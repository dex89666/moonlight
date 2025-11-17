@echo off
echo ==================================================
echo Reinstall PowerShell 7 and VS Code PowerShell extension
echo ==================================================
echo WARNING: run this script as Administrator.
echo It will attempt to install PowerShell via winget, remove PowerShell extension data, and reinstall the extension.
pause

REM Install PowerShell 7 using winget (if available)
where winget >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  echo Installing PowerShell 7 via winget...
  winget install --id Microsoft.PowerShell -e --accept-source-agreements --accept-package-agreements
  echo winget install finished with exit code %ERRORLEVEL%
) else (
  echo winget not found. Please install winget or manually install PowerShell from https://github.com/PowerShell/PowerShell/releases
)

REM Small pause to let installer finish
timeout /t 3 /nobreak >nul

REM Reinstall VS Code PowerShell extension if code CLI exists
where code >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo VS Code CLI 'code' not found in PATH. Skipping extension reinstall.
) else (
  echo Uninstalling PowerShell extension...
  code --uninstall-extension ms-vscode.powershell
  echo Installing PowerShell extension...
  code --install-extension ms-vscode.powershell
)

REM Remove extension storage and cached EditorServices (best-effort)
echo Cleaning PowerShell extension storage...
if exist "%APPDATA%\Code\User\globalStorage\ms-vscode.powershell" (
  rmdir /s /q "%APPDATA%\Code\User\globalStorage\ms-vscode.powershell"
  echo Removed globalStorage for PowerShell extension.
) else (
  echo No globalStorage folder found.
)

for /d %%d in ("%USERPROFILE%\.vscode\extensions\ms-vscode.powershell-*") do (
  echo Removing extension folder %%d
  rmdir /s /q "%%d"
)

echo Done. Please restart your PC (recommended) and then start VS Code.
pause
