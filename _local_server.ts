import dotenv from 'dotenv'
dotenv.config()

async function main() {
    // Dynamic load express to allow running without dev deps installed
    let express: any = null
    try {
        express = await import('express').then(m => m.default ?? m)
    } catch (err) {
        // express missing — we'll fall back to tiny http server
        console.warn('[local_server] express not available, falling back to stub http server')
    }

    // Import handlers dynamically to avoid ESM/require issues when running minimal stub
    let matrixHandler: any = null
    let tarotHandler: any = null
    let compatHandler: any = null
    let zodiacHandler: any = null
    let proHandler: any = null

    // Use fs.existsSync + constructed path to avoid TypeScript static module resolution
    const fs = await import('fs')
    // try .js then .ts (local dev may have .ts handlers)
    const apiPathCandidates = (name: string) => [`./api/${name}.js`, `./api/${name}.ts`]

    try {
        for (const p of apiPathCandidates('matrix')) {
            if (fs.existsSync(p)) {
                const mod = await import(p as any)
                matrixHandler = (mod && (mod.default ?? mod))
                console.log('[local_server] loaded matrix handler from', p)
                break
            }
        }
    } catch (err) { console.warn('[local_server] matrix load error', err) }
    try {
        for (const p of apiPathCandidates('tarot')) {
            if (fs.existsSync(p)) {
                const mod = await import(p as any)
                tarotHandler = (mod && (mod.default ?? mod))
                console.log('[local_server] loaded tarot handler from', p)
                break
            }
        }
    } catch (err) { console.warn('[local_server] tarot load error', err) }
    try {
        for (const p of apiPathCandidates('compat')) {
            if (fs.existsSync(p)) {
                const mod = await import(p as any)
                compatHandler = (mod && (mod.default ?? mod))
                console.log('[local_server] loaded compat handler from', p)
                break
            }
        }
    } catch (err) { console.warn('[local_server] compat load error', err) }
    try {
        for (const p of apiPathCandidates('zodiac')) {
            if (fs.existsSync(p)) {
                const mod = await import(p as any)
                zodiacHandler = (mod && (mod.default ?? mod))
                console.log('[local_server] loaded zodiac handler from', p)
                break
            }
        }
    } catch (err) { console.warn('[local_server] zodiac load error', err) }
    try {
        for (const p of apiPathCandidates('pro')) {
            if (fs.existsSync(p)) {
                const mod = await import(p as any)
                proHandler = (mod && (mod.default ?? mod))
                console.log('[local_server] loaded pro handler from', p)
                break
            }
        }
    } catch (err) { console.warn('[local_server] pro load error', err) }

    const port = Number(process.env.PORT || 3333)

    if (express) {
        const cors = (await import('cors')).default
        const app = express()
        app.use(cors({ origin: 'http://localhost:5173' }))
        app.use(express.json())
        // Log all incoming requests for debugging
        app.use((req, res, next) => {
            console.log('[local_server] incoming', req.method, req.path)
            next()
        })

        console.log('[local_server] handlers present:', {
            matrix: !!matrixHandler,
            tarot: !!tarotHandler,
            compat: !!compatHandler,
            zodiac: !!zodiacHandler,
            pro: !!proHandler,
        })

    if (matrixHandler) app.post('/api/matrix', (req, res) => { console.log('[local_server] invoke /api/matrix'); return matrixHandler(req, res) })
    if (tarotHandler) app.post('/api/tarot', (req, res) => { console.log('[local_server] invoke /api/tarot'); return tarotHandler(req, res) })
    if (compatHandler) app.post('/api/compat', (req, res) => { console.log('[local_server] invoke /api/compat'); return compatHandler(req, res) })
    if (zodiacHandler) app.post('/api/zodiac', (req, res) => { console.log('[local_server] invoke /api/zodiac'); return zodiacHandler(req, res) })
    if (proHandler) app.post('/api/pro', (req, res) => { console.log('[local_server] invoke /api/pro'); return proHandler(req, res) })

        app.listen(port, () => console.log(`[local_server] express server listening on ${port}`))
    } else {
        const http = await import('node:http')
        http.createServer((req, res) => {
            if (req.url && req.url.startsWith('/api')) {
                // If handlers are missing, return helpful JSON rather than crash
                res.writeHead(501, { 'Content-Type': 'application/json; charset=utf-8' })
                res.end(JSON.stringify({ error: 'local API disabled - install dependencies to enable' }))
                return
            }
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
            res.end('local dev API stub - express not installed')
        }).listen(port, () => console.log(`[local_server] stub server listening on ${port}`))
    }
}

// run main
void main()