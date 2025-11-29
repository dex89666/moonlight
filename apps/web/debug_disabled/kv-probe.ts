import type { VercelRequest, VercelResponse } from '@vercel/node'

// Safe probe: perform HEAD/GET to REST base and a GET to /v1/kv/__probe__ with available tokens.
// Never include tokens in response; only booleans, statuses, header keys and first N chars of errors.

function safePreview(s?: string | null, n = 120) {
  if (!s) return null
  return String(s).slice(0, n)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed')

  const candidates = [
    { url: process.env.VERCEL_KV_REST_URL, token: process.env.VERCEL_KV_REST_TOKEN, name: 'VERCEL_KV_REST' },
    { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN, name: 'KV_REST_API' },
    { url: process.env.KV_REST_URL, token: process.env.KV_REST_TOKEN, name: 'KV_REST' }
  ]

  const probes: any[] = []

  for (const c of candidates) {
    if (!c.url) continue
    let parsed: any = { name: c.name, hasUrl: true }
    try {
      const u = new URL(String(c.url))
      parsed.origin = u.origin
      parsed.pathname = u.pathname
    } catch (e:any) {
      parsed.invalidUrl = true
    }

    // HEAD to base
    try {
      const head = await fetch(String(c.url), { method: 'HEAD' })
      parsed.head = { ok: head.ok, status: head.status, headers: Array.from(head.headers.keys()).slice(0, 10) }
    } catch (e:any) {
      parsed.headError = safePreview(String(e?.message || e), 300)
    }

    // GET to v1/kv probe key with token if present
    if (c.token) {
      try {
        const base = String(c.url).replace(/\/$/, '')
        const probeUrl = `${base}/v1/kv/__probe__`
        const g = await fetch(probeUrl, { method: 'GET', headers: { Authorization: `Bearer ${c.token}` } as any })
        parsed.probe = { ok: g.ok, status: g.status, headers: Array.from(g.headers.entries()).slice(0, 6).map(([k,v])=>[k,safePreview(v,60)]) }
      } catch (e:any) {
        parsed.probeError = safePreview(String(e?.message || e), 400)
      }
    } else {
      parsed.probe = { ok: null, status: null, note: 'no-token' }
    }

    probes.push(parsed)
  }

  return res.status(200).json({ ok: true, probes })
}
