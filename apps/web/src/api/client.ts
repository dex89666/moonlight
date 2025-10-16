// Указываем прямой адрес бэкенда
export const API_BASE_URL = 'http://localhost:3000'; 

export type ApiAnalysisResponse = {
  analysis: string
  isPro: boolean
  brief: boolean
  briefReason?: string
}

export const api = {
  async post<T>(url: string, body: unknown): Promise<T> {
    // Добавляем API_BASE_URL к каждому запросу
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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