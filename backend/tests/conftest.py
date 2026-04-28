import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock
from app.main import create_app
from app.database import get_db
from app.config import get_settings

@pytest.fixture
def mock_db():
    db = MagicMock()
    # Sessions collection
    db.sessions = MagicMock()
    db.sessions.find.return_value.sort.return_value.to_list = AsyncMock()
    db.sessions.find_one = AsyncMock()
    db.sessions.insert_one = AsyncMock()
    db.sessions.update_one = AsyncMock()
    db.sessions.delete_one = AsyncMock()
    db.sessions.aggregate.return_value.to_list = AsyncMock()
    
    # Settings collection
    db.settings = MagicMock()
    db.settings.find_one = AsyncMock()
    db.settings.update_one = AsyncMock()
    
    # Character Mappings collection
    db.character_mappings = MagicMock()
    db.character_mappings.find.return_value.to_list = AsyncMock()
    
    # Campaigns collection
    db.campaigns = MagicMock()
    db.campaigns.find.return_value.sort.return_value.to_list = AsyncMock()
    db.campaigns.find_one = AsyncMock()
    db.campaigns.insert_one = AsyncMock()
    db.campaigns.update_one = AsyncMock()
    db.campaigns.delete_one = AsyncMock()
    
    return db

@pytest.fixture
def mock_settings():
    settings = MagicMock()
    settings.cors_origins = ["*"]
    settings.master_key = "dGVzdC1rZXktMzItYnl0ZXMtc2VjdXJlIQ==" # base64 for 32 bytes
    return settings

@pytest.fixture
def client(mock_db, mock_settings):
    app = create_app()
    
    # Override dependencies
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_settings] = lambda: mock_settings
    
    with TestClient(app) as c:
        yield c
    
    app.dependency_overrides = {}
