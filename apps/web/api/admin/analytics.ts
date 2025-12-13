// API route for admin analytics
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleAdminAnalytics } from '../../core/api-logic/admin/analytics.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleAdminAnalytics(req, res)
}
