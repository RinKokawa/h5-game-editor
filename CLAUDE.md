# CLAUDE.md — Project contract for AI coding assistants

> **Read this file before touching any source.** It encodes the architectural
> decisions that took weeks to negotiate. Violating them breaks the project
> in ways that surface months later, not minutes.

---

## 1. What this project is

A long-lived H5 game **editor framework**. The product is **not** "a map
editor" — it is a framework on which multiple editors (Map, Dialogue,
Animation, Quest, Inventory, Skill, Cutscene, Node, Localization,
Timeline, Particle) are built. Design every change to survive the addition
of the next ten editors.

## 2. Tech stack (locked)

- **React 19** — UI shell only
- **PixiJS 8** — canvas rendering only (React must not draw tiles)
- **Zustand 5** — UI / view state only (project data lives in the Document)
- **Vite 6**, **TypeScript 5.6 strict**, **ESLint 9 flat**, **Prettier 3**

Do not introduce Redux, MobX, RxJS, Immer, react-pixi, or any
PixiJS-React binding. They conflict with the architecture below.

## 3. Core invariants (NEVER violate)

1. **The Document is the single source of truth.** No view holds a parallel
   state for project data. Period. Project-level scalars
   (`DocumentMeta.tileSize` and `DocumentMeta.mapSize`) mutate only
   through Commands dispatched via the CommandBus
   (`SetTileSizeCommand` / `SetMapSizeCommand`) — never directly from
   the store or a panel/tool.
2. **All mutations go through Commands.** Tools, panels, and shortcuts
   build Commands and dispatch them via the Command Bus. There is no
   back-door `document.layers[0].tiles[x] = …`.
3. **React never draws a Tile.** The PixiJS scene graph is the only place
   tiles, entities, grids, and selection rects live.
4. **Pixi object references never enter React state or Zustand stores.**
   Communication is one-way: store → props (numbers, ids, flags) → Pixi
   scene graph.
5. **Tools produce Commands.** A Tool never mutates the Document directly.
   This makes tools replayable and keeps Undo/Redo correct.
6. **Module boundaries are enforced by ESLint.** If `npm run lint` passes,
   the layering is intact. Do not silence boundary rules.

## 4. Module dependency rules (enforced)

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

If you need a function from `editor/` inside `canvas/`, the right answer is
almost always: promote it to `core/` or `shared/`, then import from there.

## 5. Where things go

| You're adding…                                  | It belongs in…             |
| ----------------------------------------------- | -------------------------- |
| A tool (Brush, Eraser, …)                       | `editor/map/tools/`        |
| A mutation (DrawTile, MoveEntity, …)            | `editor/map/commands/`     |
| A Document schema type (Map, Tile, Entity)      | `editor/map/schema/`       |
| A reusable schema type (Entity base, ID brand)  | `editor/shared/`           |
| A pure rendering primitive (Sprite pool, Grid)  | `canvas/`                  |
| A React UI panel (Inspector, Palette, …)        | `panels/`                  |
| A cross-cutting system (Shortcuts, Diagnostics) | `systems/`                 |
| A pure function helper (math, ID gen)           | `shared/` or `utils/`      |
| UI-only state (current tool, open panels)       | `state/`                   |
| Project data (current map, layers, entities)    | the Document (not Zustand) |

## 6. File size & structure

- Target: **< 300 lines per file**. If a file grows beyond that, split it.
- **No God Objects**. A single class never owns "everything about editing".
- **No utility-bucket files** (`helpers.ts` with 30 unrelated functions).
- One class / one responsibility per file. File name = primary export.
- Co-locate tests next to source as `*.test.ts`.

## 7. Naming conventions

- React components: `PascalCase.tsx`
- Classes / types / interfaces: `PascalCase.ts`
- Functions / variables: `camelCase.ts`
- Constants: `SCREAMING_SNAKE_CASE` (only true compile-time constants)
- Commands: `<Verb><Noun>Command.ts` — `DrawTileCommand`, `MoveEntityCommand`
- Tools: `<Purpose>Tool.ts` — `BrushTool`, `EraserTool`, `SelectTool`
- IDs: branded strings — `type LayerId = string & { readonly __brand: 'LayerId' }`
- Files exporting a single class may drop the redundant prefix
  (e.g. `BrushTool.ts` exports `BrushTool`, not `class BrushToolTool`).

## 8. Data flow

```
User input
   ↓
Input aggregator (canvas/input)
   ↓
Active Tool (editor/map/tools)
   ↓
Command (editor/map/commands) + CommandBus (core/command)
   ↓
Document Service (core/document)  →  Document change events (core/event)
   ↓                                       ↓
HistoryStack (core/history)        Pixi Renderer (canvas/renderer)
   ↓                                       ↓
Zustand store updates              Scene-graph delta
   ↓                                       ↓
React panels re-render             Frame
```

Never skip a layer. A shortcut binding may dispatch a Command directly
(skipping the Tool), but never a Document mutation.

## 9. TypeScript style

- `strict: true` plus `noUncheckedIndexedAccess`, `noImplicitOverride`,
  `noUnusedLocals`, `noUnusedParameters`.
- **No `any`.** Use `unknown` and narrow.
- **Avoid non-null assertions** (`!`). Prefer type guards.
- Use discriminated unions for state, results, events.
- Prefer `readonly` on every type that does not mutate.
- Use `import type` for type-only imports (enforced by lint).

## 10. React style

- Function components only. No class components.
- Hooks at the top of the component; never inside conditions.
- Lift state to the smallest common ancestor; lift _type_ state to Zustand
  only if multiple distant components need it.
- **Do not** use `useEffect` to sync derived state — compute during render.
- Avoid `useMemo`/`useCallback` unless measured to be necessary.

## 11. PixiJS style

- One Pixi `Application` per editor instance. Never recreate it on re-render.
- Subscribe to Document events; do not poll.
- Reuse sprites via pools; do not allocate per tile per frame.
- The renderer must function with React StrictMode (mount, unmount, mount).

## 12. Commit & step discipline

