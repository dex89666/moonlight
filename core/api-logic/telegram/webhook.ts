import type { VercelRequest, VercelResponse } from '@vercel/node'
// ⭐️ ИСПРАВЛЕНО: Путь стал ../../../data/ + добавлено .js
import { setPro } from '../../../data/store.js'

function addDays(days: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

// ⭐️ (Эта вспомогательная функция остается без изменений)
async function sendTelegramMessage(token: string, chatId: number, text: string, replyMarkup: any = null) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body: any = {
    chat_id: chatId,
    text: text,
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ⭐️ ИСПРАВЛЕНО: 'export default' заменен на 'export async function'
export async function handleTelegramWebhook(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  // ... (проверка секрета, если есть) ...
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  const got = (req.headers['x-telegram-bot-api-secret-token'] || req.query.secret_token) as
    | string
    | undefined
  if (expected && got !== expected) return res.status(401).send('bad token')

  const update = req.body as any
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return res.status(500).send('no bot token')

  const msg = update?.message
  const chatId = msg?.chat?.id
  const text: string = msg?.text || ''

  if (typeof chatId !== 'number') return res.status(200).json({ ok: true })

  // --- ⭐️ (Эта логика остается без изменений) ⭐️ ---

  try {
    const startMatch = text.startsWith('/start')
      ? (text.split(' ').slice(1).join(' ') || '').trim()
      : ''

    // 1. Проверяем Активацию PRO
    if (startMatch && startMatch.startsWith('pro_')) {
      const userId = decodeURIComponent(startMatch.slice(4))
      const until = addDays(30)
      setPro(userId, until)
      
      const message = `PRO активирован до ${until.substring(0, 10)}. Спасибо!`
      await sendTelegramMessage(token, chatId, message);

    } 
    // 2. Проверяем обычный /start
    else if (text === '/start') {
      const message = "Добро пожаловать! \n\nНажмите кнопку ниже, чтобы открыть приложение.";
      const webAppUrl = 'https://moonlight-rouge-gamma.vercel.app';
      const replyMarkup = {
        inline_keyboard: [
          [ 
            { 
              text: "✨ Открыть приложение", 
              web_app: { url: webAppUrl } 
            }
          ]
        ]
      };
      
      await sendTelegramMessage(token, chatId, message, replyMarkup);
      
    } 
    // 3. (По желанию) Отвечаем на любой другой текст
    else {
      // (Этот блок остается пустым)
    }

  } catch (e: any) {
    console.error(e);
    await sendTelegramMessage(token, chatId, `Произошла ошибка: ${e.message}`);
  }

  return res.status(200).json({ ok: true })
}