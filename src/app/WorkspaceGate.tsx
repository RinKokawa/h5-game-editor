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
 */

import { useWorkspaceStore } from '@state/workspaceStore';

import { EditorShell } from './EditorShell';
import { Launcher } from './launcher/Launcher';

export function WorkspaceGate(): React.ReactElement {
  const phase = useWorkspaceStore((s) => s.phase);
  return phase === 'editor' ? <EditorShell /> : <Launcher />;
}
