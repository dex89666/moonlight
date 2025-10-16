export type ApiError = { message: string; code?: string }
import { API_BASE_URL } from '../api/client'

export async function fetchApi<T>(path: string, body?: unknown, opts?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.headers as Record<string,string> || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    ...opts,
  })

  if (!res.ok) {
    let err: ApiError = { message: res.statusText || 'Network error', code: String(res.status) }
    try {
      const json = await res.json()
      if (json && typeof json === 'object' && 'message' in json) err.message = (json as any).message
    } catch {}
    throw err
  }

  return res.json() as Promise<T>
}
