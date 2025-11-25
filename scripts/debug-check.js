import { execSync } from 'child_process'
import fs from 'fs'

const out = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' }).split('\n').filter(Boolean)
console.log('staged:', out)
for (const f of out) {
	if (!f.match(/\.js$|\.ts$|\.env$|\.json$|\.md$|\.yaml$|\.yml$|\.env.example$/)) continue
	let content = ''
	try {
		content = execSync(`git show :"${f}"`, { encoding: 'utf8' })
	} catch (e) {
		if (fs.existsSync(f)) content = fs.readFileSync(f, 'utf8')
	}
	console.log('---', f, 'len', content.length)
	const patterns = [/(^|\s)sk-[A-Za-z0-9]{16,}/i, /AIza[0-9A-Za-z\-_]{35}/, /-----BEGIN PRIVATE KEY-----/, /GEMINI_API_KEY/i, /TELEGRAM_BOT_TOKEN/i, /xox[baprs]-[A-Za-z0-9-]+/, /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/]
	for (const p of patterns) {
		if (p.test(content)) console.log('match', p.toString(), 'in', f)
	}
}
