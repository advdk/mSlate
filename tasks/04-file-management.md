# Task 04 — File Management

**Status:** DONE  
**Priority:** High  
**Depends on:** Task 03 (Core Editor)

## Objective

Implement daily note file creation, auto-save, and configurable notes folder.

## Sub-Tasks

### 4.1 Open/Create Today's Note on Launch
- [x] On app start, compute today's date as `YYYY-MM-DD`
- [x] Check if `YYYY-MM-DD.md` exists in the notes folder
- [x] If exists → open it in the editor
- [x] If not → create the file and open it
- [x] Handle edge case: app open across midnight (date rollover)

### 4.2 Plain `.md` File Storage
- [x] All notes stored as plain markdown files in a single folder
- [x] File names are strictly `YYYY-MM-DD.md`
- [x] No sub-folders, no metadata files, no database

### 4.3 Auto-Save
- [x] Save editor content to disk on every change
- [x] Debounce saves with ~1 second delay to avoid excessive writes
- [x] Show a subtle save indicator in status bar
- [x] Ensure file is written atomically (write to temp, then rename) to prevent corruption

### 4.4 Notes Folder Settings
- [x] Allow user to set the notes folder path via IPC (dialog.showOpenDialog)
- [x] Persist the chosen path between sessions (settings.json in userData)
- [x] On first launch, use sensible default (Documents/Slate Notes)
- [x] Validate that the chosen folder exists and is writable (ensureNotesFolder)

## Deliverables

- [x] App opens today's note on launch (creates if needed)
- [x] Typing in editor auto-saves to the correct `.md` file
- [x] Changing notes folder in settings takes effect immediately
