"""
Flat-File Database Provider module - implements the collection, cursor, and database provider interfaces
by saving and loading documents as local JSON files.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional, Union

from app.interfaces import (
    AsyncCursorInterface,
    DatabaseCollectionInterface,
    DatabaseProviderInterface,
    DeleteResult,
    InsertOneResult,
    UpdateResult,
)

logger = logging.getLogger(__name__)


# --- Helper Functions for Async File IO ---

def _read_json_file(file_path: str) -> Dict[str, Any]:
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_json_file(file_path: str, data: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    # Temporary file write and atomic replace to guarantee file integrity
    temp_path = f"{file_path}.tmp"
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(temp_path, file_path)


def _delete_file(file_path: str) -> None:
    if os.path.exists(file_path):
        os.remove(file_path)


def _list_json_files(dir_path: str) -> List[str]:
    if not os.path.exists(dir_path):
        return []
    return [os.path.join(dir_path, f) for f in os.listdir(dir_path) if f.endswith(".json")]


# --- MongoDB Query & Aggregation Interpreter ---

def _resolve_path(doc: Any, path: str) -> Any:
    """Resolve a dot-separated path in a nested document/dict structure."""
    parts = path.split('.')
    val = doc
    for part in parts:
        if isinstance(val, dict):
            val = val.get(part)
        elif isinstance(val, list):
            # If traversing a list of dicts, collect the values
            res = []
            for item in val:
                resolved = _resolve_path(item, part)
                if isinstance(resolved, list):
                    res.extend(resolved)
                else:
                    res.append(resolved)
            return res
        else:
            return None
    return val


def _match_document(doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
    """Check if a document matches a MongoDB-style query filter."""
    if not query:
        return True

    for path, criteria in query.items():
        val = _resolve_path(doc, path)

        if isinstance(criteria, dict):
            for op, expected in criteria.items():
                if op == "$ne":
                    if val == expected:
                        return False
                elif op == "$in":
                    if isinstance(val, list):
                        if not any(v in expected for v in val):
                            return False
                    else:
                        if val not in expected:
                            return False
                else:
                    # Fallback for other operators
                    if val != expected:
                        return False
        else:
            if isinstance(val, list):
                if criteria not in val:
                    return False
            else:
                if val != criteria:
                    return False

    return True


def _project_document(doc: Dict[str, Any], projection: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Apply a MongoDB-style projection to a document."""
    if not projection:
        return doc.copy()

    # Check if this is an inclusion or exclusion projection
    inclusions = {k: v for k, v in projection.items() if k != "_id" and v in (1, True)}

    if inclusions:
        # Inclusion projection
        projected = {}
        for k in inclusions:
            if k in doc:
                projected[k] = doc[k]
        # Include ID fields unless explicitly excluded
        if "_id" not in projection or projection["_id"] in (1, True):
            if "_id" in doc:
                projected["_id"] = doc["_id"]
        if "id" in doc:
            projected["id"] = doc["id"]
        return projected
    else:
        # Exclusion projection
        projected = doc.copy()
        for k, v in projection.items():
            if v in (0, False) and k in projected:
                projected.pop(k)
        return projected


