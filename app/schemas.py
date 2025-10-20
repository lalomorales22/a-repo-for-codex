"""Pydantic schemas for API interactions."""
from __future__ import annotations

from datetime import datetime
import json
from typing import Any, Optional

from pydantic import BaseModel, Field, model_validator


class ConversationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


class ConversationUpdate(BaseModel):
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
    model: str = Field(default="gpt-5-chat-latest")


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
        # Exclude SQLAlchemy's metadata attribute to avoid conflicts
        ignored_types = (type,)

    @model_validator(mode="before")
    @classmethod
    def _extract_from_orm(cls, data: Any) -> Any:
        """Extract data from ORM model, avoiding SQLAlchemy's metadata attribute."""
        if hasattr(data, '__dict__'):
            # It's an ORM object, manually extract the fields we need
            extracted = {
                'id': data.id,
                'asset_type': data.asset_type,
                'title': data.title,
                'description': data.description,
                'url': data.url,
                'metadata_json': data.metadata_json,
                'gallery_ids': data.gallery_ids,
                'created_at': data.created_at,
            }
            return extracted
        return data

    @model_validator(mode="after")
    def _populate_metadata(self) -> "GalleryAssetRead":
        # Parse metadata_json into metadata dict
        if self.metadata is None and self.metadata_json:
            try:
                self.metadata = json.loads(self.metadata_json)
            except (ValueError, TypeError):
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


class AgentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    mission: str = Field(..., min_length=1)
    instructions: str = Field(..., min_length=1)
    capabilities: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    workflow: Optional[str] = None


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    mission: Optional[str] = Field(default=None, min_length=1)
    instructions: Optional[str] = Field(default=None, min_length=1)
    capabilities: Optional[list[str]] = None
    tools: Optional[list[str]] = None
    workflow: Optional[str] = None


