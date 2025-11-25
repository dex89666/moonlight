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

  // Helper to extract text from various SDK shapes
  const extractTextFromSdk = (resp: any) => {
    if (!resp) return '';
    // common shapes
    if (typeof resp === 'string') return resp;
    if (Array.isArray(resp) && resp.length) return extractTextFromSdk(resp[0]);
    if (resp.output && Array.isArray(resp.output) && resp.output[0]) {
      // Google GenAI: output[0].content[0].text
      try { return resp.output[0].content?.[0]?.text || '' } catch { /* ignore */ }
    }
    if (resp.candidates && Array.isArray(resp.candidates) && resp.candidates[0]) {
      return resp.candidates[0].content || resp.candidates[0].text || '';
    }
    if (resp.text) return resp.text;
    if (resp.result) return resp.result;
    return '';
  };

  // Try SDK first
  try {
    const genai = await import('@google/genai');
    // Prefer explicit client exports that end with 'Client'
    const candidateNames = ['GenerativeServiceClient', 'TextServiceClient', 'GenaiClient', 'GenerativeModelsClient'];
    let ClientCtor: any = null;
    for (const name of candidateNames) {
      if ((genai as any)[name] && typeof (genai as any)[name] === 'function') {
        ClientCtor = (genai as any)[name];
        break;
      }
    }
    if (!ClientCtor) {
      for (const k of Object.keys(genai)) {
        const v = (genai as any)[k];
        if (typeof v === 'function' && (/Client$/.test(k) || /Client$/.test(v?.name || '')) && k !== 'ApiError' && v.name !== 'ApiError') {
          ClientCtor = v;
          break;
        }
      }
    }
    if (!ClientCtor) {
      for (const k of Object.keys(genai)) {
        const v = (genai as any)[k];
        if (typeof v === 'function') {
          const proto = v.prototype || {};
          if (proto.generate || proto.generateText || proto.generateContent) {
            ClientCtor = v;
            break;
          }
        }
      }
    }

    if (ClientCtor) {
      console.log('[genai] SDK client ctor found:', ClientCtor.name || '<anonymous>');
      const client = new ClientCtor({});
      try {
        const model = opts?.model || process.env.GEMINI_MODEL || 'gemini-1.5-pro';
        const parent = process.env.GEMINI_PARENT || `models/${model}`;
        const req: any = { model: parent, prompt: { text: prompt } };
        console.log('[genai] SDK request:', { parent, samplePrompt: prompt.slice(0, 120) });
        const p = client.generateText?.(req) || client.generateContent?.(req) || client.generate?.(req);
        const resp = await Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('AI timeout')), timeoutMs))]);
        console.log('[genai] SDK raw response:', resp);
        const text = extractTextFromSdk(resp);
        if (text) return String(text);
        // if SDK gave no text, fallthrough to fetch fallback
        console.warn('[genai] SDK returned empty text, falling back to HTTP fetch fallback');
      } catch (sdkErr) {
        console.warn('[genai] SDK call failed, falling back to fetch', sdkErr && sdkErr.message ? sdkErr.message : sdkErr);
      }
    }
  } catch (e) {
    console.warn('[genai] SDK unavailable, falling back to fetch', (e as any)?.message || e);
  }

  // Fetch fallback: try several plausible Gemini endpoints and shapes.
  // Use Google's Generative Language endpoint by default (recommended)
  // Keep baseUrl without /v1 so we can compose /v1/models/{model}:generate correctly
  const baseUrl = (process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
  const model = opts?.model || process.env.GEMINI_MODEL || 'gemini-1.5-pro';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Build candidate endpoints. If model-specific endpoints 404, try alternative model ids
  const altModels = [
    model,
    'text-bison-001',
    'models/text-bison-001',
    'chat-bison-001',
  ];
  const candidates: Array<{ path: string; body: any }> = [];
  for (const m of altModels) {
    if (!m) continue;
    // ensure paths both with and without /v1
    candidates.push({ path: `/v1/models/${m}:generate`, body: { prompt: { text: prompt } } });
    candidates.push({ path: `/models/${m}:generate`, body: { prompt: { text: prompt } } });
  }
  // generic compatibility endpoints
  candidates.push({ path: '/v1/completions', body: { model, prompt } });
  candidates.push({ path: '/completions', body: { model, prompt } });
  candidates.push({ path: '/completions', body: { model, input: prompt } });

  let lastErr: any = null;
  try {
    for (const c of candidates) {
      const url = baseUrl + c.path;
      console.log('[genai] trying endpoint', url, { bodySample: JSON.stringify(c.body).slice(0, 200) });
      try {
          // If geminiKey looks like an API key (starts with AIza), send as ?key= instead of Bearer
    const isApiKey = typeof geminiKey === 'string' && (/^AIza/).test(geminiKey);
    const fetchUrl = isApiKey ? `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(geminiKey)}` : url;
    const headers: any = { 'Content-Type': 'application/json' };
    if (!isApiKey) headers['Authorization'] = `Bearer ${geminiKey}`;
    // Mask key in logs: show first 4 and last 4 chars
    const maskedKey = isApiKey ? `${geminiKey.slice(0,4)}...${geminiKey.slice(-4)}` : (geminiKey ? 'Bearer *****' : 'none');
    console.log('[genai] fetch url final (masked key)', url, { usingApiKey: isApiKey, key: maskedKey });
          const resp = await fetch(fetchUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(c.body),
            signal: controller.signal,
          });
        console.log('[genai] response status', url, resp.status, resp.statusText);
        const rawText = await resp.text().catch(() => '');
        console.log('[genai] response body (raw)', url, rawText.slice(0, 1000));
        if (!resp.ok) {
          lastErr = new Error(`Gemini error at ${url}: ${resp.status} ${resp.statusText} ${rawText}`);
          (lastErr as any).status = resp.status;
          if (resp.status === 404) {
            continue;
          }
          clearTimeout(timer);
          throw lastErr;
        }

        let data: any = {};
        try { data = JSON.parse(rawText || '{}') } catch (pErr) { data = {} }
        clearTimeout(timer);
        console.log('[genai] parsed data keys', Object.keys(data || {}));
        const text = data?.choices?.[0]?.text || data?.output?.[0]?.content?.[0]?.text || data?.text || data?.result || data?.candidates?.[0]?.content || '';
        if (text) return String(text);
        lastErr = new Error(`Empty body from ${url}`);
      } catch (innerErr: any) {
        if (innerErr.name === 'AbortError') {
          clearTimeout(timer);
          throw new Error('AI timeout');
        }
        lastErr = innerErr;
        continue;
      }
    }
  } finally {
    clearTimeout(timer);
  }

  const err: any = new Error(`Gemini error: no working endpoint (last error: ${lastErr?.message || 'unknown'})`);
  err.status = lastErr?.status || 404;
  throw err;
}

export function isGeminiConfigured() {
  const k = process.env.GEMINI_API_KEY || process.env.GEMINI_API_URL || '';
  return Boolean(k);
}
