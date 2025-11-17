@echo off
echo Capture pwsh crash dump helper
echo Usage: put procdump.exe (Sysinternals) into this scripts folder and run this script as Administrator.
setlocal
set SCRIPTDIR=%~dp0
set DUMPDIR=%USERPROFILE%\Desktop\pwsh_dumps
if not exist "%DUMPDIR%" mkdir "%DUMPDIR%"

if exist "%SCRIPTDIR%procdump.exe" (
  echo Found procdump.exe in scripts folder.
  echo Running: procdump -e -ma -w pwsh.exe %DUMPDIR%
  echo (This will wait for pwsh.exe to start/crash and create a full dump in %DUMPDIR%)
  "%SCRIPTDIR%procdump.exe" -e -ma -w pwsh.exe %DUMPDIR%
  echo Done. Check %DUMPDIR% for dump files.
) else (
  echo procdump.exe not found in %SCRIPTDIR%
  echo Download procdump (Sysinternals) from:
  echo https://learn.microsoft.com/sysinternals/downloads/procdump
  echo Then place procdump.exe into the scripts folder and run this script as Administrator.
)

endlocal
pause
