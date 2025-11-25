import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai'; // ⭐️ Используем SDK
import { isValidDateStr } from '../guard.js';
import { pathNumber, summaryForPath } from '../numerology.js';
import { getUser } from '../../data/store.js';
import { kv } from '../db.js'; 

export async function handleMatrix(req: VercelRequest, res: VercelResponse) {
  console.log('[Matrix] 🚀 Начало обработки...');

  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const body = req.body || {}
  let { birthDate, userId = 'guest' } = body

  console.log(`[Matrix] Data: date=${birthDate}, user=${userId}`)

  // If birthDate not provided, try to read from subscription storage
  try {
    const raw = await kv.get(`sub:${userId}`)
    if (raw) {
      try {
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!birthDate && obj.birthDate) birthDate = obj.birthDate
      } catch (e) {
        // ignore parse
      }
    }
  } catch (e) {
    console.warn('[Matrix] KV read for birthDate failed', e)
  }

  if (!birthDate || !isValidDateStr(birthDate)) {
    return res.status(400).send('bad date')
  }

  let isPro = false
  let matrixData: any = null

  try {
    const u = getUser(userId);
    // Проверка подписки через KV
    try {
      const raw = await kv.get(`sub:${userId}`)
      if (raw) {
        try {
          const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
          if (obj && obj.expiry) {
            isPro = new Date(obj.expiry) > new Date()
          }
        } catch (e) {
          // legacy single-string expiry support
          if (typeof raw === 'string') {
            const maybeIso = raw
            isPro = new Date(maybeIso) > new Date()
          }
        }
      }
    } catch (kvErr) {
      console.error('[Matrix] KV error:', kvErr)
    }

    const p = pathNumber(birthDate);
    const s = summaryForPath(p);

  matrixData = {
      keyNumber: p,
      summary: s.summary,
      traits: s.traits
    };

    const PRO_PROMPT = `
    Подробный PRO-отчёт.
    Входные данные:
    - Ключевое число: ${p}
    - Основная тема: "${s.summary}"
    - Связанные качества: ${s.traits.join(', ')}

    Сгенерируй детальный, структурированный отчёт из 3-5 абзацев, раскрывающий сильные стороны, слабости и рекомендации.`;

    const FREE_PROMPT = `Короткий психологический портрет — ключевое число ${p}. ${s.summary}. Кратко: ${s.traits.slice(0,3).join(', ')}.`;

    const prompt = isPro ? PRO_PROMPT : FREE_PROMPT;

   if (!process.env.OPENAI_API_KEY) {
     const stub = isPro ? `Локальный тест PRO: ${birthDate}` : FREE_PROMPT;
     return res.json({ analysis: stub, isPro, brief: !isPro, matrixData, source: 'stub' });
   }
    
  console.log('[Matrix] 🤖 Подготовка запроса в OpenAI...');
  try {
    const model = process.env.MODEL || 'mistralai/mistral-7b-instruct:free'
    const baseURL = 'https://openrouter.ai/api/v1'
    const rawKey = process.env.OPENAI_API_KEY || ''
    const masked = rawKey ? `${rawKey.slice(0,4)}...${rawKey.slice(-4)}` : '(none)'
    console.log('[Matrix] DEBUG: model=', model, ' baseURL=', baseURL, ' OPENAI_KEY_MASK=', masked)
  } catch(e){}

    // Auto-detect provider: if key looks like OpenAI secret (sk-...) use official OpenAI API,
    // otherwise use OpenRouter baseURL. This helps when Vercel env contains an OpenAI key.
    // Provider override via env: OPENAI_PROVIDER = 'openai' or 'openrouter'
    const providerOverride = (process.env.OPENAI_PROVIDER || '').toLowerCase()
    const rawKey = process.env.OPENAI_API_KEY || ''
    const looksLikeOpenRouterKey = rawKey.startsWith('sk-or-') || rawKey.includes('openrouter')
    const looksLikeOpenAIKey = !looksLikeOpenRouterKey && rawKey.startsWith('sk-')
    const openaiConfig: any = { apiKey: rawKey }

    // Gemini detection: explicit override OR presence of GEMINI_API_KEY
    // Support two common setups:
    // - GEMINI_API_KEY contains the secret key and GEMINI_API_URL is the endpoint
    // - accidental case: user put key into GEMINI_API_URL (we detect that and use as key)
    let geminiKey = process.env.GEMINI_API_KEY || ''
    const envGeminiUrl = process.env.GEMINI_API_URL || ''
    // If GEMINI_API_KEY missing but GEMINI_API_URL looks like a key (starts with 'ya29.' or 'AIza' or has long token), use it as key
    if (!geminiKey && envGeminiUrl && (/^(ya29\.|AIza|[A-Za-z0-9_-]{30,})/.test(envGeminiUrl))) {
      console.warn('[Matrix] GEMINI_API_KEY missing — using GEMINI_API_URL value as key (please rename env var)')
      geminiKey = envGeminiUrl
    }
    const providerOverrideGemini = (process.env.OPENAI_PROVIDER || '').toLowerCase() === 'gemini'
    const chooseGemini = providerOverrideGemini || (!!geminiKey && !providerOverride)

    let chosenProvider = ''
    if (chooseGemini) {
      chosenProvider = 'Gemini (forced/present GEMINI_API_KEY)'
    } else if (providerOverride === 'openai') {
      chosenProvider = 'OpenAI (forced by OPENAI_PROVIDER)'
    } else if (providerOverride === 'openrouter') {
      chosenProvider = 'OpenRouter (forced by OPENAI_PROVIDER)'
      openaiConfig.baseURL = 'https://openrouter.ai/api/v1'
    } else {
      // fallback to auto-detection
      if (looksLikeOpenRouterKey) {
        chosenProvider = 'OpenRouter (auto-detected)'
        openaiConfig.baseURL = 'https://openrouter.ai/api/v1'
      } else if (looksLikeOpenAIKey) {
        chosenProvider = 'OpenAI (auto-detected)'
      } else {
        chosenProvider = 'OpenRouter (default fallback)'
        openaiConfig.baseURL = 'https://openrouter.ai/api/v1'
      }
    }

    console.log('[Matrix] Selected provider:', chosenProvider, ' (OPENAI_PROVIDER=', providerOverride || '(none)', ')')

    let text = ''
    if (chooseGemini) {
      // Prefer official @google/genai SDK when available. Fall back to direct fetch if SDK not present.
      let usedSdk = false
      try {
        const genai = await import('@google/genai')
        // Pick a client constructor from common export names, or the first exported class/function
        const candidateNames = ['GenerativeServiceClient', 'TextServiceClient', 'GenaiClient', 'GenerativeModelsClient']
        let ClientCtor: any = null
        for (const name of candidateNames) {
          if ((genai as any)[name]) {
            ClientCtor = (genai as any)[name]
            break
          }
        }
        if (!ClientCtor) {
          // pick the first export that looks like a constructor
          for (const k of Object.keys(genai)) {
            const v = (genai as any)[k]
            if (typeof v === 'function') {
              ClientCtor = v
              break
            }
          }
        }
        if (ClientCtor) {
          usedSdk = true
          console.log('[Matrix] Using @google/genai SDK with client', ClientCtor.name || '(anon)')
          const client = new ClientCtor({})
          const model = process.env.GEMINI_MODEL || 'gemini-1.5-pro'
          const parent = process.env.GEMINI_PARENT || `models/${model}`
          // Use generateText / generateContent depending on SDK version
          try {
            const req: any = {
              model: parent,
              prompt: { text: prompt }
            }
            const resp = await client.generateText?.(req) || await client.generateContent?.(req) || await client.generate?.(req)
            // normalize response
            const out = Array.isArray(resp) ? resp[0] : resp
            text = out?.text || out?.candidates?.[0]?.content || out?.candidates?.[0]?.output?.[0]?.content?.[0]?.text || out?.output?.[0]?.content?.[0]?.text || ''
          } catch (sdkErr: any) {
            console.error('[Matrix] GenAI SDK call failed', sdkErr)
            throw sdkErr
          }
        }
      } catch (impErr) {
        // SDK not available — fall back to fetch
        console.warn('[Matrix] @google/genai SDK not available, falling back to fetch', impErr?.message || impErr)
      }

      if (!usedSdk) {
        try {
          const geminiUrl = process.env.GEMINI_API_URL || 'https://api.gemini.google.com/v1'
          const model = process.env.GEMINI_MODEL || 'gemini-1.5-pro'
          const body = { model, prompt }
          console.log('[Matrix] Calling Gemini (fetch) at', geminiUrl, 'model=', model)
          const resp = await fetch(geminiUrl + '/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${geminiKey}`
            },
            body: JSON.stringify(body),
          })
          if (!resp.ok) {
            const txt = await resp.text().catch(() => '')
            throw new Error(`Gemini error: ${resp.status} ${resp.statusText} ${txt}`)
          }
          const data = await resp.json().catch(() => ({}))
          // Try common shapes
          text = data?.choices?.[0]?.text || data?.output?.[0]?.content?.[0]?.text || data?.text || ''
        } catch (gErr: any) {
          console.error('[Matrix] Gemini call failed', gErr)
          // If network/DNS error (e.g., ENOTFOUND), return a safe local stub instead of 500
          const causeCode = gErr?.cause?.code || gErr?.code || ''
          if (causeCode === 'ENOTFOUND' || causeCode === 'EAI_AGAIN' || gErr?.message?.includes('getaddrinfo')) {
            const fallback = matrixData ? `Короткий портрет: ${matrixData.summary}` : 'Короткий портрет (нет данных)'
            const stub = isPro ? `Локальный PRO-ответ по дате ${birthDate}. Gemini недоступен.` : fallback
            return res.json({ analysis: stub, isPro, brief: !isPro, matrixData, source: 'stub' })
          }
          throw gErr
        }
      }
    } else {
      const openai = new OpenAI(openaiConfig)

      const completion = await openai.chat.completions.create({
        model: process.env.MODEL || "mistralai/mistral-7b-instruct:free",
        messages: [{ role: "user", content: prompt }]
      });

      text = completion.choices[0].message.content || '';
    }

    if (!text) throw new Error('Empty response from AI');

    console.log('[Matrix] ✅ Успех');
    return res.json({ analysis: text, isPro, brief: !isPro, source: 'ai', matrixData });

  } catch (error: any) {
    console.error('[Matrix] ❌ Ошибка:', error);
    // extra debugging fields from OpenAI SDK
    try {
      console.error('[Matrix] error.error =', error?.error);
      console.error('[Matrix] error.code =', error?.code);
      console.error('[Matrix] error.status =', error?.status);
      console.error('[Matrix] error.requestID =', error?.requestID);
      console.error('[Matrix] stack =', error?.stack);
    } catch (logErr) {
      console.error('[Matrix] failed to log error details', logErr);
    }

    // Если провайдер вернул 401 (AuthenticationError), вернём аккуратный локальный stub
    const status = error?.status || error?.code || (error?.error && error.error.code);
    if (status === 401) {
      const fallback = matrixData ? `Короткий портрет: ${matrixData.summary}` : 'Короткий портрет (нет данных)';
      const stub = isPro ? `Локальный PRO-ответ по дате ${birthDate}. Проверьте OPENAI_API_KEY.` : fallback;
      return res.json({ analysis: stub, isPro, brief: !isPro, matrixData, source: 'stub' });
    }

    return res.status(500).send(error.message || 'Internal Error');
  }
}