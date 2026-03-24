---
description: "Use when working on Electron main process files (index.ts, main process modules). Enforces security best practices for Electron main process: contextIsolation, nodeIntegration disabled, IPC patterns."
applyTo: "src/index.ts,src/main/**"
---

# Electron Main Process

- Always create `BrowserWindow` with `contextIsolation: true` and `nodeIntegration: false`.
- Use `ipcMain.handle()` for async request/response from renderer.
- Use `ipcMain.on()` only for fire-and-forget messages.
- All file system operations (read, write, list directory) happen here — never in renderer.
- Validate all IPC inputs from renderer before processing.
- Use `app.getPath('userData')` for config storage.
