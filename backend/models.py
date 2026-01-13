from sqlalchemy import Column, Integer, String, Text, DateTime, CheckConstraint, Boolean
from datetime import datetime
from database import Base


class User(Base):
    """用户表（单用户场景）"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Provider(Base):
    """API 渠道配置表"""
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)  # 'gemini' 或 'openai'
    host = Column(String(500), nullable=False)
    api_key = Column(String(500), nullable=False)
    model = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("type IN ('gemini', 'openai')", name="check_provider_type"),
    )


class XHSConfig(Base):
    """XHS 文案生成 API 配置表"""
    __tablename__ = "xhs_config"

    id = Column(Integer, primary_key=True, index=True)
    host = Column(String(500), nullable=False, default='https://api.openai.com')
    api_key = Column(String(500), nullable=True)
    model = Column(String(100), nullable=False, default='gpt-4o')
    custom_models = Column(Text, nullable=True)  # JSON 数组
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class XHSProvider(Base):
    """XHS 文案API渠道配置表（多渠道支持）"""
    __tablename__ = "xhs_providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    host = Column(String(500), nullable=False, default='https://api.openai.com')
    api_key = Column(String(500), nullable=False)
    model = Column(String(100), nullable=False, default='gpt-4o')
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BananaPrompt(Base):
    """提示词快查数据表"""
    __tablename__ = "banana_prompts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    prompt = Column(Text, nullable=False)
    mode = Column(String(20), default='generate')  # generate/edit
    category = Column(String(50), nullable=True)
    author = Column(String(100), nullable=True)
    link = Column(String(500), nullable=True)
    image = Column(Text, nullable=True)  # Base64格式图片
    image_url = Column(String(500), nullable=True)  # 原始图片URL（作为fallback）
    source = Column(String(20), default='github', index=True)  # github/custom
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("source IN ('github', 'custom')", name="check_banana_source"),
        CheckConstraint("mode IN ('generate', 'edit')", name="check_banana_mode"),
    )


class BananaSyncLog(Base):
    """提示词同步日志表"""
    __tablename__ = "banana_sync_log"

    id = Column(Integer, primary_key=True, index=True)
    synced_at = Column(DateTime, default=datetime.utcnow)
    count = Column(Integer, default=0)  # 同步的提示词数量
    status = Column(String(20), default='pending')  # pending/success/failed
    message = Column(Text, nullable=True)  # 错误信息或详情

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'success', 'failed')", name="check_sync_status"),
    )
