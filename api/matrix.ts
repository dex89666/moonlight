import type { VercelRequest, VercelResponse } from '@vercel/node'

// Lightweight wrapper to delegate to core logic.
// This file exists so local dev server and tests that import `api/matrix`
// get a callable handler identical to Vercel entrypoints.

import { handleMatrix } from '../apps/web/core/api-logic/matrix.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
	return handleMatrix(req, res)
}
