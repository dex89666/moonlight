Local development instructions

1) Install dependencies (root workspace):

   npm install

2) Install dependencies for web app (if using workspaces this may be unnecessary):

   cd apps/web
   npm install

3) Create a local .env file for the web app (optional):

   cd apps/web
   copy .env.example .env   # on Windows cmd.exe

4) Environment variables to set (examples):

   ADMIN_USER_ID=your_telegram_user_id
   VERCEL_KV_URL=...       # optional for local KV access
   VERCEL_KV_TOKEN=...
   # We now use Google Gemini by default. Provide your Gemini key here:
   GEMINI_API_KEY=...
   # Optional: override model/parent used for Gemini (defaults to gemini-1.5-pro)
   GEMINI_MODEL=gemini-1.5-pro
   GEMINI_PARENT=models/gemini-1.5-pro
   # Optional: request timeout in ms
   GEMINI_TIMEOUT_MS=8000
   # Backwards compatibility: if you still have MODEL set, it's used only where relevant
   MODEL=gpt-4o-mini

Notes:
- The project uses Vercel KV in serverless endpoints. For local testing, install `@vercel/kv` (already added to package.json) and set KV environment variables, or test endpoints on Vercel where KV is available.
- The `/api/pro` endpoint currently simulates subscription by writing a 30-day expiry to KV and returns a JSON success result. There is no real payment provider wired.
- To run the development server:

   npm run dev

or for API server if using local server script:

   npm run dev:api

