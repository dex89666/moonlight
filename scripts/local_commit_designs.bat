@echo off
REM Local helper to create branch, stage design preview changes and commit locally.
REM Run this from project root in cmd.exe: scripts\local_commit_designs.bat
setlocal

echo === local commit helper ===
REM ensure we're in repo root
cd /d %~dp0\..

:: create branch if not exists and switch
ngit rev-parse --verify feature/design-previews 1>nul 2>nul
if %ERRORLEVEL% EQU 0 (
  echo Branch feature/design-previews exists, checking it out...
  git checkout feature/design-previews || (echo Failed to checkout branch & exit /b 1)
) else (
  echo Creating and checking out branch feature/design-previews...
  git checkout -b feature/design-previews || (echo Failed to create branch & exit /b 1)
)

necho Staging design preview files...
git add apps/web/src/components/DesignPreview.tsx apps/web/public/designs apps/web/public/designs/index.html apps/web/public/designs/*.svg design/concept-eye.svg || (
  echo Warning: git add returned non-zero exit code, continuing...
)

necho Committing...
git commit -m "feat(design): add design preview component and public SVG concepts" || (
  echo Nothing to commit or commit failed.
)

necho Local commit complete. To push this branch to origin, run:
necho git push -u origin feature/design-previews

necho === done ===
endlocal
pause
