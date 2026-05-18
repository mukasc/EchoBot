import sys
from unittest.mock import MagicMock
from app.models.settings import AppSettings

print("Starting scratch test...")
doc = MagicMock()
print("Creating AppSettings...")
try:
    settings = AppSettings(**doc)
    print("Success:", settings)
except Exception as e:
    print("Failed with:", e)
