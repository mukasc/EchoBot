"""
Database module — Motor (async MongoDB) client lifecycle and dependency injection.

Usage in routers/services:

    from app.database import get_db
    from motor.motor_asyncio import AsyncIOMotorDatabase

    async def my_endpoint(db: AsyncIOMotorDatabase = Depends(get_db)):
        ...
"""
from __future__ import annotations

from typing import AsyncGenerator

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings

# Module-level client — created once during lifespan startup
_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    """Return the shared Motor client. Must be called after startup."""
    if _client is None:
        raise RuntimeError("Database client is not initialised. Did startup run?")
    return _client


async def init_db() -> None:
    """Initialise the Motor client. Called from app lifespan."""
    global _client
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.mongo_url)


async def close_db() -> None:
    """Close the Motor client. Called from app lifespan."""
    global _client
    if _client is not None:
        _client.close()
        _client = None


async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """
    FastAPI dependency — yields the database instance.

    Example::

        async def endpoint(db: AsyncIOMotorDatabase = Depends(get_db)):
            docs = await db.sessions.find({}).to_list(100)
    """
    settings = get_settings()
    yield get_client()[settings.db_name]
