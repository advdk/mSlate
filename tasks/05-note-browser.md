# Task 05 — Note Browser

**Status:** DONE  
**Priority:** Medium  
**Depends on:** Task 04 (File Management)

## Objective

Implement a sidebar listing all past notes by date and full-text search across notes.

## Sub-Tasks

### 5.1 Note List Sidebar
- [x] Scan the notes folder for all `YYYY-MM-DD.md` files
- [x] Display files in a sidebar/panel, sorted newest first
- [x] Show each note's date in a readable format (e.g., "Mon, Jan 5, 2026")
- [x] Highlight today's note in the list
- [x] Clicking a date opens that note in the editor
- [x] Refresh list when notes folder contents change (file watcher)

### 5.2 Full-Text Search
- [x] Add a search input at the top of the sidebar
- [x] Search across the content of all `.md` files in the notes folder
- [x] Display results showing: note date + context snippet with match highlighted
- [x] Clicking a search result opens that note
- [x] Search should be fast (< 500ms for ~1000 notes)
- [x] Clear search to return to the chronological note list

## Deliverables

- [x] Sidebar lists all notes by date, newest first
- [x] Clicking a note opens it in the editor
- [x] Search finds text across all notes and shows contextual results
