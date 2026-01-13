from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings
import os

# 确保数据库目录存在
db_dir = os.path.dirname(settings.DATABASE_URL.replace('sqlite:///', ''))
if db_dir and not os.path.exists(db_dir):
    os.makedirs(db_dir)
    print(f"[Database] 创建数据库目录: {db_dir}")

# 创建引擎
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite 需要
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 声明基类
Base = declarative_base()


def get_db():
    """获取数据库会话的依赖"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """运行数据库迁移（添加新列）"""
    migrations = [
        # 为 banana_prompts 表添加 image_url 列
        (
            "banana_prompts",
            "image_url",
            "ALTER TABLE banana_prompts ADD COLUMN image_url VARCHAR(500)"
        ),
    ]

    with engine.connect() as conn:
        for table_name, column_name, sql in migrations:
            # 检查列是否存在
            result = conn.execute(text(
                f"SELECT COUNT(*) FROM pragma_table_info('{table_name}') WHERE name='{column_name}'"
            ))
            exists = result.scalar() > 0

            if not exists:
                try:
                    conn.execute(text(sql))
                    conn.commit()
                    print(f"[Migration] 添加列 {table_name}.{column_name}")
                except Exception as e:
                    print(f"[Migration] 添加列 {table_name}.{column_name} 失败: {e}")


def init_db():
    """初始化数据库表"""
    import models  # 导入模型以注册表
    Base.metadata.create_all(bind=engine)
    # 运行迁移（添加新列等）
    run_migrations()
