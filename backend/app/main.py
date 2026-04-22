"""
FastAPI application entry point.

Start with:
    uvicorn app.main:app --reload
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import close_db, init_db
from app.exceptions import register_exception_handlers
from app.routers import characters, demo, sessions, settings

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Application lifespan (replaces deprecated @app.on_event)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage startup and shutdown of long-lived resources."""
    logger.info("Starting up — connecting to MongoDB …")
    await init_db()
    logger.info("MongoDB connected.")
    yield
    logger.info("Shutting down — closing MongoDB connection …")
    await close_db()
    logger.info("MongoDB connection closed.")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
def create_app() -> FastAPI:
    cfg = get_settings()

    app = FastAPI(
        title="RPG Cronista API",
        version="1.0.0",
        description="API para gerenciamento e processamento de sessões de RPG.",
        lifespan=lifespan,
    )

    # CORS must be added BEFORE routers
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    register_exception_handlers(app)

    # Routers — all mounted under /api prefix
    api_prefix = "/api"
    app.include_router(demo.router, prefix=api_prefix)
    app.include_router(sessions.router, prefix=api_prefix)
    app.include_router(characters.router, prefix=api_prefix)
    app.include_router(settings.router, prefix=api_prefix)

    return app


app = create_app()
