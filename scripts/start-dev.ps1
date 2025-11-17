<#
Unified PowerShell dev launcher for the monorepo.
It opens three separate windows (backend, apps/web, apps/web-3d) and runs npm dev commands.

Usage: run PowerShell as Administrator or with execution policy that allows script execution, then:
  cd D:\miniapp
  .\scripts\start-dev.ps1

This script replaces older start-all/start-backend/start-web-3d scripts.
#>

param(
  [string]$RepoRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path) + "\.."
)

$repoRoot = (Resolve-Path $RepoRoot).Path
Write-Host "Repo root: $repoRoot"

# Paths
$backendFolder = $repoRoot
$webFolder = Join-Path $repoRoot 'apps\web'
$web3dFolder = Join-Path $repoRoot 'apps\web-3d'

function Start-Window($title, $workdir, $command) {
  $escaped = "cd /d `"$workdir`" & $command"
  $arg = "/c start ""$title"" cmd /k `"$escaped`""
  Start-Process -FilePath cmd.exe -ArgumentList $arg | Out-Null
  Write-Host "Launched: $title -> $workdir"
}

Write-Host "Launching backend..."
Start-Window "moonlight-backend" $backendFolder "npm run dev:api"

Start-Sleep -Milliseconds 400

Write-Host "Launching apps/web..."
Start-Window "moonlight-web" $webFolder "npm run dev"

Start-Sleep -Milliseconds 400

Write-Host "Launching apps/web-3d..."
Start-Window "moonlight-web-3d" $web3dFolder "npm run dev"

Write-Host "All processes launched. Check the new windows for logs."
