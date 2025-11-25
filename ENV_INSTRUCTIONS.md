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
   GEMINI_MODEL=gemini-1.5-flash
   # IMPORTANT: set GEMINI_PARENT to your GCP parent, for example:
   #   projects/your-project-id/locations/global
   # In your case (example): projects/root-habitat-474808-q1/locations/global
   GEMINI_PARENT=projects/your-project-id/locations/global
   # Optional: request timeout in ms
   GEMINI_TIMEOUT_MS=8000
   # Backwards compatibility: if you still have MODEL set, it's used only where relevant
   MODEL=gpt-4o-mini

Notes:
- The project uses Vercel KV in serverless endpoints. For local testing, install `@vercel/kv` (already added to package.json) and set KV environment variables, or test endpoints on Vercel where KV is available.
Notes on Google Generative Language access:
- Make sure the Generative Language API is enabled in your Google Cloud project (Console → APIs & Services).
- If you use an API key (starts with "AIza"), add it to Vercel as `GEMINI_API_KEY` and prefer calling endpoints with the `?key=` query. If you use a service account, configure `GOOGLE_APPLICATION_CREDENTIALS` or provide the JSON as a secret and use the SDK.
- If your key returns 404 for model paths, check that the model name exists in the Models page and that your project/parent matches the one that has access.
- The `/api/pro` endpoint currently simulates subscription by writing a 30-day expiry to KV and returns a JSON success result. There is no real payment provider wired.
- To run the development server:

   npm run dev

or for API server if using local server script:

   npm run dev:api

