import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from database import init_db, SessionLocal
from auth import init_admin_user
from routes import auth, providers, xhs, generate, xhs_providers, banana
from services.banana_sync import sync_from_github
from config import settings

logger = logging.getLogger(__name__)


# 过滤成功的健康检查日志，保留异常情况
class HealthCheckFilter(logging.Filter):
    def filter(self, record):
        message = record.getMessage()
        # 只屏蔽 200 成功的健康检查，保留异常日志
        return not ("/health" in message and "200" in message)


logging.getLogger("uvicorn.access").addFilter(HealthCheckFilter())

# 创建调度器
scheduler = AsyncIOScheduler()


async def scheduled_banana_sync():
    """定时同步Banana提示词"""
    logger.info("[Scheduler] 开始执行定时Banana提示词同步...")
    try:
        result = await sync_from_github()
        logger.info(f"[Scheduler] 定时同步完成: {result}")
    except Exception as e:
        logger.error(f"[Scheduler] 定时同步失败: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动和关闭时的生命周期管理"""
    # 启动时初始化
    print("[Startup] 初始化数据库...")
    init_db()

    # 创建管理员用户
    db = SessionLocal()
    try:
        init_admin_user(db)
    finally:
        db.close()

    # 设置定时任务 - 每天凌晨3点同步
    if settings.BANANA_SYNC_ENABLED:
        scheduler.add_job(
            scheduled_banana_sync,
            CronTrigger(hour=3, minute=0),
            id="banana_sync",
            replace_existing=True
        )
        scheduler.start()
        print("[Startup] Banana提示词定时同步任务已启动 (每天3:00)")

        # 启动时异步执行首次同步
        asyncio.create_task(scheduled_banana_sync())
        print("[Startup] 首次Banana提示词同步已触发")

    print("[Startup] 应用启动完成")
    yield
    # 关闭时清理
    if scheduler.running:
        scheduler.shutdown()
    print("[Shutdown] 应用关闭")


app = FastAPI(
    title="Artify · 智绘工作台 API",
    description="Artify · 智绘工作台后端 API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 配置（通过环境变量 CORS_ORIGINS 设置，逗号分隔多个域名，* 表示允许所有）
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gzip 压缩（响应体超过 500 字节时自动压缩）
app.add_middleware(GZipMiddleware, minimum_size=500)

# 注册路由
app.include_router(auth.router)
app.include_router(providers.router)
app.include_router(xhs.router)
app.include_router(xhs_providers.router)
app.include_router(generate.router)
app.include_router(banana.router)


@app.get("/")
async def root():
    """健康检查"""
    return {"status": "ok", "message": "Artify · 智绘工作台 API"}


@app.get("/health")
async def health():
    """健康检查端点"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("🚀 启动 Artify · 智绘工作台 API")
    print("=" * 60)
    print("📍 服务地址: http://localhost:8000")
    print("📖 API文档: http://localhost:8000/docs")
    print("=" * 60)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
