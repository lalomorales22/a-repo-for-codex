"""Pydantic schemas for API interactions."""
from __future__ import annotations

from datetime import datetime
import json
from typing import Any, Optional

from pydantic import BaseModel, Field, model_validator


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
    metadata: Optional[dict[str, Any]] = None
    gallery_ids: list[int] = Field(default_factory=list)
    created_at: datetime

    class Config:
        from_attributes = True

    @model_validator(mode="after")
    def _populate_metadata(self) -> "GalleryAssetRead":
        if self.metadata is None and self.metadata_json:
            try:
                self.metadata = json.loads(self.metadata_json)
            except ValueError:
                self.metadata = None
        return self


class GalleryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    accent_color: Optional[str] = Field(default="#10a37f")
    layout: Optional[str] = Field(default="grid")


class GalleryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    accent_color: Optional[str] = None
    layout: Optional[str] = None


class GalleryRead(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: Optional[str]
    accent_color: Optional[str]
    layout: Optional[str]
    asset_count: int = Field(default=0)
    created_at: datetime
    updated_at: datetime
    assets: list[GalleryAssetRead] = Field(default_factory=list)

    class Config:
        from_attributes = True


class GalleryAssetAssignment(BaseModel):
    asset_id: int


class OpenAIResponse(BaseModel):
    conversation: ConversationRead
    user_message: MessageRead
    assistant_message: MessageRead


class ImageRequest(BaseModel):
    prompt: str
    size: str = Field(default="1024x1024")
    quality: str = Field(default="high")
    aspect_ratio: str = Field(default="1:1")


class ImageResponse(BaseModel):
    asset: GalleryAssetRead


class VideoRequest(BaseModel):
    prompt: str
    aspect_ratio: str = Field(default="16:9")
    duration_seconds: int = Field(default=8, ge=1, le=120)
    quality: str = Field(default="high")


class VideoResponse(BaseModel):
    asset: GalleryAssetRead


class StudioRenderRequest(BaseModel):
    title: str
    orientation: str = Field(pattern=r"^(vertical|landscape)$")
    asset_ids: list[int] = Field(min_length=1)
    description: Optional[str] = None


class StudioRenderResponse(BaseModel):
    asset: GalleryAssetRead
