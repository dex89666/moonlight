import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Unified API Handler - Все API endpoints в одном файле
 * Это решает ограничение Vercel Hobby (12 функций)
 */

// Импорт логики из core
import { handleMatrix } from '../core/api-logic/matrix.js';
import { handleCompat } from '../core/api-logic/compat.js';
import { handleTelegramWebhook } from '../core/api-logic/telegram/webhook.js';
import { handlePro } from '../core/api-logic/pro.js';
import { handlePayments } from '../core/api-logic/payments.js';
import { handleTarot } from '../core/api-logic/tarot.js';
import { handleZodiac } from '../core/api-logic/zodiac.js';
import { handleUser } from '../core/api-logic/user.js';
import { handleChat } from '../core/api-logic/chat.js';
import { handleHealth } from '../core/api-logic/health.js';
import { handleAdminAnalytics } from '../core/api-logic/admin/analytics.js';
import { createStarsInvoice } from '../core/api-logic/payments/telegram.js';
import { getQuotaStatus, logAnalytics, findOrCreateUser } from '../core/mongodb.js';

console.log('[API] ✅ Unified handler loaded');

// CORS helper
function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url!, `https://${req.headers.host}`);
  const path = url.pathname;
  
  console.log(`[API] ${req.method} ${path}`);

  try {
    // ==================== TELEGRAM ====================
    if (path.includes('/telegram-webhook') || path.includes('/telegram/webhook')) {
      return await handleTelegramWebhook(req, res);
    }
    
    // ==================== ADMIN ====================
    if (path.includes('/admin/analytics')) {
      return await handleAdminAnalytics(req, res);
    }
    
    if (path.includes('/admin/users')) {
      // Redirect to analytics with users action
      req.query.action = 'users';
      return await handleAdminAnalytics(req, res);
    }
    
    // ==================== PAYMENTS ====================
    if (path.includes('/pay-stars')) {
      // Inline handler for pay-stars
      if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      
      const userId = req.body?.userId || req.query.userId;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      
      const status = await getQuotaStatus(String(userId));
      if (status.isPro && status.proExpiry && status.proExpiry > new Date()) {
        return res.json({ success: true, alreadyPro: true, expiresAt: status.proExpiry });
      }
      
      const result = await createStarsInvoice(String(userId));
      if (result.error) {
        return res.status(500).json({ success: false, error: result.error });
      }
      
      await logAnalytics(String(userId), 'payment_invoice_created');
      
      const botName = (process.env.TELEGRAM_BOT_USERNAME || 'universal_matrix_bot').replace('@', '');
      return res.json({
        success: true,
        invoiceLink: result.invoiceLink,
        priceStars: Number(process.env.PRO_PRICE_STARS || 350),
        botLink: `https://t.me/${botName}?start=pay_${encodeURIComponent(userId)}`
      });
    }
    
    if (path.includes('/payments')) {
      return await handlePayments(req, res);
    }
    
    // ==================== TELEGRAM AUTH ====================
    if (path.includes('/telegram-auth')) {
      // Inline telegram auth handler
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST required' });
      }
      
      const { user, initData } = req.body || {};
      if (!user?.id) {
        return res.status(400).json({ error: 'user.id required' });
      }
      
      await findOrCreateUser(String(user.id), {
        odname: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        authDate: user.auth_date
      });
      
      await logAnalytics(String(user.id), 'telegram_auth');
      
      return res.json({ ok: true, user: { id: user.id, username: user.username } });
    }
    
    // ==================== CORE API ====================
    if (path.includes('/matrix')) return await handleMatrix(req, res);
    if (path.includes('/compat')) return await handleCompat(req, res);
    if (path.includes('/pro')) return await handlePro(req, res);
    if (path.includes('/tarot')) return await handleTarot(req, res);
    if (path.includes('/zodiac')) return await handleZodiac(req, res);
    if (path.includes('/user')) return handleUser(req, res);
    if (path.includes('/chat')) return await handleChat(req, res);
    if (path.includes('/health')) return handleHealth(req, res);
    
    // ==================== DEBUG (inline) ====================
    if (path.includes('/debug')) {
      return res.json({
        ok: true,
        path,
        method: req.method,
        env: {
          hasMongoUri: !!process.env.MONGODB_URI,
          hasBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
          hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
          adminLoginLength: (process.env.ADMIN_LOGIN || '').length,
          adminPassLength: (process.env.ADMIN_PASSWORD || '').length,
          adminLoginTrimmed: (process.env.ADMIN_LOGIN || '').trim(),
          adminPassTrimmed: (process.env.ADMIN_PASSWORD || '').trim()
        }
      });
    }
    
    // ==================== 404 ====================
    console.warn(`[API] Route not found: ${path}`);
    return res.status(404).json({ error: 'API route not found', path });

  } catch (error: any) {
    console.error(`[API] Error in ${path}:`, error);
    return res.status(500).json({ 
      error: error.message,
      path
    });
  }
}