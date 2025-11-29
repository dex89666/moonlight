import type { VercelRequest, VercelResponse } from '@vercel/node'
import { kv } from '../core/db.js'

function safePreview(s?: string | null, n = 120) {
  if (!s) return null
  return String(s).slice(0, n)
}

async function handleProbe(_req: VercelRequest) {
  const candidates = [
    { url: process.env.VERCEL_KV_REST_URL, token: process.env.VERCEL_KV_REST_TOKEN, name: 'VERCEL_KV_REST' },
    { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN, name: 'KV_REST_API' },
    { url: process.env.KV_REST_URL, token: process.env.KV_REST_TOKEN, name: 'KV_REST' }
  ]
  const probes: any[] = []
  for (const c of candidates) {
    if (!c.url) continue
    const parsed: any = { name: c.name, hasUrl: true }
    try { const u = new URL(String(c.url)); parsed.origin = u.origin; parsed.pathname = u.pathname } catch (e:any) { parsed.invalidUrl = true }
    try { const head = await fetch(String(c.url), { method: 'HEAD' }); parsed.head = { ok: head.ok, status: head.status, headers: Array.from(head.headers.keys()).slice(0,10) } } catch (e:any) { parsed.headError = safePreview(String(e?.message || e),300) }
    if (c.token) {
      try { const base = String(c.url).replace(/\/$/, ''); const probeUrl = `${base}/v1/kv/__probe__`; const g = await fetch(probeUrl, { method: 'GET', headers: { Authorization: `Bearer ${c.token}` } as any }); parsed.probe = { ok: g.ok, status: g.status, headers: Array.from(g.headers.entries()).slice(0,6).map(([k,v])=>[k,safePreview(v,60)]) } } catch (e:any) { parsed.probeError = safePreview(String(e?.message || e),400) }
    } else { parsed.probe = { ok: null, status: null, note: 'no-token' } }
    probes.push(parsed)
  }
  return { ok: true, probes }
}

async function handleKvTest(_req: VercelRequest) {
  const key = '__diag_manual_test__'
  const value = String(Date.now())
  const out: any = { set: null, get: null }
  try { const setRes = await kv.set(key, value); out.set = { ok: !!setRes } } catch (e:any) { out.set = { ok: false, error: safePreview(String(e?.message || e),300) } }
  try { const got = await kv.get(key); out.get = { value: got } } catch (e:any) { out.get = { error: safePreview(String(e?.message || e),300) } }
  return { ok: true, probe: out }
}

async function handleStatus(_req: VercelRequest) {
  const info: any = { env: {} }
  const keys = ['VERCEL_KV_REST_URL','VERCEL_KV_REST_TOKEN','KV_REST_API_URL','KV_REST_API_TOKEN']
  for (const k of keys) { info.env[k] = typeof process.env[k] === 'string' && process.env[k]!.trim() !== '' }
  return { ok: true, info }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String(req.query.action || 'probe')
  try {
    if (action === 'probe') return res.status(200).json(await handleProbe(req))
    if (action === 'kv-test') return res.status(200).json(await handleKvTest(req))
    if (action === 'status') return res.status(200).json(await handleStatus(req))
    return res.status(400).json({ ok: false, error: 'unknown action' })
  } catch (e:any) {
    return res.status(500).json({ ok: false, error: safePreview(String(e?.message || e), 500) })
  }
}
