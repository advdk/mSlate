# Task 07 — Phase 2 Enhancements (Nice-to-Have)

**Status:** DONE  
**Priority:** Low  
**Depends on:** Tasks 01–06 complete (Phase 1 done)

## Objective

Add polish and quality-of-life features after the core app is functional.

## Sub-Tasks

### 7.1 Daily Note Template
- [x] Allow user to define a template for new daily notes
- [x] Template applied when a new `YYYY-MM-DD.md` is created
- [x] Template supports variables: `{{date}}`, `{{day_of_week}}`
- [x] Configurable in settings (stored in settings.json via IPC)

### 7.2 Word / Character Count
- [x] Show word count in the status bar
- [x] Show character count in the status bar
- [x] Update counts in real-time as user types

### 7.3 Pin / Bookmark Notes
- [x] Allow user to pin specific notes (star icon in sidebar)
- [x] Pinned notes appear at the top of the sidebar list
- [x] Persist pins between sessions (in settings.json / localStorage)

### 7.4 Quick-Jump to Today
- [x] Keyboard shortcut to jump to today's note (`Ctrl+T`)
- [x] Works from any note — loads today's note in the editor
- [x] Creates today's note if it doesn't exist yet

### 7.5 Export to PDF
- [x] Export current note as PDF (via `Ctrl+Shift+E`)
- [ ] Export a date range of notes as a single PDF
- [ ] Maintain dark/light styling option for export
- [x] Keyboard shortcut: `Ctrl+Shift+E`

## Deliverables

- [x] Each enhancement works independently
- [x] No regressions to Phase 1 functionality
