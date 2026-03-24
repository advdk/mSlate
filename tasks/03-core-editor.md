# Task 03 — Core Editor

**Status:** DONE  
**Priority:** High  
**Depends on:** Task 02 (Project Setup)

## Objective

Implement the markdown text editor with syntax highlighting and essential keyboard shortcuts.

## Sub-Tasks

### 3.1 Markdown Text Editor
- [x] Integrate a code/text editor component (CodeMirror 6)
- [x] Configure monospace font for the editing area
- [x] Enable line wrapping for long lines
- [x] Support standard text editing (copy, paste, select all, etc.)

### 3.2 Syntax Highlighting
- [x] Enable markdown syntax highlighting (headings, bold, italic, code, links, lists)
- [x] Style highlighted elements to match dark theme colors (oneDark theme)
- [x] Ensure highlighting updates in real-time as user types

### 3.3 Preview Mode (Decide During Implementation)
- [ ] Option A: Live preview in split-pane (editor left, rendered right)
- [ ] Option B: Toggle between edit and preview modes
- [ ] Render markdown to HTML for preview
- [ ] Style rendered HTML to match dark theme

> **Decision:** Deferred to Phase 2. CodeMirror's syntax highlighting provides sufficient inline preview for now.

### 3.4 Keyboard Shortcuts
- [x] `Ctrl+B` — Bold (`**text**`)
- [x] `Ctrl+I` — Italic (`*text*`)
- [x] `Ctrl+H` — Cycle heading level (`#`, `##`, `###`)
- [x] `Ctrl+L` — Insert list item (`- `)
- [x] `Ctrl+Z` / `Ctrl+Y` — Undo / Redo (via CodeMirror basicSetup)
- [x] `Ctrl+S` — Manual save (in addition to auto-save)

## Deliverables

- [x] Editor opens, accepts markdown input, and highlights syntax
- [x] Keyboard shortcuts wrap/insert correct markdown syntax (bold, italic, save)
- [ ] Preview shows rendered markdown output (deferred)
