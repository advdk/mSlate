# Task 06 — UI / Design

**Status:** DONE  
**Priority:** Medium  
**Depends on:** Task 02 (Project Setup)  
**Note:** Can be worked on in parallel with Tasks 03–05; applies styling incrementally.

## Objective

Implement the dark-only minimalist UI with clean typography and layout.

## Sub-Tasks

### 6.1 Dark Theme
- [x] Dark background (`#1a1a2e`)
- [x] Muted text colors (primary: `#e0e0e0`, secondary: `#888`)
- [x] Accent color for links, highlights, active states (`#4fc3f7`)
- [x] No light mode — dark only, no toggle
- [x] Ensure sufficient contrast for readability (WCAG AA minimum)

### 6.2 Layout
- [x] Sidebar (collapsible) on the left for note browser
- [x] Main editor area fills remaining space
- [x] Sidebar toggle via keyboard shortcut (`Ctrl+\`)
- [x] Status bar at the bottom (save indicator, date display)
- [x] No toolbar — all actions via keyboard shortcuts

### 6.3 Typography
- [x] Monospace font for editor (Cascadia Code / Fira Code / JetBrains Mono fallback chain)
- [x] Sans-serif font for UI elements (system font stack)
- [x] Comfortable line height (1.6) for readability
- [x] Sensible default font size (15px editor, 14px UI)

### 6.4 Window Chrome
- [x] Window title shows current note date (e.g., "Slate — 2026-03-24")
- [x] Minimal window decorations
- [ ] App icon (simple, monochrome, matches dark theme aesthetic)

## Deliverables

- [x] Dark theme applied consistently across all UI elements
- [x] Layout is responsive to window resize
- [x] Typography is readable and consistent
