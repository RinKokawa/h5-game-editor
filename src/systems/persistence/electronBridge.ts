/**
 * electronBridge — renderer-side wrapper for the four IPC calls the
 * preload script exposes via `contextBridge` as `window.h5`.
 *
 * When `window.h5` is present (Electron with the dev/main bundle),
 * `isElectron()` returns true and callers should use this bridge
 * instead of the localStorage-based documentIO. When it's absent
 * (plain `vite dev`, no Electron wrapper), the bridge is a no-op and
 * `isElectron()` returns false — the renderer falls back to whatever
 * persistence layer the caller is already wired to.
 *
 * This file does NOT touch the Document directly — it's a thin,
 * typed transport. The same `serializeDocument` / `deserializeDocument`
 * functions in `@core/serialization` are reused; we just hand the JSON
 * back and forth across the IPC boundary.
 *
 * `H5Bridge` is duplicated here (rather than imported from
 * `electron/preload.ts`) because the two tsconfigs split src/ and
 * electron/ into different projects. Keeping the shape duplicated is
 * two declarations but zero cross-boundary coupling.
 */

export interface H5Bridge {
  readonly openDialog: () => Promise<string | null>;
  readonly saveAsDialog: (defaultName?: string) => Promise<string | null>;
  readonly readJson: (
    filePath: string,
  ) => Promise<{ ok: true; text: string } | { ok: false; error: string }>;
  readonly writeJson: (
    filePath: string,
    text: string,
  ) => Promise<{ ok: true; bytes: number } | { ok: false; error: string }>;
}

declare global {
  interface Window {
    readonly h5?: H5Bridge;
  }
}

export const isElectron = (): boolean => typeof window !== 'undefined' && window.h5 !== undefined;

export const openDialog = async (): Promise<string | null> => {
  if (!window.h5) return null;
  return window.h5.openDialog();
};

export const saveAsDialog = async (defaultName?: string): Promise<string | null> => {
  if (!window.h5) return null;
  return window.h5.saveAsDialog(defaultName);
};

export const readJsonFile = async (
  filePath: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  if (!window.h5) return { ok: false, error: 'Electron bridge not available' };
  return window.h5.readJson(filePath);
};

export const writeJsonFile = async (
  filePath: string,
  text: string,
): Promise<{ ok: true; bytes: number } | { ok: false; error: string }> => {
  if (!window.h5) return { ok: false, error: 'Electron bridge not available' };
  return window.h5.writeJson(filePath, text);
};
