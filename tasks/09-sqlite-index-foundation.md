# Task 09 — SQLite Index Foundation

**Status:** DONE  
**Priority:** High  
**Depends on:** Task 04 (File Management), Task 05 (Note Browser)

## Objective

Introduce a local SQLite full-text index for notes and initialize it safely at app startup while keeping markdown files as the source of truth.

## Sub-Tasks

### 9.1 Database Setup
- [x] Add a SQLite dependency compatible with Electron Forge packaging
- [x] Store the database under the app userData directory
- [x] Create a schema for notes and metadata
- [x] Enable full-text search using SQLite FTS

### 9.2 Startup Indexing
- [x] Initialize the database during app startup
- [x] Ensure the notes folder is scanned on first run
- [x] Track index metadata such as last indexed time and note count
- [x] Avoid blocking the app longer than necessary during startup

### 9.3 Index Maintenance API
- [x] Expose index status via IPC
- [x] Add commands to clear the index and rebuild it
- [x] Keep renderer access limited to preload APIs only

## Deliverables

- [x] App creates or opens a SQLite database on startup
- [x] Existing notes are indexed into the local database
- [x] Main process exposes safe APIs for index status, clear, and rebuild