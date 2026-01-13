"""
Banana提示词API路由
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
import httpx

from database import get_db
from models import BananaPrompt
from schemas import (
    BananaPromptCreate,
    BananaPromptUpdate,
    BananaPromptResponse,
    BananaSyncStatusResponse,
    BananaSyncResponse,
    BananaImageUpdate
)
from services.banana_sync import banana_sync_service
from auth import get_current_user

router = APIRouter(prefix="/api/banana", tags=["banana"])


@router.get("/prompts", response_model=List[BananaPromptResponse])
async def get_prompts(
    source: str = None,
    db: Session = Depends(get_db)
):
    """
    获取所有提示词

    Args:
        source: 可选过滤，'github' 或 'custom'
    """
    query = db.query(BananaPrompt)

    if source:
        query = query.filter(BananaPrompt.source == source)

    # 按 ID 正序，保持与 JSON 原始顺序一致
    return query.order_by(BananaPrompt.id.asc()).all()


@router.get("/prompts/{prompt_id}", response_model=BananaPromptResponse)
async def get_prompt(
    prompt_id: int,
    db: Session = Depends(get_db)
):
    """获取单个提示词"""
    prompt = db.query(BananaPrompt).filter(BananaPrompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="提示词不存在")
    return prompt


@router.post("/prompts", response_model=BananaPromptResponse)
async def create_prompt(
    data: BananaPromptCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    创建自定义提示词

    需要登录认证
    """
    # 如果没有指定作者，使用当前用户
    author = data.author if data.author else current_user

    prompt = BananaPrompt(
        title=data.title,
        prompt=data.prompt,
        mode=data.mode,
        category=data.category,
        author=author,
        link=data.link,
        image=data.image,
        source="custom"  # 用户创建的都是custom
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


@router.put("/prompts/{prompt_id}", response_model=BananaPromptResponse)
async def update_prompt(
    prompt_id: int,
    data: BananaPromptUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    更新自定义提示词

    仅允许更新 source='custom' 的提示词
    """
    prompt = db.query(BananaPrompt).filter(BananaPrompt.id == prompt_id).first()

    if not prompt:
        raise HTTPException(status_code=404, detail="提示词不存在")

    if prompt.source != "custom":
        raise HTTPException(status_code=403, detail="只能编辑自定义提示词")

    # 更新字段
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prompt, key, value)

    db.commit()
    db.refresh(prompt)
    return prompt


@router.patch("/prompts/{prompt_id}/image")
async def update_prompt_image(
    prompt_id: int,
    data: BananaImageUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    更新提示词图片（前端补图专用）

    无 source 限制，允许为任意提示词补充图片
    需要登录认证
    """
    prompt = db.query(BananaPrompt).filter(BananaPrompt.id == prompt_id).first()

    if not prompt:
        raise HTTPException(status_code=404, detail="提示词不存在")

    prompt.image = data.image
    db.commit()

    return {"success": True, "message": "图片已更新"}


@router.delete("/prompts/{prompt_id}")
async def delete_prompt(
    prompt_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    删除自定义提示词

    仅允许删除 source='custom' 的提示词
    """
    prompt = db.query(BananaPrompt).filter(BananaPrompt.id == prompt_id).first()

    if not prompt:
        raise HTTPException(status_code=404, detail="提示词不存在")

    if prompt.source != "custom":
        raise HTTPException(status_code=403, detail="只能删除自定义提示词")

    db.delete(prompt)
    db.commit()

    return {"success": True, "message": "删除成功"}


@router.post("/sync", response_model=BananaSyncResponse)
async def sync_prompts(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    手动触发GitHub同步

    需要登录认证
    """
    result = await banana_sync_service.sync(db)
    return BananaSyncResponse(**result)


@router.get("/sync/status", response_model=BananaSyncStatusResponse)
async def get_sync_status(
    db: Session = Depends(get_db)
):
    """获取最近一次同步状态"""
    status = banana_sync_service.get_latest_sync_status(db)

    if not status:
        raise HTTPException(status_code=404, detail="暂无同步记录")

    return status
