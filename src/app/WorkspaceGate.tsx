/**
 * WorkspaceGate — the single root of the app.
 *
 * Reads `workspaceStore.phase` and renders either `<Launcher/>` or
 * `<EditorShell/>`. No router, no provider — a plain if/else. Both
 * children expect the phase they're in, so the only state they read
 * is the workspace store; nothing else has to know about the gate.
 *
 * Why an explicit component instead of selecting inside `App.tsx`?
 * The children are different (one is a panel under `panels/`, one is
 * a layout under `app/`). Putting the conditional in a dedicated
 * file keeps `App.tsx` a one-liner and surfaces the launcher/editor
 * split as a first-class concept.
 *
 * Window-close handshake:
 *   - On mount, subscribe to `onBeforeClose` (the main process
 *     intercepts the OS close gesture and pings us here).
 *   - On ping, read the current phase from the store directly (no
 *     subscription — we want the value *at the moment of the
 *     gesture*, not a snapshot from the last render).
 *   - `editor` → call `leave()` to flip back to the Launcher. The
 *     window stays open.
 *   - `launcher` → there's nothing to "return to", so call
 *     `confirmClose()` to actually tear the window down.
 *
 * Subscribing here (instead of in EditorShell or Launcher) keeps the
 * listener count at exactly one regardless of which child is mounted,
 * and avoids re-subscribing every time the phase flips.
 */

import { useEffect } from 'react';

import { useWorkspaceStore } from '@state/workspaceStore';
import { confirmClose, onBeforeClose } from '@systems/persistence/electronBridge';

import { EditorShell } from './EditorShell';
import { Launcher } from './launcher/Launcher';

export function WorkspaceGate(): React.ReactElement {
  const phase = useWorkspaceStore((s) => s.phase);

  useEffect(() => {
    const unsubscribe = onBeforeClose(() => {
      const currentPhase = useWorkspaceStore.getState().phase;
      if (currentPhase === 'editor') {
        // Flip back to the Launcher. The window stays alive; the
        // EditorShell unmounts and its cleanup (tool teardown, log
        // unsubscribe, title reset) runs normally.
        useWorkspaceStore.getState().leave();
      } else {
        // Already on the Launcher; no workspace to return to. The
        // user's intent was to quit, so let the close go through.
        void confirmClose();
      }
    });
    return unsubscribe;
  }, []);

  return phase === 'editor' ? <EditorShell /> : <Launcher />;
}
