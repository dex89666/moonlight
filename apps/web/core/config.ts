export const SYSTEM_PROMPT = "Ты — эмпатичный и мудрый эзотерически ассистент. Отвечай кратко, тепло и по делу.";
// Allow overriding the model via environment (VERCEL / .env). Keep the previous value as default.
export const MODEL = process.env.MODEL || "mistralai/mistral-7b-instruct:free";

// Gemini (Google Generative Language) configuration
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GEMINI_PARENT = process.env.GEMINI_PARENT || '';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';