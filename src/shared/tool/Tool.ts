/**
 * Tool — the contract every editor tool implements.
 *
 * Step 24 lifts what was an implicit "constructor(canvas) + destroy()"
 * convention into a named interface so the Extension Registry can
 * reference tools by `id` and instantiate them via a `factory`. Each
 * tool is parameterless at construction and attaches to a canvas
 * later — this lets the EditorShell defer tool wiring until
 * `PixiRenderer.start()` resolves, and lets future editors
 * (Dialogue, Animation, …) plug their own tools into the same
 * toolbar without subclassing the Map editor's wiring.
 *
 * Lives in `shared/` (not `editor/map/tools/`) because both
 * `core/extension/` and the editor-specific tools need to import
 * the same interface without crossing a forbidden module boundary.
 *
 * The interface is intentionally small: `id` (the toolbar slot),
 * `labelKey` (an i18n key — never a literal), `attach(canvas)`
 * (wires DOM listeners and stores the canvas reference), and
 * `detach()` (removes listeners and resets transient state). Tools
 * never mutate the Document directly — they build Commands and
 * dispatch them via the CommandBus (invariant 5).
 */

export interface Tool {
  readonly id: string;
  readonly labelKey: string;

  /**
   * Attach the tool to the given Pixi canvas. Called once after
   * `PixiRenderer.start()` resolves; may not be called again before
   * `detach()`. The canvas reference stays valid until `detach()`
   * fires.
   */
  attach(canvas: HTMLCanvasElement): void;

  /**
   * Detach the tool. Removes all DOM listeners and resets transient
   * state (in-flight stroke buffers, captured pointers, etc.). After
   * `detach()` the tool may be re-`attach()`ed to a fresh canvas.
   */
  detach(): void;
}