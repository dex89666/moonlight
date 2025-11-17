# Developer guide

Короткая инструкция по локальной разработке и использованию `fetchApi`:

1) Установка

```cmd
cd /d d:\miniapp
npm install
cd apps/web
npm install
```

2) Переменные окружения
- `OPENAI_API_KEY` — ключ LLM (опционально; если не задан, API использует локальные stub‑ответы)

3) Запуск в локальной разработке

```cmd
# Запуск локального API (используется _local_server.ts)
npx tsx _local_server.ts

# Запуск фронтенда
cd apps/web
npm run dev
```

4) Пример типизированного fetch wrapper (использование в фронтенде)

```ts
import { fetchApi } from './src/lib/fetchApi'
import type { ApiAnalysisResponse } from './src/api/client'

const resp = await fetchApi<ApiAnalysisResponse>('/api/matrix', { birthDate: '01.01.1990', userId: 'guest' })
console.log(resp.analysis, resp.isPro, resp.brief, resp.briefReason)
```

5) Тесты и CI

```cmd
# Запуск тестов
npm run test

# Сборка фронтенда
npm run build
```

6) Webhook платежей

- Пример webhook находится в `api/payments/payme.ts` — адаптируйте под вашего провайдера и секреты.

7) Полезно знать

- Все API возвращают: `{ analysis: string; isPro: boolean; brief: boolean; briefReason?: string }`.
- Для локальной разработки используйте `guest` или Telegram `userId` (через `initTelegram()` в UI).
