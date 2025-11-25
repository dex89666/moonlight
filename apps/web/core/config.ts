export const SYSTEM_PROMPT = "Ты — эмпатичный и мудрый эзотерический ассистент. Отвечай кратко, тепло и по делу.";
// Allow overriding the model via environment (VERCEL / .env). Keep the previous value as default.
export const MODEL = process.env.MODEL || "mistralai/mistral-7b-instruct:free";