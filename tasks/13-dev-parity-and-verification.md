# Task 13 — Dev Parity And Verification

**Status:** DONE  
**Priority:** Medium  
**Depends on:** Tasks 09–12

## Objective

Keep browser-first development usable while the Electron-only index and import features are added.

## Sub-Tasks

### 13.1 Mock API Parity
- [x] Add mock implementations for index status, clear, and rebuild actions
- [x] Simulate indexed search behavior in browser mode
- [x] Add a safe placeholder flow for markdown import in browser mode

### 13.2 Verification
- [x] Run lint after code changes
- [x] Verify startup indexing and indexed search in Electron
- [x] Verify clear and rebuild actions
- [x] Verify import flows and conflict handling

## Deliverables

- [x] `npm run dev` remains useful for renderer development
- [x] Electron-specific behavior is validated with the real filesystem

## Notes

- Browser-mode validation covered indexed search clear and rebuild behavior plus the mock markdown import review/apply flow.
- Real filesystem and SQLite verification is repeatable via `npm run verify:parity`.