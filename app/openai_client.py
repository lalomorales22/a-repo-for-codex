"""Wrapper around the OpenAI SDK using the latest responses API."""
from __future__ import annotations

from typing import Any, Iterable

from openai import OpenAI, OpenAIError

from .config import Settings


def _format_history(history: Iterable[dict[str, str]]) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = []
    for item in history:
        messages.append(
            {
                "role": item["role"],
                "content": [{"type": "text", "text": item["content"]}],
            }
        )
    return messages


class OpenAIMegaClient:
    """Thin wrapper that uses the latest OpenAI responses API endpoints."""

    def __init__(self, settings: Settings):
        self._settings = settings
        if settings.openai_api_key:
            self._client = OpenAI(
                api_key=settings.openai_api_key,
                organization=settings.openai_organization,
            )
        else:
            self._client = None

    def chat(self, history: Iterable[dict[str, str]], *, model: str) -> dict[str, Any]:
        """Call the Responses API to generate chat completions."""

        if self._client is None:
            return {
                "role": "assistant",
                "content": "Configure OPENAI_API_KEY to stream live responses.",
                "model": model,
                "usage": {},
            }

        try:
            response = self._client.responses.create(
                model=model,
                input=_format_history(history),
            )
        except OpenAIError as exc:  # pragma: no cover - best effort guard
            return {
                "role": "assistant",
                "content": f"OpenAI API error: {exc}",
                "model": model,
                "usage": {},
            }

        output = response.output[0].content[0].text if response.output else ""
        usage = response.usage or {}
        return {
            "role": "assistant",
            "content": output,
            "model": response.model,
            "usage": usage,
        }

    def create_image(self, prompt: str, *, size: str, quality: str) -> dict[str, Any]:
        """Generate an image using the Images API."""

        if self._client is None:
            return {
                "url": "https://placehold.co/600x600?text=Configure+OPENAI_API_KEY",
                "revised_prompt": prompt,
                "model": "gpt-image-1",
            }

        try:
            result = self._client.images.generate(
                model="gpt-image-1", prompt=prompt, size=size, quality=quality
            )
        except OpenAIError as exc:  # pragma: no cover - best effort guard
            return {
                "url": f"https://placehold.co/600x600?text=OpenAI+API+error",
                "revised_prompt": f"{prompt} (error: {exc})",
                "model": "gpt-image-1",
            }

        data = result.data[0]
        return {
            "url": data.url,
            "revised_prompt": getattr(data, "revised_prompt", prompt),
            "model": "gpt-image-1",
        }
