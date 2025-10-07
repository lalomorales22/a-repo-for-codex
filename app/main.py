"""FastAPI entrypoint for the OpenAI Mega App."""
from __future__ import annotations

from datetime import datetime
from typing import Generator

import json

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .config import BASE_DIR, get_settings
from .database import (
    Conversation,
    Gallery,
    GalleryAsset,
    Message,
    init_db,
    session_scope,
)
from .openai_client import OpenAIMegaClient
from .schemas import (
    ConversationCreate,
    ConversationRead,
    ConversationUpdate,
    GalleryAssetAssignment,
    GalleryAssetCreate,
    GalleryAssetRead,
    GalleryCreate,
    GalleryRead,
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
)

settings = get_settings()
openai_client = OpenAIMegaClient(settings=settings)
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

    asset = GalleryAsset(
        asset_type="video",
        title=request.prompt[:80] if request.prompt else "Generated video",
        description=(
            f"Storyboard with {video_info['model']} ({request.aspect_ratio}, {request.duration_seconds}s)"
        ),
        url=video_info["url"],
        metadata_json=json.dumps(
            {
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
