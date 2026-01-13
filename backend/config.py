import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 数据库
    DATABASE_URL: str = "sqlite:///./data/app.db"

    # JWT 认证
    JWT_SECRET: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24 * 7  # 7 天

    # CORS 配置（逗号分隔的域名列表，* 表示允许所有）
    CORS_ORIGINS: str = "*"

    # 管理员账号（首次启动时创建）
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"

    # GitHub代理配置（仅用于GitHub请求，如提示词同步）
    GITHUB_PROXY_HTTP: str = ""
    GITHUB_PROXY_HTTPS: str = ""

    # Banana提示词同步配置
    BANANA_SYNC_ENABLED: bool = True
    BANANA_GITHUB_URL: str = "https://raw.githubusercontent.com/glidea/banana-prompt-quicker/refs/heads/main/prompts.json"

    def get_cors_origins(self) -> List[str]:
        """解析 CORS_ORIGINS 为列表"""
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
