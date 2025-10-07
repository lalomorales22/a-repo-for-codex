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
from .database import Conversation, GalleryAsset, Message, init_db, session_scope
from .openai_client import OpenAIMegaClient
from .schemas import (
    ConversationCreate,
    ConversationRead,
    GalleryAssetCreate,
    GalleryAssetRead,
    ImageRequest,
    ImageResponse,
    MessageCreate,
    MessageRead,
    OpenAIResponse,
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
    conversation = Conversation(title=payload.title)
    db.add(conversation)
    db.flush()
    db.refresh(conversation)
    return conversation


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
        metadata_json=json.dumps({"revised_prompt": image_info.get("revised_prompt")}),
    )
    db.add(asset)
    db.flush()
    db.refresh(asset)

    return ImageResponse(asset=GalleryAssetRead.model_validate(asset))
