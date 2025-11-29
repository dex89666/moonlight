import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const r = await fetch('https://api.ipify.org?format=json', { method: 'GET' })
    const text = await r.text()
    return res.status(200).json({ ok: true, status: r.status, bodyPreview: text.slice(0, 400) })
  } catch (e:any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
}
