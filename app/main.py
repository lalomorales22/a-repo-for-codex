"""FastAPI entrypoint for the OpenAI Mega App."""
from __future__ import annotations

from datetime import datetime
from typing import Generator

import json

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import func

from .config import BASE_DIR, get_settings
from .database import (
    Agent,
    AudioTrack,
    Conversation,
    Gallery,
    GalleryAsset,
    Message,
    WorkspaceWidget,
    init_db,
    session_scope,
)
from .elevenlabs_client import ElevenLabsClient
from .openai_client import OpenAIMegaClient
from .schemas import (
    AgentBuildRequest,
    AgentBuildResponse,
    AgentCreate,
    AgentPlan,
    AgentRead,
    AgentSummary,
    AgentUpdate,
    AudioGenerationRequest,
    AudioTrackRead,
    AudioTrackSummary,
    ConversationCreate,
    ConversationRead,
    ConversationSummary,
    ConversationUpdate,
    DataCatalogResponse,
    DataCatalogStats,
    GalleryAssetAssignment,
    GalleryAssetCreate,
    GalleryAssetRead,
    GalleryAssetSummary,
    GalleryCreate,
    GalleryRead,
    GallerySummary,
    GalleryUpdate,
    ImageRequest,
    ImageResponse,
    MessageCreate,
    MessageRead,
    OpenAIResponse,
    StudioRenderRequest,
    StudioRenderResponse,
    VideoRequest,
    VideoResponse,
    WorkspaceWidgetCreate,
    WorkspaceWidgetRead,
    WorkspaceWidgetSummary,
    WorkspaceWidgetUpdate,
)

settings = get_settings()
openai_client = OpenAIMegaClient(settings=settings)
elevenlabs_client = ElevenLabsClient(settings=settings)
app = FastAPI(title="OpenAI Mega App", version="1.0.0")


def get_db() -> Generator:
    with session_scope() as session:
        yield session


@app.on_event("startup")
def on_startup() -> None:
    init_db()


app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static",
)

templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/", response_class=HTMLResponse)
def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api/conversations", response_model=list[ConversationRead])
def list_conversations(db=Depends(get_db)):
    conversations = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    return conversations


@app.post(
    "/api/conversations",
    response_model=ConversationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(payload: ConversationCreate, db=Depends(get_db)):
    clean_title = payload.title.strip()
    if not clean_title:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Title cannot be empty")
    conversation = Conversation(title=clean_title)
    db.add(conversation)
    db.flush()
    db.refresh(conversation)
    return conversation


@app.patch("/api/conversations/{conversation_id}", response_model=ConversationRead)
def update_conversation(
    conversation_id: int, payload: ConversationUpdate, db=Depends(get_db)
):
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    clean_title = payload.title.strip()
    if not clean_title:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Title cannot be empty",
        )

    conversation.title = clean_title
    conversation.updated_at = datetime.utcnow()
    db.flush()
    db.refresh(conversation)
    return conversation


@app.delete("/api/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: int, db=Depends(get_db)):
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conversation)
    return None


@app.get(
    "/api/conversations/{conversation_id}/messages",
    response_model=list[MessageRead],
)
def list_messages(conversation_id: int, db=Depends(get_db)):
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation.messages


@app.post(
    "/api/conversations/{conversation_id}/messages",
    response_model=OpenAIResponse,
)
def send_message(conversation_id: int, payload: MessageCreate, db=Depends(get_db)):
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=payload.content,
        model=payload.model,
    )
    db.add(user_message)
    db.flush()
    db.refresh(user_message)

    history = (
        [{"role": message.role, "content": message.content} for message in conversation.messages]
        + [{"role": "user", "content": payload.content}]
    )
    assistant_payload = openai_client.chat(history, model=payload.model)
    assistant_message = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=assistant_payload["content"],
        model=assistant_payload["model"],
        token_usage=str(assistant_payload.get("usage", {})),
    )
    conversation.updated_at = datetime.utcnow()
    db.add(assistant_message)
    db.flush()
    db.refresh(assistant_message)

    db.refresh(conversation)

    return OpenAIResponse(
        conversation=ConversationRead.model_validate(conversation),
        user_message=MessageRead.model_validate(user_message),
        assistant_message=MessageRead.model_validate(assistant_message),
    )


