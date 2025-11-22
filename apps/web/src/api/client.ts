// ⭐️ ИСПРАВЛЕНО: Умный выбор адреса
// Если мы разрабатываем (DEV) -> http://localhost:3000
// Если мы в продакшене (Vercel) -> "" (пустая строка, то есть текущий домен)
// ⭐️ ЖЕЛЕЗОБЕТОННО: Всегда используем текущий домен
export const API_BASE_URL = '';

export type ApiAnalysisResponse = {
  analysis: string
  isPro: boolean
  brief: boolean
  briefReason?: string
  source?: 'ai' | 'stub'
  // Данные для "живой матрицы"
  matrixData?: {
    keyNumber?: number
    summary?: string
    traits?: string[]
    energies?: number[]
  }
}

export const api = {
  // Этот метод автоматически подставит правильный API_BASE_URL
  async post<T>(url: string, body: unknown): Promise<T> {
    // Пытаемся получить ID из Telegram WebApp (если есть)
    const sdkUserId = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    
    let bodyWithUser: any;
    if (typeof body === 'object' && body !== null) {
      bodyWithUser = { ...(body as any) };
      // Если userId не передан явно, добавляем его из Telegram
      if (!bodyWithUser.userId && sdkUserId) {
        bodyWithUser.userId = sdkUserId.toString();
      }
    } else {
      bodyWithUser = { userId: sdkUserId, payload: body };
    }

    // ⭐️ ВАЖНО: Собираем полный адрес
    const fullUrl = `${API_BASE_URL}${url}`;

    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyWithUser),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Error ${res.status}`);
    }
    
    return await res.json() as T;
  },
  
  async get<T>(url: string): Promise<T> {
    const fullUrl = `${API_BASE_URL}${url}`;
    const res = await fetch(fullUrl);
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return (await res.json()) as T;
  },
};