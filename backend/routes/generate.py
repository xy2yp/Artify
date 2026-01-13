import json
import re
import base64
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import AsyncGenerator

from database import get_db
from models import Provider, XHSConfig, User
from schemas import GenerateRequest, XHSGenerateRequest
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["AI代理"])

# HTTP 客户端超时配置
TIMEOUT = httpx.Timeout(300.0, connect=30.0)


async def fetch_image_as_base64(url: str) -> str:
    """下载图片并转换为 base64"""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(url)
        if response.status_code == 200:
            content_type = response.headers.get('content-type', 'image/jpeg')
            mime_type = content_type.split(';')[0].strip()
            b64_data = base64.b64encode(response.content).decode('utf-8')
            return f"data:{mime_type};base64,{b64_data}"
    return None


async def process_openai_response(data: dict) -> dict:
    """
    处理 OpenAI 格式响应，提取文字和图片
    返回统一格式: { text, images: [{ base64, mimeType }] }
    """
    result = {"text": "", "images": []}

    if not data.get("choices") or not data["choices"][0].get("message"):
        return result

    content = data["choices"][0]["message"].get("content", "")

    # 正则提取图片
    # 1. base64 格式: ![...](data:image/...)
    data_url_pattern = r'!\[.*?\]\((data:image/[^)]+)\)'
    # 2. URL 格式: ![...](https://...)
    http_url_pattern = r'!\[.*?\]\((https?://[^)]+)\)'

    # 提取 base64 图片
    for match in re.finditer(data_url_pattern, content):
        data_url = match.group(1)
        # 提取 mime type
        mime_match = re.match(r'data:([^;]+);', data_url)
        mime_type = mime_match.group(1) if mime_match else 'image/jpeg'
        result["images"].append({
            "base64": data_url,
            "mimeType": mime_type
        })

    # 提取 URL 图片并转换为 base64
    for match in re.finditer(http_url_pattern, content):
        url = match.group(1)
        try:
            base64_data = await fetch_image_as_base64(url)
            if base64_data:
                result["images"].append({
                    "base64": base64_data,
                    "mimeType": "image/jpeg"
                })
        except Exception as e:
            print(f"[generate] Failed to fetch image from {url}: {e}")

    # 移除图片标记后的文字
    text = re.sub(data_url_pattern, '', content)
    text = re.sub(http_url_pattern, '', text)
    result["text"] = text.strip()

    return result


def process_gemini_response(data: dict) -> dict:
    """
    处理 Gemini 格式响应，提取文字和图片
    返回统一格式: { text, images: [{ base64, mimeType }] }
    """
    result = {"text": "", "images": []}

    if not data.get("candidates") or not data["candidates"][0].get("content"):
        return result

    parts = data["candidates"][0]["content"].get("parts", [])

    for part in parts:
        # 文字部分
        if "text" in part:
            result["text"] += part["text"]
        # 图片部分 (inline_data)
        if "inline_data" in part:
            inline = part["inline_data"]
            mime_type = inline.get("mime_type", "image/jpeg")
            b64_data = inline.get("data", "")
            # 确保有 data URI 前缀
            if not b64_data.startswith("data:"):
                b64_data = f"data:{mime_type};base64,{b64_data}"
            result["images"].append({
                "base64": b64_data,
                "mimeType": mime_type
            })

    return result


def build_openai_payload(request: GenerateRequest, provider: Provider) -> dict:
    """构建 OpenAI 兼容格式的请求体（支持上下文）"""
    messages = []

    # 添加历史消息（纯文本，不包含图片）
    if request.history_messages:
        for msg in request.history_messages:
            messages.append({
                "role": msg.role,
                "content": [{"type": "text", "text": msg.content}]
            })

    # 构建当前用户消息
    current_content = [{"type": "text", "text": request.prompt or "Generate image"}]

    # 先添加历史图片（上下文图片）
    if request.context_images:
        for img_b64 in request.context_images:
            current_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}
            })

    # 再添加当前图片
    if request.images:
        for img_b64 in request.images:
            current_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}
            })

    messages.append({"role": "user", "content": current_content})

    size_map = {"1K": "1024x1024", "2K": "2048x2048", "4K": "4096x4096"}

    payload = {
        "model": provider.model,
        "messages": messages,
        "stream": request.settings.streaming,
        "size": size_map.get(request.settings.resolution, "1024x1024"),
    }

    if request.settings.aspect_ratio and request.settings.aspect_ratio != "auto":
        payload["aspect_ratio"] = request.settings.aspect_ratio

    return payload


