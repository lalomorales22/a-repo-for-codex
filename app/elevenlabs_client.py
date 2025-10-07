"""Minimal ElevenLabs API helper."""
from __future__ import annotations

from typing import Any, Dict, Optional

import httpx

from .config import Settings


class ElevenLabsClient:
    """Lightweight client for the ElevenLabs Text-to-Speech API."""

    BASE_URL = "https://api.elevenlabs.io/v1"

    def __init__(self, settings: Settings):
        self._api_key = settings.elevenlabs_api_key

    def _headers(self) -> Dict[str, str]:
        headers = {"Accept": "application/json"}
        if self._api_key:
            headers["xi-api-key"] = self._api_key
        return headers

    def generate_audio(
        self,
        prompt: str,
        *,
        title: str,
        voice: Optional[str] = None,
        style: Optional[str] = None,
        track_type: str = "music",
        duration_seconds: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generate an audio track or return a mocked placeholder."""

        if not self._api_key:
            return {
                "url": "https://cdn.pixabay.com/download/audio/2022/10/25/audio_5c3c7e90f3.mp3",  # noqa: E501
                "model": "mock-elevenlabs",
                "voice": voice or "placeholder",
                "style": style or "inspiration",
                "track_type": track_type,
                "duration_seconds": duration_seconds or 30,
                "description": f"Preview for '{title}' — configure ELEVENLABS_API_KEY for live audio.",
            }

        payload: Dict[str, Any] = {
            "text": prompt,
            "model_id": "eleven_multilingual_v2",
        }
        if voice:
            payload["voice_settings"] = {"voice_id": voice}
        if style:
            payload.setdefault("voice_settings", {})["style"] = style  # type: ignore[index]
        if duration_seconds:
            payload["duration_seconds"] = duration_seconds

        voice_id = voice or "pNInz6obpgDQGcFmaJgB"
        url = f"{self.BASE_URL}/text-to-speech/{voice_id}"

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, headers=self._headers(), json=payload)
                response.raise_for_status()
        except httpx.HTTPError as exc:  # pragma: no cover - external dependency
            return {
                "url": "https://cdn.pixabay.com/download/audio/2022/10/25/audio_5c3c7e90f3.mp3",
                "model": "elevenlabs",  # placeholder identifier
                "voice": voice_id,
                "style": style,
                "track_type": track_type,
                "duration_seconds": duration_seconds or 30,
                "description": f"Failed to call ElevenLabs: {exc}",
            }

        audio_url = response.headers.get("Location")
        if not audio_url:
            audio_url = "https://cdn.pixabay.com/download/audio/2022/10/25/audio_5c3c7e90f3.mp3"

        return {
            "url": audio_url,
            "model": "elevenlabs",
            "voice": voice_id,
            "style": style,
            "track_type": track_type,
            "duration_seconds": duration_seconds,
            "description": f"Generated with ElevenLabs voice {voice_id}",
        }
