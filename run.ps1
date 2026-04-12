# EchoBot Unified Start Script
# This script starts all the components of the EchoBot system in separate PowerShell windows.

Write-Host "Starting EchoBot services..." -ForegroundColor Cyan

# 1. Start Backend Bot
Write-Host "Launching Backend Bot..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\venv\Scripts\python.exe bot.py" -WorkingDirectory "backend" -WindowStyle Normal

# 2. Start Backend Server
Write-Host "Launching Backend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\venv\Scripts\python.exe -m uvicorn server:app --reload --port 8000" -WorkingDirectory "backend" -WindowStyle Normal

# 3. Start Voice Bridge
Write-Host "Launching Voice Bridge..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd voice-bridge; node index.js" -WindowStyle Normal

# 4. Start Frontend
Write-Host "Launching Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start" -WindowStyle Normal

Write-Host "All services have been launched in separate windows." -ForegroundColor Yellow
Write-Host "Please check each window for logs and status." -ForegroundColor Yellow
