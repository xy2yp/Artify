"""
Banana提示词同步服务
从GitHub同步提示词数据到本地数据库
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List

import httpx
from sqlalchemy.orm import Session

from config import settings
from models import BananaPrompt, BananaSyncLog
from database import SessionLocal

logger = logging.getLogger(__name__)


class BananaSyncService:
    """Banana提示词同步服务"""

    def __init__(self):
        self.github_url = settings.BANANA_GITHUB_URL
        self.max_retries = 3
        self.base_delay = 1  # 基础延迟（秒）
        # 基础请求头
        self.base_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Sec-Ch-Ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "image",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "cross-site",
        }

    def _get_proxy_config(self) -> Optional[Dict[str, str]]:
        """获取代理配置"""
        if settings.GITHUB_PROXY_HTTP or settings.GITHUB_PROXY_HTTPS:
            proxies = {}
            if settings.GITHUB_PROXY_HTTP:
                proxies["http://"] = settings.GITHUB_PROXY_HTTP
            if settings.GITHUB_PROXY_HTTPS:
                proxies["https://"] = settings.GITHUB_PROXY_HTTPS
            return proxies
        return None

    async def _download_with_retry(
        self,
        url: str,
        use_proxy: bool = True,
        timeout: float = 60.0
    ) -> Optional[bytes]:
        """
        带指数退避重试的下载

        Args:
            url: 下载URL
            use_proxy: 是否使用代理
            timeout: 超时时间

        Returns:
            下载的字节数据，失败返回None
        """
        proxies = self._get_proxy_config() if use_proxy else None

        for attempt in range(self.max_retries):
            try:
                # 构建完整的请求头
                request_headers = self.base_headers.copy()

                # 根据不同网站设置特定的请求头
                if "linux.do" in url:
                    request_headers["Referer"] = "https://linux.do/"
                    request_headers["Origin"] = "https://linux.do"
                    request_headers["Sec-Fetch-Site"] = "same-origin"
                elif "github" in url or "githubusercontent" in url:
                    request_headers["Referer"] = "https://github.com/"
                elif "jsdelivr" in url:
                    request_headers["Referer"] = "https://github.com/"

                async with httpx.AsyncClient(
                    proxies=proxies,
                    timeout=httpx.Timeout(timeout, connect=30.0),
                    follow_redirects=True,
                    headers=request_headers
                ) as client:
                    response = await client.get(url)
                    response.raise_for_status()
                    return response.content
            except Exception as e:
                delay = self.base_delay * (2 ** attempt)  # 指数退避
                logger.warning(
                    f"下载失败 (尝试 {attempt + 1}/{self.max_retries}), "
                    f"URL: {url}, 代理: {use_proxy}, 错误: {type(e).__name__}: {e}, "
                    f"等待 {delay}s 后重试"
                )
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(delay)

        return None

    async def _fetch_github_data(self) -> Optional[List[Dict[str, Any]]]:
        """从GitHub获取提示词JSON数据"""
        logger.info(f"开始从GitHub获取数据: {self.github_url}")

        # 尝试使用代理
        content = await self._download_with_retry(self.github_url, use_proxy=True)

        # 如果代理失败，尝试直连
        if content is None and self._get_proxy_config():
            logger.info("代理获取失败，尝试直连")
            content = await self._download_with_retry(self.github_url, use_proxy=False)

        if content:
            import json
            try:
                data = json.loads(content.decode("utf-8"))
                logger.info(f"成功获取 {len(data)} 条提示词数据")
                return data
            except json.JSONDecodeError as e:
                logger.error(f"JSON解析失败: {e}")
                return None

        logger.error("无法从GitHub获取数据")
        return None

    async def sync(self, db: Session) -> Dict[str, Any]:
        """
        执行增量同步（基于title匹配）

        只保存提示词文本和图片URL，图片由前端下载并上传

        Returns:
            同步结果字典
        """
        if not settings.BANANA_SYNC_ENABLED:
            return {
                "success": False,
                "message": "同步功能已禁用",
                "count": 0
            }

        # 创建同步日志
        sync_log = BananaSyncLog(status="pending")
        db.add(sync_log)
        db.commit()
        db.refresh(sync_log)

        try:
            # 获取GitHub数据
            github_data = await self._fetch_github_data()

            if github_data is None:
                sync_log.status = "failed"
                sync_log.message = "无法从GitHub获取数据"
                db.commit()
                return {
                    "success": False,
                    "message": "无法从GitHub获取数据",
                    "count": 0
                }

            # 获取现有 GitHub 提示词，构建 title -> prompt 映射
            existing_prompts = db.query(BananaPrompt).filter(
                BananaPrompt.source == "github"
            ).all()
            existing_titles = {p.title: p for p in existing_prompts}

            # 保存所有提示词（不下载图片）
            new_count = 0
            deleted_count = 0
            json_titles = set()

            for item in github_data:
                title = item.get("title", "无标题")
                json_titles.add(title)

                # 已存在则跳过（保留现有数据和图片）
                if title in existing_titles:
                    continue

                # 新增提示词（image=None，保存 image_url 供前端下载）
                image_url = item.get("preview") or item.get("image")
                prompt = BananaPrompt(
                    title=title,
                    prompt=item.get("prompt") or item.get("content", ""),
                    mode=item.get("mode", "generate"),
                    category=item.get("category"),
                    author=item.get("author"),
                    link=item.get("link"),
                    image=None,  # 图片由前端下载
                    image_url=image_url,
                    source="github"
                )
                db.add(prompt)
                new_count += 1

            # 删除 JSON 中不存在的提示词
            for title, prompt in existing_titles.items():
                if title not in json_titles:
                    db.delete(prompt)
                    deleted_count += 1

            # 提交
            db.commit()

            # 更新同步日志
            total_count = len(existing_titles) - deleted_count + new_count
            sync_log.status = "success"
            sync_log.count = total_count
            sync_log.message = (
                f"同步完成: 新增 {new_count}, 删除 {deleted_count}, "
                f"保留 {len(existing_titles) - deleted_count}"
            )
            db.commit()

            logger.info(sync_log.message)

            return {
                "success": True,
                "message": sync_log.message,
                "count": total_count
            }

        except Exception as e:
            logger.error(f"同步失败: {e}")
            sync_log.status = "failed"
            sync_log.message = str(e)
            db.commit()

            return {
                "success": False,
                "message": f"同步失败: {str(e)}",
                "count": 0
            }

    def get_latest_sync_status(self, db: Session) -> Optional[BananaSyncLog]:
        """获取最近一次同步状态"""
        return db.query(BananaSyncLog).order_by(
            BananaSyncLog.synced_at.desc()
        ).first()


# 单例实例
banana_sync_service = BananaSyncService()


async def sync_from_github():
    """便捷函数：执行同步（用于定时任务）"""
    db = SessionLocal()
    try:
        result = await banana_sync_service.sync(db)
        logger.info(f"定时同步结果: {result}")
        return result
    finally:
        db.close()
