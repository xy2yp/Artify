from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import XHSProvider, User
from schemas import XHSProviderCreate, XHSProviderUpdate, XHSProviderResponse
from auth import get_current_user

router = APIRouter(prefix="/api/xhs-providers", tags=["文案API管理"])


@router.get("", response_model=List[XHSProviderResponse])
async def get_xhs_providers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取所有XHS渠道配置"""
    providers = db.query(XHSProvider).all()
    return providers


@router.post("", response_model=XHSProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_xhs_provider(
    provider: XHSProviderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建新XHS渠道"""
    # 检查名称是否重复
    existing = db.query(XHSProvider).filter(XHSProvider.name == provider.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="渠道名称已存在")

    db_provider = XHSProvider(
        name=provider.name,
        host=provider.host,
        api_key=provider.api_key,
        model=provider.model
    )
    db.add(db_provider)
    db.commit()
    db.refresh(db_provider)
    return db_provider


@router.put("/{provider_id}", response_model=XHSProviderResponse)
async def update_xhs_provider(
    provider_id: int,
    provider: XHSProviderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新XHS渠道配置"""
    db_provider = db.query(XHSProvider).filter(XHSProvider.id == provider_id).first()
    if not db_provider:
        raise HTTPException(status_code=404, detail="渠道不存在")

    # 检查名称是否与其他渠道重复
    if provider.name:
        existing = db.query(XHSProvider).filter(
            XHSProvider.name == provider.name,
            XHSProvider.id != provider_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="渠道名称已存在")

    # 更新非空字段
    update_data = provider.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(db_provider, key, value)

    db.commit()
    db.refresh(db_provider)
    return db_provider


@router.delete("/{provider_id}")
async def delete_xhs_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除XHS渠道"""
    db_provider = db.query(XHSProvider).filter(XHSProvider.id == provider_id).first()
    if not db_provider:
        raise HTTPException(status_code=404, detail="渠道不存在")

    db.delete(db_provider)
    db.commit()
    return {"message": "删除成功"}


@router.get("/{provider_id}")
async def get_xhs_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取单个XHS渠道（内部使用，包含 api_key）"""
    db_provider = db.query(XHSProvider).filter(XHSProvider.id == provider_id).first()
    if not db_provider:
        raise HTTPException(status_code=404, detail="渠道不存在")
    return db_provider
