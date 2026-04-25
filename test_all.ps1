Write-Host "Iniciando Suite de Testes do EchoBot..." -ForegroundColor Cyan

# 1. Backend Tests
Write-Host "`n[1/3] Testando Backend (FastAPI)..." -ForegroundColor Yellow
cd backend
if (Test-Path ".\venv\Scripts\activate.ps1") {
    .\venv\Scripts\activate.ps1
}
pytest
if ($LASTEXITCODE -ne 0) { 
    Write-Host "[FAIL] Falha nos testes do Backend!" -ForegroundColor Red
    cd ..
    exit $LASTEXITCODE 
}
cd ..

# 2. Frontend Tests
Write-Host "`n[2/3] Testando Frontend (React/Vitest)..." -ForegroundColor Yellow
cd frontend
# Usamos test:ui que mapeia para vitest
npm run test:ui -- --run
if ($LASTEXITCODE -ne 0) { 
    Write-Host "[FAIL] Falha nos testes do Frontend!" -ForegroundColor Red
    cd ..
    exit $LASTEXITCODE 
}
cd ..

# 3. Voice Bridge Tests
Write-Host "`n[3/3] Testando Voice Bridge (Node.js)..." -ForegroundColor Yellow
cd voice-bridge
npm test
if ($LASTEXITCODE -ne 0) { 
    Write-Host "[FAIL] Falha nos testes do Voice Bridge!" -ForegroundColor Red
    cd ..
    exit $LASTEXITCODE 
}
cd ..

Write-Host "`n[SUCCESS] Todos os testes passaram com sucesso!" -ForegroundColor Green
