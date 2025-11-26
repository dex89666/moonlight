import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

// minimal helper to mask secrets
function mask(s: string | undefined) {
  if (!s) return '---';
  if (s.length <= 8) return s.replace(/./g, '*');
  return s.slice(0, 4) + '...' + s.slice(-4);
}

async function tryMintSaToken(saJsonRaw?: string) {
  if (!saJsonRaw) return { ok: false, error: 'no sa json' };
  try {
    // lazy require so installs without google-auth-library won't break
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GoogleAuth } = require('google-auth-library');
    const sa = JSON.parse(saJsonRaw);
    const auth = new GoogleAuth({
      credentials: sa,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return { ok: true, token: token?.token || null };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const env = {
    GEMINI_API_KEY: mask(process.env.GEMINI_API_KEY),
    GEMINI_MODEL: process.env.GEMINI_MODEL || process.env.MODEL || 'not-set',
    GEMINI_PARENT: mask(process.env.GEMINI_PARENT),
    FORCE_CANNED: process.env.FORCE_CANNED || process.env.FORCE_OFFLINE || process.env.USE_CANNED,
  };

  // try to load SA from env or file
  const saRaw = process.env.GEMINI_SA_JSON || (process.env.GEMINI_SA_B64 ? Buffer.from(process.env.GEMINI_SA_B64, 'base64').toString('utf8') : undefined);

  const saFromFilePath = path.join(process.cwd(), 'root-habitat-474808-q1-c1f1.json');
  let saFromFile: string | undefined;
  if (!saRaw && fs.existsSync(saFromFilePath)) {
    try { saFromFile = fs.readFileSync(saFromFilePath, 'utf8'); } catch (e) { /* ignore */ }
  }

  const saToUse = saRaw || saFromFile;

  const mint = await tryMintSaToken(saToUse);

  // try GET /v1/models with SA token if minted
  let modelsResult: any = null;
  if (mint.ok && mint.token) {
    try {
      const u = 'https://generativelanguage.googleapis.com/v1/models';
      const r = await fetch(u, { headers: { Authorization: `Bearer ${mint.token}` }, method: 'GET' });
      const txt = await r.text();
      modelsResult = { status: r.status, body: txt.slice(0, 2000) };
    } catch (e: any) {
      modelsResult = { error: String(e?.message || e) };
    }
  }

  // also try with API key (if present)
  let modelsKeyResult: any = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      const key = process.env.GEMINI_API_KEY;
      const u = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`;
      const r = await fetch(u, { method: 'GET' });
      const txt = await r.text();
      modelsKeyResult = { status: r.status, body: txt.slice(0, 2000) };
    } catch (e: any) {
      modelsKeyResult = { error: String(e?.message || e) };
    }
  }

  return res.json({ env, minted: mint, modelsWithSa: modelsResult, modelsWithKey: modelsKeyResult });
}
