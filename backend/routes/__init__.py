# Routes package
# 导入所有路由模块使其可以被外部访问
from . import auth, providers, xhs, generate, xhs_providers, banana

__all__ = ['auth', 'providers', 'xhs', 'generate', 'xhs_providers', 'banana']
