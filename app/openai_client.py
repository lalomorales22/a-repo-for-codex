"""Wrapper around the OpenAI SDK using the latest responses API."""
from __future__ import annotations

import json
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
                "url": "https://placehold.co/600x600?text=OpenAI+API+error",
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

    def plan_agent(self, prompt: str) -> dict[str, Any]:
        """Create an agent blueprint by prompting the Responses API."""

        baseline = {
            "name": "Product Ops Companion",
            "mission": "Automate product rituals and prepare stakeholder-ready briefs.",
            "instructions": (
                "You are a meticulous product operations agent. Structure updates, uncover risks, "
                "and surface next steps with crisp, executive-ready language."
            ),
            "capabilities": [
                "Summarise research, feedback, and roadmap updates",
                "Highlight blockers across engineering, design, and GTM",
                "Draft follow-up actions with owners and deadlines",
            ],
            "tools": [
                "Notion knowledge base",
                "Jira issue tracker",
                "Calendar availability API",
            ],
            "workflow": (
                "1. Gather the latest notes, tickets, and KPIs.\n"
                "2. Generate a concise update tailored to the audience.\n"
                "3. Suggest actions, owners, and timelines.\n"
                "4. Log decisions back to the workspace for traceability."
            ),
            "rationale": (
                "Designed as a baseline response when the OpenAI API isn't configured."
            ),
        }

        if self._client is None:
            return baseline

        instructions = (
            "You are an expert OpenAI agent architect. Given a product or operations brief, "
            "design an autonomous agent. Respond strictly as minified JSON with the keys "
            "name, mission, instructions, capabilities (array of strings), tools (array of strings), "
            "workflow (string) and rationale (string). Ensure arrays are concise."
        )

        try:
            response = self._client.responses.create(
                model="gpt-5-chat-latest",
                input=[
                    {
                        "role": "system",
                        "content": [{"type": "input_text", "text": instructions}],
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "input_text",
                                "text": prompt,
                            }
                        ],
                    },
                ],
            )
        except OpenAIError:
            return baseline

        output_text = ""
        if getattr(response, "output", None):
            output_text = response.output[0].content[0].text
        else:
            raw = getattr(response, "output_text", "")
            if isinstance(raw, list):
                output_text = "".join(raw)
            else:
                output_text = raw or ""

        try:
            parsed = json.loads(output_text)
            if isinstance(parsed, dict):
                capabilities = parsed.get("capabilities")
                if isinstance(capabilities, list):
                    capabilities_list = [
                        str(item).strip() for item in capabilities if str(item).strip()
                    ]
                else:
                    capabilities_list = baseline["capabilities"]

                tools = parsed.get("tools")
                if isinstance(tools, list):
                    tools_list = [str(item).strip() for item in tools if str(item).strip()]
                else:
                    tools_list = baseline["tools"]

                workflow = parsed.get("workflow")
                workflow_text = workflow.strip() if isinstance(workflow, str) else None
                rationale = parsed.get("rationale")
                rationale_text = rationale.strip() if isinstance(rationale, str) else None

                return {
                    "name": (parsed.get("name") or baseline["name"]).strip(),
                    "mission": (parsed.get("mission") or baseline["mission"]).strip(),
                    "instructions": (
                        parsed.get("instructions") or baseline["instructions"]
                    ).strip(),
                    "capabilities": capabilities_list or baseline["capabilities"],
                    "tools": tools_list or baseline["tools"],
                    "workflow": workflow_text or baseline["workflow"],
                    "rationale": rationale_text or baseline["rationale"],
                }
        except (TypeError, ValueError):
            pass

        return baseline
