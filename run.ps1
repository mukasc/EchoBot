# EchoBot Unified Start Script
# Inicia todos os serviços em janelas PowerShell separadas.
#
# Uso: .\run.ps1  (execute a partir da raiz do projeto EchoBot)

$root = $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EchoBot — Iniciando serviços...       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Backend (FastAPI via uvicorn do venv)
Write-Host "[1/3] Backend (FastAPI)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Write-Host 'BACKEND' -ForegroundColor Cyan; `
     Set-Location '$root\backend'; `
     .\venv\Scripts\uvicorn.exe app.main:app --reload" `
    -WindowStyle Normal

Start-Sleep -Milliseconds 500

# 2. Voice Bridge (Node.js)
Write-Host "[2/3] Voice Bridge (Node.js)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Write-Host 'VOICE BRIDGE' -ForegroundColor Magenta; `
     Set-Location '$root\voice-bridge'; `
     node index.js" `
    -WindowStyle Normal

Start-Sleep -Milliseconds 500

# 3. Frontend (npm start)
Write-Host "[3/3] Frontend (npm start)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Write-Host 'FRONTEND' -ForegroundColor Yellow; `
     Set-Location '$root\frontend'; `
     npm start" `
    -WindowStyle Normal

Write-Host ""
Write-Host "Todos os serviços foram iniciados em janelas separadas." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Backend  : http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs : http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Frontend : http://localhost:3000 (ou a porta do npm)" -ForegroundColor White
Write-Host ""
