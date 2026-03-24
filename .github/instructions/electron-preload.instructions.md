---
description: "Use when working on preload scripts. Enforces safe API exposure via contextBridge."
applyTo: "src/preload.ts"
---

# Electron Preload Script

- Use `contextBridge.exposeInMainWorld()` to expose a typed API object (e.g., `window.api`).
- Only expose specific IPC invoke/send calls — never expose `ipcRenderer` directly.
- Define TypeScript interfaces for the exposed API.
- Keep the preload script minimal — just the bridge, no business logic.
