/**
 * Telegram Bot Webhook Handler
 * Полная реализация по официальной документации:
 * https://core.telegram.org/bots/payments
 * 
 * Поддерживаемые команды:
 * /start - Приветствие и открытие WebApp
 * /pro, /buy, /subscribe - Отправка счёта на оплату
 * /status - Проверка статуса подписки
 * /terms - Условия использования
 * /support - Контакт поддержки
 * /help - Список команд
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { grantProSubscription, findOrCreateUser, getPaymentsCollection, logAnalytics, getQuotaStatus } from '../../mongodb.js'
import { handleSuccessfulPayment, answerPreCheckoutQuery, sendInvoice, sendMessage } from '../payments/telegram.js'

const PRO_PRICE_STARS = Number(process.env.PRO_PRICE_STARS || 350)
const BOT_USERNAME = (process.env.TELEGRAM_BOT_USERNAME || '@universal_matrix_bot').replace('@', '')
const WEBAPP_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'https://moonlight-rouge-gamma.vercel.app'

// Условия использования
const TERMS_TEXT = `
<b>📜 Условия использования</b>

1. <b>Цифровые товары</b>
Данный бот предоставляет цифровые услуги: нумерологический анализ, расклады Таро, гороскопы.

2. <b>PRO подписка</b>
• Стоимость: ${PRO_PRICE_STARS} Telegram Stars
• Срок действия: 30 дней с момента оплаты
• Включает: безлимитный доступ ко всем функциям

3. <b>Оплата</b>
Оплата производится через Telegram Stars. Возврат возможен в течение 14 дней, если услуга не была использована.

4. <b>Ответственность</b>
Анализ носит развлекательный характер и не является профессиональной консультацией.

5. <b>Персональные данные</b>
Мы сохраняем только Telegram ID и имя пользователя для работы сервиса.

Нажимая «Оплатить», вы соглашаетесь с данными условиями.

Дата обновления: декабрь 2025
`

const SUPPORT_TEXT = `
<b>🆘 Поддержка</b>

Если у вас возникли вопросы или проблемы:

1. <b>По оплате и подписке:</b>
   Напишите нам: @dex89666

2. <b>Технические проблемы:</b>
   Опишите проблему и приложите скриншот

3. <b>Возврат средств:</b>
   Возврат возможен в течение 14 дней, если PRO-функции не были использованы.

⚠️ <i>Обратите внимание: служба поддержки Telegram не сможет помочь с покупками через этого бота.</i>

Обычно мы отвечаем в течение 24 часов.
`

const HELP_TEXT = `
<b>📖 Доступные команды:</b>

/start - Открыть приложение
/pro - Купить PRO подписку
/status - Проверить статус подписки
/terms - Условия использования
/support - Связаться с поддержкой
/help - Показать эту справку

<b>💫 Возможности:</b>
🔢 Матрица Судьбы
💞 Совместимость партнёров
🃏 Расклады Таро
♈ Персональный гороскоп
`

export async function handleTelegramWebhook(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  // Проверка секрета webhook
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  const got = (req.headers['x-telegram-bot-api-secret-token'] || req.query.secret_token) as string | undefined
  if (expected && got !== expected) {
    console.warn('[Webhook] Invalid secret token')
    return res.status(401).send('Unauthorized')
  }

  const update = req.body as any
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return res.status(500).send('TELEGRAM_BOT_TOKEN not configured')

  console.log('[Webhook] Update received:', JSON.stringify(update).slice(0, 800))

  try {
    // ==========================================
    // ШАГ 3: Обработка pre_checkout_query
    // КРИТИЧНО: Ответить нужно в течение 10 секунд!
    // ==========================================
    if (update.pre_checkout_query) {
      const query = update.pre_checkout_query
      console.log('[Webhook] pre_checkout_query:', {
        id: query.id,
        from: query.from?.id,
        currency: query.currency,
        total_amount: query.total_amount,
        invoice_payload: query.invoice_payload
      })
      
      // Проверяем payload (можно добавить дополнительные проверки)
      let canProcess = true
      let errorMessage = ''
      
      try {
        const payload = JSON.parse(query.invoice_payload || '{}')
        // Можно проверить: не истёк ли товар, есть ли в наличии и т.д.
        if (payload.type !== 'pro_subscription') {
          canProcess = false
          errorMessage = 'Неизвестный тип товара'
        }
      } catch {
        // Payload не парсится, но это не критично
      }
      
      // Отвечаем на pre_checkout_query
      await answerPreCheckoutQuery(query.id, canProcess, errorMessage)
      
      return res.status(200).json({ ok: true })
    }

    // ==========================================
    // ШАГ 4-5: Обработка successful_payment
    // Пользователь успешно оплатил!
    // ==========================================
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment
      const from = update.message.from
      const chatId = update.message.chat?.id
      
      console.log('[Webhook] ✅ successful_payment:', {
        telegram_payment_charge_id: payment.telegram_payment_charge_id,
        total_amount: payment.total_amount,
        currency: payment.currency
      })
      
      // Определяем userId
      let userId = String(from?.id || chatId)
      try {
        const payload = JSON.parse(payment.invoice_payload || '{}')
        if (payload.userId) userId = payload.userId
      } catch {}

      // Обрабатываем платёж и сохраняем charge_id
      const result = await handleSuccessfulPayment(
        userId,
        {
          telegram_payment_charge_id: payment.telegram_payment_charge_id,
          provider_payment_charge_id: payment.provider_payment_charge_id,
          total_amount: payment.total_amount,
          currency: payment.currency,
          invoice_payload: payment.invoice_payload
        },
        from
      )

      // Отправляем подтверждение
      if (result.success && chatId) {
        const expiryDate = result.expiresAt?.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }) || 'скоро'
        
        await sendMessage(chatId, 
          `🎉 <b>Спасибо за покупку!</b>\n\n` +
          `✅ PRO подписка успешно активирована!\n` +
          `📅 Действует до: <b>${expiryDate}</b>\n\n` +
          `Теперь вам доступен подробный анализ без ограничений.\n\n` +
          `Нажмите кнопку ниже, чтобы начать:`,
          {
            replyMarkup: {
              inline_keyboard: [
                [{ text: '✨ Открыть приложение', web_app: { url: WEBAPP_URL } }]
              ]
            }
          }
        )
        
        await logAnalytics(userId, 'payment_completed', { 
          stars: payment.total_amount,
          chargeId: payment.telegram_payment_charge_id 
        })
      }

      return res.status(200).json({ ok: true })
    }

    // ==========================================
    // Обработка callback_query (нажатия на кнопки)
    // ==========================================
    if (update.callback_query) {
      const query = update.callback_query
      const callbackChatId = query.message?.chat?.id
      const callbackUserId = String(query.from?.id)
      const data = query.data

      console.log('[Webhook] callback_query:', data)

      // Ответ на callback чтобы убрать "loading"
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: query.id })
      })

      if (data === 'buy_pro' && callbackChatId) {
        await findOrCreateUser(callbackUserId, {
          odname: query.from?.username,
          firstName: query.from?.first_name
        })
        await sendInvoice(callbackUserId, callbackChatId)
        await logAnalytics(callbackUserId, 'payment_initiated', { source: 'button' })
      }

      return res.status(200).json({ ok: true })
    }

    // ==========================================
    // Обработка текстовых сообщений и команд
    // ==========================================
    const msg = update?.message
    if (!msg) return res.status(200).json({ ok: true })
    
    const chatId = msg.chat?.id
    const text: string = msg.text || ''
    const from = msg.from

    if (typeof chatId !== 'number') return res.status(200).json({ ok: true })

    const userId = String(from?.id || chatId)

    // Регистрируем/обновляем пользователя
    await findOrCreateUser(userId, {
      odname: from?.username,
      firstName: from?.first_name,
      lastName: from?.last_name
    })

    // ==========================================
    // /start - Приветствие
    // ==========================================
    if (text.startsWith('/start')) {
      const startParam = (text.split(' ').slice(1).join(' ') || '').trim()

      // /start pay_XXX - запрос на оплату
      if (startParam.startsWith('pay_')) {
        const payUserId = decodeURIComponent(startParam.slice(4))
        await sendInvoice(payUserId || userId, chatId)
        await logAnalytics(userId, 'payment_initiated', { source: 'deeplink' })
        return res.status(200).json({ ok: true })
      }

      // /start invoice_XXX - открытие по ссылке на инвойс
      if (startParam.startsWith('invoice_')) {
        await sendInvoice(userId, chatId)
        return res.status(200).json({ ok: true })
      }

      // Обычный /start
      await sendMessage(chatId,
        `✨ <b>Добро пожаловать!</b>\n\n` +
        `Я помогу вам узнать больше о себе через:\n\n` +
        `🔢 <b>Матрицу Судьбы</b> — психологический портрет\n` +
        `💞 <b>Совместимость</b> — анализ отношений\n` +
        `🃏 <b>Таро</b> — карта дня и расклады\n` +
        `♈ <b>Гороскоп</b> — персональный прогноз\n\n` +
        `<b>Бесплатно:</b> 2 запроса в день (краткий анализ)\n` +
        `<b>PRO (${PRO_PRICE_STARS}⭐):</b> безлимит + подробный анализ\n\n` +
        `Нажмите кнопку, чтобы начать:`,
        {
          replyMarkup: {
            inline_keyboard: [
              [{ text: '✨ Открыть приложение', web_app: { url: WEBAPP_URL } }],
              [{ text: `⭐ Купить PRO (${PRO_PRICE_STARS} звёзд)`, callback_data: 'buy_pro' }]
            ]
          }
        }
      )
      
      await logAnalytics(userId, 'bot_start')
      return res.status(200).json({ ok: true })
    }

    // ==========================================
    // /pro, /buy, /subscribe - Покупка PRO
    // ==========================================
    if (text === '/pro' || text === '/buy' || text === '/subscribe') {
      await sendInvoice(userId, chatId)
      await logAnalytics(userId, 'payment_initiated', { command: text })
      return res.status(200).json({ ok: true })
    }

    // ==========================================
    // /status - Статус подписки
    // ==========================================
    if (text === '/status') {
      const status = await getQuotaStatus(userId)
      
      let statusText = ''
      if (status.isPro && status.proExpiry) {
        const expiryDate = status.proExpiry.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
        statusText = 
          `⭐ <b>Ваш статус: PRO</b>\n\n` +
          `📅 Подписка действует до: <b>${expiryDate}</b>\n\n` +
          `Вам доступен полный анализ без ограничений.`
      } else {
        statusText = 
          `📊 <b>Ваш статус: Бесплатный</b>\n\n` +
          `📨 Использовано сегодня: ${status.used} из ${status.limit}\n\n` +
          `Хотите получить подробный анализ без ограничений?`
      }
      
      await sendMessage(chatId, statusText, {
        replyMarkup: status.isPro ? {
          inline_keyboard: [
            [{ text: '✨ Открыть приложение', web_app: { url: WEBAPP_URL } }]
          ]
        } : {
          inline_keyboard: [
            [{ text: `⭐ Купить PRO (${PRO_PRICE_STARS} звёзд)`, callback_data: 'buy_pro' }],
            [{ text: '✨ Открыть приложение', web_app: { url: WEBAPP_URL } }]
          ]
        }
      })
      return res.status(200).json({ ok: true })
    }

    // ==========================================
    // /terms - Условия использования (ОБЯЗАТЕЛЬНО по гайду)
    // ==========================================
    if (text === '/terms') {
      await sendMessage(chatId, TERMS_TEXT)
      return res.status(200).json({ ok: true })
    }

    // ==========================================
    // /support - Поддержка (ОБЯЗАТЕЛЬНО по гайду)
    // ==========================================
    if (text === '/support') {
      await sendMessage(chatId, SUPPORT_TEXT)
      return res.status(200).json({ ok: true })
    }

    // ==========================================
    // /help - Справка
    // ==========================================
    if (text === '/help') {
      await sendMessage(chatId, HELP_TEXT, {
        replyMarkup: {
          inline_keyboard: [
            [{ text: '✨ Открыть приложение', web_app: { url: WEBAPP_URL } }]
          ]
        }
      })
      return res.status(200).json({ ok: true })
    }

    // ==========================================
    // Любой другой текст - подсказка
    // ==========================================
    if (text && !text.startsWith('/')) {
      await sendMessage(chatId,
        `Чтобы использовать бота, откройте приложение по кнопке ниже.\n\n` +
        `Для списка команд напишите /help`,
        {
          replyMarkup: {
            inline_keyboard: [
              [{ text: '✨ Открыть приложение', web_app: { url: WEBAPP_URL } }]
            ]
          }
        }
      )
    }

  } catch (e: any) {
    console.error('[Webhook] Error:', e)
  }

  return res.status(200).json({ ok: true })
}