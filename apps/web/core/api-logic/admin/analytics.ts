// Admin Analytics API
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { 
  getAllUsers, 
  getProUsers, 
  getRecentPayments, 
  getAnalyticsStats,
  grantProSubscription,
  revokeProSubscription,
  logAnalytics,
  type UserDoc,
  type PaymentDoc
} from '../../mongodb.js'

// Админ-креденшиалы (6 букв логин, 6 цифр пароль)
const ADMIN_LOGIN = (process.env.ADMIN_LOGIN || 'mavkoj').trim()
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '372915').trim()

// Проверка Basic Auth
function checkAdminAuth(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Basic ')) return false
  
  try {
    const base64 = authHeader.slice(6)
    const decoded = Buffer.from(base64, 'base64').toString('utf-8')
    const [login, password] = decoded.split(':')
    return login.trim() === ADMIN_LOGIN && password.trim() === ADMIN_PASSWORD
  } catch {
    return false
  }
}

// Маппинг User для API ответа
function mapUser(u: UserDoc) {
  return {
    odid: u.odId,
    odname: u.odname || 'Unknown',
    username: u.odname || 'Unknown',
    firstName: u.firstName,
    lastName: u.lastName,
    isPro: u.isPro,
    proExpiresAt: u.proExpiry,
    messagesUsedToday: u.freeUsedToday,
    lastMessageDate: u.lastQuotaReset,
    createdAt: u.createdAt,
    lastActive: u.lastVisit
  }
}

// Маппинг Payment для API ответа
function mapPayment(p: PaymentDoc) {
  return {
    odid: p.odId,
    odname: p.odname,
    amount: p.stars,
    stars: p.stars,
    status: p.status,
    createdAt: p.createdAt,
    expiresAt: p.expiresAt
  }
}

export async function handleAdminAnalytics(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  // Auth check
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid admin credentials' })
  }
  
  try {
    const action = req.query.action || req.body?.action || 'stats'
    
    switch (action) {
      case 'stats': {
        // Общая статистика
        const stats = await getAnalyticsStats()
        const proUsers = await getProUsers()
        const recentPayments = await getRecentPayments(20)
        
        return res.json({
          success: true,
          data: {
            stats: {
              totalUsers: stats.totalUsers,
              proUsers: stats.proUsers,
              totalPayments: stats.totalPayments,
              totalRevenue: stats.totalPayments * 350 // estimated
            },
            proUsersCount: proUsers.length,
            proUsers: proUsers.map(mapUser),
            recentPayments: recentPayments.map(mapPayment)
          }
        })
      }
      
      case 'users': {
        // Все пользователи
        const limit = parseInt(String(req.query.limit || req.body?.limit || 100), 10)
        const users = await getAllUsers(limit)
        
        return res.json({
          success: true,
          data: {
            users: users.map(mapUser),
            total: users.length
          }
        })
      }
      
      case 'pro-users': {
        // Только PRO пользователи
        const proUsers = await getProUsers()
        
        return res.json({
          success: true,
          data: {
            users: proUsers.map(mapUser),
            total: proUsers.length
          }
        })
      }
      
      case 'payments': {
        // История платежей
        const limit = parseInt(String(req.query.limit || req.body?.limit || 50), 10)
        const payments = await getRecentPayments(limit)
        
        return res.json({
          success: true,
          data: {
            payments: payments.map(mapPayment),
            total: payments.length
          }
        })
      }
      
      case 'grant-pro': {
        // Выдать PRO подписку пользователю
        const odId = req.body?.telegramId || req.query.telegramId || req.body?.odId || req.query.odId
        const days = parseInt(String(req.body?.days || req.query.days || 30), 10)
        
        if (!odId) {
          return res.status(400).json({ error: 'telegramId/odId is required' })
        }
        
        const result = await grantProSubscription(String(odId), 350)
        await logAnalytics(String(odId), 'admin_grant_pro', { days })
        
        return res.json({
          success: true,
          message: `PRO granted for ${days} days`,
          data: {
            odid: odId,
            isPro: true,
            proExpiresAt: result.expiresAt
          }
        })
      }
      
      case 'revoke-pro': {
        // Отозвать PRO подписку
        const odId = req.body?.telegramId || req.query.telegramId || req.body?.odId || req.query.odId
        
        if (!odId) {
          return res.status(400).json({ error: 'telegramId/odId is required' })
        }
        
        await revokeProSubscription(String(odId))
        await logAnalytics(String(odId), 'admin_revoke_pro')
        
        return res.json({
          success: true,
          message: 'PRO subscription revoked',
          data: {
            odid: odId,
            isPro: false
          }
        })
      }
      
      default:
        return res.status(400).json({ error: 'Unknown action', validActions: ['stats', 'users', 'pro-users', 'payments', 'grant-pro', 'revoke-pro'] })
    }
  } catch (error: any) {
    console.error('[Admin] Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

export default handleAdminAnalytics
