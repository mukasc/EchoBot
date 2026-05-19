import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from app.database import get_db_client
from app.config import get_settings

async def main():
    client = get_db_client()
    db = client[get_settings().mongodb_db_name]
    settings = await db['settings'].find_one({'_id': 'app_settings'})
    print(settings)

if __name__ == "__main__":
    asyncio.run(main())
