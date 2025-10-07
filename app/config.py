"""Configuration helpers for the OpenAI Mega App."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration sourced from environment variables."""

    openai_api_key: Optional[str] = Field(
        default=None, alias="OPENAI_API_KEY", description="OpenAI API key"
    )
    openai_organization: Optional[str] = Field(
        default=None,
        alias="OPENAI_ORG_ID",
        description="Optional OpenAI organization identifier",
    )
    database_url: str = Field(
        default="sqlite:///./mega_app.db",
        alias="DATABASE_URL",
        description="Database connection string",
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""

    return Settings()


BASE_DIR = Path(__file__).resolve().parent
