# PowerShell script to remove .env and .npmrc from git index and add to .gitignore
$scriptRoot = $PSScriptRoot
$repoRoot = Join-Path $scriptRoot '..'
Set-Location -Path $repoRoot
$logsDir = Join-Path $repoRoot 'logs'
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }
$log = Join-Path $logsDir 'remove_secrets_output_ps.txt'
"--- start $(Get-Date) ---" | Out-File -FilePath $log -Encoding utf8
function L([string]$s) {
    # Tee-Object in Windows PowerShell 5.1 doesn't support -Encoding.
    if ($PSVersionTable.PSVersion.Major -ge 6) {
        $s | Tee-Object -FilePath $log -Append -Encoding utf8
    }
    else {
        # Use Out-File for older Windows PowerShell
        $s | Out-File -FilePath $log -Append -Encoding utf8
    }
}

L "Working directory: $(Get-Location)"
L "Remove .env and .npmrc from git index and add to .gitignore"

L "Checking git status..."
git status --porcelain=v1 --branch 2>&1 | ForEach-Object { L $_ }

L "Removing from index (keeps local files)..."
try {
    git rm --cached .env .npmrc 2>&1 | ForEach-Object { L $_ }
} catch {
    L "git rm threw an exception: $_"
}

L "Ensure .gitignore contains .env and .npmrc"
$gi = Join-Path $repoRoot '.gitignore'
if (-not (Test-Path $gi)) {
    "" | Out-File -FilePath $gi -Encoding utf8
    L ".gitignore created"
}
$lines = Get-Content $gi -ErrorAction SilentlyContinue
if ($lines -notcontains '.env') { '.env' | Add-Content -Path $gi -Encoding utf8; L "Added .env to .gitignore" } else { L ".env already in .gitignore" }
if ($lines -notcontains '.npmrc') { '.npmrc' | Add-Content -Path $gi -Encoding utf8; L "Added .npmrc to .gitignore" } else { L ".npmrc already in .gitignore" }

L "git add .gitignore"
git add .gitignore 2>&1 | ForEach-Object { L $_ }

L "git commit -m 'chore(secrets): remove .env and .npmrc from index and add to .gitignore'"
$commitOutput = git commit -m "chore(secrets): remove .env and .npmrc from index and add to .gitignore" 2>&1 | ForEach-Object { L $_ }
if ($LASTEXITCODE -ne 0) { L "Commit returned exit code $LASTEXITCODE (probably nothing to commit)" } else { L "Commit successful" }

L "IMPORTANT: rotate any secrets that may have been committed (OpenAI keys, telegram tokens, payment secrets)."
L "Done at $(Get-Date)"
"--- end $(Get-Date) ---" | Out-File -FilePath $log -Append -Encoding utf8
