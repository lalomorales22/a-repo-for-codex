"""Wrapper around the OpenAI SDK using the latest responses API."""
from __future__ import annotations

import json
import logging
import time
from typing import Any, Iterable

import httpx
from openai import OpenAI, OpenAIError

from .config import Settings

logger = logging.getLogger(__name__)


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
        """Generate an image using the Images API with gpt-image-1."""

        if self._client is None:
            return {
                "url": "https://placehold.co/600x600?text=Configure+OPENAI_API_KEY",
                "revised_prompt": prompt,
                "model": "gpt-image-1",
            }

        # gpt-image-1 supports: 1024x1024, 1536x1024 (landscape), 1024x1536 (portrait), or auto
        # Map common sizes to gpt-image-1 supported sizes
        size_mapping = {
            "256x256": "1024x1024",
            "512x512": "1024x1024",
            "1024x1024": "1024x1024",
            "1536x1024": "1536x1024",
            "1024x1536": "1024x1536",
            "1792x1024": "1536x1024",  # Map to closest supported size
            "1024x1792": "1024x1536",  # Map to closest supported size
        }
        
        gpt_image_size = size_mapping.get(size, "auto")
        
        # gpt-image-1 supports: high, medium, low, or auto
        quality_mapping = {
            "high": "high",
            "hd": "high",
            "medium": "medium",
            "standard": "medium",
            "low": "low",
        }
        gpt_image_quality = quality_mapping.get(quality, "auto")

        try:
            # Use gpt-image-1 which returns base64-encoded images
            result = self._client.images.generate(
                model="gpt-image-1",
                prompt=prompt,
                size=gpt_image_size,
                quality=gpt_image_quality,
                n=1,
                output_format="png",
            )
        except OpenAIError as exc:  # pragma: no cover - best effort guard
            return {
                "url": "https://placehold.co/600x600?text=OpenAI+API+error",
                "revised_prompt": f"{prompt} (error: {exc})",
                "model": "gpt-image-1",
            }

        data = result.data[0]
        # gpt-image-1 returns b64_json, convert to data URL
        if hasattr(data, "b64_json") and data.b64_json:
            image_url = f"data:image/png;base64,{data.b64_json}"
        else:
            # Fallback to url if available
            image_url = getattr(data, "url", "https://placehold.co/600x600?text=No+Image+Data")
        
        return {
            "url": image_url,
            "revised_prompt": getattr(data, "revised_prompt", prompt),
            "model": "gpt-image-1",
        }

    def create_video(
        self, prompt: str, *, aspect_ratio: str, duration_seconds: int, quality: str
    ) -> dict[str, Any]:
        """Generate a video using the OpenAI Sora video generation API.
        
        This uses the real /videos endpoint which is an asynchronous process:
        1. POST /videos to start a render job
        2. GET /videos/{video_id} to poll for completion status
        3. GET /videos/{video_id}/content to fetch the final MP4
        """

        if self._client is None:
            orientation = "vertical" if aspect_ratio in {"9:16", "3:4"} else "landscape"
            placeholder_text = prompt.replace(" ", "+")[:80]
            return {
                "url": "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
                "thumbnail_url": f"https://placehold.co/640x360?text={placeholder_text or 'Preview'}",
                "model": "video-placeholder",
                "orientation": orientation,
                "aspect_ratio": aspect_ratio,
                "duration_seconds": duration_seconds,
                "quality": quality,
                "revised_prompt": prompt,
            }

        # Map aspect ratio to video size (sora-2 supports various sizes)
        size_mapping = {
            "16:9": "1280x720",    # landscape
            "9:16": "720x1280",    # portrait
            "1:1": "1024x1024",    # square
            "4:3": "1024x768",     # standard
            "3:4": "768x1024",     # portrait standard
        }
        video_size = size_mapping.get(aspect_ratio, "1280x720")
        
        # Sora-2 only supports specific durations: 4, 8, or 12 seconds
        # Map the requested duration to the nearest supported value
        if duration_seconds <= 4:
            video_seconds = "4"
        elif duration_seconds <= 8:
            video_seconds = "8"
        else:
            video_seconds = "12"

        try:
            # Start a video render job using the Videos API
            
            headers = {
                "Authorization": f"Bearer {self._settings.openai_api_key}",
                "Content-Type": "application/json",
            }
            
            # Start the render job with JSON payload
            response = httpx.post(
                "https://api.openai.com/v1/videos",
                headers=headers,
                json={
                    "prompt": prompt,
                    "model": "sora-2",
                    "size": video_size,
                    "seconds": video_seconds,
                },
                timeout=30.0,
            )
            response.raise_for_status()
            job_data = response.json()
            
            video_id = job_data.get("id")
            if not video_id:
                raise ValueError("No video ID returned from API")
            
            # Poll for completion (with timeout)
            max_attempts = 60  # 60 attempts = ~5 minutes with 5s intervals
            attempt = 0
            
            while attempt < max_attempts:
                status_response = httpx.get(
                    f"https://api.openai.com/v1/videos/{video_id}",
                    headers=headers,
                    timeout=30.0,
                )
                status_response.raise_for_status()
                status_data = status_response.json()
                
                status = status_data.get("status")
                
                if status == "completed":
                    # Fetch the final video content URL
                    content_url = f"https://api.openai.com/v1/videos/{video_id}/content"
                    
                    orientation = "vertical" if aspect_ratio in {"9:16", "3:4"} else "landscape"
                    
                    return {
                        "url": content_url,
                        "thumbnail_url": status_data.get("thumbnail_url", "https://placehold.co/640x360?text=Video+Ready"),
                        "model": "sora-2",
                        "orientation": orientation,
                        "aspect_ratio": aspect_ratio,
                        "duration_seconds": int(video_seconds),  # Convert back to int
                        "quality": quality,
                        "revised_prompt": status_data.get("revised_prompt", prompt),
                        "video_id": video_id,
                    }
                elif status == "failed":
                    error_msg = status_data.get("error", "Unknown error")
                    raise ValueError(f"Video generation failed: {error_msg}")
                
                # Still processing, wait before polling again
                time.sleep(5)
                attempt += 1
            
            # Timeout - return partial result
            orientation = "vertical" if aspect_ratio in {"9:16", "3:4"} else "landscape"
            return {
                "url": f"https://api.openai.com/v1/videos/{video_id}/content",
                "thumbnail_url": "https://placehold.co/640x360?text=Processing",
                "model": "sora-2",
                "orientation": orientation,
                "aspect_ratio": aspect_ratio,
                "duration_seconds": int(video_seconds),  # Convert back to int
                "quality": quality,
                "revised_prompt": prompt,
                "video_id": video_id,
                "status": "processing",
            }
            
        except Exception as exc:  # pragma: no cover - defensive guard
            # Log the actual error for debugging
            logger.error(f"Video generation failed: {type(exc).__name__}: {exc}")
            
            orientation = "vertical" if aspect_ratio in {"9:16", "3:4"} else "landscape"
            
            # Check if it's an HTTP error with status code
            error_detail = str(exc)
            if hasattr(exc, 'response'):
                try:
                    error_detail = f"HTTP {exc.response.status_code}: {exc.response.text[:200]}"
                except:
                    pass
            
            return {
                "url": "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
                "thumbnail_url": f"https://placehold.co/640x360?text=API+Error",
                "model": "sora-2-fallback",
                "orientation": orientation,
                "aspect_ratio": aspect_ratio,
                "duration_seconds": int(video_seconds) if isinstance(video_seconds, str) else duration_seconds,
                "quality": quality,
                "revised_prompt": f"{prompt} (API Error: {error_detail})",
                "error": error_detail,
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
