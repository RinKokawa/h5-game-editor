# H5 Game Editor — User Guide

> How to use H5 Game Editor (v0.1). Focused on the Map editor for
> now; additional editors (Dialogue, Animation, …) plug into the
> same shell later.
>
> **Languages:** [English](./USER_GUIDE.md) · [简体中文](./USER_GUIDE.zh-CN.md)

---

## 1. Quick Start

### 1.1 Install

System requirements: **Node ≥ 20**.

```bash
git clone https://github.com/RinKokawa/h5-game-editor
cd h5-game-editor
npm install
```

### 1.2 Launch

```bash
npm run electron:dev
```

A native window opens. The **Launcher** appears on first run — pick a
workspace to start.

> **Note:** `npm run dev` (Vite-only) also opens the UI in a browser,
> but workspace persistence (Ctrl+S, Ctrl+O, the Launcher actions)
> requires the desktop build. Use `npm run electron:dev` for the
> full experience.

### 1.3 Create or open a workspace

A **workspace** is a folder on disk holding the editor's project
files:

- `h5-editor.json` — config (name, active document id, …)
- `documents/<docId>.json` — each map
- `assets/` — your imported assets (folder reserved for a future
  step; v0.1 ships builtin sheets only)

**New Workspace**

1. Click **New Workspace**.
2. Enter a name (e.g. `my-game`).
3. Pick an **empty** folder. The editor writes the skeleton and
   drops you into the editor.

**Open Folder…**

Click **Open Folder…**, pick any folder with an existing
`h5-editor.json`. The editor validates the config and loads the
active document.

**Recent workspaces**

The right side of the Launcher lists recent folders. Click any
entry to jump straight in. Hover an entry to reveal × (remove
from list) and → (open this workspace).

The current workspace is also reachable from **File → Back to
Launcher** in the editor.

### 1.4 Editor layout

```
┌─────────────────────────────────────────────────┐
│ MenuBar                                          │
├─────────────────────────────────────────────────┤
│ Toolbar (V / H / B / E / O / C / R)              │
├──────────┬──────────────────────┬────────────────┤
│ Palette  │                      │ Inspector      │
│ Assets   │      CANVAS          │ Properties     │
│ Layers   │                      │                │
├──────────┴──────────────────────┴────────────────┤
│ Console                                          │
├─────────────────────────────────────────────────┤
│ StatusBar (selection / doc / zoom)                │
└─────────────────────────────────────────────────┘
```

- **Left panels** (stacked, drag to reorder / resize):
  - **Palette** — pick a tile from a builtin sheet, or pick the
    eraser.
  - **Asset Browser** — list of builtin tilesets.
  - **Layers** — add / remove / show / lock / reorder layers.
- **Canvas** — the map you're editing. Pan with **H** (Pan tool,
  hold and drag); zoom with mouse wheel.
- **Right panels**:
  - **Inspector** — placeholder for v0.1; property editing arrives
    with the Extension Registry.
  - **Properties** — live read-only key/value view of the current
    selection (tiles, entity, or collider).
- **Console** — log lines from `console.info` / save / load events
  / errors. Useful for diagnosing "save didn't write" type
  questions.
- **StatusBar** — selection size / cell count, current tile size,
  zoom percentage.

### 1.5 Your first map

1. The default workspace starts with one empty Tile layer
   ("Layer 1").
2. Click the **Brush** tool (B) on the toolbar.
3. Pick a tile from the **Palette** panel — four builtin sheets:
   `grass`, `hills`, `tilled-dirt`, `water`. The eraser sits at
   the bottom.
4. Click on the canvas to paint a single cell. Click-and-drag to
   paint a stroke.
5. Press **Ctrl+S** to save. The document writes to
   `<workspace>/documents/<docId>.json`.

To add another layer, click **+** in the Layers panel header. The
popover offers **Tile / Object / Collision**:

- **Tile** — flat painted layer (most maps have multiple for
  ground, decoration, …).
- **Object** — entity layer (place sprites / spawn-points /
  doors / pickups).
- **Collision** — collider layer (typed boxes — solid / trigger /
  platform). v0.1 supports only **box** shapes.

---

## 2. Keyboard shortcuts

### Tools

| Key | Tool | Purpose |
| --- | --- | --- |
| V | Select | Pick cells / entities / colliders |
| H | Pan | Hold and drag to move the camera |
| B | Brush | Paint the active tile |
| E | Eraser | Clear cells |
| R | Rect | Fill or shift-outline a rectangle |
| O | Entity | Place a sprite / spawn-point / door / pickup |
| C | Collider | Draw a box collider |

> Single-letter shortcuts (V/H/B/E/O/C/R) work without modifiers.
> The shortcut registry drops events from editable fields — typing
> "v" into a future search box won't switch tools mid-keystroke.

### File

| Shortcut | Action |
| --- | --- |
| Ctrl+S | Save (overwrites the active document) |
| Ctrl+O | Open (file dialog; replaces the active document) |

### History

| Shortcut | Action |
| --- | --- |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+Shift+Z | Redo (alternative binding) |

### Selection

| Shortcut | Action |
| --- | --- |
| Delete / Backspace | Erase the current selection |
| Escape | Clear selection / close menu / close dialog |

### Window

| Shortcut | Action |
| --- | --- |
| X / Alt+F4 / Cmd+W | Return to Launcher (window stays open) |
| Cmd+Q / Quit menu | Quit the app |

> The OS close gesture returns to the Launcher; only the actual
> quit menu / shortcut closes the app. This lets you switch
> workspaces without re-launching.

### Menus

| Shortcut | Menu item |
| --- | --- |
| Ctrl+S | File → Save |
| Ctrl+O | File → Open |
| — | File → Back to Launcher |
| — | Help → Documentation (opens the GitHub repo) |
| — | Help → About (version + license dialog) |

### Language

MenuBar → **View → Language** switches between English /
简体中文 / 日本語. The choice persists across sessions.

---

Still need help? Open an issue on the
[GitHub repository](https://github.com/RinKokawa/h5-game-editor).