"""FastAPI entrypoint for the OpenAI Mega App."""
from __future__ import annotations

from datetime import datetime
from typing import Callable, Generator

import json
import textwrap

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
    CodeFile,
    CodeProject,
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
    AvatarDesignRequest,
    AvatarDesignResponse,
    CodeFileCreate,
    CodeFileRead,
    CodeFileUpdate,
    CodeGenerationRequest,
    CodeGenerationResponse,
    CodeProjectRead,
    ConversationCreate,
    ConversationRead,
    ConversationSummary,
    ConversationUpdate,
    DataCatalogResponse,
    DataCatalogStats,
    DataPoint,
    DataVisualizationRequest,
    DataVisualizationResponse,
    DocumentDraftRequest,
    DocumentDraftResponse,
    DocumentSection,
    GalleryAssetAssignment,
    GalleryAssetCreate,
    GalleryAssetRead,
    GalleryAssetSummary,
    GalleryCreate,
    GalleryRead,
    GallerySummary,
    GalleryUpdate,
    GameConceptRequest,
    GameConceptResponse,
    ImageRequest,
    ImageResponse,
    KnowledgeBoardColumn,
    KnowledgeBoardItem,
    KnowledgeBoardRequest,
    KnowledgeBoardResponse,
    MessageCreate,
    MessageRead,
    OpenAIResponse,
    PresentationPlanRequest,
    PresentationPlanResponse,
    PresentationSlide,
    SimulationRunRequest,
    SimulationRunResponse,
    StudioRenderRequest,
    StudioRenderResponse,
    VideoRequest,
    VideoResponse,
    WhiteboardSummaryRequest,
    WhiteboardSummaryResponse,
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


def ensure_default_code_project(db) -> CodeProject:
    """Guarantee that at least one code project exists for the sandbox."""

    project = db.query(CodeProject).order_by(CodeProject.created_at.asc()).first()
    if project is not None:
        return project

    project = CodeProject(
        name="Launch Control API",
        description="Demo workspace showcasing how the sandbox persists code.",
    )
    db.add(project)
    db.flush()
    sample_files = [
        (
            "README.md",
            "markdown",
            textwrap.dedent(
                """
                # Launch Control API

                This demo project powers the Mega App's sandbox. It includes:

                - A FastAPI service with observability hooks
                - A lightweight tasks module for async job orchestration
                - Example tests illustrating data access patterns
                """
            ).strip(),
        ),
        (
            "src/api.py",
            "python",
            textwrap.dedent(
                """
                from fastapi import APIRouter, HTTPException


                router = APIRouter()


                @router.get("/health")
                async def health_check() -> dict[str, str]:
                    return {"status": "ok"}


                @router.post("/deploy")
                async def trigger_deploy(payload: dict) -> dict[str, str]:
                    if not payload.get("environment"):
                        raise HTTPException(status_code=422, detail="Missing environment")
                    return {"status": "scheduled", "environment": payload["environment"]}
                """
            ).strip(),
        ),
        (
            "src/tasks.py",
            "python",
            textwrap.dedent(
                """
                import asyncio
                from collections.abc import Callable


                async def run_job(name: str, step: Callable[[], None]) -> str:
                    await asyncio.sleep(0.1)
                    step()
                    return f"job:{name}:completed"
                """
            ).strip(),
        ),
        (
            "tests/test_api.py",
            "python",
            textwrap.dedent(
                """
                from httpx import AsyncClient


                async def test_health(app_client: AsyncClient) -> None:
                    response = await app_client.get("/health")
                    assert response.status_code == 200
                    assert response.json()["status"] == "ok"
                """
            ).strip(),
        ),
    ]
    for path, language, content in sample_files:
        db.add(
            CodeFile(
                project_id=project.id,
                path=path,
                language=language,
                content=f"{content}\n",
            )
        )
    db.flush()
    db.refresh(project)
    return project


