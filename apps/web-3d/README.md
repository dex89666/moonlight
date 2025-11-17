Web 3D workspace

This small workspace is a separate sandbox for the React Three Fiber prototype. It targets React 18 and includes r3f deps.

To install and run locally (from repository root):

CMD:
```
cd apps\web-3d
npm install
npm run dev
```

PowerShell:
```
Set-Location apps\web-3d
npm install
npm run dev
```

Notes:
- This workspace is isolated from `apps/web` to avoid peer dependency conflicts between React 19 and r3f packages.
- If you want, I can wire this workspace into the main site's router or add an Nginx/Vercel preview step in CI.