This project is built **one architectural step at a time**. Each step
must:

1. Be approved before starting.
2. Land behind a working `npm run build` + `npm run lint` + `npm run typecheck`.
3. Add tests for non-trivial logic.
4. Update `README.md` and `CLAUDE.md` if scope or rules changed.

Do not bundle "while we're at it" changes into a step. Stay laser-focused.

## 13. Current step

**v0.1 closed loop + 5-year skeleton** — completed. Steps 20–28
shipped; Step 29 (SelectionStrategy registry) is deferred until
the 4th selection kind lands.

**Step 28 — Command 去重 (A3)** — completed last. The five
"shape-varies-only-by-kind" Commands now share two base classes.

- `editor/map/commands/layerFactories.ts` mints a fresh `ObjectLayer`
  (analogous to `TileLayer`) and assigns a unique id.
- `AddObjectLayerCommand` prepends a new object layer; mirrors the
  existing tile-layer add.
- `PlaceEntityCommand` / `RemoveEntityCommand` add and remove
  entities; the place command appends the entity id to the
  active object's `entityOrder` and the remove command captures
  every layer reference so undo restores them.
- `ObjectLayerView` (PixiJS) renders object layers with one
  `Container` per layer and a `Graphics` rectangle per entity, in
  `entityOrder`. Visibility, lock, and reordering all drive from
  the document store.
- `EntityTool` (O shortcut) places an entity on click: active layer
  must be an `Object` layer (else the click is a no-op), Space+left
  defers to camera, every placement is a single `PlaceEntityCommand`
  undo entry.
- `LayerPanel` `+` opens a popover with **Tile** / **Object** choices
  for v0.1.
- `editor/map/palette/defaultEntityTypes.ts` is the placeholder
  palette (sprite / spawn-point / door / pickup) — real plugin
  renderers land with the Extension Registry.
- `DocumentService.removeEntity` automatically cleans up dangling
  references in every `ObjectLayer.entityOrder` so the
  `RemoveEntityCommand` only has to capture them for undo symmetry.
- Entity removal from the canvas UI is **not** in scope for Step 13
  (no selection model yet). Use Undo (Ctrl+Z) to revert. The
  selection model lands with Step 19.

**Why Object layer / entity data lives on `documentStore`, not the
Pixi scene graph.** PixiJS views must subscribe to a plain-data
store. `ObjectLayerView` reads `useDocumentStore` and rebuilds its
Container on a rAF debounce — one place for ordering, visibility,
and the entity table, all from a single source of truth.

**Step 14 — Collision layer + box collider placement** — completed.
The Map editor now has a `Collision` layer kind that holds typed
collider shapes; v0.1 ships box placement.

- `editor/map/commands/layerFactories.ts` mints a fresh `CollisionLayer`
  with empty `colliderOrder`; `AddCollisionLayerCommand` prepends it.
- `PlaceColliderCommand` adds a collider to the `colliders` table AND
  appends its id to the layer's `colliderOrder`. The Command takes a
  `BoxCollider` value (v0.1) — `placeCollider` helper mints a fresh
  id. `RemoveColliderCommand` is the symmetric inverse; both undo
  cleanly via `DocumentService.removeCollider` orphan cleanup.
- `CollisionLayerView` (PixiJS) mirrors `ObjectLayerView`: one
  `Container` per CollisionLayer, rebuilt on a rAF debounce.
  Each `box` collider is a translucent filled rectangle stroked in
  its `kind`-color (solid red, trigger blue, platform green).
  Circle and polygon entries are skipped in the renderer (schema
  supports them; UI lands with the collision editor extension).
- `ColliderTool` (C shortcut) drag-strokes a box; clicks without a
  drag place a `tileSize` × `tileSize` default box. `MIN_BOX_SIZE=4`
  guards against zero-size placements. Space+left defers to
  camera, same as every other tool.
- `LayerPanel` popover now lists **Tile / Object / Collision**.
- `documentStore` carries `colliders: ReadonlyMap<ColliderId, Collider>`
  and primitives (`addCollider`, `removeCollider`, `setCollider`,
  `getCollider`, `appendToCollisionLayer`,
  `removeFromCollisionLayer`) — same shape as the entity table.
- Like Step 13, collider removal from the canvas UI is out of scope
  (no selection model). Use Undo (Ctrl+Z) to revert. Real selection
  - Inspector wiring lands in Step 19.

**Why Collision layer / collider data lives on `documentStore`, not the
Pixi scene graph.** Same reason as Step 13 — `CollisionLayerView`
subscribes to `useDocumentStore` and rebuilds. The orphan-cleanup
pattern (`removeCollider` strips dangling ids from every
`CollisionLayer.colliderOrder`) means commands only need to capture
refs for undo, not track them.

**Step 19 — Selection model extension + PropertiesPanel real data**
— completed. The selection store is now a discriminated union:
`{ kind: 'tiles' | 'entity' | 'collider', ... }`. The
`PropertiesPanel` is no longer a placeholder — it renders the live
data of whatever is selected.

- `selectionStore.ts` exposes
  `Selection = TileSelection | EntitySelection | ColliderSelection`.
  `setTileSelection / toggleTileCell / addTileCell` (tile-side),
  `setEntitySelection / setColliderSelection` (identity-side).
  `marquee` and `hover` remain tile-only in v0.1 (entity / collider
  marquee lands with the selection extension step).
- `SelectTool` hit-tests all three layer kinds. On a Tile layer it
  keeps the existing toggle / marquee behavior; on Object layers it
  picks the topmost entity whose AABB contains the click; on
  Collision layers, the topmost box collider. Cross-layer selection
  is out of scope (Step 22).
- `SelectionOverlay` (PixiJS) now subscribes to BOTH `selectionStore`
  and `documentStore`, so selected entity / collider outlines track
  live position changes (or vanish when the selected thing is
  deleted). Outlines get a tiny corner-mark so they read as selection
  vs. the underlying object. Circle / polygon collider outlines fall
  through with the editor extension.