def ai_structured_response(
    system_prompt: str,
    user_prompt: str,
    fallback: Callable[[], dict],
    *,
    model: str = "gpt-4.1-mini",
) -> tuple[dict, str]:
    """Call OpenAI for structured JSON responses, falling back to local data."""

    if not openai_client.is_live:
        data = fallback()
        return data, "offline-simulated"

    response = openai_client.structured_chat(system_prompt, user_prompt, model=model)
    content = response.get("content", "")
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        data = fallback()
    model_used = response.get("model", model)
    return data, model_used


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


@app.get("/api/code/projects", response_model=list[CodeProjectRead])
def list_code_projects(db=Depends(get_db)):
    ensure_default_code_project(db)
    projects = db.query(CodeProject).order_by(CodeProject.created_at.asc()).all()
    return [CodeProjectRead.model_validate(project) for project in projects]


@app.get("/api/code/projects/{project_id}/files", response_model=list[CodeFileRead])
def list_code_files(project_id: int, db=Depends(get_db)):
    project = db.get(CodeProject, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return [CodeFileRead.model_validate(file) for file in project.files]


@app.post(
    "/api/code/projects/{project_id}/files",
    response_model=CodeFileRead,
    status_code=status.HTTP_201_CREATED,
)
def create_code_file(project_id: int, payload: CodeFileCreate, db=Depends(get_db)):
    project = db.get(CodeProject, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    existing = (
        db.query(CodeFile)
        .filter(CodeFile.project_id == project_id, CodeFile.path == payload.path.strip())
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="File already exists")
    code_file = CodeFile(
        project_id=project_id,
        path=payload.path.strip(),
        language=payload.language,
        content=payload.content or "",
    )
    db.add(code_file)
    db.flush()
    db.refresh(code_file)
    return CodeFileRead.model_validate(code_file)


@app.patch(
    "/api/code/projects/{project_id}/files/{file_id}",
    response_model=CodeFileRead,
)
def update_code_file(project_id: int, file_id: int, payload: CodeFileUpdate, db=Depends(get_db)):
    code_file = db.get(CodeFile, file_id)
    if code_file is None or code_file.project_id != project_id:
        raise HTTPException(status_code=404, detail="File not found")
    data = payload.model_dump(exclude_unset=True)
    new_path = data.get("path")
    if new_path and new_path != code_file.path:
        duplicate = (
            db.query(CodeFile)
            .filter(CodeFile.project_id == project_id, CodeFile.path == new_path)
            .first()
        )
        if duplicate:
            raise HTTPException(status_code=409, detail="Another file already uses this path")
        code_file.path = new_path
    if "language" in data:
        code_file.language = data["language"]
    if "content" in data and data["content"] is not None:
        code_file.content = data["content"]
    code_file.updated_at = datetime.utcnow()
    db.flush()
    db.refresh(code_file)
    return CodeFileRead.model_validate(code_file)


@app.post("/api/code/projects/{project_id}/generate", response_model=CodeGenerationResponse)
def generate_code_suggestion(project_id: int, payload: CodeGenerationRequest, db=Depends(get_db)):
    project = db.get(CodeProject, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    def fallback() -> dict:
        language = payload.language or "Python"
        context_line = f"# Context: {payload.context.strip()}\n" if payload.context else ""
        snippet = textwrap.dedent(
            f"""
            {context_line}# Generated {language} snippet responding to: {payload.prompt}
            def main():
                """Auto-generated placeholder function."""
                return "Replace with live generation once the AI client is configured."

            if __name__ == "__main__":
                print(main())
            """
        ).strip()
        explanation = (
            "Simulated response summarising how the snippet could address the request. "
            "Connect your OpenAI API key to stream real code completions."
        )
        return {"code": snippet, "explanation": explanation}

    system_prompt = textwrap.dedent(
        """
        You are an expert pair-programming assistant. Respond with JSON containing two keys:
        - "code": the generated code snippet (string)
        - "explanation": a concise explanation of what the code does (string)
        Avoid markdown code fences. Tailor the snippet to the provided language and context.
        """
    ).strip()
    context_parts = [f"Project: {project.name}", f"Prompt: {payload.prompt}"]
    if payload.language:
        context_parts.append(f"Language: {payload.language}")
    if payload.file_path:
        context_parts.append(f"File: {payload.file_path}")
    if payload.context:
        context_parts.append(f"Context:\n{payload.context}")
    user_prompt = "\n\n".join(context_parts)
    data, model_used = ai_structured_response(system_prompt, user_prompt, fallback)
    return CodeGenerationResponse(
        code=data.get("code", ""),
        explanation=data.get("explanation", ""),
        model=model_used,
    )


@app.post("/api/document/draft", response_model=DocumentDraftResponse)
def draft_document(payload: DocumentDraftRequest):
    def fallback() -> dict:
        outline = payload.key_points or [
            f"Why {payload.topic} matters for {payload.audience}",
            "Key opportunities",
            "Risks and mitigations",
        ]
        sections = [
            {
                "heading": heading,
                "content": (
                    f"{heading} for {payload.audience} framed in a {payload.tone} tone. "
                    "Connects decisions to measurable outcomes."
                ),
            }
            for heading in outline
        ]
        return {
            "title": f"{payload.topic} brief",
            "summary": (
                f"{payload.topic} overview for {payload.audience}. "
                "Highlights opportunities, mitigations, and next actions."
            ),
            "outline": outline,
            "sections": sections,
            "call_to_actions": [
                "Circulate with stakeholders",
                "Gather feedback on priorities",
                "Translate into delivery roadmap",
            ],
        }

    baseline = fallback()
    system_prompt = textwrap.dedent(
        """
        You are a staff-level product writer. Return JSON with keys title, summary, outline (list of strings),
        sections (list of {"heading": str, "content": str}), and call_to_actions (list of strings).
        Respond in the requested tone.
        """
    ).strip()
    key_points = "\n".join(f"- {point}" for point in payload.key_points) if payload.key_points else ""
    user_prompt = textwrap.dedent(
        f"""
        Topic: {payload.topic}
        Audience: {payload.audience}
        Tone: {payload.tone}
        Key points:
        {key_points or '- Emphasise practical outcomes'}
        """
    ).strip()
    data, model_used = ai_structured_response(system_prompt, user_prompt, fallback)
    document_data = {
        "title": data.get("title") or baseline["title"],
        "summary": data.get("summary") or baseline["summary"],
        "outline": data.get("outline") or baseline["outline"],
        "sections": data.get("sections") or baseline["sections"],
        "call_to_actions": data.get("call_to_actions") or baseline["call_to_actions"],
    }
    return DocumentDraftResponse(model=model_used, **document_data)


@app.post("/api/presentation/plan", response_model=PresentationPlanResponse)
def plan_presentation(payload: PresentationPlanRequest):
    def fallback() -> dict:
        slides = [
            {
                "title": "Opening story",
                "bullets": [
                    f"Context for {payload.audience}",
                    "Define the customer tension",
                    "Preview the solution",
                ],
                "visual": "Hero metric or customer quote",
            },
            {
                "title": "Solution architecture",
                "bullets": [
                    "How the system works",
                    "Integration touchpoints",
                    "Operational ownership",
                ],
                "visual": "Layered diagram",
            },
            {
                "title": "Roadmap",
                "bullets": [
                    "Milestones by quarter",
                    "Dependencies",
                    "Risks and asks",
                ],
                "visual": "Timeline",
            },
        ]
        return {
            "headline": f"{payload.theme} narrative",
            "slides": slides,
            "next_steps": [
                "Confirm owners for follow-up questions",
                "Share recording and key artifacts",
                "Book working session to refine details",
            ],
        }

    baseline = fallback()
    system_prompt = textwrap.dedent(
        """
        You help product teams craft executive-ready presentations. Reply with JSON containing headline,
        slides (array of {"title": str, "bullets": [str], "visual": str}), and next_steps (array of str).
        Match the requested tone and duration.
        """
    ).strip()
    goals = "\n".join(f"- {goal}" for goal in payload.goals) if payload.goals else "- Align stakeholders"
    user_prompt = textwrap.dedent(
        f"""
        Theme: {payload.theme}
        Audience: {payload.audience}
        Duration: {payload.duration_minutes} minutes
        Goals:\n{goals}
        """
    ).strip()
    data, model_used = ai_structured_response(system_prompt, user_prompt, fallback)
    plan_data = {
        "headline": data.get("headline") or baseline["headline"],
        "slides": data.get("slides") or baseline["slides"],
        "next_steps": data.get("next_steps") or baseline["next_steps"],
    }
    return PresentationPlanResponse(model=model_used, **plan_data)


@app.post("/api/data/visualize", response_model=DataVisualizationResponse)
def visualize_data(payload: DataVisualizationRequest):
    def fallback() -> dict:
        dataset = [
            {"label": "North America", "value": 42.5},
            {"label": "EMEA", "value": 35.0},
            {"label": "APAC", "value": 27.4},
        ]
        return {
            "chart_type": payload.chart_preference or "bar",
            "dataset": dataset,
            "summary": f"Primary insight: {payload.dataset_description} shows strongest momentum in North America.",
            "insights": [
                "North America leads growth with clear margin",
                "EMEA stabilises after previous quarter's dip",
                "APAC acceleration suggests investment opportunity",
            ],
        }

    baseline = fallback()
    system_prompt = textwrap.dedent(
        """
        You are a data storyteller. Return JSON with chart_type, dataset (array of {"label": str, "value": number}),
        summary (string), and insights (array of strings). Keep values numeric.
        """
    ).strip()
    user_prompt = textwrap.dedent(
        f"""
        Dataset description: {payload.dataset_description}
        Desired chart: {payload.chart_preference}
        Goal: {payload.goal or 'Highlight actionable trends'}
        """
    ).strip()
    data, model_used = ai_structured_response(system_prompt, user_prompt, fallback)
    viz_data = {
        "chart_type": data.get("chart_type") or baseline["chart_type"],
        "dataset": data.get("dataset") or baseline["dataset"],
        "summary": data.get("summary") or baseline["summary"],
        "insights": data.get("insights") or baseline["insights"],
    }
    return DataVisualizationResponse(model=model_used, **viz_data)


@app.post("/api/game/concept", response_model=GameConceptResponse)
def build_game_concept(payload: GameConceptRequest):
    def fallback() -> dict:
        return {
            "elevator_pitch": f"{payload.genre.title()} game where players {payload.fantasy.lower()}.",
            "core_loop": [
                "Collect signals from the simulation",
                "Synthesize strategies with AI advisor",
                "Deploy actions and review outcomes",
            ],
            "mechanics": payload.pillars
            or [
                "Dynamic market events",
                "Co-op planning board",
                "Skill tree that unlocks automation",
            ],
            "progression": [
                "Tutorial: establish baseline",
                "Season: compete asynchronously",
                "Endgame: unlock persistent world modifiers",
            ],
            "monetization": ["Season pass", "Cosmetic bundles", "Collaborative events"],
        }

    baseline = fallback()
    system_prompt = textwrap.dedent(
        """
        You are a senior game designer. Return JSON with elevator_pitch, core_loop (array of str), mechanics (array of str),
        progression (array of str), and monetization (array of str). Tie ideas back to the fantasy.
        """
    ).strip()
    pillars = "\n".join(f"- {pillar}" for pillar in payload.pillars) if payload.pillars else "- Player agency"
    user_prompt = textwrap.dedent(
        f"""
        Fantasy: {payload.fantasy}
        Genre: {payload.genre}
        Platform: {payload.platform or 'Cross-platform'}
        Pillars:\n{pillars}
        """
    ).strip()
    data, model_used = ai_structured_response(system_prompt, user_prompt, fallback)
    concept_data = {
        "elevator_pitch": data.get("elevator_pitch") or baseline["elevator_pitch"],
        "core_loop": data.get("core_loop") or baseline["core_loop"],
        "mechanics": data.get("mechanics") or baseline["mechanics"],
        "progression": data.get("progression") or baseline["progression"],
        "monetization": data.get("monetization") or baseline["monetization"],
    }
    return GameConceptResponse(model=model_used, **concept_data)


@app.post("/api/avatar/design", response_model=AvatarDesignResponse)
def design_avatar(payload: AvatarDesignRequest):
    def fallback() -> dict:
        palette = ["#0ea5e9", "#38bdf8", "#e0f2fe"] if payload.palette_hint is None else [
            payload.palette_hint,
            "#f97316",
            "#fef3c7",
        ]
        return {
            "concept_name": payload.name,
            "description": (
                f"{payload.name} rendered in a {payload.style} style with {payload.vibe or 'confident'} energy."
            ),
            "palette": palette,
            "accessories": ["Neural interface", "Motion scarf", "Soft glow"],
            "prompt": (
                f"Portrait of {payload.name}, {payload.vibe or 'optimistic'} vibe, {payload.style} aesthetic, "
                f"studio lighting, detailed textures"
            ),
        }

    baseline = fallback()
    system_prompt = textwrap.dedent(
        """
        You are an art director crafting character sheets. Reply with JSON containing concept_name, description, palette
        (array of hex strings), accessories (array of str), and prompt (string for an image model).
        """
    ).strip()
    user_prompt = textwrap.dedent(
        f"""
        Name: {payload.name}
        Style: {payload.style}
        Vibe: {payload.vibe or 'uplifting'}
        Palette hint: {payload.palette_hint or 'cool neutrals'}
        """
    ).strip()
    data, model_used = ai_structured_response(system_prompt, user_prompt, fallback)
    avatar_data = {
        "concept_name": data.get("concept_name") or baseline["concept_name"],
        "description": data.get("description") or baseline["description"],
        "palette": data.get("palette") or baseline["palette"],
        "accessories": data.get("accessories") or baseline["accessories"],
        "prompt": data.get("prompt") or baseline["prompt"],
    }
    return AvatarDesignResponse(model=model_used, **avatar_data)


@app.post("/api/simulation/run", response_model=SimulationRunResponse)
def run_simulation(payload: SimulationRunRequest):
    def fallback() -> dict:
        return {
            "scenario": payload.scenario,
            "timeline": [
                {"phase": "T0", "details": "Baseline state captured and telemetry streaming"},
                {"phase": "T+1", "details": "Scenario injected, AI agent tuning parameters"},
                {"phase": "T+2", "details": "Stabilisation reached, exporting playbook"},
            ],
            "metrics": [
                {"name": metric, "value": "Trending"} for metric in (payload.metrics or ["Throughput", "Latency"])
            ],
            "risks": ["Data freshness", "Operator adoption"],
            "summary": (
                f"Simulation for {payload.scenario} completes within {payload.horizon}, "
                "highlighting mitigation strategies and follow-up analyses."
            ),
        }

    baseline = fallback()
    system_prompt = textwrap.dedent(
        """
        You model operational simulations. Return JSON with scenario, timeline (array of {"phase": str, "details": str}),
        metrics (array of {"name": str, "value": str}), risks (array of str), and summary (string).
        """
    ).strip()
    metrics = "\n".join(f"- {metric}" for metric in payload.metrics) if payload.metrics else "- Throughput"
    user_prompt = textwrap.dedent(
        f"""
        Scenario: {payload.scenario}
        Horizon: {payload.horizon}
        Metrics:\n{metrics}
        """
    ).strip()
    data, model_used = ai_structured_response(system_prompt, user_prompt, fallback)
    simulation_data = {
        "scenario": data.get("scenario") or baseline["scenario"],
        "timeline": data.get("timeline") or baseline["timeline"],
        "metrics": data.get("metrics") or baseline["metrics"],
        "risks": data.get("risks") or baseline["risks"],
        "summary": data.get("summary") or baseline["summary"],
    }
    return SimulationRunResponse(model=model_used, **simulation_data)


@app.post("/api/whiteboard/summarize", response_model=WhiteboardSummaryResponse)
def summarize_whiteboard(payload: WhiteboardSummaryRequest):
    def fallback() -> dict:
        notes = payload.notes or []
        highlights = [note.get("text", "") for note in notes][:3]
        clusters: list[dict[str, list[str]]] = []
        by_category: dict[str, list[str]] = {}
        for note in notes:
            category = note.get("category", "Ideas")
            by_category.setdefault(category, []).append(note.get("text", ""))
        for category, items in by_category.items():
            clusters.append({"label": category, "items": [item for item in items if item]})
        follow_ups = ["Confirm owners", "Document decisions", "Sync with stakeholders"]
        return {
            "highlights": highlights or ["Board is ready for more detail"],
            "clusters": clusters,
            "follow_ups": follow_ups,
        }

    baseline = fallback()
    system_prompt = textwrap.dedent(
        """
        You are an AI collaborator reviewing a whiteboard. Return JSON with highlights (array of str),
        clusters (array of {"label": str, "items": [str]}), and follow_ups (array of str).
        """
    ).strip()
    formatted_notes = "\n".join(
        f"- [{note.get('category', 'Idea')}] {note.get('text', '')}" for note in payload.notes
    )
    user_prompt = textwrap.dedent(
        f"""
        Notes collected:\n{formatted_notes or '- No notes captured yet'}
        """
    ).strip()
    data, model_used = ai_structured_response(system_prompt, user_prompt, fallback)
    summary_data = {
        "highlights": data.get("highlights") or baseline["highlights"],
        "clusters": data.get("clusters") or baseline["clusters"],
        "follow_ups": data.get("follow_ups") or baseline["follow_ups"],
    }
    return WhiteboardSummaryResponse(model=model_used, **summary_data)


@app.post("/api/knowledge/curate", response_model=KnowledgeBoardResponse)
def curate_knowledge(payload: KnowledgeBoardRequest):
    def fallback() -> dict:
        columns = [
            {
                "title": "Signals",
                "items": [
                    {
                        "title": "Industry benchmark",
                        "summary": "Latest report summarising adoption curves",
                        "link": "https://example.com/benchmark",
                    },
                    {
                        "title": "Customer interview",
                        "summary": "Head of Ops outlines pain in daily workflow",
                        "link": None,
                    },
                ],
            },
            {
                "title": "Insights",
                "items": [
                    {
                        "title": "Automation reduces toil",
                        "summary": "Teams adopting copilots cut manual effort by 32%",
                        "link": None,
                    },
                    {
                        "title": "Change management",
                        "summary": "Upskilling plan accelerates adoption",
                        "link": "https://example.com/change",
                    },
                ],
            },
            {
                "title": "Actions",
                "items": [
                    {
                        "title": "Pilot program",
                        "summary": "Launch with operations pod to validate impact",
                        "link": None,
                    },
                ],
            },
        ]
        return {
            "theme": payload.theme,
            "columns": columns,
            "actions": [
                "Share with leadership circle",
                "Schedule enablement workshop",
                "Track insight freshness monthly",
            ],
        }

    baseline = fallback()
    system_prompt = textwrap.dedent(
        """
        You compile knowledge boards. Respond with JSON containing theme, columns (array of {"title": str, "items":
        [{"title": str, "summary": str, "link": str|null}]}), and actions (array of str). Highlight diversity of sources.
        """
    ).strip()
    user_prompt = textwrap.dedent(
        f"""
        Theme: {payload.theme}
        Objective: {payload.objective or 'Enable fast onboarding'}
        Audience: {payload.audience or 'Product and GTM teams'}
        """
    ).strip()
    data, model_used = ai_structured_response(system_prompt, user_prompt, fallback)
    board_data = {
        "theme": data.get("theme") or baseline["theme"],
        "columns": data.get("columns") or baseline["columns"],
        "actions": data.get("actions") or baseline["actions"],
    }
    return KnowledgeBoardResponse(model=model_used, **board_data)


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
        code_projects=db.query(func.count(CodeProject.id)).scalar() or 0,
        code_files=db.query(func.count(CodeFile.id)).scalar() or 0,
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