@app.get("/api/gallery", response_model=list[GalleryAssetRead])
def get_gallery(db=Depends(get_db)):
    assets = db.query(GalleryAsset).order_by(GalleryAsset.created_at.desc()).all()
    return assets


@app.post("/api/gallery", response_model=GalleryAssetRead, status_code=status.HTTP_201_CREATED)
def create_gallery_asset(payload: GalleryAssetCreate, db=Depends(get_db)):
    asset = GalleryAsset(
        asset_type=payload.asset_type,
        title=payload.title,
        description=payload.description,
        url=payload.url,
        metadata_json=json.dumps(payload.metadata) if payload.metadata else None,
    )
    db.add(asset)
    db.flush()
    db.refresh(asset)
    return asset


@app.post("/api/images", response_model=ImageResponse)
def generate_image(request: ImageRequest, db=Depends(get_db)):
    image_info = openai_client.create_image(
        prompt=request.prompt, size=request.size, quality=request.quality
    )
    asset = GalleryAsset(
        asset_type="image",
        title=request.prompt[:80],
        description=f"Generated with {image_info['model']} (quality {request.quality})",
        url=image_info["url"],
        metadata_json=json.dumps(
            {
                "revised_prompt": image_info.get("revised_prompt"),
                "size": request.size,
                "quality": request.quality,
                "aspect_ratio": request.aspect_ratio,
            }
        ),
    )
    db.add(asset)
    db.flush()
    db.refresh(asset)

    return ImageResponse(asset=GalleryAssetRead.model_validate(asset))


@app.post("/api/videos", response_model=VideoResponse)
def generate_video(request: VideoRequest, db=Depends(get_db)):
    video_info = openai_client.create_video(
        prompt=request.prompt,
        aspect_ratio=request.aspect_ratio,
        duration_seconds=request.duration_seconds,
        quality=request.quality,
    )

    # Extract video_id from the OpenAI URL if available
    video_id = video_info.get("video_id")
    
    # If we have a video_id, use our proxy endpoint instead of direct OpenAI URL
    if video_id:
        video_url = f"/api/videos/{video_id}/content"
    else:
        # Fallback to the original URL (for mock data or errors)
        video_url = video_info["url"]

    asset = GalleryAsset(
        asset_type="video",
        title=request.prompt[:80] if request.prompt else "Generated video",
        description=(
            f"Storyboard with {video_info['model']} ({request.aspect_ratio}, {request.duration_seconds}s)"
        ),
        url=video_url,
        metadata_json=json.dumps(
            {
                "video_id": video_id,
                "revised_prompt": video_info.get("revised_prompt"),
                "thumbnail_url": video_info.get("thumbnail_url"),
                "aspect_ratio": video_info.get("aspect_ratio"),
                "duration_seconds": video_info.get("duration_seconds"),
                "quality": video_info.get("quality"),
                "orientation": video_info.get("orientation"),
            }
        ),
    )
    db.add(asset)
    db.flush()
    db.refresh(asset)

    return VideoResponse(asset=GalleryAssetRead.model_validate(asset))


@app.get("/api/videos/{video_id}/content")
async def proxy_video_content(video_id: str):
    """
    Proxy endpoint to fetch video content from OpenAI with authentication.
    
    The frontend cannot directly access OpenAI's /videos/{id}/content endpoint
    because it requires an API key. This endpoint fetches the video with proper
    authentication and streams it to the client.
    """
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key not configured"
        )
    
    try:
        # Fetch the video from OpenAI with authentication
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"https://api.openai.com/v1/videos/{video_id}/content",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                },
            )
            
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Video not found")
            elif response.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid API key")
            elif response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch video: {response.text[:200]}"
                )
            
            # Stream the video content to the client
            return StreamingResponse(
                response.iter_bytes(chunk_size=8192),
                media_type=response.headers.get("content-type", "video/mp4"),
                headers={
                    "Content-Disposition": f'inline; filename="video_{video_id}.mp4"',
                    "Accept-Ranges": "bytes",
                }
            )
    
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching video: {str(e)}"
        )


