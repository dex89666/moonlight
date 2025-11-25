import type { VercelRequest, VercelResponse } from '@vercel/node'

import { handlePro } from '../apps/web/core/api-logic/pro.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
	return handlePro(req, res)
}
