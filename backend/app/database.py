"""
Database module — centralises database lifespan management and dependency injection.
Dynamically resolves Mongo (Motor) or Flat-File persistence providers based on settings.
"""
from __future__ import annotations

import os
from typing import AsyncGenerator

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import get_settings
from app.interfaces import DatabaseProviderInterface

# Module-level references
_client: AsyncIOMotorClient | None = None
_db_provider: DatabaseProviderInterface | None = None


def get_client() -> AsyncIOMotorClient:
    """Return the shared Motor client. Must be called after startup in MongoDB mode."""
    if _client is None:
        raise RuntimeError("Database client is not initialised. Did startup run?")
    return _client


def get_db_provider() -> DatabaseProviderInterface:
    """Return the active database provider. Must be called after startup."""
    if _db_provider is None:
        raise RuntimeError("Database provider is not initialised. Did startup run?")
    return _db_provider


async def init_db() -> None:
    """Initialise the configured database provider (MongoDB or Flat-File)."""
    global _client, _db_provider
    settings = get_settings()

    if settings.db_provider == "flatfile":
        from app.flatfile_provider import FlatFileDatabaseProvider
        os.makedirs(settings.flatfile_dir, exist_ok=True)
        _db_provider = FlatFileDatabaseProvider(settings.flatfile_dir)
        logger_info = f"Flat-File Database initialised in directory: {settings.flatfile_dir}"
    else:
        from app.mongo_provider import MongoDatabaseProvider
        _client = AsyncIOMotorClient(settings.mongo_url)
        db = _client[settings.db_name]
        _db_provider = MongoDatabaseProvider(db)
        logger_info = f"MongoDB initialised on URL: {settings.mongo_url} (DB: {settings.db_name})"

    # Log setup
    import logging
    logging.getLogger(__name__).info(logger_info)


async def close_db() -> None:
    """Close connections and release resources."""
    global _client, _db_provider
    if _client is not None:
        _client.close()
        _client = None
    _db_provider = None


async def get_db() -> AsyncGenerator[DatabaseProviderInterface, None]:
    """
    FastAPI dependency yielding the configured database provider interface.
    """
    yield get_db_provider()

