// Telegram Stars Payment Integration
// Полная реализация по официальной документации Telegram Bot Payments API
// https://core.telegram.org/bots/payments

import type { Payments } from './index.js'
import { grantProSubscription, findOrCreateUser, getPaymentsCollection } from '../../mongodb.js'

const TELEGRAM_API = 'https://api.telegram.org/bot'
const PRO_PRICE_STARS = Number(process.env.PRO_PRICE_STARS || 350)

/**
 * Шаг 1: Создание счёта-фактуры (Invoice)
 * Используем sendInvoice для отправки счёта в чат
 * currency: "XTR" - обязательно для Telegram Stars
 * provider_token: "" - пустой для цифровых товаров
 */
export async function sendInvoice(
  userId: string, 
  chatId: number,
  options?: {
    title?: string
    description?: string
    photoUrl?: string
  }
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' }
  }

  try {
    await findOrCreateUser(userId)

    // Уникальный payload для идентификации заказа
    const payload = JSON.stringify({
      userId,
      type: 'pro_subscription',
      days: 30,
      createdAt: Date.now()
    })

    const response = await fetch(`${TELEGRAM_API}${token}/sendInvoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        title: options?.title || '⭐ PRO Подписка (30 дней)',
        description: options?.description || 
          'Получите полный доступ:\n' +
          '✅ Подробный анализ Матрицы Судьбы\n' +
          '✅ Детальная совместимость\n' +
          '✅ Ежедневные расклады Таро\n' +
          '✅ Персональный гороскоп\n' +
          '✅ Без ограничений на запросы',
        payload: payload,
        provider_token: '', // Пустой для цифровых товаров (Telegram Stars)
        currency: 'XTR',    // XTR = Telegram Stars
        prices: [
          { label: 'PRO подписка 30 дней', amount: PRO_PRICE_STARS }
        ],
        // Опционально: фото товара
        photo_url: options?.photoUrl || undefined,
        photo_width: options?.photoUrl ? 512 : undefined,
        photo_height: options?.photoUrl ? 512 : undefined,
        // Защита контента (пересылка только с кнопкой перехода в бота)
        protect_content: false,
        // start_parameter для single-chat invoice (опционально)
        start_parameter: `invoice_${userId}_${Date.now()}`
      })
    })

    const data = await response.json()
    
    if (!data.ok) {
      console.error('[TelegramPay] sendInvoice failed:', data)
      return { success: false, error: data.description || 'Failed to send invoice' }
    }

    console.log('[TelegramPay] Invoice sent:', data.result?.message_id)
    return { success: true, messageId: data.result?.message_id }
  } catch (error: any) {
    console.error('[TelegramPay] Error sending invoice:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Создание ссылки на инвойс (для WebApp)
 * Альтернативный способ - createInvoiceLink
 */
export async function createStarsInvoice(
  userId: string, 
  chatId?: number
): Promise<{ invoiceLink?: string; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return { error: 'TELEGRAM_BOT_TOKEN not configured' }
  }

  try {
    await findOrCreateUser(userId)

    const payload = JSON.stringify({
      userId,
      type: 'pro_subscription',
      days: 30,
      createdAt: Date.now()
    })

    const response = await fetch(`${TELEGRAM_API}${token}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '⭐ PRO Подписка (30 дней)',
        description: 'Полный доступ ко всем функциям: подробный анализ, безлимитные запросы.',
        payload: payload,
        provider_token: '', // Пустой для Telegram Stars
        currency: 'XTR',
        prices: [
          { label: 'PRO подписка', amount: PRO_PRICE_STARS }
        ]
      })
    })

    const data = await response.json()
    
    if (!data.ok) {
      console.error('[TelegramPay] createInvoiceLink failed:', data)
      return { error: data.description || 'Failed to create invoice' }
    }

    return { invoiceLink: data.result }
  } catch (error: any) {
    console.error('[TelegramPay] Error creating invoice:', error)
    return { error: error.message || 'Unknown error' }
  }
}

/**
 * Шаг 3: Ответ на pre_checkout_query
 * КРИТИЧНО: Ответить нужно в течение 10 секунд!
 * 
 * @param preCheckoutQueryId - ID запроса
 * @param ok - true = подтвердить, false = отклонить
 * @param errorMessage - сообщение об ошибке (только если ok=false)
 */
