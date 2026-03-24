# Task 12 — Markdown Import

**Status:** DONE  
**Priority:** Medium  
**Depends on:** Task 10 (Indexed Search Sync), Task 11 (Settings And Commands)

## Objective

Import existing dated markdown files into the notes folder and index them safely.

## Sub-Tasks

### 12.1 Import Scan
- [x] Choose a folder to import from
- [x] Detect valid `YYYY-MM-DD.md` files only
- [x] Report invalid filenames without importing them

### 12.2 Conflict Handling
- [x] Review conflicts for files that already exist locally
- [x] Allow per-file decisions before import completes
- [x] Summarize imported, skipped, and failed files

### 12.3 Post-Import Sync
- [x] Copy imported files into the notes folder
- [x] Update the SQLite index for all imported notes
- [x] Refresh the UI after import completes

## Deliverables

- [x] Users can import dated markdown files from another folder
- [x] Conflicts are handled safely and explicitly