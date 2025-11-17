# Start777.ps1
# Запускает frontend (apps/web) и локальный API сервер в отдельных окнах PowerShell
# Использование: Запустить из корня репозитория: .\Start777.ps1

$cwd = Split-Path -Parent $MyInvocation.MyCommand.Path

# Frontend (Vite)
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$cwd\apps\web'; npm run dev"

# API server (local)
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$cwd'; npm run dev:api"

Write-Host "Launched frontend and API in new PowerShell windows." -ForegroundColor Green
