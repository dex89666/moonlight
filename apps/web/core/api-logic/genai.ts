// Helper to call Gemini (prefer @google/genai SDK, fallback to fetch)
export async function generateWithGemini(prompt: string, opts?: { timeoutMs?: number, model?: string }) {
  const envGeminiKey = process.env.GEMINI_API_KEY || '';
  const envGeminiUrl = process.env.GEMINI_API_URL || '';
  // accidental case: user put key into GEMINI_API_URL
  let geminiKey = envGeminiKey;
  if (!geminiKey && envGeminiUrl && (/^(ya29\.|AIza|[A-Za-z0-9_-]{30,})/.test(envGeminiUrl))) {
    geminiKey = envGeminiUrl;
  }

  const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || opts?.timeoutMs || 8000);

  if (!geminiKey) {
    const err: any = new Error('GEMINI_API_KEY missing');
    err.status = 401;
    throw err;
  }

  // Try SDK first
  try {
    const genai = await import('@google/genai');
    const candidateNames = ['GenerativeServiceClient', 'TextServiceClient', 'GenaiClient', 'GenerativeModelsClient'];
    let ClientCtor: any = null;
    for (const name of candidateNames) {
      if ((genai as any)[name]) {
        ClientCtor = (genai as any)[name];
        break;
      }
    }
    if (!ClientCtor) {
      for (const k of Object.keys(genai)) {
        const v = (genai as any)[k];
        if (typeof v === 'function') {
          ClientCtor = v;
          break;
        }
      }
    }

    if (ClientCtor) {
      const client = new ClientCtor({});
      const model = opts?.model || process.env.GEMINI_MODEL || 'gemini-1.5-pro';
      const parent = process.env.GEMINI_PARENT || `models/${model}`;
      const req: any = { model: parent, prompt: { text: prompt } };

      const p = client.generateText?.(req) || client.generateContent?.(req) || client.generate?.(req);
      const resp = await Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('AI timeout')), timeoutMs))]);
      const out = Array.isArray(resp) ? resp[0] : resp;
      const text = out?.text || out?.candidates?.[0]?.content || out?.candidates?.[0]?.output?.[0]?.content?.[0]?.text || out?.output?.[0]?.content?.[0]?.text || '';
      return String(text || '');
    }
  } catch (e) {
    // SDK missing or failed -> fallback to fetch
    console.warn('[genai] SDK unavailable, falling back to fetch', (e as any)?.message || e);
  }

  // Fetch fallback: try several plausible Gemini endpoints and shapes.
  const baseUrl = (process.env.GEMINI_API_URL || 'https://api.gemini.google.com/v1').replace(/\/$/, '');
  const model = opts?.model || process.env.GEMINI_MODEL || 'gemini-1.5-pro';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Candidate endpoints to try (some deployments use different paths)
  const candidates = [
    { path: '/completions', body: { model, prompt } },
    { path: '/v1/completions', body: { model, prompt } },
    { path: '/generateText', body: { model, prompt } },
    { path: '/v1/generateText', body: { model, prompt } },
    // Some compatibility layers accept {input} instead of prompt
    { path: '/completions', body: { model, input: prompt } },
  ];

  let lastErr: any = null;
  try {
    for (const c of candidates) {
      const url = baseUrl + c.path;
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${geminiKey}`,
          },
          body: JSON.stringify(c.body),
          signal: controller.signal,
        });
        if (!resp.ok) {
          const txt = await resp.text().catch(() => '');
          lastErr = new Error(`Gemini error at ${url}: ${resp.status} ${resp.statusText} ${txt}`);
          (lastErr as any).status = resp.status;
          // If 404, try next candidate; otherwise break and throw after clearing timer
          if (resp.status === 404) {
            continue
          }
          clearTimeout(timer);
          throw lastErr;
        }

        const data = await resp.json().catch(() => ({}));
        clearTimeout(timer);
        // Try several places for text
        const text = data?.choices?.[0]?.text || data?.output?.[0]?.content?.[0]?.text || data?.text || data?.result || '';
        return String(text || '');
      } catch (innerErr: any) {
        if (innerErr.name === 'AbortError') {
          clearTimeout(timer);
          throw new Error('AI timeout');
        }
        lastErr = innerErr;
        // try next candidate
        continue;
      }
    }
  } finally {
    clearTimeout(timer);
  }

  // If we reach here, none of the endpoints worked
  const err: any = new Error(`Gemini error: no working endpoint (last error: ${lastErr?.message || 'unknown'})`);
  err.status = lastErr?.status || 404;
  throw err;
}

export function isGeminiConfigured() {
  const k = process.env.GEMINI_API_KEY || process.env.GEMINI_API_URL || '';
  return Boolean(k);
}