@app.get("/api/widgets", response_model=list[WorkspaceWidgetRead])
def list_widgets(db=Depends(get_db)):
    widgets = db.query(WorkspaceWidget).order_by(WorkspaceWidget.created_at.asc()).all()
    return [WorkspaceWidgetRead.model_validate(widget) for widget in widgets]


@app.post("/api/widgets", response_model=WorkspaceWidgetRead, status_code=status.HTTP_201_CREATED)
def create_widget(payload: WorkspaceWidgetCreate, db=Depends(get_db)):
    widget = WorkspaceWidget(
        widget_type=payload.widget_type,
        title=payload.title,
        width=payload.width,
        height=payload.height,
        position_left=payload.position_left,
        position_top=payload.position_top,
    )
    widget.config = payload.config
    db.add(widget)
    db.flush()
    db.refresh(widget)
    return WorkspaceWidgetRead.model_validate(widget)


@app.patch("/api/widgets/{widget_id}", response_model=WorkspaceWidgetRead)
def update_widget(widget_id: int, payload: WorkspaceWidgetUpdate, db=Depends(get_db)):
    widget = db.get(WorkspaceWidget, widget_id)
    if widget is None:
        raise HTTPException(status_code=404, detail="Widget not found")

    data = payload.model_dump(exclude_unset=True)
    if "config" in data:
        config = data.pop("config")
        widget.config = config
    for field, value in data.items():
        setattr(widget, field, value)

    db.flush()
    db.refresh(widget)
    return WorkspaceWidgetRead.model_validate(widget)


