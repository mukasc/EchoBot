"""
MongoDB Database Provider module - implements the collection, cursor, and database provider interfaces
by wrapping the native Motor async client.
"""
from __future__ import annotations

from typing import Any, AsyncIterator, Dict, List, Optional, Union
from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorCursor, AsyncIOMotorDatabase

from app.interfaces import (
    AsyncCursorInterface,
    DatabaseCollectionInterface,
    DatabaseProviderInterface,
    DeleteResult,
    InsertOneResult,
    UpdateResult,
)


class MongoAsyncCursor(AsyncCursorInterface):
    """Wrapper around Motor's AsyncIOMotorCursor."""

    def __init__(self, cursor: AsyncIOMotorCursor) -> None:
        self._cursor = cursor

    def sort(self, key_or_list: Union[str, List[tuple[str, int]]], direction: Optional[int] = None) -> AsyncCursorInterface:
        self._cursor = self._cursor.sort(key_or_list, direction)
        return self

    async def to_list(self, length: Optional[int]) -> List[Dict[str, Any]]:
        # In motor, to_list requires a length. If None is passed, we can default to 1000 or similar
        l = length if length is not None else 1000
        return await self._cursor.to_list(l)

    def __aiter__(self) -> AsyncIterator[Dict[str, Any]]:
        return self

    async def __anext__(self) -> Dict[str, Any]:
        return await self._cursor.__anext__()


class MongoDatabaseCollection(DatabaseCollectionInterface):
    """Wrapper around Motor's AsyncIOMotorCollection."""

    def __init__(self, collection: AsyncIOMotorCollection) -> None:
        self._collection = collection

    async def find_one(self, filter: Dict[str, Any], projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        return await self._collection.find_one(filter, projection)

    def find(self, filter: Dict[str, Any], projection: Optional[Dict[str, Any]] = None) -> AsyncCursorInterface:
        return MongoAsyncCursor(self._collection.find(filter, projection))

    async def insert_one(self, document: Dict[str, Any]) -> InsertOneResult:
        res = await self._collection.insert_one(document)
        return InsertOneResult(res.inserted_id)

    async def update_one(self, filter: Dict[str, Any], update: Dict[str, Any], upsert: bool = False) -> UpdateResult:
        res = await self._collection.update_one(filter, update, upsert=upsert)
        return UpdateResult(matched_count=res.matched_count, modified_count=res.modified_count)

    async def delete_one(self, filter: Dict[str, Any]) -> DeleteResult:
        res = await self._collection.delete_one(filter)
        return DeleteResult(deleted_count=res.deleted_count)

    def aggregate(self, pipeline: List[Dict[str, Any]]) -> AsyncCursorInterface:
        return MongoAsyncCursor(self._collection.aggregate(pipeline))


class MongoDatabaseProvider(DatabaseProviderInterface):
    """MongoDB provider housing wrapped collection instances."""

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._db = db
        self._sessions = MongoDatabaseCollection(db.sessions)
        self._campaigns = MongoDatabaseCollection(db.campaigns)
        self._character_mappings = MongoDatabaseCollection(db.character_mappings)
        self._settings = MongoDatabaseCollection(db.settings)

    @property
    def sessions(self) -> DatabaseCollectionInterface:
        return self._sessions

    @property
    def campaigns(self) -> DatabaseCollectionInterface:
        return self._campaigns

    @property
    def character_mappings(self) -> DatabaseCollectionInterface:
        return self._character_mappings

    @property
    def settings(self) -> DatabaseCollectionInterface:
        return self._settings
