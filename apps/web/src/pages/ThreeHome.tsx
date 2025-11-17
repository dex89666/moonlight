import React from 'react'

const R3D_URL = (import.meta as any).env?.VITE_R3D_URL ?? 'http://localhost:5174'

export default function ThreeHome() {
  const sameOrigin = typeof window !== 'undefined' && (() => {
    try {
      return window.location.origin === new URL(R3D_URL).origin
    } catch (e) {
      return false
    }
  })()

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ color: '#efe8ff' }}>3D Preview — Experimental</h1>
      <p>
        The 3D prototype was moved to a separate workspace to avoid React version conflicts.
        To run it locally:
      </p>
      <ol>
        <li>
          Open a terminal and run: <code>scripts\start-web-3d.ps1</code> (PowerShell) or{' '}
          <code>scripts\start-web-3d.bat</code> (CMD).
        </li>
        <li>
          Open the 3D dev server in a new tab: <a href={R3D_URL} target="_blank" rel="noreferrer">{R3D_URL}</a>
        </li>
      </ol>
      <p>If you prefer, you can run the 3D workspace separately at <code>apps/web-3d</code> (React 18 + r3f).</p>

      <div style={{ marginTop: 20 }}>
        {sameOrigin ? (
          <div style={{ padding: 16, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6 }}>
            <strong>Notice:</strong> the site appears to be served from the same origin as the 3D dev server.
            To avoid embedding the page into itself (infinite recursion), the live preview iframe is disabled.
            You can still open the 3D server in a separate tab: <a href={R3D_URL} target="_blank" rel="noreferrer">{R3D_URL}</a>
          </div>
        ) : (
          <iframe src={R3D_URL} style={{ width: '100%', height: 600, border: '1px solid rgba(255,255,255,0.06)' }} title="web-3d-preview" />
        )}
      </div>
    </div>
  )
}
