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
    const apiPath = (name: string) => `./api/${name}.js`

    try {
        const p = apiPath('matrix')
        if (fs.existsSync(p)) {
            const mod = await import(p as any)
            matrixHandler = (mod && (mod.default ?? mod))
        }
    } catch (_) {}
    try {
        const p = apiPath('tarot')
        if (fs.existsSync(p)) {
            const mod = await import(p as any)
            tarotHandler = (mod && (mod.default ?? mod))
        }
    } catch (_) {}
    try {
        const p = apiPath('compat')
        if (fs.existsSync(p)) {
            const mod = await import(p as any)
            compatHandler = (mod && (mod.default ?? mod))
        }
    } catch (_) {}
    try {
        const p = apiPath('zodiac')
        if (fs.existsSync(p)) {
            const mod = await import(p as any)
            zodiacHandler = (mod && (mod.default ?? mod))
        }
    } catch (_) {}
    try {
        const p = apiPath('pro')
        if (fs.existsSync(p)) {
            const mod = await import(p as any)
            proHandler = (mod && (mod.default ?? mod))
        }
    } catch (_) {}

    const port = Number(process.env.PORT || 3000)

    if (express) {
        const cors = (await import('cors')).default
        const app = express()
        app.use(cors({ origin: 'http://localhost:5173' }))
        app.use(express.json())

        if (matrixHandler) app.post('/api/matrix', (req, res) => matrixHandler(req, res))
        if (tarotHandler) app.post('/api/tarot', (req, res) => tarotHandler(req, res))
        if (compatHandler) app.post('/api/compat', (req, res) => compatHandler(req, res))
        if (zodiacHandler) app.post('/api/zodiac', (req, res) => zodiacHandler(req, res))
        if (proHandler) app.post('/api/pro', (req, res) => proHandler(req, res))

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