- `EraseSelectionCommand` is now strictly tile-side: it `isEmpty()`
  returns true for non-tile selections, and only the tile path
  captures/restores the prior cells. Symmetric `RemoveEntityCommand`
  and `RemoveColliderCommand` are routed in the keyboard handler.
- `SelectionShortcuts.Delete` / `Backspace` switches on
  `selection.kind`: tile → `EraseSelectionCommand`, entity →
  `RemoveEntityCommand`, collider → `RemoveColliderCommand`.
  `Escape` clears any selection (and any in-flight marquee).
- `PropertiesPanel` renders flat key/value rows for the current
  selection. Entity rows show id / type / name / position / size /
  rotation; collider rows add `kind` and adapt the geometry block to
  box (size + rotation), circle (radius), or polygon (vertex count).
  Tile rows list the layer name + cell count, then one row per cell
  with `tilesetId / tileId`. Empty / stale states print a centered hint.
- `StatusBar` selection counter is now kind-aware: tiles report their
  cell count, entity / collider always 1, none → 0. The
  `selection.size`-on-`cells` shortcut is gone.

**Why the selection is a single discriminated union, not three
parallel fields.** Each selection picks exactly one kind. Forcing the
union means consumers (`EraseSelectionCommand`, `StatusBar`,
`PropertiesPanel`, `SelectionShortcuts`) must narrow explicitly —
the compiler catches any path that mixes kinds. A field-based design
("`entityId?` + `colliderId?` + ... + a `kind` discriminator")
re-introduces all the combinations a discriminated union removes.

**Step 18 — Workspace + Launcher** — completed. The editor now boots
into a workspace picker (`<Launcher/>`) instead of mounting the
editor unconditionally, and all document persistence is scoped to a
folder the user owns.

- A workspace = a folder the user chooses. The folder contains
  `h5-editor.json` (the `WorkspaceConfig`) plus `documents/<id>.json`
  files and an empty `assets/` skeleton. The schema supports a
  `documents[]` table so a future multi-doc UI doesn't need to
  migrate the on-disk shape; v0.1 ships exactly one document per
  workspace.
- `core/workspace/schema.ts` carries the pure types and layout
  constants (`WorkspaceRef`, `WorkspaceConfig`, `RecentEntry`,
  `WORKSPACE_CONFIG_FILENAME`, `MAX_RECENT_ENTRIES`, etc.). The
  renderer and the Electron main process both import from here so a
  filename / version bump has exactly one source of truth.
- `state/workspaceStore.ts` holds the UI-only phase + the in-memory
  mirror of recents. ESLint forbids `state/` from importing
  `systems/`, so the store *cannot* drive IPC. The actual recents
  load/save runs through `systems/persistence/recentWorkspaces.ts`
  and is composed by the `<Launcher/>`.
- `systems/persistence/workspaceIO.ts` is the workspace-scoped
  orchestrator: `createNewWorkspace(name)` (folder picker + file
  bootstrap, returns the ref + active doc id), `openExistingWorkspace`
  (stat the config), `loadActiveDocument` (hydrate the document
  store and reset selection / history).
- `systems/persistence/documentIO.ts` is now strictly
  workspace-scoped. Save writes to
  `<workspace>/documents/<activeDocId>.json`; Load re-reads it (a
  manual "revert to disk" gesture). The localStorage fallback from
  Step 16 is **removed**: with a launcher, "no workspace, no
  document" is the correct rule rather than a magic last-snapshot.
  Outcomes discriminate on `path: string` (never null) reflecting
  the new always-workspace-backed storage.
- `electron/main.ts` + `electron/preload.ts` gained the dialog +
  workspace + recents IPC surface (`dialog:pickFolder`,
  `workspace:{create,stat,listDocuments,readDocument,writeDocument}`,
  `recents:{load,save}`). Recents live in `app.getPath('userData')`
  on the main side; the renderer never names the file.
