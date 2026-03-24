# Task 10 — Indexed Search Sync

**Status:** DONE  
**Priority:** High  
**Depends on:** Task 09 (SQLite Index Foundation)

## Objective

Replace linear file scanning with SQLite-backed search and keep the index synchronized with note changes.

## Sub-Tasks

### 10.1 Search Integration
- [x] Replace file-by-file search with indexed search queries
- [x] Return note snippets from indexed matches
- [x] Preserve current note ordering expectations in results

### 10.2 Sync Triggers
- [x] Upsert notes into the index on create and save
- [x] Remove deleted notes from the index
- [x] Detect external file changes from the existing watcher
- [x] Rebuild the index when the notes folder changes

## Deliverables

- [x] Ctrl+P search uses indexed results across all notes
- [x] Index remains accurate when notes are edited inside or outside the app