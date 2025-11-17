@echo off
REM Start frontend dev server in apps/web
cd /d %~dp0
cd /d %~dp0\..
set LOGDIR=%~dp0\..\..\logs
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
set LOGFILE=%LOGDIR%\frontend-%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%.log

powershell -Command "Write-Output 'Starting frontend (Vite) in apps/web...' | Tee-Object -FilePath '%LOGFILE%'"

if not exist "%~dp0\node_modules" (
		powershell -Command "Write-Output 'node_modules not found, running npm install...' | Tee-Object -FilePath '%LOGFILE%' -Append"
		npm install --no-audit --no-fund 2>&1 | powershell -Command "& { $input | Tee-Object -FilePath '%LOGFILE%' -Append }"
) else (
		powershell -Command "Write-Output 'node_modules exists, skipping install.' | Tee-Object -FilePath '%LOGFILE%' -Append"
)

powershell -Command "Write-Output 'Running: npm run dev (logs -> %LOGFILE%)' | Tee-Object -FilePath '%LOGFILE%' -Append"
npm run dev 2>&1 | powershell -Command "& { $input | Tee-Object -FilePath '%LOGFILE%' -Append }"

echo Frontend process exited. See log: %LOGFILE%
echo Press any key to close this window...
pause >nul
