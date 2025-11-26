import type { VercelRequest, VercelResponse } from '@vercel/node';

function mask(s: string | undefined) {
  if (!s) return '---';
  if (s.length <= 8) return s.replace(/./g, '*');
  return s.slice(0, 4) + '...' + s.slice(-4);
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const env = {
    GEMINI_API_KEY: mask(process.env.GEMINI_API_KEY),
    GEMINI_MODEL: process.env.GEMINI_MODEL || process.env.MODEL || 'not-set',
    GEMINI_PARENT: mask(process.env.GEMINI_PARENT),
    FORCE_CANNED: process.env.FORCE_CANNED || process.env.FORCE_OFFLINE || process.env.USE_CANNED || '0',
  };

  return res.json({ ok: true, env });
}
