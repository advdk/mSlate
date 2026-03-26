# mSlate

mSlate is a minimalist desktop markdown editor for daily notes.

It is built with Electron Forge, Webpack, and TypeScript, with a browser-first development workflow for fast UI iteration and an Electron runtime for real file I/O.

## What It Does

- Opens today's note automatically using the filename format `YYYY-MM-DD.md`
- Stores notes as plain markdown files in a user-accessible folder
- Auto-saves edits while you type
- Lists past notes in a chronological sidebar
- Supports full-text search across notes
- Includes a note search palette and a command palette
- Renders markdown preview inside the app
- Tracks word and character count in the status bar
- Supports note templates for new daily notes
- Lets you pin notes to the top of the sidebar
- Imports existing dated markdown files with conflict handling
- Exports the current note to PDF
- Uses a SQLite-backed search index as a derived cache, not as the source of truth

## Principles

- Offline only
- Local-first
- Dark theme only
- One note per day
- Plain files remain the source of truth

## Development Workflow

mSlate is developed browser-first.

In browser mode, the renderer runs at `http://localhost:3333` and uses a mock API backed by `localStorage`. That keeps renderer work fast and avoids needing Electron for most UI changes.

In Electron mode, the app uses the preload bridge and main-process IPC for real filesystem access, settings persistence, import flows, PDF export, and the SQLite search index.

## Getting Started

### Prerequisites

- Node.js current LTS
- npm

### Install Dependencies

```bash
npm install
```

### Run In Browser Dev Mode

```bash
npm run dev
```

This starts the Webpack dev server at `http://localhost:3333` and uses the mock API.

### Run The Full Electron App

```bash
npm run start
```

This launches the desktop app with real file I/O.

### Build A Desktop Package

```bash
npm run make
```

### Publish A GitHub Release

```bash
npm run publish
```

This uses Electron Forge publishing and is intended for GitHub Releases.

### Lint

```bash
npm run lint
```

### Verify Browser And Electron Parity

```bash
npm run verify:parity
```

## How Notes Are Stored

- Notes are plain `.md` files
- Filenames must match `YYYY-MM-DD.md`
- On first launch, mSlate defaults to a `mSlate Notes` folder inside your Documents directory
- The notes folder can be changed from the app
- Notes are written atomically to reduce the risk of file corruption

mSlate also stores app metadata in the platform app data directory:

- `settings.json` for preferences such as notes folder, note template, and pinned notes
- `search-index.db` for the derived SQLite search index

The markdown files remain authoritative. The database exists only to speed up search and can be rebuilt.

## Features

### Daily Notes

- Opens or creates today's note on launch
- Supports daily note templates with `{{date}}` and `{{day_of_week}}`
- Handles jumping back to today's note from anywhere in the app

### Editing

- CodeMirror-based markdown editor
- Auto-save after edits
- Inline markdown shortcuts for bold, italic, headings, and lists
- Word and character counts in the status bar
- Zen mode and preview mode

### Navigation And Search

- Sidebar with all dated notes, newest first
- Pin important notes to keep them at the top
- `Ctrl+P` note palette for fast note search and opening
- `Ctrl+Shift+P` command palette for app actions
- Search index maintenance through Settings and commands

### Import And Export

- Import existing markdown notes from another folder
- Accepts only valid `YYYY-MM-DD.md` filenames
- Detects conflicts before import
- Export the current note to PDF

## Keyboard Shortcuts

### Global

- `Ctrl+P`: open note palette
- `Ctrl+Shift+P`: open command palette
- `Ctrl+,`: open Settings
- `Ctrl+\\`: toggle sidebar
- `Ctrl+T`: jump to today's note
- `Ctrl+Shift+V`: toggle preview mode
- `Ctrl+Shift+Z`: toggle zen mode
- `Ctrl+Shift+E`: export current note to PDF

### Editor

- `Ctrl+B`: wrap selection in bold markdown
- `Ctrl+I`: wrap selection in italic markdown
- `Ctrl+H`: cycle heading level
- `Ctrl+L`: insert or continue a list item
- `Ctrl+S`: save immediately

## Architecture

- `src/index.ts`: Electron main process, filesystem access, settings, search index, import, export, and window actions
- `src/preload.ts`: safe API surface exposed to the renderer through `contextBridge`
- `src/renderer.ts`: UI, editor behavior, palettes, settings, preview, and status bar interactions
- `src/mock-api.ts`: browser-mode implementation for fast renderer development
- `src/main/search-index.ts`: SQLite-backed search index implementation

## Releases And Auto-Updates

- Packaged Windows and macOS builds check for updates from GitHub Releases
- Packaged Windows and macOS builds can also trigger a manual update check from the command palette or Help menu
- Auto-update checks are enabled only in packaged app builds, not during local development
- GitHub Releases must use valid semver tags such as `v0.1.1`
- Releases must not be drafts or prereleases if you want them to be picked up by the public Electron update service
- The repository used for release publishing and update checks is `advdk/mSlate`

### Release Flow

1. Update the version in [package.json](package.json)
2. Commit and push your changes
3. Create and push a semver tag such as `v0.1.1`
4. The release workflow in [.github/workflows/release.yml](.github/workflows/release.yml) publishes artifacts to GitHub Releases

### Notes

- Windows auto-update works with the existing Squirrel maker output
- macOS auto-update requires properly signed builds for production use
- Linux builds can still be published, but in-app auto-update is not enabled by the current setup

## Project Structure

```text
src/
  index.ts
  preload.ts
  renderer.ts
  mock-api.ts
  index.html
  index.css
tasks/
  00-overview.md
scripts/
  verify-task13.cjs
```

## Security Model

- The renderer does not access Node.js APIs directly
- File and OS operations stay in the Electron main process
- Renderer-to-main communication goes through the preload bridge and IPC
- Browser mode falls back to a mock API instead of exposing privileged access

## Status

Current implemented work includes:

- Core daily-note editor
- File-backed note storage
- Search and indexed search sync
- Settings and maintenance actions
- Markdown import
- Browser/Electron parity verification

Task tracking lives in `tasks/`, with the task index at `tasks/00-overview.md`.

## License

MIT