import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv, find_dotenv
from fastapi import FastAPI

load_dotenv(find_dotenv())
from fastapi.middleware.cors import CORSMiddleware

from database import engine
from models import Base
from routers import articles, settings, bookmarks
from scheduler import start_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時: テーブル作成 + スケジューラー開始
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")
    scheduler = start_scheduler()
    yield
    # 終了時: スケジューラー停止
    scheduler.shutdown()
    logger.info("Scheduler stopped")


app = FastAPI(
    title="Tech Feed API",
    description="AI-powered tech news feed from Zenn and Qiita",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://tech-feed-frontend-7v22.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(articles.router)
app.include_router(settings.router)
app.include_router(bookmarks.router)


@app.get("/")
def root():
    return {"message": "Tech Feed API is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