- `app/WorkspaceGate.tsx` selects `<Launcher/>` vs `<EditorShell/>`
  on `workspaceStore.phase`. `app/launcher/Launcher.tsx` is the
  full-screen UI (brand + actions + recent list). `app/App.tsx` is
  now `<WorkspaceGate/>`. File → Back to Launcher (added in
  `EditorShell.tsx`'s `fileActions`) returns to the launcher
  without touching disk.

**Why the Launcher sits in `app/`, not `panels/`.** The Launcher's
whole reason to exist is to mediate between the React UI and
Electron IPC (`systems/`); the ESLint boundary forbids `panels/`
from importing `systems/`, so the only legal home is `app/`.
`panels/` retains its "always passive consumer of core + state"
identity.

**Why the localStorage fallback was deleted rather than disabled.**
A fallback that never fires is dead code. The launcher is the only
legal entry point in Step 18; Ctrl+S / Ctrl+O outside the editor
phase now log a clear error and stop, which is exactly what an
intentional "no workspace, no document" rule should do.

**Step 21 — Document schema 收尾 (tileSize / mapSize → DocumentMeta)** —
completed. Project-level scalars are now first-class Document data
and mutate only through Commands.

- `editor/map/schema/document.ts` gains `DocumentMeta { tileSize; mapSize }`
  and adds it as `Document.meta`. The `Document` interface itself is
  still forward-shape (flat `DocumentStore` mirrors the active
  fields only); the `MapData` / `Document.maps` restructure is
  deferred until a second map is real.
- `state/documentStore.ts` collapses `tileSize` / `mapSize` into
  `meta: DocumentMeta`. The only direct setter left on the store
  is `setActiveLayer` — selection / focus, not project data.
  `setMeta` is a private primitive called only by
  `DocumentService`.
- `core/document/DocumentService.ts` gains
  `getMeta / setMeta / setTileSize / setMapSize`, all emitting
  `{ kind: 'document:meta' }`. The single read endpoint for views
  stays `useDocumentStore`.
- `editor/map/commands/SetTileSizeCommand.ts` and `SetMapSizeCommand.ts`
  are the only legal mutation paths for `tileSize` / `mapSize`.
  Both throw at construction for non-positive values, both
  carry `prev`/`next` so `do`/`undo` are symmetric and stateless.
  Indexed under the existing `@editor/map/commands` barrel.
- `core/serialization/documentSerializer.ts` round-trips `meta`
  (`{ tileSize, mapSize }`) under a top-level `meta` key. The
  error path now rejects a missing `meta` and a missing
  `meta.mapSize`.
- `systems/persistence/documentIO.ts` and
  `systems/persistence/workspaceIO.ts` route the active Document
  through `meta` on save and load; IO no longer peeks at the flat
  scalars.
- View consumers (StatusBar, GridView, TileLayerView, SelectionOverlay,
  SelectTool / EraserTool / RectTool / BrushTool / EntityTool /
  ColliderTool, EditorShell) read `s.meta.tileSize` /
  `s.meta.mapSize` in place of the old flat fields. Comments in
  `selectionStore.ts` and `SelectionOverlay.ts` updated to match.
- CLAUDE.md §3 invariant 1 strengthened: "Project-level scalars
  (`DocumentMeta.tileSize` and `DocumentMeta.mapSize`) mutate only
  through Commands dispatched via the CommandBus
  (`SetTileSizeCommand` / `SetMapSizeCommand`) — never directly
  from the store or a panel/tool."

**Why a separate `DocumentMeta` field rather than putting
`tileSize` / `mapSize` on `MapData`.** Two reasons. (1) The
`Document` is the unit of save/load today; hoisting these scalars
onto `meta` keeps the wire format one-to-one with the schema.
(2) `MapData` is forward-shape — when a second map is real, each
`MapData` carries its own `tileSize` and the project's meta keeps
the workspace-level defaults. Pulling the trigger on `MapData`
now would force a redundant rewrite of every command.

Next: **Step 22 — DocumentChange payload + LayerView 基类** (A2 + A6).
The discriminated `DocumentChange` union gives PixiJS layer views
the targeting they need to do per-cell updates; the
`canvas/layers/LayerView` base class extracts the
drop/add/reorder/rAF dance so the three existing
`{Tile,Object,Collision}LayerView` files collapse by ~60% each.

**Step 22 — DocumentChange payload + LayerView 基类 (A2 + A6)** —
completed. Pixi subscribers can now opt into targeted updates
without losing their no-op skipping, and the three LayerView
files share one container-lifecycle / rAF-debounce / reorder
implementation.

- `core/document/DocumentService.ts` upgrades `DocumentChange`
  from `{ kind: string }` to a 17-variant discriminated union.
  Each variant carries the location info a focused subscriber
  needs: `tile:set { layerId; coord }`, `layer:add { layer;
  atIndex }`, `entity:set { entity }`, `objectLayer:append {
  layerId; entityId }`, etc. Subscribers who don't care about a
  particular kind keep working — they just compare `c.kind ===
  '...'` against the new tag.
- Emitter-side rAF coalescing was considered and rejected for
  Step 22. Pixi layer views already rAF-debounce at the base
  class level, and async delivery would force subscribers
  (notably `SelectionOverlay`) to await frames just to read
  state. If a future non-Pixi subscriber actually needs
  batching, that's the trigger.
- `canvas/layers/LayerView.ts` is a new generic base class:
  `class LayerView<TLayer extends Layer>`. It owns the Pixi
  container hierarchy (one root + one child container per
  visible layer), rAF-debounced redraws via
  `protected scheduleRender()`, drop-stale / add-new /
  reorder-three-step, and the destroy lifecycle.
- Subclasses (`TileLayerView`, `ObjectLayerView`,
  `CollisionLayerView`) implement three abstract slots:
  `subscribeToSource()` (one Zustand subscription returning the
  unsubscribe), `filterLayer(): l is TLayer`, and
  `renderNode(node, layer)` — the only place content drift is
  handled. Per-layer diff state (`Map<LayerId, TContentState>`)
  lives on the subclass because it's view-specific.
- `editor/map/schema/events.ts` deleted. It was a forward-shape
  aspirational `DocumentChange` with `MapId` payloads — never
  imported, never emitted, and now superseded by the live
  `core/document/DocumentService.DocumentChange` union.
- File budget: base class ~140 lines (with comments), three
  subclasses collapse from 130–170 lines each to ~85–110.
  Per-subclass shrinkage on the lifecycle boilerplate alone is
  ~70%.

**Why a base class now, before Step 23's per-cell diff work.**
Step 23 only needs to rewrite `TileLayerView.renderNode`'s
body to mutate one sprite instead of rebuilding. With the
lifecycle extracted, that becomes a localized change instead of
a full rewrite. If Step 22 had skipped the base class, Step 23
would either have to rewrite three LayerView files at once or
land the patch twice (once for the lifecycle, once for the
content diff).

**Why the discriminated `kind` over a runtime `kind: string`.**
Three reasons. (1) `c.kind === 'tile:set'` narrows the
discriminant and gives subscribers an in-scope `coord` without
a re-lookup. (2) Adding a new variant is type-checked across
every `switch (c.kind)` — the compiler punishes stale matches.
(3) `DocumentChange` becomes the contract a future
editor-with-extensions uses to declare its own variant — no
runtime registration, no symbol magic.

Next: **Step 23 — TileLayerView 性能 (差量绘制)** (B3). Now that
`tile:set` carries `(layerId, coord)` and the base class owns
the rAF/lifecycle dance, the TileLayerView can shift from
"rebuild everything" to "mutate one sprite" without touching
the surrounding architecture.

**Step 23 — TileLayerView 性能 (差量绘制)** — completed. The
TileLayerView no longer rebuilds the entire container on every
store change. Per-cell updates mutate a single sprite; only
insert/remove actually allocates.

- `canvas/tile-layer/TileLayerView.ts` keeps a `Map<LayerId,
  Map<TileCoordKey, Sprite>>` keyed by tile coord. Each layer
  also stores a `LayerSnapshot { tiles; tileSize }` so
  tileSize-only mutations (e.g. `SetTileSizeCommand`) trigger
  the resize path without a full diff.
- `diffTileSprites` is exported as a pure helper. Cold start
  (`prev === undefined`) adds every entry; warm passes walk
  `prev.keys()` for removals and `next.entries()` for adds /
  mutations, reusing the existing `Sprite` instance and only
  re-tinting / re-positioning changed cells.
- The no-op fast-path stays at the renderNode boundary: if
  `tilesEqual(prev.tiles, next.tiles)` *and* `tileSize` is
  unchanged, `renderNode` returns immediately — no diff
  traversal, no Pixi mutation.
- `applyPlacement` mutates `tint / width / height / x / y` on
  the existing sprite. Rotation / flip still fall through
  the schema (placeholder palette only varies tileId), but the
  seam is in place for when the v0.2 plugin renderer lands.
- Test coverage in `TileLayerView.test.ts` (6 cases) drives
  `diffTileSprites` directly with a `Container` and a fake
  `tiles` map: cold start, no-op, add, remove, mutate-in-place,
  resize. The tests assert `sprites.size`, `container.children
  .length`, and that changed cells reuse the same `Sprite`
  instance (no churn).

**Why incremental sprite diff over a `ParticleContainer` or a
global sprite pool.** Three reasons. (1) The codebase has one
`Sprite` per visible tile, not one per (tileset, palette
slot). A `ParticleContainer` would force a property-pack layout
that the placeholder palette doesn't need. (2) Per-cell
mutation maps cleanly onto the `tile:set` payload from Step
22 — the same kind of update lands the same way. (3) Pool
reuse across layers would require a key-stable identity that
the per-layer Map already provides, and would be a refactor
of the just-extracted LayerView lifecycle.

**Why a `LayerSnapshot` alongside the sprite Map.** A
`SetTileSizeCommand` doesn't touch `tiles` itself; it changes
`meta.tileSize`. Without the snapshot, the no-op fast path
would skip resize on the second `setTileSize` of the same
value (false positive: the map is equal but the cell sizes
are stale). Carrying `tileSize` in the snapshot makes that
case correct.

Next: **Step 24 — Extension Registry + Tool interface** (A1).
CLAUDE.md has promised extension points since Step 1;
either the registry exists or the promise is deleted.

**Step 24 — Extension Registry + Tool interface (A1)** —
completed. CLAUDE.md §5's "Editor extension points" table now has
a concrete shape, every concrete tool implements a shared
interface, and the five stub directories (`core/extension`,
`core/history`, `utils`, `shared/constants`, `assets`) each play
their real role.

- `shared/tool/Tool.ts` is the interface every editor tool
  implements: parameterless constructor, `attach(canvas)` to wire
  DOM listeners, `detach()` to remove them, plus `id` and
  `labelKey`. The interface lives in `shared/` (not
  `editor/map/tools/`) because `core/extension/` and the editor
  tools both need to import it without crossing the
  `core → editor` boundary.
- All seven Map editor tools (`BrushTool`, `EraserTool`,
  `PanTool`, `RectTool`, `SelectTool`, `EntityTool`,
  `ColliderTool`) are rewritten to `implements Tool`. The
  constructor no longer takes `canvas`; `EditorShell` does
  `new BrushTool(); brush.attach(canvas); ... brush.detach();`
  after `PixiRenderer.start()` resolves. Net effect: tools can be
  swapped at runtime via the registry without rewriting the shell.
- `core/extension/types.ts` declares `EditorExtension`,
  `ToolDefinition`, `PanelDefinition`, `CommandPaletteEntry`,
  `DocumentSerializer`, and the `EditorRegistry` surface.
  `core/extension/registry.ts` implements `ExtensionRegistry` —
  install / lookup for all four surfaces, duplicate-id guards on
  every register call, ordered `listExtensions()` for boot
  introspection.
- The five stub directories are no longer empty:
  - `core/extension/index.ts` — real barrel
    (`ExtensionRegistry` + types).
  - `core/history/index.ts` — re-exports `HistoryStack` from
    `@core/command/HistoryStack` (canonical name).
  - `utils/` — `ids.ts` (generatePrefixedId / generateId),
    `timing.ts` (debounce / throttle, timer-driven so it's
    deterministic under fake timers), `deepFreeze.ts`,
    `dom.ts` (the `isEditableTarget` helper previously
    copy-pasted in 4 shortcut files).
  - `shared/constants/` — `MIN_BOX_SIZE`, `DEFAULT_CANVAS_PADDING`,
    `DEFAULT_GRID_COLOR` lifted out of tool/view files.
  - `assets/` — left as a reserved stub (v0.1 placeholder palette
    doesn't need a real loader yet).
- Test coverage: `registry.test.ts` (8 cases: install, lookup,
  dedup guards across all four surfaces, multi-tool bundle),
  `dom.test.ts` (8 cases for `isEditableTarget` including
  INPUT[type=button] non-edit and contentEditable), `timing.test.ts`
  (5 cases for debounce + throttle including trailing-edge
  coalescing).

**Why `Tool` lives in `shared/`, not `editor/map/tools/`.** The
`core/extension` registry needs to reference the interface (its
`ToolDefinition.factory: () => Tool` returns it), but the ESLint
boundary forbids `core` from importing `editor`. Moving the
interface to `shared/tool/` puts it on a layer both `core` and
`editor` can see without bending the rules.

**Why `throttle` is timer-driven, not `Date.now`-driven.** The
original throttle used `Date.now()` to measure the window. Vitest's
fake timers don't auto-advance `Date.now()` in happy-dom, so the
trailing-edge tests were flaky. Switching to a `setTimeout`-only
implementation makes the wrapper fully deterministic under any
clock mocking — a desirable property for any future
performance-sensitive caller too.

**Why the stub directories are populated now.** CLAUDE.md has
referenced `core/extension/`, `core/history/`, `utils/`, and
`shared/constants/` since Step 1. Leaving them as empty `export
{}` was the worst of both worlds — the contracts they implied
weren't real, and a future editor author would land in a directory
with nothing to import from. Step 24 either fulfills the
contracts (registry, history barrel, util helpers, shared
constants) or documents the reservation (`assets/`).

Next: **Step 25 — Shortcut 中央化** (B5). Four
copy-pasted `isEditableTarget` definitions become one import;
the four shortcut classes become declarative `Shortcut[]`
arrays dispatched by a single keydown listener.

**Step 25 — Shortcut 中央化 (B5)** — completed. Four shortcut
classes became four declarative arrays; the `keydown` listener
collapsed from four to one.

- `systems/shortcut/Shortcut.ts` declares `ShortcutBinding` (a
  three-variant discriminated union: `key`, `ctrlKey`,
  `ctrlShiftKey`) and the `Shortcut` interface (`id`, `binding`,
  optional `when(event)`, `run(event)`). `matchesBinding` is
  exported separately so tests can drive it directly.
- `systems/shortcut/registry.ts` implements `ShortcutRegistry`:
  `register()` (throws on duplicate id), `registerAll()`,
  `list()`, `attach()` (one window keydown listener), `detach()`,
  and `dispatch(event)` (first-match-wins, drops `repeat`,
  delegates to `isEditableTarget`). The listener is short-
  circuited on double-attach.
- The four shortcut files (`HistoryShortcuts`,
  `SelectionShortcuts`, `ToolShortcuts`,
  `persistence/DocumentIOShortcuts`) become `readonly Shortcut[]`
  exports — no class, no `addEventListener` call site. The
  `isEditableTarget` copy-paste is gone; the registry's default
  guard delegates to `@utils/index`'s single implementation.
- `EditorShell` instantiates one `ShortcutRegistry`, calls
  `registerAll(...)` four times, attaches, and detaches on
  cleanup. The old `historyShortcuts.attach()` /
  `historyShortcuts.detach()` lines are gone.
- Test coverage: `registry.test.ts` (10 cases for
  `matchesBinding` and `dispatch`), plus the 8 `isEditableTarget`
  cases from Step 24 still pass through the registry's default
  guard.

**Why declarative `Shortcut[]` over a class hierarchy.** The four
existing shortcut classes were 80% identical — same listener
attach / detach, same editable-target guard, same `preventDefault`
dance. The class form made each new shortcut a copy-paste task
and made it impossible to share an `id` namespace. Declarative
values flow through one registry that owns all of that plumbing
and gives tests a single point of attack (`registry.dispatch(ev)`).

**Why first-match-wins, not longest-prefix or any-other policy.**
The four shortcuts have disjoint bindings today, so the policy
never matters in practice. First-match-wins is the cheapest policy
to reason about and to test: "if shortcut `a` is registered
before `b`, `a`'s binding wins when both match". If a future
shortcut needs to share a binding with another, the contract is
"register the more specific one first" — no priority field, no
runtime registry.

**Why the registry drops `repeat` and editable-target events by
default, with no opt-out.** `repeat=true` events are how a held
key fires repeated strokes; for tool-switching shortcuts that's
noise. And editable-target suppression is the safety net the four
shortcut files each had to remember to add — promoting it to the
registry means a future shortcut author cannot accidentally forget
it. A shortcut that genuinely wants to fire on repeat can read
`event.repeat` inside its own `run()`.

Next: **Step 26 — 核心测试 Phase 1** (B6-1). Lift `core/`
coverage from < 10% to ≥ 70%: CommandBus, HistoryStack,
DocumentService (18 mutators + payload shape), serializer edge
cases, workspace schema guards.

**Step 26 — 核心测试 Phase 1 (B6-1)** — completed. `core/`
now has 4 dedicated test files (was 1). Total suite goes from
86 to 146 tests.

- `core/command/CommandBus.test.ts` (9 cases): execute / undo /
  redo ordering, redo-stack clearing on a fresh execute, subscribe
  notifications on every transition, clearHistory wipes both
  stacks, no-op on empty undo/redo, and a wiring test that locks
  the `Command.do(service)` argument-passing contract.
- `core/command/HistoryStack.test.ts` (8 cases): LIFO ordering,
  push-invalidates-redo, empty pop returns null, clear wipes both,
  and a documented note that the stack does not invoke
  `Command.do/undo` — that's the bus's job.
- `core/workspace/schema.test.ts` (13 cases): `isWorkspaceConfig`
  accepts well-formed configs (including unknown extra fields),
  rejects missing/wrong-type `version` / `name` / `activeDocId` /
  `documents` / `lastSavedAt`. `isRecentList` rejects wrong version
  / non-array entries. Locked behavior matches what IO expects on
  disk.
- `core/document/DocumentService.test.ts` (33 cases): every
  public mutator (`setTileSize`, `setMapSize`, `setMeta`, `getMeta`,
  `setTile`, `getTile`, `addLayer`, `removeLayer`, `setLayerVisible`,
  `setLayerLocked`, `reorderLayer`, `findLayerIndex`, `layerCount`,
  `addEntity`, `setEntity`, `getEntity`, `removeEntity`,
  `appendToObjectLayer`, `removeFromObjectLayer`, `addCollider`,
  `setCollider`, `getCollider`, `removeCollider`,
  `appendToCollisionLayer`, `removeFromCollisionLayer`, plus
  `snapshot` and `subscribe`). Asserts both store mutation AND
  the discriminated `DocumentChange` payload shape (e.g. `tile:set`
  carries `layerId + coord`; `layer:add` carries `atIndex`).
  Orphan cleanup is exercised end-to-end: removeEntity strips the
  id from every ObjectLayer.entityOrder; removeCollider strips the
  id from every CollisionLayer.colliderOrder. Snapshot / unsubscribe
  behavior locked.

**Why tests assert `events.length` rather than mock-spy call
counts.** The service's emitter is the public contract — every
subscriber (Pixi views, SelectionOverlay, history store mirror)
reads from it. Asserting `events.length` and the event shape is
a stronger guarantee than counting store-mutation calls because
it locks the *observable* contract, not an implementation detail.

**Why removeEntity / removeCollider tests don't expect a
per-layer `objectLayer:remove` event.** The current service
implementation fires the per-layer events only on user-driven
mutations (the explicit `appendToObjectLayer` /
`appendToCollisionLayer` path). Orphan cleanup runs through the
store primitive directly so it doesn't re-emit — `entity:remove`
is the canonical "this thing is gone" signal a subscriber
should care about. Step 28 (Command 去重) may revisit this when
it consolidates the remove commands.

**Why the serializer tests already exist (Step 20).** They cover
tile / object / collision round-trips and the corrupt-JSON error
path. Step 26 didn't duplicate them; the 33 new DocumentService
tests are the Phase 1 increment on top.

**Step 27 — 核心测试 Phase 2 + 集成 (B6-2)** — completed. The
test suite now also covers the IO orchestrators and the
Pixi-side overlay, lifting editor + systems out of the
"untested stub" bucket.

- `systems/persistence/recentWorkspaces.test.ts` (13 cases) covers
  the pure `pushRecent` / `removeRecent` math (cap, dedup, order)
  and the bridge-bound `loadRecents` / `saveRecents` paths with a
  mocked `window.h5`. Browser-fallback (no bridge) is asserted
  separately — that's the test-environment code path.
- `systems/persistence/workspaceIO.test.ts` (14 cases) drives
  `createNewWorkspace`, `openExistingWorkspace`,
  `loadActiveDocument`, `serializeActiveDocument`. The bridge is
  swapped via a `setBridge()` helper because `window.h5` is
  `readonly`; the bridge mock uses `Promise.resolve({ ok: true as
  const, ... })` to keep the discriminated-union narrowing intact.
- `systems/persistence/documentIO.test.ts` (9 cases) drives
  `saveDocument` / `loadDocument` end-to-end, including the
  `<workspace>/documents/<docId>.json` path composition, write
  errors, malformed JSON, and "no active workspace" guard.
- `editor/map/commands/AddLayerCommands.test.ts` (11 cases) covers
  the three Add*LayerCommand classes. Asserts `kind`, `makeActive`,
  and that undo restores the seed tile layer (the
  "removeLayer refuses to delete the last layer" invariant
  re-verified at the Command level).
- `editor/map/commands/RemoveCommands.test.ts` (8 cases) covers
  RemoveEntityCommand / RemoveColliderCommand including the
  "undo restores references on every referencing layer" path and
  the stale-id no-op case.
- `editor/map/commands/EraseSelectionCommand.test.ts` (7 cases)
  covers tile-only erase + undo round-trip, empty-cell skip, and
  the non-tile-selection no-op. This test surfaced a latent bug:
  `undo` was calling `new PlaceTileCommand(...).undo(service)`
  but the freshly-minted Command had never had `do()` called, so
  `prev` was `null` and "undo" actually removed the tile again.
  Replaced with a direct `service.setTile(...)` call so captured
  entries round-trip cleanly. Coverage: 49 new cases; total
  test count now 213 across 23 files.
- `canvas/selection/SelectionOverlay.test.ts` (5 cases) asserts
  Pixi lifecycle (container attached, `eventMode = none`,
  destroy detaches + clears subscriptions) and that mutating
  selection / document / view stores does not throw on the
  subscription path.

**Why the bridge mocks use `Promise.resolve({ ok: true as const,
... })` instead of `async () => ({ ... })`.** `vi.fn(async () =>
...)` widens the literal `true` to `boolean`, which then fails to
match the `{ ok: true }` arm of the IPC return union. The
explicit `as const` on `ok` keeps TypeScript's narrowing across
the call site so callers don't need their own casts.

**Why mock `window.h5` instead of refactoring the IO to take a
bridge dependency.** The IO functions deliberately read
`window.h5` at call-time (not import-time) so vite's dev server
can boot without the preload. Mocking the global preserves that
contract — production code paths stay identical.

Next: **Step 28 — Command 去重 (A3)**. Three Add*LayerCommands
and two Place*Commands share enough code that a thin base class
+ concrete wrapper pattern will shave ~60 lines without changing
the public Command surface (so the 28 new tests from Step 27
don't have to change).

**Step 28 — Command 去重 (A3)** — completed. The five
"shape-varies-only-by-kind" Commands now share two base classes.

- `editor/map/commands/AddLayerCommand.ts` (33 lines) is the
  shared base for `AddTileLayerCommand` / `AddObjectLayerCommand`
  / `AddCollisionLayerCommand`. Each wrapper is now ~15 lines: a
  constructor that calls `super('layer:add[-kind]', layer,
  makeActive)`. The five-line do/undo pair lives in the base.
- `editor/map/commands/PlacePlacedObjectCommand.ts` (63 lines)
  is the shared base for `PlaceEntityCommand` /
  `PlaceColliderCommand`. It's generic over `<TLayerId, TItemId,
  TPayload extends { id: TItemId }>` so the four ops (add /
  appendToLayer / removeFromLayer / remove) can bind to the right
  primitive without leaking the Entity / Collider type into the
  base. Each wrapper is now ~50 lines, down from ~50 but with the
  shared four-method body living in one place.
- The 11 Step 27 tests for Add*LayerCommand and the 2 existing
  Place* tests pass unchanged — the public Command surface
  (`kind`, `do`, `undo`, plus the `placedEntity` /
  `placedCollider` getters) is preserved.
- The `CommandBus.execute` accepts the wrappers because they
  extend the base classes which `implements Command`.

**Why the `AddLayerCommand` base is not exported as a public
class.** The three wrappers are the only callers — `LayerPanel`
imports each one specifically. Exporting the base would invite
callers to mint `new AddLayerCommand('layer:foo', ...)` strings
that bypass the layer-kind discriminator. The base file exists
so the shared shape has one source of truth; the index re-exports
it only for tooling (e.g. a future coalescer that wants to match
on a common base).

**Why the `PlacePlacedObjectCommand` generics go to three
parameters.** The layerId and the payload id are different brand
types (`LayerId` vs `EntityId` / `ColliderId`), so collapsing
them to a single `TId` was a dead end — the ops bag's
`appendToLayer` would have to take two distinct types. Three
parameters is the minimum that keeps the brands distinct and the
ops typed precisely.

Next: **Step 29 — SelectionStrategy 注册表 (A5)** is deferred
until the 4th selection kind lands — see plan. The 10-step plan
is now complete: Steps 20–28 delivered, Step 29 reserved for
future work.

**Post-Step 28 patch — Launcher Electron-availability hint** —
applied. The Launcher used to silently fail in `npm run dev`
because the `window.h5` bridge is only installed by the
Electron preload — `pickFolder` would call an undefined function
and the user would see no feedback at all.

- `<Launcher/>` calls `isElectron()` (a tiny `typeof
  window.h5 !== 'undefined'` check) once on mount. When the
  bridge is missing, a persistent amber banner appears at the
  top of the page with the actionable text "Run `npm run
  electron:dev` to launch the editor", and the **New Workspace**
  and **Open Folder…** buttons are visibly disabled.
- `handleOpen` short-circuits with the same error inlined under
  the action buttons when called programmatically — so a
  keyboard shortcut or focus-driven path gets the same hint.
- The i18n key `launcher.error.noElectron` is updated in all
  three bundles (en / zh-CN / ja-JP) with the run-command hint,
  not just the bare error.
- `README.md` promotes `npm run electron:dev` to the primary
  dev command and documents the Vite-only preview behavior
  (Launcher mounts; actions disabled with the banner hint).

**Why a banner plus disabled buttons rather than just a banner.**
Two channels that both point at the same fix are more robust than
one: the banner is the answer to "why is the page different",
and the disabled buttons answer "can I click this" without the
user having to try. The inline error in `handleOpen` covers the
edge case where focus / keyboard still routes through the
handler.

**Why `isElectron()` lives in `systems/persistence/` rather than
a shared util.** It's a single-line probe over `window.h5`, and
only the Launcher ever needs it. Promoting it to `utils/` would
import the bridge module from a layer that has no other reason
to know IPC exists.

**Post-Step 28 patch 2 — preload sandbox fix** — applied. The
first patch made the "needs Electron" banner visible; that
exposed a deeper bug: even when running under
`npm run electron:dev`, `window.h5` was still undefined. Cause:
`electron/main.ts` had `webPreferences.sandbox: true`, and
Electron 43 silently fails ESM preloads that use named imports
from the virtual `electron` module
(`import { contextBridge, ipcRenderer } from 'electron'`). The
preload loaded, hit the import, never reached
`contextBridge.exposeInMainWorld('h5', api)`, and the renderer
saw a missing bridge.

- `electron/main.ts` flips `sandbox: true` → `sandbox: false`.
  `contextIsolation: true` and `nodeIntegration: false` stay on
  — those are the two that actually separate the renderer from
  Node. Sandbox's threat model (untrusted remote scripts) doesn't
  apply to a local editor that loads Vite (dev) or `dist/index.html`
  (prod).
- The file header comment now documents the choice and the reason,
  so a future reader doesn't re-enable sandbox "for security" and
  re-break the bridge.
- The `electron/preload.ts` source stays untouched — disabling
  sandbox is enough; the named-import form works fine once the
  full `electron` module is reachable.

**Why `sandbox: false` is acceptable here.** The editor never
loads remote content. With `contextIsolation: true`, the
renderer still cannot reach Node directly; it only sees the
typed surface the preload exposes. The only thing sandbox: true
adds for a local-only app is the cost of the polyfilled
preload environment — and that cost is what bit us. Step 18's
original choice (`sandbox: true`) was the Electron docs'
default; the docs are written for the generic case, not for an
app whose entire renderer surface is a localhost or file:// URL.

## 14. Common pitfalls to avoid

- ❌ Putting tile data in Zustand. → Goes in the Document.
- ❌ Drawing a tile with React. → Goes in PixiJS.
- ❌ Importing `editor/` from `canvas/` to share a constant. → Move the
  constant to `shared/` and import from `canvas/` directly.
- ❌ Adding `useEffect` to "sync" props into Pixi. → Pixi should subscribe
  to Document events or accept props that change its own state directly.
- ❌ Putting business logic in components. → Move to core/ or a Command.
- ❌ Adding a third-party state library to "solve" a Zustand quirk. → The
  quirk is a code smell; refactor.
- ❌ Skipping `npm run lint` because "it'll be fine". It will not be fine.
- ❌ Moving the i18n locale store into `state/` "to share state with
  other panels". → It's already shared via `useT()` / `useLocale()`.
  Putting it in `state/` would force `core/i18n/` to import `state/`,
  breaking the ESLint boundary. Zustand is a library, not a layer.
- ❌ Adding a third locale by editing `i18n.ts` and the switcher. →
  Extend the `Locale` union in `core/i18n/types.ts`, add the bundle
  to `bundles/`, and `AVAILABLE_LOCALES` is automatically picked up
  by the switcher via `Object.entries(NATIVE_NAMES)`.
- ❌ Putting the `Launcher` in `panels/` so it sits next to the
  other panels. → The Launcher's job is to talk to Electron IPC;
  `panels/` is forbidden from `systems/`. The Launcher lives in
  `app/` (sibling to `WorkspaceGate` and `EditorShell`).
- ❌ "Re-enabling" the Step 16 localStorage document IO so the
  vite dev server can boot without picking a workspace. → With
  Step 18's launcher, "no workspace, no document" is the rule. The
  localStorage path was deliberately deleted — re-adding it would
  re-introduce the dual-backend split the workspace removes.

## 15. Questions to ask before adding a feature

1. Which module does this belong to per §5?
2. Does it need a Command, or is it a pure read?
3. Does it introduce a new module? If yes, declare its dependency rules.
4. Does it force any module to import across forbidden boundaries?
   If yes, promote the shared piece to a lower layer first.
5. Is there an extension point in `core/extension/` that should host it
   instead of hard-coding in one editor?

If any answer is unclear, stop and ask the user.
