# Task 01 — Tech Decision

**Status:** DONE  
**Priority:** Critical (blocks all other tasks)  
**Depends on:** Nothing

## Objective

Choose the application framework and target OS before any implementation begins.

## Options

| Option | Pros | Cons |
|--------|------|------|
| **Tauri (Rust + web UI)** | ~5 MB binary, fast, native file access, cross-platform | Rust knowledge needed for backend |
| **Electron (JS)** | JS everywhere, large ecosystem, mature tooling | ~150 MB+ bundle size |
| **Python + CustomTkinter** | Simplest to build and modify | Less polished UI |

## Target OS Options

- Windows only
- Mac only
- Linux only
- Cross-platform (all three)

## Decision Criteria

- Binary size and startup performance (constraint: < 2s startup)
- Developer familiarity and iteration speed
- Native file system access quality
- Packaging and distribution simplicity

## Sub-Tasks

- [ ] Evaluate each framework against decision criteria
- [ ] Build a minimal "hello world" prototype with top candidate (optional)
- [ ] Choose target OS(es)
- [ ] Document final decision in this file

## Decision

> **Framework:** Electron (JS/TS)  
> **Target OS:** Cross-platform (Windows, Mac, Linux)  
> **Rationale:** JS/TS everywhere (same language for main + renderer), massive ecosystem, mature tooling, proven at scale (VS Code is built on Electron). Trade-off of larger bundle size (~150 MB+) is acceptable for a desktop app.
