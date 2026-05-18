"""
Interfaces module - defines the abstract collection, cursor, and database provider interfaces.
These mimic Motor (async MongoDB) client's structural patterns to avoid massive refactoring in routers.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncIterator, Dict, List, Optional, Union


class AsyncCursorInterface(ABC):
    """Abstract interface mimicking the Motor AsyncIO cursor."""

    @abstractmethod
    def sort(self, key_or_list: Union[str, List[tuple[str, int]]], direction: Optional[int] = None) -> AsyncCursorInterface:
        """Sort documents in the cursor."""
        pass

    @abstractmethod
    async def to_list(self, length: Optional[int]) -> List[Dict[str, Any]]:
        """Materialize the cursor results into a list of dicts."""
        pass

    @abstractmethod
    def __aiter__(self) -> AsyncIterator[Dict[str, Any]]:
        """Allow async iteration over cursor results."""
        pass

    @abstractmethod
    async def __anext__(self) -> Dict[str, Any]:
        """Get the next item during async iteration."""
        pass


class InsertOneResult:
    """Wrapper class for insert_one results."""
    def __init__(self, inserted_id: Any):
        self.inserted_id = inserted_id


class UpdateResult:
    """Wrapper class for update_one results."""
    def __init__(self, matched_count: int, modified_count: int):
        self.matched_count = matched_count
        self.modified_count = modified_count


class DeleteResult:
    """Wrapper class for delete_one results."""
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count


class DatabaseCollectionInterface(ABC):
    """Abstract interface mimicking Motor collection queries and operations."""

    @abstractmethod
    async def find_one(self, filter: Dict[str, Any], projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Fetch a single document matching the filter."""
        pass

    @abstractmethod
    def find(self, filter: Dict[str, Any], projection: Optional[Dict[str, Any]] = None) -> AsyncCursorInterface:
        """Query multiple documents, returning an async cursor."""
        pass

    @abstractmethod
    async def insert_one(self, document: Dict[str, Any]) -> InsertOneResult:
        """Insert a single document."""
        pass

    @abstractmethod
    async def update_one(self, filter: Dict[str, Any], update: Dict[str, Any], upsert: bool = False) -> UpdateResult:
        """Update a single document matching the filter."""
        pass

    @abstractmethod
    async def delete_one(self, filter: Dict[str, Any]) -> DeleteResult:
        """Delete a single document matching the filter."""
        pass

    @abstractmethod
    def aggregate(self, pipeline: List[Dict[str, Any]]) -> AsyncCursorInterface:
        """Execute an aggregation pipeline, returning an async cursor."""
        pass


class DatabaseProviderInterface(ABC):
    """Unified repository provider interface representing the database collections."""
    
    @property
    @abstractmethod
    def sessions(self) -> DatabaseCollectionInterface:
        """The sessions collection interface."""
        pass

    @property
    @abstractmethod
    def campaigns(self) -> DatabaseCollectionInterface:
        """The campaigns collection interface."""
        pass

    @property
    @abstractmethod
    def character_mappings(self) -> DatabaseCollectionInterface:
        """The character mappings collection interface."""
        pass

    @property
    @abstractmethod
    def settings(self) -> DatabaseCollectionInterface:
        """The app settings collection interface."""
        pass