def _apply_update(doc: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
    """Apply MongoDB-style update operators to a document in place."""
    new_doc = doc.copy()
    
    # Check if there are any $-prefixed keys (update operators)
    has_operators = any(k.startswith('$') for k in update.keys())
    
    if has_operators:
        if "$set" in update:
            for k, v in update["$set"].items():
                if '.' in k:
                    parts = k.split('.')
                    curr = new_doc
                    for part in parts[:-1]:
                        if part not in curr or not isinstance(curr[part], dict):
                            curr[part] = {}
                        curr = curr[part]
                    curr[parts[-1]] = v
                else:
                    new_doc[k] = v
        if "$push" in update:
            for k, v in update["$push"].items():
                if '.' in k:
                    parts = k.split('.')
                    curr = new_doc
                    for part in parts[:-1]:
                        if part not in curr or not isinstance(curr[part], dict):
                            curr[part] = {}
                        curr = curr[part]
                    target_list = curr.get(parts[-1])
                    if not isinstance(target_list, list):
                        target_list = []
                    curr[parts[-1]] = target_list
                else:
                    if k not in new_doc or not isinstance(new_doc[k], list):
                        new_doc[k] = []
                    target_list = new_doc[k]
                
                # Check for $each modifier
                if isinstance(v, dict) and "$each" in v:
                    items_to_push = v["$each"]
                else:
                    items_to_push = [v]
                
                # Append each item
                for item in items_to_push:
                    target_list.append(item)
    else:
        # Legacy direct-dictionary update
        for k, v in update.items():
            if not k.startswith("$"):
                new_doc[k] = v
                
    return new_doc


def _run_aggregation(documents: List[Dict[str, Any]], pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Runs a Python-native interpretation of MongoDB aggregation pipeline stages."""
    docs = [doc.copy() for doc in documents]

    for stage in pipeline:
        if not isinstance(stage, dict) or len(stage) != 1:
            continue
        op, val = list(stage.items())[0]

        if op == "$match":
            docs = [d for d in docs if _match_document(d, val)]

        elif op == "$unwind":
            field = val
            if field.startswith("$"):
                field = field[1:]

            unwound_docs = []
            for d in docs:
                arr = d.get(field)
                if isinstance(arr, list) and arr:
                    for item in arr:
                        new_d = d.copy()
                        new_d[field] = item.copy() if isinstance(item, dict) else item
                        unwound_docs.append(new_d)
            docs = unwound_docs

        elif op == "$project":
            projected_docs = []
            for d in docs:
                new_d = {}
                for dest_k, src_v in val.items():
                    if dest_k == "_id" and src_v in (0, False):
                        continue
                    if isinstance(src_v, str) and src_v.startswith("$"):
                        new_d[dest_k] = _resolve_path(d, src_v[1:])
                    elif src_v in (1, True):
                        new_d[dest_k] = d.get(dest_k)
                    elif isinstance(src_v, dict):
                        new_d[dest_k] = src_v
                    else:
                        new_d[dest_k] = src_v
                projected_docs.append(new_d)
            docs = projected_docs

        elif op == "$group":
            group_key_expr = val.get("_id")
            group_field = None
            if isinstance(group_key_expr, str) and group_key_expr.startswith("$"):
                group_field = group_key_expr[1:]

            groups = {}
            for d in docs:
                g_key = _resolve_path(d, group_field) if group_field else None
                if g_key is None:
                    g_key_hash = None
                elif not isinstance(g_key, (str, int, float, bool)):
                    g_key_hash = str(g_key)
                else:
                    g_key_hash = g_key

                if g_key_hash not in groups:
                    groups[g_key_hash] = (g_key, [])
                groups[g_key_hash][1].append(d)

            grouped_docs = []
            for g_key_hash, (orig_g_key, group_docs) in groups.items():
                new_d = {"_id": orig_g_key}
                for acc_k, acc_v in val.items():
                    if acc_k == "_id":
                        continue
                    if isinstance(acc_v, dict) and len(acc_v) == 1:
                        acc_op, acc_expr = list(acc_v.items())[0]
                        if acc_op == "$push":
                            pushed_items = []
                            for gd in group_docs:
                                if isinstance(acc_expr, dict):
                                    item = {}
                                    for item_k, item_v in acc_expr.items():
                                        if isinstance(item_v, str) and item_v.startswith("$"):
                                            item[item_k] = _resolve_path(gd, item_v[1:])
                                        else:
                                            item[item_k] = item_v
                                    pushed_items.append(item)
                                elif isinstance(acc_expr, str) and acc_expr.startswith("$"):
                                    pushed_items.append(_resolve_path(gd, acc_expr[1:]))
                                else:
                                    pushed_items.append(acc_expr)
                            new_d[acc_k] = pushed_items
                grouped_docs.append(new_d)
            docs = grouped_docs

        elif op == "$sort":
            sort_keys = list(val.items())
            for key, dir_val in reversed(sort_keys):
                reverse = (dir_val == -1)

                def get_val(doc):
                    v = _resolve_path(doc, key)
                    if v is None:
                        return ""
                    if isinstance(v, datetime):
                        return v.isoformat()
                    return v

                docs.sort(key=get_val, reverse=reverse)

    return docs


# --- Cursor Implementation ---

class FlatFileAsyncCursor(AsyncCursorInterface):
    """Local, thread-safe asynchronous cursor for FlatFile collections."""

    def __init__(self, documents: List[Dict[str, Any]]) -> None:
        self._documents = documents
        self._index = 0

    def sort(self, key_or_list: Union[str, List[tuple[str, int]]], direction: Optional[int] = None) -> AsyncCursorInterface:
        if isinstance(key_or_list, str):
            sort_keys = [(key_or_list, direction if direction is not None else 1)]
        else:
            sort_keys = key_or_list

        for key, dir_val in reversed(sort_keys):
            reverse = (dir_val == -1)

            def get_val(doc):
                v = _resolve_path(doc, key)
                if v is None:
                    return ""
                if isinstance(v, datetime):
                    return v.isoformat()
                return v

            self._documents.sort(key=get_val, reverse=reverse)
        return self

    async def to_list(self, length: Optional[int]) -> List[Dict[str, Any]]:
        if length is not None:
            return self._documents[self._index : self._index + length]
        return self._documents[self._index :]

    def __aiter__(self) -> AsyncIterator[Dict[str, Any]]:
        return self

    async def __anext__(self) -> Dict[str, Any]:
        if self._index >= len(self._documents):
            raise StopAsyncIteration
        doc = self._documents[self._index]
        self._index += 1
        return doc


# --- Collection Implementation ---

class FlatFileDatabaseCollection(DatabaseCollectionInterface):
    """Collection wrapper using JSON files stored in a collection folder."""

    def __init__(self, collection_dir: str) -> None:
        self._dir = collection_dir
        self._lock = asyncio.Lock()

    async def _load_all_docs(self) -> List[Dict[str, Any]]:
        """Load all valid JSON documents inside the collection folder."""
        if not os.path.exists(self._dir):
            return []
        files = await asyncio.to_thread(_list_json_files, self._dir)
        docs = []
        for file in files:
            try:
                doc = await asyncio.to_thread(_read_json_file, file)
                docs.append(doc)
            except Exception as e:
                logger.error(f"Error loading Flat-File document {file}: {e}")
        return docs

    async def find_one(self, filter: Dict[str, Any], projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        async with self._lock:
            docs = await self._load_all_docs()
            for doc in docs:
                if _match_document(doc, filter):
                    return _project_document(doc, projection)
            return None

    def find(self, filter: Dict[str, Any], projection: Optional[Dict[str, Any]] = None) -> AsyncCursorInterface:
        # To match motor, find returns a cursor synchronously.
        # Inside the cursor, loading, filtering, and projecting are resolved async on execution or immediately.
        # For simplicity and thread safety under local bounds, we load all docs async and initialize the cursor.
        # But since find() must return synchronously, we schedule the task to run inside a synchronous proxy.
        # A clean way is to load documents on to_list/iteration, or run a synchronous future.
        # Let's run a loop task or construct a cursor that loads dynamically.
        # However, to be fully async-compliant and extremely reliable:
        class DynamicCursor(FlatFileAsyncCursor):
            def __init__(self, parent: FlatFileDatabaseCollection, filt: Dict[str, Any], proj: Optional[Dict[str, Any]]) -> None:
                super().__init__([])
                self._parent = parent
                self._filt = filt
                self._proj = proj
                self._loaded = False
                self._sort_queue: List[tuple[str, int]] = []

            async def _ensure_loaded(self):
                if not self._loaded:
                    async with self._parent._lock:
                        all_docs = await self._parent._load_all_docs()
                    filtered = [d for d in all_docs if _match_document(d, self._filt)]
                    self._documents = [_project_document(d, self._proj) for d in filtered]
                    
                    # Apply queued sort operations
                    if self._sort_queue:
                        for key, dir_val in reversed(self._sort_queue):
                            reverse = (dir_val == -1)
                            def get_val(doc):
                                v = _resolve_path(doc, key)
                                if v is None:
                                    return ""
                                return v
                            self._documents.sort(key=get_val, reverse=reverse)
                            
                    self._loaded = True

            def sort(self, key_or_list: Union[str, List[tuple[str, int]]], direction: Optional[int] = None) -> AsyncCursorInterface:
                if isinstance(key_or_list, str):
                    keys = [(key_or_list, direction if direction is not None else 1)]
                else:
                    keys = key_or_list
                self._sort_queue.extend(keys)
                return self

            async def to_list(self, length: Optional[int]) -> List[Dict[str, Any]]:
                await self._ensure_loaded()
                return await super().to_list(length)

            async def __anext__(self) -> Dict[str, Any]:
                await self._ensure_loaded()
                return await super().__anext__()

        return DynamicCursor(self, filter, projection)

    async def insert_one(self, document: Dict[str, Any]) -> InsertOneResult:
        async with self._lock:
            doc_id = document.get("id") or document.get("_id")
            if not doc_id:
                doc_id = str(uuid.uuid4())
                document["id"] = doc_id

            # Save the clean copy
            file_path = os.path.join(self._dir, f"{doc_id}.json")
            await asyncio.to_thread(_write_json_file, file_path, document)
            return InsertOneResult(doc_id)

    async def update_one(self, filter: Dict[str, Any], update: Dict[str, Any], upsert: bool = False) -> UpdateResult:
        async with self._lock:
            docs = await self._load_all_docs()
            matched_doc = None
            for doc in docs:
                if _match_document(doc, filter):
                    matched_doc = doc
                    break

            if matched_doc:
                updated_doc = _apply_update(matched_doc, update)
                # Ensure it retains the original ID
                doc_id = matched_doc.get("id") or matched_doc.get("_id")
                file_path = os.path.join(self._dir, f"{doc_id}.json")
                await asyncio.to_thread(_write_json_file, file_path, updated_doc)
                return UpdateResult(matched_count=1, modified_count=1)

            if upsert:
                # Construct document from filter keys and update actions
                new_doc = {}
                # Set initial fields from filter
                for k, v in filter.items():
                    if '$' not in k and '.' not in k:
                        new_doc[k] = v

                # Apply update fields
                new_doc = _apply_update(new_doc, update)

                # Ensure it has an ID
                doc_id = new_doc.get("id") or new_doc.get("_id") or filter.get("id")
                if not doc_id:
                    doc_id = str(uuid.uuid4())
                new_doc["id"] = doc_id

                file_path = os.path.join(self._dir, f"{doc_id}.json")
                await asyncio.to_thread(_write_json_file, file_path, new_doc)
                return UpdateResult(matched_count=0, modified_count=1)

            return UpdateResult(matched_count=0, modified_count=0)

    async def delete_one(self, filter: Dict[str, Any]) -> DeleteResult:
        async with self._lock:
            docs = await self._load_all_docs()
            for doc in docs:
                if _match_document(doc, filter):
                    doc_id = doc.get("id") or doc.get("_id")
                    file_path = os.path.join(self._dir, f"{doc_id}.json")
                    await asyncio.to_thread(_delete_file, file_path)
                    return DeleteResult(deleted_count=1)
            return DeleteResult(deleted_count=0)

    def aggregate(self, pipeline: List[Dict[str, Any]]) -> AsyncCursorInterface:
        class AggregationCursor(FlatFileAsyncCursor):
            def __init__(self, parent: FlatFileDatabaseCollection, pipe: List[Dict[str, Any]]) -> None:
                super().__init__([])
                self._parent = parent
                self._pipe = pipe
                self._loaded = False

            async def _ensure_loaded(self):
                if not self._loaded:
                    async with self._parent._lock:
                        all_docs = await self._parent._load_all_docs()
                    self._documents = _run_aggregation(all_docs, self._pipe)
                    self._loaded = True

            async def to_list(self, length: Optional[int]) -> List[Dict[str, Any]]:
                await self._ensure_loaded()
                return await super().to_list(length)

            async def __anext__(self) -> Dict[str, Any]:
                await self._ensure_loaded()
                return await super().__anext__()

        return AggregationCursor(self, pipeline)


# --- Database Provider Implementation ---

class FlatFileDatabaseProvider(DatabaseProviderInterface):
    """Database Provider implementation executing local file persistence."""

    def __init__(self, flatfile_dir: str) -> None:
        self._base_dir = flatfile_dir
        self._sessions = FlatFileDatabaseCollection(os.path.join(flatfile_dir, "sessions"))
        self._campaigns = FlatFileDatabaseCollection(os.path.join(flatfile_dir, "campaigns"))
        self._character_mappings = FlatFileDatabaseCollection(os.path.join(flatfile_dir, "character_mappings"))
        self._settings = FlatFileDatabaseCollection(os.path.join(flatfile_dir, "settings"))

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
