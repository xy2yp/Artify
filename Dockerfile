# Artify 智绘工作台 
#  nginx (前端静态文件 + 反向代理) + uvicorn (FastAPI 后端)

FROM python:3.11-slim

LABEL maintainer="Artify"
LABEL description="Artify 智绘工作台"

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV TZ=Asia/Shanghai

# 配置清华 apt 源 (Debian bookworm)
RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 创建应用目录
WORKDIR /app

# 配置清华 pip 源
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 复制后端依赖并安装
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# 复制后端代码
COPY backend/ /app/backend/

# 复制前端静态文件
COPY index.html /app/frontend/
COPY logo.svg /app/frontend/
COPY css/ /app/frontend/css/
COPY js/ /app/frontend/js/

# 复制配置文件
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# 创建数据目录和日志目录
RUN mkdir -p /app/backend/data /var/log/supervisor

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# 启动 supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
