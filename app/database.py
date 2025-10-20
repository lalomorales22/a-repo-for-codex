"""Database utilities for the OpenAI Mega App."""
from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime
from typing import Generator

import json

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)

from .config import get_settings


class Base(DeclarativeBase):
    """Base class for ORM models."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class Conversation(Base):
    """Conversation metadata."""

    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)

    messages: Mapped[list[Message]] = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class Message(Base):
    """Chat message exchanged with OpenAI."""

    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id"))
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(String(128), nullable=True)
    token_usage: Mapped[str] = mapped_column(String(128), nullable=True)

    conversation: Mapped[Conversation] = relationship("Conversation", back_populates="messages")


class GalleryAsset(Base):
    """Generated asset stored in the gallery."""

    __tablename__ = "gallery_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    asset_type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[str] = mapped_column(Text, nullable=True)

    galleries: Mapped[list["Gallery"]] = relationship(
        "Gallery",
        secondary="gallery_asset_links",
        back_populates="assets",
    )

    @property
    def gallery_ids(self) -> list[int]:
        return [gallery.id for gallery in self.galleries]


class Gallery(Base):
    """Curated collection of generated assets."""

    __tablename__ = "galleries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(120), nullable=True)
    accent_color: Mapped[str] = mapped_column(String(16), nullable=True)
    layout: Mapped[str] = mapped_column(String(64), nullable=True)

    assets: Mapped[list[GalleryAsset]] = relationship(
        "GalleryAsset",
        secondary="gallery_asset_links",
        back_populates="galleries",
        order_by="GalleryAsset.created_at.desc()",
    )

    @property
    def asset_count(self) -> int:
        return len(self.assets)


class Agent(Base):
    """Stored automation agent configuration."""

    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    mission: Mapped[str] = mapped_column(Text, nullable=False)
    instructions: Mapped[str] = mapped_column(Text, nullable=False)
    workflow: Mapped[str] = mapped_column(Text, nullable=True)
    capabilities_json: Mapped[str] = mapped_column(Text, nullable=True)
    tools_json: Mapped[str] = mapped_column(Text, nullable=True)

    @property
    def capabilities(self) -> list[str]:
        if not self.capabilities_json:
            return []
        try:
            return json.loads(self.capabilities_json)
        except ValueError:
            return []

    @capabilities.setter
    def capabilities(self, values: list[str]) -> None:
        if values:
            self.capabilities_json = json.dumps(values)
        else:
            self.capabilities_json = None

    @property
    def tools(self) -> list[str]:
        if not self.tools_json:
            return []
        try:
            return json.loads(self.tools_json)
        except ValueError:
            return []

    @tools.setter
    def tools(self, values: list[str]) -> None:
        if values:
            self.tools_json = json.dumps(values)
        else:
            self.tools_json = None


class GalleryAssetLink(Base):
    """Association table between galleries and assets."""

    __tablename__ = "gallery_asset_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    gallery_id: Mapped[int] = mapped_column(ForeignKey("galleries.id", ondelete="CASCADE"))
    asset_id: Mapped[int] = mapped_column(ForeignKey("gallery_assets.id", ondelete="CASCADE"))

    __table_args__ = (UniqueConstraint("gallery_id", "asset_id", name="uq_gallery_asset"),)


class WorkspaceWidget(Base):
    """Widget instance shown on the primary canvas."""

    __tablename__ = "workspace_widgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    widget_type: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    width: Mapped[float] = mapped_column(Float, nullable=False, default=360.0)
    height: Mapped[float] = mapped_column(Float, nullable=False, default=360.0)
    position_left: Mapped[float] = mapped_column(Float, nullable=False, default=160.0)
    position_top: Mapped[float] = mapped_column(Float, nullable=False, default=160.0)
    config_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    @property
    def config(self) -> dict | None:
        if not self.config_json:
            return None
        try:
            return json.loads(self.config_json)
        except ValueError:
            return None

    @config.setter
    def config(self, value: dict | None) -> None:
        if value:
            self.config_json = json.dumps(value)
        else:
            self.config_json = None


class CodeProject(Base):
    """Container representing a logical code workspace."""

    __tablename__ = "code_projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    files: Mapped[list["CodeFile"]] = relationship(
        "CodeFile",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="CodeFile.path",
    )

    @property
    def file_count(self) -> int:
        return len(self.files)


class CodeFile(Base):
    """Individual file tracked within a code project."""

    __tablename__ = "code_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("code_projects.id", ondelete="CASCADE"))
    path: Mapped[str] = mapped_column(String(512), nullable=False)
    language: Mapped[str | None] = mapped_column(String(64), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")

    project: Mapped[CodeProject] = relationship("CodeProject", back_populates="files")

    __table_args__ = (UniqueConstraint("project_id", "path", name="uq_code_file_path"),)


class AudioTrack(Base):
    """Generated audio artifact."""

    __tablename__ = "audio_tracks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    style: Mapped[str | None] = mapped_column(String(120), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    voice: Mapped[str | None] = mapped_column(String(120), nullable=True)
    track_type: Mapped[str] = mapped_column(String(64), nullable=False, default="music")
    url: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)


_settings = get_settings()
engine = create_engine(
    _settings.database_url,
    connect_args={"check_same_thread": False}
    if _settings.database_url.startswith("sqlite")
    else {},
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def init_db() -> None:
    """Create database tables if they do not already exist."""

    Base.metadata.create_all(bind=engine)


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """Provide a transactional scope around a series of operations."""

    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
