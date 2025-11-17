@echo off
echo Remove .env and .npmrc from git index and add to .gitignore
cd /d %~dp0\..

echo Checking git status...
git status --porcelain=v1 --branch

echo Removing from index (keeps local files)...
git rm --cached .env .npmrc 2>nul

echo Ensure .gitignore contains .env and .npmrc
findstr /x /c:".env" .gitignore >nul 2>nul || echo .env>>.gitignore
findstr /x /c:".npmrc" .gitignore >nul 2>nul || echo .npmrc>>.gitignore

git add .gitignore
git commit -m "chore(secrets): remove .env and .npmrc from index and add to .gitignore" || echo "Nothing to commit or commit failed"

echo Pushed local commit. To remove secrets from remote history, consider using BFG or git filter-repo.
echo Example (manual):
echo git push origin --delete <branch> ; or use git filter-repo locally then force-push

echo IMPORTANT: rotate any secrets that may have been committed (OpenAI keys, telegram tokens, payment secrets).
echo See README in project root for suggested commands.

pause
