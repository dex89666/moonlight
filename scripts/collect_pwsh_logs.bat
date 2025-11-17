@echo off
SETLOCAL ENABLEDELAYEDEXPANSION

echo Collecting PowerShell/VS Code logs into project folder...
set OUT_DIR=%~dp0..\logs
for %%I in ("%OUT_DIR%") do set OUT_DIR=%%~fI
if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

echo Output directory: %OUT_DIR%

echo 1) PowerShell version and path > "%OUT_DIR%\pwsh_version.txt"
where pwsh > "%OUT_DIR%\pwsh_where.txt" 2>&1
where powershell >> "%OUT_DIR%\pwsh_where.txt" 2>&1
echo. >> "%OUT_DIR%\pwsh_where.txt"
powershell -NoProfile -Command "$PSVersionTable.PSVersion | Out-String" >> "%OUT_DIR%\pwsh_version.txt" 2>&1

echo 2) VS Code PowerShell Output channel (if available)
echo (this captures last 500 lines if file exists)
set VS_GLOBAL=%APPDATA%\Code\User\globalStorage\ms-vscode.powershell\EditorServices
if exist "%VS_GLOBAL%\EditorServices.log" (
  powershell -NoProfile -Command "Get-Content -Path '%VS_GLOBAL%\EditorServices.log' -Tail 500 | Out-File -FilePath '%OUT_DIR%\\EditorServices.log' -Encoding utf8"
  echo Copied EditorServices.log to %OUT_DIR%\EditorServices.log
) else (
  echo EditorServices.log not found at %VS_GLOBAL% > "%OUT_DIR%\EditorServices.log"
)

echo 3) List PowerShell extension folders
dir "%USERPROFILE%\.vscode\extensions\ms-vscode.powershell-*" /b > "%OUT_DIR%\pwsh_extensions_list.txt" 2>nul || echo No extensions found > "%OUT_DIR%\pwsh_extensions_list.txt"

echo 4) VS Code logs (main)
set CODE_LOGS=%APPDATA%\Code\logs
if exist "%CODE_LOGS%" (
  dir "%CODE_LOGS%" /s /b > "%OUT_DIR%\vscode_logs_list.txt"
) else (
  echo No VS Code logs folder found > "%OUT_DIR%\vscode_logs_list.txt"
)

echo 5) Recent Application Event Viewer entries for PowerShell (requires admin)
echo NOTE: this command may require elevation; if it fails, run cmd as Administrator.
powershell -NoProfile -Command "Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='PowerShell'} -MaxEvents 50 | Format-List -Property TimeCreated,Id,LevelDisplayName,Message" > "%OUT_DIR%\eventviewer_powerShell.txt" 2>nul || echo Event log read failed or access denied > "%OUT_DIR%\eventviewer_powerShell.txt"

echo Done. Collected files:
dir "%OUT_DIR%" /b

echo Please attach the files from %OUT_DIR% here.
pause