class AgentRead(AgentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AgentPlan(AgentBase):
    rationale: Optional[str] = None


class AgentBuildRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    context: Optional[str] = None


class AgentBuildResponse(BaseModel):
    plan: AgentPlan
    message: str = Field(default="Generated using OpenAI planning tools")


class WorkspaceWidgetBase(BaseModel):
    widget_type: str = Field(..., min_length=1, max_length=64)
    title: str = Field(..., min_length=1, max_length=255)
    width: float = Field(default=360.0, ge=160.0)
    height: float = Field(default=320.0, ge=160.0)
    position_left: float = Field(default=160.0)
    position_top: float = Field(default=160.0)
    config: Optional[dict[str, Any]] = None


class WorkspaceWidgetCreate(WorkspaceWidgetBase):
    pass


class WorkspaceWidgetUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    width: Optional[float] = Field(default=None, ge=160.0)
    height: Optional[float] = Field(default=None, ge=160.0)
    position_left: Optional[float] = None
    position_top: Optional[float] = None
    config: Optional[dict[str, Any]] = None


class WorkspaceWidgetRead(WorkspaceWidgetBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AudioGenerationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    prompt: str = Field(..., min_length=1)
    style: Optional[str] = Field(default=None, max_length=120)
    voice: Optional[str] = Field(default=None, max_length=120)
    track_type: str = Field(default="music")
    duration_seconds: Optional[int] = Field(default=None, ge=5, le=600)


class AudioTrackRead(BaseModel):
    id: int
    title: str
    description: Optional[str]
    style: Optional[str]
    duration_seconds: Optional[int]
    voice: Optional[str]
    track_type: str
    url: str
    created_at: datetime
    metadata_json: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None

    class Config:
        from_attributes = True
        # Exclude SQLAlchemy's metadata attribute to avoid conflicts
        ignored_types = (type,)

    @model_validator(mode="before")
    @classmethod
    def _extract_from_orm(cls, data: Any) -> Any:
        """Extract data from ORM model, avoiding SQLAlchemy's metadata attribute."""
        if hasattr(data, '__dict__'):
            # It's an ORM object, manually extract the fields we need
            extracted = {
                'id': data.id,
                'title': data.title,
                'description': data.description,
                'style': data.style,
                'duration_seconds': data.duration_seconds,
                'voice': data.voice,
                'track_type': data.track_type,
                'url': data.url,
                'created_at': data.created_at,
                'metadata_json': data.metadata_json,
            }
            return extracted
        return data

    @model_validator(mode="after")
    def _populate_metadata(self) -> "AudioTrackRead":
        # Parse metadata_json into metadata dict
        if self.metadata is None and self.metadata_json:
            try:
                self.metadata = json.loads(self.metadata_json)
            except (ValueError, TypeError):
                self.metadata = None
        return self


class ConversationSummary(BaseModel):
    id: int
    title: str
    message_count: int
    updated_at: datetime


class GalleryAssetSummary(BaseModel):
    id: int
    asset_type: str
    title: str
    description: Optional[str]
    url: str
    created_at: datetime


class AudioTrackSummary(BaseModel):
    id: int
    title: str
    description: Optional[str]
    style: Optional[str]
    duration_seconds: Optional[int]
    voice: Optional[str]
    track_type: str
    url: str
    created_at: datetime


class AgentSummary(BaseModel):
    id: int
    name: str
    mission: str
    capabilities: list[str] = Field(default_factory=list)
    updated_at: datetime


class GallerySummary(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: Optional[str]
    asset_count: int
    updated_at: datetime


class WorkspaceWidgetSummary(BaseModel):
    id: int
    title: str
    widget_type: str
    width: float
    height: float
    config: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


class DataCatalogStats(BaseModel):
    conversations: int
    messages: int
    gallery_assets: int
    galleries: int
    agents: int
    audio_tracks: int
    widgets: int
    code_projects: int
    code_files: int


class DataCatalogResponse(BaseModel):
    stats: DataCatalogStats
    conversations: list[ConversationSummary] = Field(default_factory=list)
    assets: list[GalleryAssetSummary] = Field(default_factory=list)
    audio: list[AudioTrackSummary] = Field(default_factory=list)
    agents: list[AgentSummary] = Field(default_factory=list)
    galleries: list[GallerySummary] = Field(default_factory=list)
    widgets: list[WorkspaceWidgetSummary] = Field(default_factory=list)


class CodeFileBase(BaseModel):
    path: str = Field(..., min_length=1, max_length=512)
    language: Optional[str] = Field(default=None, max_length=64)


class CodeFileCreate(CodeFileBase):
    content: str = Field(default="")


class CodeFileUpdate(BaseModel):
    path: Optional[str] = Field(default=None, min_length=1, max_length=512)
    language: Optional[str] = Field(default=None, max_length=64)
    content: Optional[str] = None


class CodeFileRead(CodeFileBase):
    id: int
    project_id: int
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CodeProjectRead(BaseModel):
    id: int
    name: str
    description: Optional[str]
    file_count: int = Field(default=0)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CodeGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    language: Optional[str] = Field(default=None, max_length=64)
    context: Optional[str] = None
    file_path: Optional[str] = Field(default=None, max_length=512)


class CodeGenerationResponse(BaseModel):
    code: str
    explanation: str
    model: str


class DocumentDraftRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    audience: str = Field(..., min_length=1)
    tone: str = Field(default="pragmatic")
    key_points: list[str] = Field(default_factory=list)


class DocumentSection(BaseModel):
    heading: str
    content: str


class DocumentDraftResponse(BaseModel):
    title: str
    summary: str
    outline: list[str]
    sections: list[DocumentSection]
    call_to_actions: list[str]
    model: str


class PresentationPlanRequest(BaseModel):
    theme: str = Field(..., min_length=1)
    audience: str = Field(..., min_length=1)
    duration_minutes: int = Field(default=15, ge=5, le=120)
    goals: list[str] = Field(default_factory=list)


class PresentationSlide(BaseModel):
    title: str
    bullets: list[str]
    visual: Optional[str] = None


class PresentationPlanResponse(BaseModel):
    headline: str
    slides: list[PresentationSlide]
    next_steps: list[str]
    model: str


class DataVisualizationRequest(BaseModel):
    dataset_description: str = Field(..., min_length=1)
    chart_preference: str = Field(default="bar")
    goal: Optional[str] = None


class DataPoint(BaseModel):
    label: str
    value: float


class DataVisualizationResponse(BaseModel):
    chart_type: str
    dataset: list[DataPoint]
    summary: str
    insights: list[str]
    model: str


class GameConceptRequest(BaseModel):
    fantasy: str = Field(..., min_length=1)
    genre: str = Field(default="strategy")
    pillars: list[str] = Field(default_factory=list)
    platform: Optional[str] = None


class GameConceptResponse(BaseModel):
    elevator_pitch: str
    core_loop: list[str]
    mechanics: list[str]
    progression: list[str]
    monetization: list[str]
    model: str


class AvatarDesignRequest(BaseModel):
    name: str = Field(..., min_length=1)
    style: str = Field(default="illustrated")
    vibe: Optional[str] = None
    palette_hint: Optional[str] = None


class AvatarDesignResponse(BaseModel):
    concept_name: str
    description: str
    palette: list[str]
    accessories: list[str]
    prompt: str
    model: str


class SimulationRunRequest(BaseModel):
    scenario: str = Field(..., min_length=1)
    horizon: str = Field(default="30 days")
    metrics: list[str] = Field(default_factory=list)


class SimulationRunResponse(BaseModel):
    scenario: str
    timeline: list[dict[str, str]]
    metrics: list[dict[str, str]]
    risks: list[str]
    summary: str
    model: str


class WhiteboardSummaryRequest(BaseModel):
    notes: list[dict[str, str]]


class WhiteboardSummaryResponse(BaseModel):
    highlights: list[str]
    clusters: list[dict[str, list[str]]]
    follow_ups: list[str]
    model: str


class KnowledgeBoardRequest(BaseModel):
    theme: str = Field(..., min_length=1)
    objective: str = Field(default="")
    audience: Optional[str] = None


class KnowledgeBoardItem(BaseModel):
    title: str
    summary: str
    link: Optional[str] = None


class KnowledgeBoardColumn(BaseModel):
    title: str
    items: list[KnowledgeBoardItem]


class KnowledgeBoardResponse(BaseModel):
    theme: str
    columns: list[KnowledgeBoardColumn]
    actions: list[str]
    model: str