@app.delete("/api/widgets/{widget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_widget(widget_id: int, db=Depends(get_db)):
    widget = db.get(WorkspaceWidget, widget_id)
    if widget is None:
        raise HTTPException(status_code=404, detail="Widget not found")
    db.delete(widget)
    return None


@app.get("/api/galleries", response_model=list[GalleryRead])
def list_galleries(db=Depends(get_db)):
    galleries = db.query(Gallery).order_by(Gallery.updated_at.desc()).all()
    return [GalleryRead.model_validate(gallery) for gallery in galleries]


@app.post("/api/galleries", response_model=GalleryRead, status_code=status.HTTP_201_CREATED)
def create_gallery(payload: GalleryCreate, db=Depends(get_db)):
    gallery = Gallery(
        name=payload.name,
        description=payload.description,
        category=payload.category,
        accent_color=payload.accent_color,
        layout=payload.layout,
    )
    db.add(gallery)
    db.flush()
    db.refresh(gallery)
    return GalleryRead.model_validate(gallery)


@app.patch("/api/galleries/{gallery_id}", response_model=GalleryRead)
def update_gallery(gallery_id: int, payload: GalleryUpdate, db=Depends(get_db)):
    gallery = db.get(Gallery, gallery_id)
    if gallery is None:
        raise HTTPException(status_code=404, detail="Gallery not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(gallery, field, value)

    db.flush()
    db.refresh(gallery)
    return GalleryRead.model_validate(gallery)


@app.post("/api/galleries/{gallery_id}/assets", response_model=GalleryRead)
def add_asset_to_gallery(gallery_id: int, payload: GalleryAssetAssignment, db=Depends(get_db)):
    gallery = db.get(Gallery, gallery_id)
    if gallery is None:
        raise HTTPException(status_code=404, detail="Gallery not found")

    asset = db.get(GalleryAsset, payload.asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset not in gallery.assets:
        gallery.assets.append(asset)

    db.flush()
    db.refresh(gallery)
    return GalleryRead.model_validate(gallery)


@app.get(
    "/api/galleries/{gallery_id}/assets",
    response_model=list[GalleryAssetRead],
)
def list_gallery_assets(gallery_id: int, db=Depends(get_db)):
    gallery = db.get(Gallery, gallery_id)
    if gallery is None:
        raise HTTPException(status_code=404, detail="Gallery not found")
    return [GalleryAssetRead.model_validate(asset) for asset in gallery.assets]


@app.post("/api/studio/render", response_model=StudioRenderResponse)
def render_studio_video(payload: StudioRenderRequest, db=Depends(get_db)):
    assets = (
        db.query(GalleryAsset)
        .filter(GalleryAsset.id.in_(payload.asset_ids))
        .order_by(GalleryAsset.created_at.asc())
        .all()
    )
    if len(assets) != len(payload.asset_ids):
        raise HTTPException(status_code=404, detail="One or more assets were not found")

    storyboard_prompt = " \n".join(
        f"Scene {index + 1}: {asset.title}" for index, asset in enumerate(assets)
    )
    video_info = openai_client.create_video(
        prompt=f"Compose a {payload.orientation} video with scenes: {storyboard_prompt}",
        aspect_ratio="9:16" if payload.orientation == "vertical" else "16:9",
        duration_seconds=min(12, 4 * len(assets)),
        quality="high",
    )

    asset = GalleryAsset(
        asset_type="video",
        title=payload.title[:80] if payload.title else "Studio montage",
        description=payload.description
        or f"Studio composition ({payload.orientation}) crafted from {len(assets)} assets.",
        url=video_info["url"],
        metadata_json=json.dumps(
            {
                "revised_prompt": video_info.get("revised_prompt"),
                "source_asset_ids": payload.asset_ids,
                "orientation": payload.orientation,
                "thumbnail_url": video_info.get("thumbnail_url"),
            }
        ),
    )
    db.add(asset)
    db.flush()
    db.refresh(asset)

    return StudioRenderResponse(asset=GalleryAssetRead.model_validate(asset))


@app.get("/api/agents", response_model=list[AgentRead])
def list_agents(db=Depends(get_db)):
    agents = db.query(Agent).order_by(Agent.updated_at.desc()).all()
    return [AgentRead.model_validate(agent) for agent in agents]


@app.post("/api/agents", response_model=AgentRead, status_code=status.HTTP_201_CREATED)
def create_agent(payload: AgentCreate, db=Depends(get_db)):
    clean_capabilities = [item.strip() for item in payload.capabilities if item.strip()]
    clean_tools = [item.strip() for item in payload.tools if item.strip()]

    agent = Agent(
        name=payload.name.strip(),
        mission=payload.mission.strip(),
        instructions=payload.instructions.strip(),
        workflow=payload.workflow.strip() if payload.workflow else None,
    )
    agent.capabilities = clean_capabilities
    agent.tools = clean_tools

    db.add(agent)
    db.flush()
    db.refresh(agent)
    return AgentRead.model_validate(agent)


@app.patch("/api/agents/{agent_id}", response_model=AgentRead)
def update_agent(agent_id: int, payload: AgentUpdate, db=Depends(get_db)):
    agent = db.get(Agent, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    data = payload.model_dump(exclude_unset=True)

    if "capabilities" in data:
        agent.capabilities = [item.strip() for item in data.pop("capabilities") or [] if item.strip()]
    if "tools" in data:
        agent.tools = [item.strip() for item in data.pop("tools") or [] if item.strip()]

    for field, value in data.items():
        if isinstance(value, str):
            setattr(agent, field, value.strip())
        else:
            setattr(agent, field, value)

    db.flush()
    db.refresh(agent)
    return AgentRead.model_validate(agent)


@app.post("/api/agents/build", response_model=AgentBuildResponse)
def build_agent(payload: AgentBuildRequest) -> AgentBuildResponse:
    brief = payload.prompt.strip()
    if payload.context:
        brief = f"{brief}\n\nContext:\n{payload.context.strip()}"

    plan_data = openai_client.plan_agent(brief)
    plan = AgentPlan.model_validate(plan_data)
    return AgentBuildResponse(plan=plan)


@app.get("/api/audio-tracks", response_model=list[AudioTrackRead])
def list_audio_tracks(db=Depends(get_db)):
    tracks = db.query(AudioTrack).order_by(AudioTrack.created_at.desc()).all()
    return [AudioTrackRead.model_validate(track) for track in tracks]


@app.post("/api/audio-tracks", response_model=AudioTrackRead, status_code=status.HTTP_201_CREATED)
def generate_audio_track(payload: AudioGenerationRequest, db=Depends(get_db)):
    audio_info = elevenlabs_client.generate_audio(
        payload.prompt,
        title=payload.title,
        voice=payload.voice,
        style=payload.style,
        track_type=payload.track_type,
        duration_seconds=payload.duration_seconds,
    )

    track = AudioTrack(
        title=payload.title,
        description=audio_info.get("description"),
        style=audio_info.get("style") or payload.style,
        duration_seconds=audio_info.get("duration_seconds") or payload.duration_seconds,
        voice=audio_info.get("voice") or payload.voice,
        track_type=audio_info.get("track_type") or payload.track_type,
        url=audio_info["url"],
        metadata_json=json.dumps(
            {
                key: value
                for key, value in audio_info.items()
                if key
                not in {"url", "style", "duration_seconds", "voice", "track_type", "description"}
            }
        )
        if audio_info
        else None,
    )
    db.add(track)
    db.flush()
    db.refresh(track)
    return AudioTrackRead.model_validate(track)


@app.get("/api/data-catalog", response_model=DataCatalogResponse)
def get_data_catalog(db=Depends(get_db)):
    stats = DataCatalogStats(
        conversations=db.query(func.count(Conversation.id)).scalar() or 0,
        messages=db.query(func.count(Message.id)).scalar() or 0,
        gallery_assets=db.query(func.count(GalleryAsset.id)).scalar() or 0,
        galleries=db.query(func.count(Gallery.id)).scalar() or 0,
        agents=db.query(func.count(Agent.id)).scalar() or 0,
        audio_tracks=db.query(func.count(AudioTrack.id)).scalar() or 0,
        widgets=db.query(func.count(WorkspaceWidget.id)).scalar() or 0,
    )

    limit = 6

    conversation_rows = (
        db.query(
            Conversation.id,
            Conversation.title,
            Conversation.updated_at,
            func.count(Message.id).label("message_count"),
        )
        .outerjoin(Message)
        .group_by(Conversation.id)
        .order_by(Conversation.updated_at.desc())
        .limit(limit)
        .all()
    )
    conversations = [
        ConversationSummary(
            id=row.id,
            title=row.title,
            message_count=row.message_count or 0,
            updated_at=row.updated_at,
        )
        for row in conversation_rows
    ]

    assets = (
        db.query(GalleryAsset)
        .order_by(GalleryAsset.created_at.desc())
        .limit(limit)
        .all()
    )
    asset_summaries = [
        GalleryAssetSummary(
            id=asset.id,
            asset_type=asset.asset_type,
            title=asset.title,
            description=asset.description,
            url=asset.url,
            created_at=asset.created_at,
        )
        for asset in assets
    ]

    tracks = (
        db.query(AudioTrack)
        .order_by(AudioTrack.created_at.desc())
        .limit(limit)
        .all()
    )
    audio_summaries = [
        AudioTrackSummary(
            id=track.id,
            title=track.title,
            description=track.description,
            style=track.style,
            duration_seconds=track.duration_seconds,
            voice=track.voice,
            track_type=track.track_type,
            url=track.url,
            created_at=track.created_at,
        )
        for track in tracks
    ]

    agent_records = (
        db.query(Agent)
        .order_by(Agent.updated_at.desc())
        .limit(limit)
        .all()
    )
    agent_summaries = [
        AgentSummary(
            id=agent.id,
            name=agent.name,
            mission=agent.mission,
            capabilities=agent.capabilities,
            updated_at=agent.updated_at,
        )
        for agent in agent_records
    ]

    gallery_records = (
        db.query(Gallery)
        .order_by(Gallery.updated_at.desc())
        .limit(limit)
        .all()
    )
    gallery_summaries = [
        GallerySummary(
            id=gallery.id,
            name=gallery.name,
            description=gallery.description,
            category=gallery.category,
            asset_count=gallery.asset_count,
            updated_at=gallery.updated_at,
        )
        for gallery in gallery_records
    ]

    widget_records = (
        db.query(WorkspaceWidget)
        .order_by(WorkspaceWidget.updated_at.desc())
        .limit(limit)
        .all()
    )
    widget_summaries = [
        WorkspaceWidgetSummary(
            id=widget.id,
            title=widget.title,
            widget_type=widget.widget_type,
            width=widget.width,
            height=widget.height,
            config=widget.config,
            created_at=widget.created_at,
            updated_at=widget.updated_at,
        )
        for widget in widget_records
    ]

    return DataCatalogResponse(
        stats=stats,
        conversations=conversations,
        assets=asset_summaries,
        audio=audio_summaries,
        agents=agent_summaries,
        galleries=gallery_summaries,
        widgets=widget_summaries,
    )
