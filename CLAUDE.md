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
   state for project data. Period.
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

**Step 13 — Object layer + Entity placement** — completed. The Map
editor can now host identity-bearing objects (NPCs, spawn points,
doors, pickups) on dedicated `Object` layers.

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

Next: **Step 14 — Collision layer** (mirror of Step 13: collider
schema, collision layer in the Document, `CollisionLayerView`,
collision-rectangle placement tool).

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

## 15. Questions to ask before adding a feature

1. Which module does this belong to per §5?
2. Does it need a Command, or is it a pure read?
3. Does it introduce a new module? If yes, declare its dependency rules.
4. Does it force any module to import across forbidden boundaries?
   If yes, promote the shared piece to a lower layer first.
5. Is there an extension point in `core/extension/` that should host it
   instead of hard-coding in one editor?

If any answer is unclear, stop and ask the user.
