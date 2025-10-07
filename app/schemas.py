"""Pydantic schemas for API interactions."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


class ConversationRead(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    role: str = Field(default="user")
    content: str = Field(..., min_length=1)
    model: str = Field(default="gpt-4.1-mini")


class MessageRead(BaseModel):
    id: int
    role: str
    content: str
    model: Optional[str]
    token_usage: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class GalleryAssetCreate(BaseModel):
    asset_type: str
    title: str
    description: Optional[str]
    url: str
    metadata: Optional[dict[str, Any]] = None


class GalleryAssetRead(BaseModel):
    id: int
    asset_type: str
    title: str
    description: Optional[str]
    url: str
    metadata_json: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class OpenAIResponse(BaseModel):
    conversation: ConversationRead
    user_message: MessageRead
    assistant_message: MessageRead


class ImageRequest(BaseModel):
    prompt: str
    size: str = Field(default="1024x1024")
    quality: str = Field(default="high")


class ImageResponse(BaseModel):
    asset: GalleryAssetRead
