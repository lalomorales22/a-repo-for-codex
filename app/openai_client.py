"""Wrapper around the OpenAI SDK using the latest responses API."""
from __future__ import annotations

from typing import Any, Iterable

from openai import OpenAI, OpenAIError

from .config import Settings


def _format_history(history: Iterable[dict[str, str]]) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = []
    for item in history:
        role = item["role"]
        content_type = "output_text" if role == "assistant" else "input_text"
        messages.append(
            {
                "role": role,
                "content": [
                    {
                        "type": content_type,
                        "text": item["content"],
                    }
                ],
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

        if getattr(response, "output", None):
            output = response.output[0].content[0].text
        else:
            output_text = getattr(response, "output_text", "")
            if isinstance(output_text, list):
                output = "".join(output_text)
            else:
                output = output_text or ""
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

    def create_video(
        self, prompt: str, *, aspect_ratio: str, duration_seconds: int, quality: str
    ) -> dict[str, Any]:
        """Generate a video storyboard or clip placeholder."""

        if self._client is None:
            orientation = "vertical" if aspect_ratio in {"9:16", "3:4"} else "landscape"
            placeholder_text = prompt.replace(" ", "+")[:80]
            return {
                "url": "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
                "thumbnail_url": f"https://placehold.co/640x360?text={placeholder_text or 'Preview'}",
                "model": "gpt-video-1",  # indicative placeholder
                "orientation": orientation,
                "aspect_ratio": aspect_ratio,
                "duration_seconds": duration_seconds,
                "quality": quality,
                "revised_prompt": prompt,
            }

        # Until the official video endpoint is widely available, fall back to a storyboard
        # using the responses API to synthesize a creative brief. The resulting asset is still
        # treated as a video artifact on the frontend.
        try:
            response = self._client.responses.create(
                model="gpt-5-chat-latest",
                input=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "input_text",
                                "text": (
                                    "Create a cinematic storyboard synopsis for a short video "
                                    f"({duration_seconds}s, {aspect_ratio} ratio, {quality} quality) "
                                    f"with the following prompt: {prompt}"
                                ),
                            }
                        ],
                    }
                ],
            )
        except OpenAIError as exc:  # pragma: no cover - defensive guard
            return {
                "url": "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
                "thumbnail_url": "https://placehold.co/640x360?text=Video+Error",
                "model": "gpt-video-1",
                "orientation": "landscape",
                "aspect_ratio": aspect_ratio,
                "duration_seconds": duration_seconds,
                "quality": quality,
                "revised_prompt": f"{prompt} (error: {exc})",
            }

        if getattr(response, "output", None):
            storyboard = response.output[0].content[0].text
        else:
            storyboard_text = getattr(response, "output_text", "")
            if isinstance(storyboard_text, list):
                storyboard = "".join(storyboard_text) or prompt
            else:
                storyboard = storyboard_text or prompt
        orientation = "vertical" if aspect_ratio in {"9:16", "3:4"} else "landscape"
        return {
            "url": "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
            "thumbnail_url": "https://placehold.co/640x360?text=AI+Storyboard",
            "model": response.model,
            "orientation": orientation,
            "aspect_ratio": aspect_ratio,
            "duration_seconds": duration_seconds,
            "quality": quality,
            "revised_prompt": storyboard,
        }
