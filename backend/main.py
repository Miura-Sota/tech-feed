import logging
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv, find_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

load_dotenv(find_dotenv())
from fastapi.middleware.cors import CORSMiddleware

from database import engine
from models import Base
from routers import articles, settings, bookmarks, read_marks, auth

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://tech-feed-frontend-7v22.onrender.com",
]


def _parse_cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS")
    if not raw:
        return _DEFAULT_CORS_ORIGINS
    return [o.strip() for o in raw.split(",") if o.strip()]


ALLOWED_ORIGINS = _parse_cors_origins()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")
    yield


app = FastAPI(
    title="Tech Feed API",
    description="AI-powered tech news feed from Zenn and Qiita",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers,
    )

app.include_router(auth.router)
app.include_router(articles.router)
app.include_router(settings.router)
app.include_router(bookmarks.router)
app.include_router(read_marks.router)


@app.get("/")
def root():
    return {"message": "Tech Feed API is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
