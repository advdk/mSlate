# Task 02 — Project Setup

**Status:** DONE  
**Priority:** High  
**Depends on:** Task 01 (Tech Decision)

## Objective

Initialize the project with the chosen framework, configure defaults, and set up the build/packaging pipeline.

## Sub-Tasks

### 2.1 Initialize Project
- [x] Scaffold project using framework CLI/template
- [x] Set up directory structure (src, assets, config, etc.)
- [x] Install core dependencies
- [x] Verify the app runs in development mode

### 2.2 Configure Dark Theme as Default
- [x] Set dark color scheme as the only theme
- [x] No light mode toggle needed
- [x] Define base color palette (background, text, accents)

### 2.3 Build & Packaging Pipeline
- [x] Configure build script for production binary
- [x] Set up auto-build via GitHub Actions for target OS
- [x] Test that packaged binary launches correctly
- [x] Configure app icon and metadata (name, version, description)

## Deliverables

- [x] Project runs locally in dev mode
- [x] `npm run make` produces a distributable binary
- [x] CI pipeline builds on push to `main`