export async function answerPreCheckoutQuery(
  preCheckoutQueryId: string, 
  ok: boolean, 
  errorMessage?: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.error('[TelegramPay] No bot token for answerPreCheckoutQuery')
    return false
  }

  try {
    console.log('[TelegramPay] Answering pre_checkout_query:', preCheckoutQueryId, ok ? 'OK' : 'ERROR')
    
    const response = await fetch(`${TELEGRAM_API}${token}/answerPreCheckoutQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pre_checkout_query_id: preCheckoutQueryId,
        ok: ok,
        error_message: ok ? undefined : (errorMessage || 'К сожалению, не удалось обработать заказ. Попробуйте позже.')
      })
    })

    const data = await response.json()
    console.log('[TelegramPay] answerPreCheckoutQuery result:', data)
    return data.ok === true
  } catch (error) {
    console.error('[TelegramPay] answerPreCheckoutQuery error:', error)
    return false
  }
}

/**
 * Шаг 4-5: Обработка successful_payment
 * - Сохраняем telegram_payment_charge_id для возможного возврата
 * - Активируем подписку
 * - Отправляем подтверждение пользователю
 */
export async function handleSuccessfulPayment(
  userId: string, 
  paymentInfo: {
    telegram_payment_charge_id: string  // ВАЖНО: сохраняем для refund
    provider_payment_charge_id?: string
    total_amount: number
    currency: string
    invoice_payload?: string
  },
  fromUser?: {
    id: number
    username?: string
    first_name?: string
    last_name?: string
  }
): Promise<{ success: boolean; expiresAt?: Date }> {
  try {
    console.log('[TelegramPay] Processing successful_payment:', {
      userId,
      chargeId: paymentInfo.telegram_payment_charge_id,
      amount: paymentInfo.total_amount,
      currency: paymentInfo.currency
    })

    // Парсим payload если есть
    let payloadData: any = {}
    try {
      if (paymentInfo.invoice_payload) {
        payloadData = JSON.parse(paymentInfo.invoice_payload)
      }
    } catch {}

    // Используем userId из payload если есть
    const actualUserId = payloadData.userId || userId
    const days = payloadData.days || 30

    // Активируем PRO подписку
    const result = await grantProSubscription(actualUserId, paymentInfo.total_amount)

    // Сохраняем платёж в базу с telegram_payment_charge_id
    const payments = await getPaymentsCollection()
    await payments.insertOne({
      odId: actualUserId,
      odname: fromUser?.username,
      stars: paymentInfo.total_amount,
      currency: paymentInfo.currency,
      // ВАЖНО: сохраняем для возможного refund
      telegramPaymentChargeId: paymentInfo.telegram_payment_charge_id,
      providerPaymentChargeId: paymentInfo.provider_payment_charge_id,
      invoicePayload: paymentInfo.invoice_payload,
      createdAt: new Date(),
      expiresAt: result.expiresAt,
      status: 'completed'
    })

    console.log('[TelegramPay] ✅ Payment processed, PRO until:', result.expiresAt)
    return { success: true, expiresAt: result.expiresAt }
  } catch (error: any) {
    console.error('[TelegramPay] Error processing payment:', error)
    return { success: false }
  }
}

/**
 * Возврат средств (refund)
 * Используем сохранённый telegram_payment_charge_id
 */
export async function refundPayment(
  odId: string,
  telegramPaymentChargeId: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return { success: false, error: 'No bot token' }
  }

  try {
    const response = await fetch(`${TELEGRAM_API}${token}/refundStarPayment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: parseInt(odId, 10),
        telegram_payment_charge_id: telegramPaymentChargeId
      })
    })

    const data = await response.json()
    
    if (!data.ok) {
      return { success: false, error: data.description }
    }

    // Обновляем статус платежа в базе
    const payments = await getPaymentsCollection()
    await payments.updateOne(
      { telegramPaymentChargeId },
      { $set: { status: 'refunded', refundedAt: new Date() } }
    )

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Отправка сообщения пользователю
 */
export async function sendMessage(
  chatId: number,
  text: string,
  options?: {
    parseMode?: 'HTML' | 'Markdown'
    replyMarkup?: any
  }
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return false

  try {
    const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: options?.parseMode || 'HTML',
        reply_markup: options?.replyMarkup
      })
    })

    const data = await response.json()
    return data.ok === true
  } catch {
    return false
  }
}

// Legacy interface for payments module
export const telegramPayments: Payments = {
  async createPro(userId: string) {
    const bot = process.env.TELEGRAM_BOT_USERNAME || '@universal_matrix_bot'
    const botName = bot.replace(/^@/, '')
    const startParam = `pay_${encodeURIComponent(userId)}`
    const redirectUrl = `https://t.me/${botName}?start=${startParam}`
    return { redirectUrl }
  },
}