# Slate — Copilot Instructions

## Project Overview

Slate is a minimalist desktop markdown editor for daily notes, built with **Electron** (Electron Forge + Webpack + TypeScript).

- One note per day, auto-named `YYYY-MM-DD.md`, stored as plain `.md` files in a local folder.
- Dark theme only. No accounts, no sync, fully offline.
- Cross-platform: Windows, Mac, Linux.

## Development Workflow

**Browser-first development.** The app is built and tested as a standard web application in the browser — with file system operations mocked — then packaged with Electron for desktop distribution once functionality is stable.

- `npm run dev` — **Primary dev command.** Runs webpack-dev-server at `http://localhost:3333`. Uses mock API (`src/mock-api.ts`) with localStorage. No Electron involved. Fast hot-reload.
- `npm run start` — Launches full Electron app with real file I/O. Use to verify Electron-specific behavior.
- `npm run make` — Builds distributable desktop binary.

The renderer auto-detects the environment: if `window.api` (injected by Electron preload) exists, it uses real IPC; otherwise it falls back to the browser mock.

## Tech Stack

- **Framework:** Electron (via Electron Forge)
- **Bundler:** Webpack
- **Language:** TypeScript (strict)
- **Renderer:** HTML/CSS/TS (no React/Vue — keep it vanilla and minimal)

## Architecture

- `src/index.ts` — Main process (Electron main, window management, file I/O)
- `src/preload.ts` — Preload script (exposes safe APIs to renderer via contextBridge)
- `src/renderer.ts` — Renderer process (UI logic, editor)
- `src/mock-api.ts` — Browser mock of SlateAPI (localStorage-backed, used in `npm run dev`)
- `src/index.html` — App shell
- `src/index.css` — Styles

## Conventions

- Keep dependencies minimal. Prefer built-in Node/Electron APIs over npm packages.
- All file I/O happens in the main process; renderer communicates via IPC.
- Use `contextBridge` / `ipcRenderer.invoke` pattern — never expose full Node.js to renderer.
- Dark theme only — no light mode, no theme toggle.
- Notes are plain `.md` files. No database, no proprietary formats.

## Task Tracking

Task breakdown lives in `tasks/`. See `tasks/00-overview.md` for the full index. Update task status in the relevant file when completing work.

## Code Style

- TypeScript strict mode
- ESLint for linting (`npm run lint`)
- Prefer `const` over `let`, avoid `any`
- Use async/await for all async operations
