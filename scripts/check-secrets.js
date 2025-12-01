// Lightweight pre-commit secret scanner
// Scans staged files for common secret patterns and blocks commit if found.
import { execSync } from 'child_process'
import fs from 'fs'

function getStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
    return out.split('\n').map(s => s.trim()).filter(Boolean)
  } catch (e) {
    console.error('Failed to get staged files', e)
    return []
  }
}

// Only scan these file extensions to reduce false positives (avoid package-lock, binary blobs)
const allowedExt = ['.js', '.ts', '.env', '.json', '.md', '.yaml', '.yml', '.env.example']

const patterns = [
  /(^|\s)sk-[A-Za-z0-9]{16,}/i, // OpenAI-like
  /AIza[0-9A-Za-z\-_]{35}/, // Google API key
  /-----BEGIN PRIVATE KEY-----/, // PEM
  /GEMINI_API_KEY/i,
  /TELEGRAM_BOT_TOKEN/i,
  /xox[baprs]-[A-Za-z0-9-]+/, // Slack tokens
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWT-like
]

let blocked = []
for (const file of getStagedFiles()) {
  if (!allowedExt.some(ext => file.endsWith(ext))) continue
  let content = ''
  try {
    content = execSync(`git show :"${file}"`, { encoding: 'utf8' })
  } catch (e) {
    if (fs.existsSync(file)) content = fs.readFileSync(file, 'utf8')
  }
  for (const re of patterns) {
    if (re.test(content)) {
      // ignore safe patterns where the token is read from process.env (e.g. process.env.TELEGRAM_BOT_TOKEN)
      if (/TELEGRAM_BOT_TOKEN/i.test(re.source)) {
        const envUsage = /process\.env(?:\[['"`]TELEGRAM_BOT_TOKEN['"`]\]|\.TELEGRAM_BOT_TOKEN)/.test(content)
        if (envUsage) continue
      }
      blocked.push({ file, pattern: re.toString() })
      break
    }
  }
}

if (blocked.length) {
  console.error('\n🚨 Secret patterns detected in staged files:')
  for (const b of blocked) console.error(` - ${b.file}  matches ${b.pattern}`)
  console.error('\nRemove secrets from files or unstaged them, then try committing again.')
  process.exit(1)
}

process.exit(0)
