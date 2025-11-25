// Helper to call Gemini (prefer @google/genai SDK, fallback to fetch)
import { MODEL as FALLBACK_MODEL } from '../config';

export async function generateWithGemini(prompt: string, opts?: { timeoutMs?: number, model?: string }) {
  const envGeminiKey = process.env.GEMINI_API_KEY || '';
  const envGeminiUrl = process.env.GEMINI_API_URL || '';
  let geminiKey = envGeminiKey;
  if (!geminiKey && envGeminiUrl && (/^(ya29\.|AIza|[A-Za-z0-9_-]{30,})/.test(envGeminiUrl))) {
    geminiKey = envGeminiUrl;
  }

  const saJsonRawTop = process.env.GEMINI_SA_JSON || '';
  const saJsonB64Top = process.env.GEMINI_SA_B64 || '';
  let saCredentialsTop: any = null;
  try {
    if (saJsonRawTop) saCredentialsTop = JSON.parse(saJsonRawTop);
    else if (saJsonB64Top) saCredentialsTop = JSON.parse(Buffer.from(saJsonB64Top, 'base64').toString('utf-8'));
  } catch (e) {
    // ignore
  }

  const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || opts?.timeoutMs || 8000);

  if (!geminiKey && !saCredentialsTop) {
    const err: any = new Error('GEMINI_API_KEY or GEMINI_SA_JSON/GEMINI_SA_B64 missing');
    err.status = 401;
    throw err;
  }

  const extractTextFromSdk = (resp: any) => {
    if (!resp) return '';
    if (typeof resp === 'string') return resp;
    if (Array.isArray(resp) && resp.length) return extractTextFromSdk(resp[0]);
    if (resp.output && Array.isArray(resp.output) && resp.output[0]) {
      try { return resp.output[0].content?.[0]?.text || '' } catch { }
    }
    if (resp.candidates && Array.isArray(resp.candidates) && resp.candidates[0]) return resp.candidates[0].content || resp.candidates[0].text || '';
    if (resp.text) return resp.text;
    if (resp.result) return resp.result;
    return '';
  };

  // Try SDK when available
  let sdkTried = false;
  let sdkError: any = null;
  try {
    const genai = await import('@google/genai');
    const candidateNames = ['GenerativeServiceClient', 'TextServiceClient', 'GenaiClient', 'GenerativeModelsClient'];
    let ClientCtor: any = null;
    for (const name of candidateNames) {
      if ((genai as any)[name] && typeof (genai as any)[name] === 'function') { ClientCtor = (genai as any)[name]; break; }
    }
    if (!ClientCtor) {
      for (const k of Object.keys(genai)) {
        const v = (genai as any)[k];
        if (typeof v === 'function' && (/Client$/.test(k) || /Client$/.test(v?.name || '')) && k !== 'ApiError' && v.name !== 'ApiError') { ClientCtor = v; break; }
      }
    }
    if (!ClientCtor) {
      for (const k of Object.keys(genai)) {
        const v = (genai as any)[k];
        if (typeof v === 'function') {
          const proto = v.prototype || {};
          if (proto.generate || proto.generateText || proto.generateContent) { ClientCtor = v; break; }
        }
      }
    }

    if (ClientCtor) {
      const clientOpts: any = {};
      if (saCredentialsTop) {
        clientOpts.credentials = saCredentialsTop;
        console.log('[genai] using service account credentials from GEMINI_SA_JSON/GEMINI_SA_B64');
      } else {
        console.log('[genai] no service account found; SDK will try default behavior');
      }
      const client = new ClientCtor(clientOpts);
      try {
        const model = opts?.model || process.env.GEMINI_MODEL || 'gemini-1.5-pro';
        const parentEnv = process.env.GEMINI_PARENT || '';
        const sdkModel = parentEnv ? `${parentEnv.replace(/\/$/, '')}/models/${model}` : `models/${model}`;
        const req: any = { model: sdkModel, prompt: { text: prompt } };
        console.log('[genai] SDK request:', { sdkModel, samplePrompt: prompt.slice(0, 120) });
        const p = client.generateText?.(req) || client.generateContent?.(req) || client.generate?.(req);
  const resp = await Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('AI timeout')), timeoutMs))]);
        console.log('[genai] SDK raw response:', resp);
        const text = extractTextFromSdk(resp);
        sdkTried = true;
        if (text) return String(text);
        sdkError = new Error('Empty SDK response');
      } catch (e) {
        sdkTried = true;
        sdkError = e;
        console.warn('[genai] SDK call failed', e?.message || e);
      }
    }
  } catch (e) {
    console.warn('[genai] SDK unavailable', e?.message || e);
  }

  // If SDK was not available but we have service account JSON, try to mint an OAuth access token
  // using google-auth-library and then use that token for HTTP fetch calls below.
  let saAccessToken: string | null = null;
  try {
    if (!sdkTried && saCredentialsTop) {
      try {
        const {JWT} = await import('google-auth-library');
        const jwtClient = new JWT({
          email: saCredentialsTop.client_email,
          key: saCredentialsTop.private_key,
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const res = await jwtClient.authorize();
        saAccessToken = res?.access_token || null;
        if (saAccessToken) console.log('[genai] minted access token from SA JSON');
        // Debug: list available models for the project (helps diagnose 404 / billing issues)
        try {
          const modelsUrl = 'https://generativelanguage.googleapis.com/v1/models';
          const mres = await fetch(modelsUrl, { method: 'GET', headers: { Authorization: `Bearer ${saAccessToken}` } });
          const mtext = await mres.text().catch(()=>'');
          console.log('[genai] GET /v1/models status', mres.status, mres.statusText);
          console.log('[genai] GET /v1/models body (raw)', mtext.slice(0,2000));
        } catch (me) {
          console.warn('[genai] GET /v1/models failed', me?.message || me);
        }
      } catch (e) {
        console.warn('[genai] SA token minting failed', e?.message || e);
      }
    }
  } catch (e) {
    console.warn('[genai] SA token flow error', e?.message || e);
  }

  // If we used service-account and SDK failed, abort and return error (avoid HTTP key fallback)
  const hasSa = Boolean(saCredentialsTop);
  if (hasSa && sdkTried) {
    const err: any = new Error(`Gemini SDK error: ${sdkError?.message || 'SDK call failed'}`);
    err.status = sdkError?.status || 500;
    throw err;
  }

  // HTTP fetch fallback
  const baseUrl = (process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
  const model = opts?.model || process.env.GEMINI_MODEL || 'gemini-1.5-pro';
  const parentEnv = process.env.GEMINI_PARENT || '';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const altModels = [model, 'text-bison-001', 'chat-bison-001'];
  const candidates: Array<{ path: string; body: any }> = [];
  for (const m of altModels) {
    if (!m) continue;
    candidates.push({ path: `/v1/models/${m}:generate`, body: { prompt: { text: prompt } } });
    candidates.push({ path: `/models/${m}:generate`, body: { prompt: { text: prompt } } });
    if (parentEnv) {
      const parent = parentEnv.replace(/\/$/, '');
      candidates.push({ path: `/v1/${parent}/models/${m}:generate`, body: { prompt: { text: prompt } } });
      candidates.push({ path: `/${parent}/models/${m}:generate`, body: { prompt: { text: prompt } } });
    }
  }
  candidates.push({ path: '/v1/completions', body: { model, prompt } });
  candidates.push({ path: '/completions', body: { model, prompt } });
  candidates.push({ path: '/completions', body: { model, input: prompt } });

  let lastErr: any = null;
  try {
    for (const c of candidates) {
      const url = baseUrl + c.path;
      console.log('[genai] trying endpoint', url, { bodySample: JSON.stringify(c.body).slice(0, 200) });
      try {
        const isApiKey = typeof geminiKey === 'string' && (/^AIza/).test(geminiKey);
        const fetchUrl = isApiKey ? `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(geminiKey)}` : url;
        const headers: any = { 'Content-Type': 'application/json' };
        // Prefer SA minted access token when available
        if (saAccessToken) {
          headers['Authorization'] = `Bearer ${saAccessToken}`;
        } else if (!isApiKey && geminiKey) {
          headers['Authorization'] = `Bearer ${geminiKey}`;
        }
        const maskedKey = isApiKey ? `${geminiKey.slice(0,4)}...${geminiKey.slice(-4)}` : (saAccessToken ? 'Bearer <sa-token>' : (geminiKey ? 'Bearer *****' : 'none'));
        console.log('[genai] fetch url final (masked key)', url, { usingApiKey: isApiKey, key: maskedKey });
        const resp = await fetch(fetchUrl, { method: 'POST', headers, body: JSON.stringify(c.body), signal: controller.signal });
        console.log('[genai] response status', url, resp.status, resp.statusText);
        const rawText = await resp.text().catch(() => '');
        console.log('[genai] response body (raw)', url, rawText.slice(0, 1000));
        if (!resp.ok) {
          lastErr = new Error(`Gemini error at ${url}: ${resp.status} ${resp.statusText} ${rawText}`);
          (lastErr as any).status = resp.status;
          if (resp.status === 404) continue;
          clearTimeout(timer);
          throw lastErr;
        }
        let data: any = {};
        try { data = JSON.parse(rawText || '{}'); } catch (pErr) { data = {}; }
        clearTimeout(timer);
        console.log('[genai] parsed data keys', Object.keys(data || {}));
        const text = data?.choices?.[0]?.text || data?.output?.[0]?.content?.[0]?.text || data?.text || data?.result || data?.candidates?.[0]?.content || '';
        if (text) return String(text);
        lastErr = new Error(`Empty body from ${url}`);
      } catch (innerErr: any) {
        if (innerErr.name === 'AbortError') { clearTimeout(timer); throw new Error('AI timeout'); }
        lastErr = innerErr; continue;
      }
    }
  } finally {
    clearTimeout(timer);
  }

  const err: any = new Error(`Gemini error: no working endpoint (last error: ${lastErr?.message || 'unknown'})`);
  err.status = lastErr?.status || 404;
  // If everything returned 404, suggest using local fallback model or check billing/API
  if (lastErr?.status === 404) {
    console.warn('[genai] All Gemini endpoints returned 404. Suggest falling back to', FALLBACK_MODEL);
    const ferr: any = new Error(`Gemini endpoints not available (404). Suggest using fallback model: ${FALLBACK_MODEL} or enable Generative API / billing for project.`);
    ferr.status = 502;
    throw ferr;
  }
  throw err;
}

export function isGeminiConfigured() {
  const k = process.env.GEMINI_API_KEY || process.env.GEMINI_API_URL || process.env.GEMINI_SA_JSON || process.env.GEMINI_SA_B64 || '';
  return Boolean(k);
}
