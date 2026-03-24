# Slate — Task Overview

## Project Summary

A minimalist desktop markdown editor for daily notes. One note per day, auto-named by date (`YYYY-MM-DD.md`), stored as plain `.md` files in a local folder.

## Task Index

| # | Task File | Description | Status |
|---|-----------|-------------|--------|
| 01 | [01-tech-decision.md](01-tech-decision.md) | Choose framework and target OS | DONE — Electron |}
| 02 | [02-project-setup.md](02-project-setup.md) | Initialize project, dark theme, build pipeline | DONE |
| 03 | [03-core-editor.md](03-core-editor.md) | Markdown editor with syntax highlighting | DONE |
| 04 | [04-file-management.md](04-file-management.md) | Daily note creation, auto-save, settings | DONE |
| 05 | [05-note-browser.md](05-note-browser.md) | Sidebar, note listing, full-text search | DONE |
| 06 | [06-ui-design.md](06-ui-design.md) | Dark theme, layout, typography | DONE |
| 07 | [07-phase2-enhancements.md](07-phase2-enhancements.md) | Templates, word count, bookmarks, export | DONE |
| 08 | [08-command-palette.md](08-command-palette.md) | VS Code-style Ctrl+P command palette search | DONE |
| 09 | [09-sqlite-index-foundation.md](09-sqlite-index-foundation.md) | Add SQLite-backed search index and startup indexing | DONE |
| 10 | [10-indexed-search-sync.md](10-indexed-search-sync.md) | Keep search index synchronized with note changes | DONE |
| 11 | [11-settings-and-commands.md](11-settings-and-commands.md) | Settings UI and Ctrl+Shift+P command actions | DONE |
| 12 | [12-markdown-import.md](12-markdown-import.md) | Import dated markdown files with conflict handling | DONE |
| 13 | [13-dev-parity-and-verification.md](13-dev-parity-and-verification.md) | Mock API parity and regression verification | DONE |

## Constraints

- Notes folder must be user-accessible — markdown files remain the source of truth
- App must work fully offline
- Startup time under 2 seconds
- Single-user, local only — no accounts, no sync
- Any local database must be a derived cache or index, not the primary data store

## Acceptance Criteria

1. App launches and opens today's `YYYY-MM-DD.md` (creates if missing)
2. Edits auto-save to disk as valid markdown
3. All past `.md` files in the folder appear in the browser
4. Full-text search returns results across all notes
5. Dark theme renders correctly on target OS