def build_gemini_payload(request: GenerateRequest, provider: Provider) -> dict:
    """构建 Gemini 原生格式的请求体（支持上下文）"""
    contents = []

    # 添加历史消息（纯文本，不包含图片）
    if request.history_messages:
        for msg in request.history_messages:
            # Gemini 使用 'user' 和 'model' 作为 role
            role = "user" if msg.role == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.content}]
            })

    # 构建当前用户消息
    current_parts = [{"text": request.prompt or "Generate image"}]

    # 先添加历史图片（上下文图片）
    if request.context_images:
        for img_b64 in request.context_images:
            current_parts.append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": img_b64
                }
            })

    # 再添加当前图片
    if request.images:
        for img_b64 in request.images:
            current_parts.append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": img_b64
                }
            })

    contents.append({"role": "user", "parts": current_parts})

    generation_config = {
        "responseModalities": ["TEXT", "IMAGE"],
        "imageConfig": {
            "imageSize": request.settings.resolution
        }
    }

    if request.settings.aspect_ratio and request.settings.aspect_ratio != "auto":
        generation_config["imageConfig"]["aspectRatio"] = request.settings.aspect_ratio

    return {
        "contents": contents,
        "generationConfig": generation_config
    }


async def stream_proxy(url: str, headers: dict, payload: dict) -> AsyncGenerator[bytes, None]:
    """流式代理转发"""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            async for chunk in response.aiter_bytes():
                yield chunk


@router.post("/generate")
async def generate(
    request: GenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """AI 图像生成代理"""
    # 获取渠道配置
    provider = db.query(Provider).filter(Provider.id == request.provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="渠道不存在")

    try:
        if provider.type == "openai":
            # OpenAI 兼容格式
            payload = build_openai_payload(request, provider)
            url = f"{provider.host.rstrip('/')}/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {provider.api_key}",
                "Content-Type": "application/json"
            }

            if request.settings.streaming:
                return StreamingResponse(
                    stream_proxy(url, headers, payload),
                    media_type="text/event-stream"
                )
            else:
                async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                    response = await client.post(url, headers=headers, json=payload)
                    if response.status_code != 200:
                        raise HTTPException(
                            status_code=response.status_code,
                            detail=response.text
                        )
                    data = response.json()
                    # 处理响应，统一格式
                    return await process_openai_response(data)

        else:
            # Gemini 原生格式
            payload = build_gemini_payload(request, provider)
            url = f"{provider.host.rstrip('/')}/v1beta/models/{provider.model}:generateContent?key={provider.api_key}"
            headers = {"Content-Type": "application/json"}

            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=response.text
                    )
                data = response.json()
                # 处理响应，统一格式
                return process_gemini_response(data)

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="请求超时")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"请求失败: {str(e)}")


@router.post("/xhs/generate")
async def xhs_generate(
    request: XHSGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """XHS 文案生成代理"""
    # 获取 XHS 配置
    config = db.query(XHSConfig).first()
    if not config or not config.api_key:
        raise HTTPException(status_code=400, detail="请先配置文案生成 API")

    # 构建请求
    content = [{"type": "text", "text": request.system_prompt + "\n\n需求：" + request.topic}]

    if request.images:
        for img_b64 in request.images:
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}
            })

    payload = {
        "model": config.model,
        "stream": False,
        "messages": [{"role": "user", "content": content}]
    }

    url = f"{config.host.rstrip('/')}/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {config.api_key}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=response.text
                )

            data = response.json()

            # 解析 JSON 响应
            content_text = data["choices"][0]["message"]["content"]
            clean_json = content_text.replace("```json", "").replace("```", "").strip()
            outline = json.loads(clean_json)
            outline["id"] = int(import_time() * 1000)

            return outline

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"解析响应失败: {str(e)}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="请求超时")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"请求失败: {str(e)}")


def import_time():
    """获取时间戳"""
    import time
    return time.time()
