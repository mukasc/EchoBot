#!/usr/bin/env python
"""
Migration utility to safely copy data from the MongoDB instance to JSON flat files.
Uses settings loaded from backend/.env and writes output to the configured Flat-File directory.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from typing import Any, Dict

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

# Add current directory to path to allow importing app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("migration")


def serialize_mongo_doc(val: Any) -> Any:
    """Recursively convert ObjectId and datetime instances to serializable formats."""
    if isinstance(val, dict):
        return {k: serialize_mongo_doc(v) for k, v in val.items()}
    elif isinstance(val, list):
        return [serialize_mongo_doc(item) for item in val]
    elif isinstance(val, ObjectId):
        return str(val)
    elif isinstance(val, datetime):
        return val.isoformat()
    return val


def write_json_atomically(file_path: str, data: Dict[str, Any]) -> None:
    """Safely write JSON to disk using atomic replacement."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    temp_path = f"{file_path}.tmp"
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(temp_path, file_path)


async def migrate_collection(
    mongo_collection: Any,
    flatfile_dir: str,
    collection_name: str,
    dry_run: bool = False
) -> int:
    """Migrate all documents from a MongoDB collection to flat JSON files."""
    logger.info(f"Scanning collection '{collection_name}'...")
    count = 0
    
    # Read all documents from collection
    async for raw_doc in mongo_collection.find({}):
        # Deep copy and serialize special types (ObjectId, datetime)
        doc = serialize_mongo_doc(raw_doc)
        
        # Determine unique filename identifier
        doc_id = doc.get("id") or doc.get("_id")
        if not doc_id:
            logger.warning(f"Skipping document in '{collection_name}' because it lacks an identifier.")
            continue
            
        # Ensure document has both 'id' and '_id' populated as string for compatibility
        doc["id"] = doc_id
        doc["_id"] = doc_id
        
        if not dry_run:
            file_path = os.path.join(flatfile_dir, collection_name, f"{doc_id}.json")
            await asyncio.to_thread(write_json_atomically, file_path, doc)
            
        count += 1
        if count % 50 == 0:
            logger.info(f"Processed {count} documents in '{collection_name}'...")
            
    logger.info(f"Successfully migrated {count} documents from '{collection_name}' "
                f"{'(DRY RUN)' if dry_run else ''}.")
    return count


async def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate data from MongoDB to Flat-File persistence.")
    parser.add_argument("--dry-run", action="store_true", help="Scan and serialize, but do not write to disk.")
    parser.add_argument("--out-dir", type=str, default=None, help="Override flatfile output directory path.")
    args = parser.parse_args()

    settings = get_settings()
    out_dir = args.out_dir or settings.flatfile_dir
    
    logger.info("=== EchoBot Database Migration Start ===")
    logger.info(f"MongoDB URL:  {settings.mongo_url}")
    logger.info(f"Database:     {settings.db_name}")
    logger.info(f"Flat-File Dir:{out_dir}")
    logger.info(f"Dry Run:      {args.dry_run}")
    logger.info("=========================================")

    # Initialize MongoDB Client
    client = AsyncIOMotorClient(settings.mongo_url)
    db = client[settings.db_name]

    # Collections mapping
    collections_to_migrate = {
        "campaigns": db.campaigns,
        "sessions": db.sessions,
        "character_mappings": db.character_mappings,
        "settings": db.settings,
    }

    total_count = 0
    try:
        for name, mongo_coll in collections_to_migrate.items():
            total_count += await migrate_collection(mongo_coll, out_dir, name, dry_run=args.dry_run)
            
        logger.info("=========================================")
        logger.info(f"Migration completed! Total records processed: {total_count}")
        logger.info("=========================================")
    except Exception as e:
        logger.error(f"Migration failed with error: {e}", exc_info=True)
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
