Notes on installing dependencies for the web app

Problem
-------
The monorepo contains packages and dependencies that can cause peer dependency conflicts when installing in `apps/web`. In particular, @react-three/fiber expects React 18, while this project uses React 19 in `apps/web`.

Recommended safe installer
--------------------------
Use the helper scripts in the repo:

- Windows CMD:
  - From the repository root run:
    ```
    scripts\install-web-deps.bat
    ```

- PowerShell:
  - From the repository root run:
    ```powershell
    .\scripts\install-web-deps.ps1
    ```

What the scripts do
-------------------
1. Try pnpm install with `--shamefully-hoist` (pnpm handles peer deps more flexibly and isolates installs).
2. If pnpm is not available or fails, fallback to `npm install --legacy-peer-deps` which relaxes peer dependency conflicts.

Notes and alternatives
----------------------
- Using `--legacy-peer-deps` or `--force` can install packages that don't strictly match peer constraints — this is a pragmatic choice for local development but might mask runtime incompatibilities.
- A safer long-term fix is to align the React version across projects or to split the web app into a separate workspace/package that targets React 18.
- If you need help migrating to pnpm or making a separate workspace, I can prepare that change.

How to re-add @react-three / three packages safely
-----------------------------------------------
If you want to use the 3D prototype locally, a safe approach is to keep those packages out of the main `apps/web` install and instead install them in a separate folder or workspace that targets React 18.

Quick local re-add (not recommended in monorepo root):

1. From `apps/web` (if you accept potential peer conflicts):

```powershell
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing --legacy-peer-deps --no-audit --no-fund
```

2. Recommended: Create a separate small workspace for the 3D page that uses React 18 and install the packages there. I can scaffold this if you'd like.
