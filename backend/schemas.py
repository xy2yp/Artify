from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ===== 认证相关 =====
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    token: str
    token_type: str = "bearer"


# ===== 渠道配置相关 =====
class ProviderBase(BaseModel):
    name: str
    type: str  # 'gemini' 或 'openai'
    host: str
    model: str


class ProviderCreate(ProviderBase):
    api_key: str


class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    host: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None


class ProviderResponse(ProviderBase):
    id: int
    created_at: datetime
    # 注意：不返回 api_key

    class Config:
        from_attributes = True


class ProviderWithKey(ProviderBase):
    """内部使用，包含 api_key"""
    id: int
    api_key: str

    class Config:
        from_attributes = True


# ===== XHS 配置相关 =====
class XHSConfigBase(BaseModel):
    host: str = 'https://api.openai.com'
    model: str = 'gpt-4o'
    custom_models: Optional[List[str]] = None


class XHSConfigUpdate(BaseModel):
    host: Optional[str] = None
    api_key: Optional[str] = None  # 只有修改时才传
    model: Optional[str] = None
    custom_models: Optional[List[str]] = None


class XHSConfigResponse(XHSConfigBase):
    has_key: bool = False  # 是否已配置 API Key

    class Config:
        from_attributes = True


# ===== AI 生成相关 =====
class GenerateSettings(BaseModel):
    resolution: str = "1K"  # "1K", "2K", "4K"
    aspect_ratio: str = "auto"
    streaming: bool = False


class HistoryMessage(BaseModel):
    """历史消息结构"""
    role: str  # 'user' 或 'assistant'
    content: str


class GenerateRequest(BaseModel):
    provider_id: int
    prompt: Optional[str] = None
    images: Optional[List[str]] = None  # base64 编码的图片
    history_messages: Optional[List[HistoryMessage]] = None  # 历史消息（用于上下文）
    context_images: Optional[List[str]] = None  # 历史图片（base64编码，统一放在当前消息中发送）
    settings: GenerateSettings = GenerateSettings()


class XHSGenerateRequest(BaseModel):
    topic: str
    images: Optional[List[str]] = None  # base64 编码的图片
    image_count: int = 4
    system_prompt: str
    provider_id: Optional[int] = None  # 可选，指定使用的XHS渠道


# ===== XHS Provider 多渠道配置 =====
class XHSProviderBase(BaseModel):
    name: str
    host: str = 'https://api.openai.com'
    model: str = 'gpt-4o'


class XHSProviderCreate(XHSProviderBase):
    api_key: str


class XHSProviderUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    is_active: Optional[bool] = None


class XHSProviderResponse(XHSProviderBase):
    id: int
    is_active: bool
    created_at: datetime
    # 注意：不返回 api_key

    class Config:
        from_attributes = True


class XHSProviderWithKey(XHSProviderBase):
    """内部使用，包含 api_key"""
    id: int
    api_key: str
    is_active: bool

    class Config:
        from_attributes = True


# ===== Banana 提示词相关 =====
class BananaPromptBase(BaseModel):
    title: str
    prompt: str
    mode: str = 'generate'  # generate/edit
    category: Optional[str] = None
    author: Optional[str] = None
    link: Optional[str] = None
    image: Optional[str] = None  # Base64格式图片
    image_url: Optional[str] = None  # 原始图片URL（作为fallback）


class BananaPromptCreate(BananaPromptBase):
    pass


class BananaPromptUpdate(BaseModel):
    title: Optional[str] = None
    prompt: Optional[str] = None
    mode: Optional[str] = None
    category: Optional[str] = None
    author: Optional[str] = None
    link: Optional[str] = None
    image: Optional[str] = None
    image_url: Optional[str] = None


class BananaPromptResponse(BananaPromptBase):
    id: int
    source: str
    created_at: datetime

    class Config:
        from_attributes = True


class BananaSyncStatusResponse(BaseModel):
    id: int
    synced_at: datetime
    count: int
    status: str
    message: Optional[str] = None

    class Config:
        from_attributes = True


class BananaSyncResponse(BaseModel):
    success: bool
    message: str
    count: int = 0


class BananaImageUpdate(BaseModel):
    """用于前端补图上传"""
    image: str  # Base64格式图片
