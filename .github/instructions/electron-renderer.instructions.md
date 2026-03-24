---
description: "Use when working on renderer process files (renderer.ts, UI components, CSS). Enforces Electron renderer security: no direct Node access, use preload API only."
applyTo: "src/renderer.ts,src/renderer/**,src/index.html,src/index.css"
---

# Electron Renderer Process

- Never import Node.js modules (`fs`, `path`, etc.) directly in renderer code.
- Access main process features only through the `window.api` object exposed by preload.
- Keep UI code minimal and vanilla — no frameworks unless explicitly decided.
- All styles use CSS custom properties for theming (dark theme only).
- Use semantic HTML elements where appropriate.
