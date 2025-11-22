// Указываем прямой адрес бэкенда
// Если мы в режиме разработки (локально) -> используем localhost
// Если мы в продакшене (Vercel) -> используем пустую строку (относительный путь)
export const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

export type ApiAnalysisResponse = {
  analysis: string
  isPro: boolean
  brief: boolean
  briefReason?: string
  source?: 'ai' | 'stub'
  
  // ⭐️ НОВОЕ: Добавляем необязательное поле для структурированных данных
  matrixData?: {
    keyNumber?: number
    summary?: string
    traits?: string[]
    // (Мы сделаем его гибким, чтобы он работал и для compat.tsx)
    energies?: number[] 
  }
}

export const api = {
  async post<T>(url: string, body: unknown): Promise<T> {
    // Ensure we include Telegram userId when available, but don't overwrite an explicit body.userId
    const sdkUserId = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id
    let bodyWithUser: any
    if (typeof body === 'object' && body !== null) {
      // respect userId passed explicitly in body; use SDK id only as fallback
      bodyWithUser = { ...(body as any) }
      if (!bodyWithUser.userId && sdkUserId) bodyWithUser.userId = sdkUserId
    } else {
      bodyWithUser = { userId: sdkUserId, payload: body }
    }

    // Добавляем API_BASE_URL к каждому запросу
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyWithUser),
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }
    
    const data = await res.json();
    return data as T;
  },
  
  async get<T>(url: string): Promise<T> {
    // Добавляем API_BASE_URL к каждому запросу
    const res = await fetch(`${API_BASE_URL}${url}`);
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return (await res.json()) as T;
  },
};