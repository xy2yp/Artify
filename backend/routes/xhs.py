import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import XHSConfig, User
from schemas import XHSConfigUpdate, XHSConfigResponse
from auth import get_current_user

router = APIRouter(prefix="/api/xhs-config", tags=["XHS配置"])


def get_or_create_config(db: Session) -> XHSConfig:
    """获取或创建 XHS 配置（单例模式）"""
    config = db.query(XHSConfig).first()
    if not config:
        config = XHSConfig(
            host='https://api.openai.com',
            model='gpt-4o'
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.get("", response_model=XHSConfigResponse)
async def get_xhs_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取 XHS API 配置"""
    config = get_or_create_config(db)

    # 解析 custom_models JSON
    custom_models = []
    if config.custom_models:
        try:
            custom_models = json.loads(config.custom_models)
        except:
            pass

    return XHSConfigResponse(
        host=config.host,
        model=config.model,
        custom_models=custom_models,
        has_key=bool(config.api_key)
    )


@router.put("", response_model=XHSConfigResponse)
async def update_xhs_config(
    update: XHSConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新 XHS API 配置"""
    config = get_or_create_config(db)

    if update.host is not None:
        config.host = update.host
    if update.api_key is not None:
        config.api_key = update.api_key
    if update.model is not None:
        config.model = update.model
    if update.custom_models is not None:
        config.custom_models = json.dumps(update.custom_models)

    db.commit()
    db.refresh(config)

    # 解析 custom_models JSON
    custom_models = []
    if config.custom_models:
        try:
            custom_models = json.loads(config.custom_models)
        except:
            pass

    return XHSConfigResponse(
        host=config.host,
        model=config.model,
        custom_models=custom_models,
        has_key=bool(config.api_key)
    )
