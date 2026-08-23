/**
 * FloatingPanelsLayer — renders every panel whose `panelDockState`
 * isn't `'docked'` as a floating window above the EditorShell grid.
 *
 * Step 30-B. The layer is a single full-coverage absolutely
 * positioned container; each `FloatingPanel` positions itself with
 * `position: absolute` and `z-index: 100 + floatingZ[id]`. Pointer
 * events bubble up to here for the global drag handlers inside
 * each panel.
 *
 * Panel registry (id → title + render) lives inline so a new panel
 * can be added by extending the `useLayoutStore.PanelId` union and
 * adding one entry below. i18n titles use `useT()` to honor the
 * current locale.
 */

import type { ReactNode } from 'react';

import { AssetBrowserPanel } from '@panels/asset-browser/AssetBrowserPanel';
import { ConsolePanel } from '@panels/console/ConsolePanel';
import { InspectorPanel } from '@panels/inspector/InspectorPanel';
import { LayerPanel } from '@panels/layer/LayerPanel';
import { PalettePanel } from '@panels/palette/PalettePanel';
import { PropertiesPanel } from '@panels/properties/PropertiesPanel';

import { useT } from '@core/i18n';
import { FloatingPanel } from '@layout/FloatingPanel';
import { useLayoutStore, type PanelId } from '@state/layoutStore';

import styles from './FloatingPanelsLayer.module.css';

interface PanelRegistryEntry {
  readonly id: PanelId;
  readonly title: string;
  readonly render: () => ReactNode;
}

const buildRegistry = (t: (key: string) => string): ReadonlyMap<PanelId, PanelRegistryEntry> =>
  new Map<PanelId, PanelRegistryEntry>([
    ['palette', { id: 'palette', title: t('dock.palette'), render: () => <PalettePanel /> }],
    ['assets', { id: 'assets', title: t('dock.assets'), render: () => <AssetBrowserPanel /> }],
    ['layers', { id: 'layers', title: t('dock.layers'), render: () => <LayerPanel /> }],
    [
      'inspector',
      { id: 'inspector', title: t('dock.inspector'), render: () => <InspectorPanel /> },
    ],
    [
      'properties',
      { id: 'properties', title: t('dock.properties'), render: () => <PropertiesPanel /> },
    ],
    ['console', { id: 'console', title: t('dock.console'), render: () => <ConsolePanel /> }],
  ]);

export function FloatingPanelsLayer() {
  const t = useT();
  const dockState = useLayoutStore((s) => s.panelDockState);
  const hidden = useLayoutStore((s) => s.panelHidden);
  const registry = buildRegistry(t);

  const floating: ReactNode[] = [];
  for (const [id, entry] of registry) {
    const state = dockState[id];
    // Step 30-B: hidden panels skip the floating layer entirely;
    // their state (incl. position) is preserved so re-showing via
    // the Window menu restores the layout as it was.
    if (state === 'docked') continue;
    if (hidden[id] ?? false) continue;
    floating.push(
      <FloatingPanel key={id} id={id} title={entry.title} state={state ?? 'docked'}>
        {entry.render()}
      </FloatingPanel>,
    );
  }

  if (floating.length === 0) return null;

  return <div className={styles.layer}>{floating}</div>;
}