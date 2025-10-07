"""Database utilities for the OpenAI Mega App."""
from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime
from typing import Generator

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

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
