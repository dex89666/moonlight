# Илона | Нумерология + Таро мини-бот

Мини-приложение (web + Telegram WebApp-friendly) и serverless API (Vercel) для нумерологии, Таро, совместимости и зодиака, со встроенным чатом (LLM) и paywall.

## Стек
- Frontend: Vite + React + TypeScript, React Router, тёмная тема, mobile-first
- Backend: Vercel serverless (Node 20)
- LLM: OpenAI (через /api/chat)
- Store: in-memory с файловой опцией
- Payments: telegram | stripe | none (заглушки)

## Быстрый старт
1. Скопируйте `.env.example` в `.env` и заполните ключи (минимум OPENAI_API_KEY или оставьте пусто для stub).
2. Установка:
   - В корне: `npm install`
   - В apps/web: `npm install`
3. Запуск:
   - API локально (Vercel): `npm run dev` (в корне)
   - Frontend: `npm run dev` (в apps/web)

## Gemini (Google) integration

Если у вас есть платная версия Gemini и вы хотите использовать её вместо OpenAI/OpenRouter:

- В корневом `.env` укажите:
  - `GEMINI_API_KEY` — ваш секретный ключ для Gemini.
  - `GEMINI_API_URL` — (опционально) endpoint API, по умолчанию используется `https://api.gemini.google.com/v1`.
  - `GEMINI_MODEL` — (опционально) модель, например `gemini-1.5-pro`.

- В Vercel добавьте те же переменные (Project → Settings → Environment Variables). Никогда не коммитьте реальные ключи в репозиторий.

Примечание по безопасности:

- Если ключ случайно оказался в `.env` и уже был закоммичен, немедленно отзовите (revoke) ключ в Google Cloud Console и создайте новый.
- Добавьте `.env` в `.gitignore` (в этом репозитории уже игнорируется).
- Для очистки истории коммитов используйте `git filter-repo` или BFG, но проще — сгенерировать новый ключ и удалить старый из репозитория как можно быстрее.

Примеры локального запуска:

```cmd
set GEMINI_API_KEY=ВАШ_НОВЫЙ_КЛЮЧ
npm run dev
```


## Деплой на Vercel
- Импортируйте репозиторий в Vercel.
- Установите переменные окружения из `.env.example`.
- Frontend билдится из `apps/web` (Vite), API — из корня `/api/*`.
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
