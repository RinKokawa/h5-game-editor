# H5 Game Editor

A long-term maintainable, data-driven H5 game editor framework. Designed to
be the host for multiple editor types (Map, Dialogue, Animation, Quest, ...)
sharing a single core.

> Status: **early scaffolding**. Architecture frozen; feature work in progress.

## Tech Stack

| Concern       | Choice                  | Why                                        |
| ------------- | ----------------------- | ------------------------------------------ |
| UI shell      | React 19                | Ecosystem, hiring, mature hooks model      |
| Canvas render | PixiJS 8                | Fastest mature 2D WebGL renderer           |
| State (UI)    | Zustand 5               | Minimal API, no boilerplate, easy to scope |
| Build         | Vite 6                  | First-class TS / HMR / ESM                 |
| Language      | TypeScript 5.6 (strict) | Compile-time guarantees for 5-year horizon |
| Lint          | ESLint 9 (flat config)  | Module-boundary enforcement                |
| Format        | Prettier 3              | One canonical style                        |

## Architecture in One Picture

```
React Shell (UI, panels, layout)
       │
       │  Zustand stores (UI state)  ·  Command Bus (mutations)
       ▼
Core Framework (command, history, event, document, extension)
       │
       │  Document change events
       ▼
PixiJS Renderer (camera, grid, layers, gizmos)
```

Single source of truth = the **Document**. All mutations go through
**Commands**. Renderers and UI both subscribe to change events. See
[`CLAUDE.md`](./CLAUDE.md) for the full architectural rationale.

## Project Structure

```
src/
├── app/           # Entry, root component, providers
├── core/          # Business-agnostic framework (command, history, event, ...)
├── editor/        # Editor implementations (map in v0.1)
├── canvas/        # PixiJS rendering subsystem
├── panels/        # React UI panels (inspector, palette, ...)
├── layout/        # Dock / splitter / layout persistence
├── state/         # Zustand stores (UI / view state only)
├── assets/        # Asset loading & caching
├── systems/       # Cross-cutting (shortcuts, command palette, diagnostics)
├── shared/        # Pure constants and math
├── types/         # Global TypeScript types
├── utils/         # Pure utility functions
└── styles/        # Global styles and CSS variables
```

Each folder has a `README` comment in its `index.ts` describing its scope.

## Module Dependency Rules

Lower layers may **never** depend on upper layers. ESLint enforces:

```
app       →  editor, panels, layout, systems, canvas
editor    →  core, state, canvas, panels
canvas    →  core, state
panels    →  core, state
layout    →  core, state, panels
systems   →  core, state, editor, panels
core      →  types, shared, utils
state     →  core, types, shared, utils
shared    →  types, utils
utils     →  types, shared
```

Adding an import across a forbidden edge fails `npm run lint`.

## Getting Started

Requirements: Node ≥ 20.

```bash
npm install
npm run electron:dev # full editor: Vite + Electron (http://localhost:5173 inside the app)
npm run dev          # Vite-only (browser preview; Launcher shows a "needs Electron" banner)
npm run build        # production build
npm run typecheck    # TypeScript only
npm run lint         # ESLint
npm run lint:fix     # ESLint --fix
npm run format       # Prettier write
npm run test         # Vitest (unit tests, once per file)
npm run test:watch   # Vitest watch mode
```

The editor is **Electron-only** — workspaces live in folders the user
picks via the OS dialog, and the renderer talks to the filesystem
through the `window.h5` bridge the preload exposes. Running
`npm run dev` opens the Vite preview in a plain browser; the Launcher
mounts but the **New Workspace** and **Open Folder…** actions are
disabled with an inline hint to use `npm run electron:dev` instead.

## Current Capabilities (v0.1)

- ✅ Vite + React 19 + TypeScript strict
- ✅ PixiJS renderer + camera + grid + tile layers
- ✅ Brush tool: paint / erase with drag-to-paint
- ✅ Select / Pan / Eraser / Brush / Entity / Collider tools (V / H / B / E / O / C)
- ✅ Selection: tiles (click + marquee), entities (click), colliders (click), Delete-to-erase
- ✅ Layer panel: add / delete / move / visibility / lock (tile + object + collision layer kinds)
- ✅ Command system + Undo/Redo (Ctrl/Cmd+Z, Ctrl/Cmd+Y, Ctrl/Cmd+Shift+Z)
- ✅ JSON save / load (Ctrl/Cmd+S, Ctrl/Cmd+O) via Electron file dialogs
- ✅ Object layers + Entity placement (sprite, spawn-point, door, pickup)
- ✅ Collision layers + box collider placement (drag-to-size)
- ✅ Rect tool — fill + Shift outline, single Ctrl+Z per drag (R)
- ✅ PropertiesPanel: live read-only view of the current selection
- ✅ Editor UI: English / 简体中文 / 日本語 (MenuBar → View → Language)
- ✅ Workspace + Launcher (Electron-only): folder-based persistence, recents
- ✅ Module-boundary ESLint enforcement

## Roadmap

| Step | Scope                                           | Status |
| ---- | ----------------------------------------------- | ------ |
| 1    | Architecture design                             | ✅     |
| 2    | Project scaffold                                | ✅     |
| 3    | Data structures (Document, Map, Layers, Entity) | ✅     |
| 4    | Editor layout (menubar, toolbar, dock)          | ✅     |
| 5    | PixiJS integration                              | ✅     |
| 6    | Camera (pan, zoom)                              | ✅     |
| 7    | Grid overlay                                    | ✅     |
| 8    | Tile drawing                                    | ✅     |
| 9    | Layers (visibility, lock, reorder)              | ✅     |
| 10   | Command system + Undo/Redo                      | ✅     |
| 11   | Selection & marquee                             | ✅     |
| 12   | Tools (Brush, Eraser, Select, Pan)              | ✅     |
| 13   | Object layer + Entity placement                 | ✅     |
| 14   | Collision layer                                 | ✅     |
| 15   | JSON import / export                            | ✅     |
| 16   | Shortcuts (Ctrl+S / Z / Y / Delete / Space)     | ✅     |
| 17   | Editor UI i18n (English / 简体中文 / 日本語)   | ✅     |
| 18   | Workspace + Launcher (Electron-only)           | ✅     |
| 19   | Selection model + PropertiesPanel real data     | ✅     |

Future editor types (Dialogue, Animation, Quest, Inventory, Skill,
Cutscene, Node, Localization, Timeline, Particle) plug into the existing
`core/` and `editor/` registries without architectural changes.

## Contributing

1. Read [`CLAUDE.md`](./CLAUDE.md) — it is the contract.
2. Run `npm run lint` and `npm run typecheck` before pushing.
3. Keep files focused; if a file exceeds ~300 lines, split it.
4. New modules must declare their scope in `index.ts` and respect the
   dependency rules above.
