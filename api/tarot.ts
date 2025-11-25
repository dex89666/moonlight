import type { VercelRequest, VercelResponse } from '@vercel/node'

import { handleTarot } from '../apps/web/core/api-logic/tarot.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
	return handleTarot(req, res)
}
