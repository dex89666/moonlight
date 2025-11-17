export type ApiError = { message: string; code?: string }
import { API_BASE_URL } from '../api/client'

export async function fetchApi<T>(path: string, body?: unknown, opts?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`
  const controller = new AbortController()
  // Use Vite env var (VITE_FETCH_TIMEOUT_MS) in the browser; fallback to 10000ms
  // process.env is not available in the browser and causes `process is not defined` errors.
  const timeoutMs = Number((import.meta as any).env?.VITE_FETCH_TIMEOUT_MS) || 10000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.headers as Record<string,string> || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: controller.signal,
    ...opts,
  }).finally(() => clearTimeout(timeout))

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
