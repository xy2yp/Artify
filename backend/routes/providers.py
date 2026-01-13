from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Provider, User
from schemas import ProviderCreate, ProviderUpdate, ProviderResponse
from auth import get_current_user

router = APIRouter(prefix="/api/providers", tags=["渠道配置"])


@router.get("", response_model=List[ProviderResponse])
async def get_providers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取所有渠道配置"""
    providers = db.query(Provider).all()
    return providers


@router.post("", response_model=ProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_provider(
    provider: ProviderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建新渠道"""
    # 检查名称是否重复
    existing = db.query(Provider).filter(Provider.name == provider.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="渠道名称已存在")

    db_provider = Provider(
        name=provider.name,
        type=provider.type,
        host=provider.host,
        api_key=provider.api_key,
        model=provider.model
    )
    db.add(db_provider)
    db.commit()
    db.refresh(db_provider)
    return db_provider


@router.put("/{provider_id}", response_model=ProviderResponse)
async def update_provider(
    provider_id: int,
    provider: ProviderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新渠道配置"""
    db_provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not db_provider:
        raise HTTPException(status_code=404, detail="渠道不存在")

    # 更新非空字段
    update_data = provider.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(db_provider, key, value)

    db.commit()
    db.refresh(db_provider)
    return db_provider


@router.delete("/{provider_id}")
async def delete_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除渠道"""
    db_provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not db_provider:
        raise HTTPException(status_code=404, detail="渠道不存在")

    db.delete(db_provider)
    db.commit()
    return {"message": "删除成功"}


@router.get("/{provider_id}")
async def get_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取单个渠道（内部使用，包含 api_key）"""
    db_provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not db_provider:
        raise HTTPException(status_code=404, detail="渠道不存在")
    return db_provider
