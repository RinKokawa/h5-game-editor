import { beforeEach, describe, expect, it } from 'vitest';

import {
  MAX_PANEL_BODY,
  MIN_PANEL_BODY,
  useLayoutStore,
  type LayoutState,
} from './layoutStore';

const initial = useLayoutStore.getInitialState();

beforeEach(() => {
  localStorage.clear();
  useLayoutStore.setState({ ...initial });
});

describe('layoutStore', () => {
  it('exposes default column geometry and panel layout', () => {
    const s = useLayoutStore.getState();
    expect(s.leftWidth).toBe(280);
    expect(s.rightWidth).toBe(320);
    expect(s.bottomHeight).toBe(200);
    expect(s.leftPanelOrder).toEqual(['palette', 'assets', 'layers']);
    expect(s.rightPanelOrder).toEqual(['inspector', 'properties']);
    expect(s.panelCollapsed.palette).toBe(false);
  });

  it('clamps column widths to their limits', () => {
    const s = useLayoutStore.getState();
    s.setLeftWidth(50);
    expect(useLayoutStore.getState().leftWidth).toBe(200);
    s.setLeftWidth(9999);
    expect(useLayoutStore.getState().leftWidth).toBe(600);
  });

  it('clamps panel body heights to [MIN_PANEL_BODY, MAX_PANEL_BODY]', () => {
    const s = useLayoutStore.getState();
    s.setPanelHeight('palette', 1);
    expect(useLayoutStore.getState().panelHeights.palette).toBe(MIN_PANEL_BODY);
    s.setPanelHeight('palette', 999_999);
    expect(useLayoutStore.getState().panelHeights.palette).toBe(MAX_PANEL_BODY);
    s.setPanelHeight('palette', 333);
    expect(useLayoutStore.getState().panelHeights.palette).toBe(333);
  });

  it('sets the panel order per side without touching the other side', () => {
    const s = useLayoutStore.getState();
    s.setPanelOrder('left', ['layers', 'palette', 'assets']);
    expect(useLayoutStore.getState().leftPanelOrder).toEqual(['layers', 'palette', 'assets']);
    expect(useLayoutStore.getState().rightPanelOrder).toEqual(['inspector', 'properties']);
    s.setPanelOrder('right', ['properties', 'inspector']);
    expect(useLayoutStore.getState().rightPanelOrder).toEqual(['properties', 'inspector']);
  });

  it('toggles a single panel collapsed flag', () => {
    const s = useLayoutStore.getState();
    s.togglePanelCollapsed('assets');
    s.togglePanelCollapsed('assets');
    expect(useLayoutStore.getState().panelCollapsed.assets).toBe(false);
    s.togglePanelCollapsed('assets');
    expect(useLayoutStore.getState().panelCollapsed.assets).toBe(true);
    expect(useLayoutStore.getState().panelCollapsed.palette).toBe(false);
  });

  it('persists layout data (not actions) to localStorage', () => {
    const s = useLayoutStore.getState();
    s.setPanelHeight('layers', 421);
    s.setPanelOrder('left', ['assets', 'layers', 'palette']);
    const raw = localStorage.getItem('h5-editor-layout');
    expect(raw).not.toBeNull();
    // zustand persist wraps the payload as { state, version }.
    const wrapper = JSON.parse(raw ?? '{}') as { state?: Partial<LayoutState> };
    const persisted = wrapper.state ?? {};
    expect(persisted.panelHeights?.layers).toBe(421);
    expect(persisted.leftPanelOrder).toEqual(['assets', 'layers', 'palette']);
    expect(persisted.setPanelHeight).toBeUndefined();
  });
});

describe('layoutStore — detachable panels (Step 30-B)', () => {
  it('starts every panel in the docked state with a default position', () => {
    const s = useLayoutStore.getState();
    expect(s.panelDockState.palette).toBe('docked');
    expect(s.panelDockState.console).toBe('docked');
    expect(s.floatingPosition.palette).toEqual({ x: 80, y: 80, w: 320, h: 320 });
    expect(s.topZ).toBe(0);
  });

  it('setPanelDockState flips a panel to floating without losing its position', () => {
    const s = useLayoutStore.getState();
    s.setFloatingPosition('palette', { x: 400, y: 200, w: 360, h: 240 });
    s.setPanelDockState('palette', 'floating');

    const after = useLayoutStore.getState();
    expect(after.panelDockState.palette).toBe('floating');
    expect(after.floatingPosition.palette).toEqual({ x: 400, y: 200, w: 360, h: 240 });
  });

  it('setPanelDockState seeds a position when flipping docked → floating the first time', () => {
    const s = useLayoutStore.getState();
    // No position override — defaults should kick in.
    s.setPanelDockState('inspector', 'floating');

    const after = useLayoutStore.getState();
    expect(after.panelDockState.inspector).toBe('floating');
    expect(after.floatingPosition.inspector).toBeDefined();
    expect(after.floatingPosition.inspector?.w).toBeGreaterThan(0);
  });

  it('setPanelDockState round-trips through minimized and back to docked', () => {
    const s = useLayoutStore.getState();
    s.setPanelDockState('layers', 'floating');
    s.setPanelDockState('layers', 'minimized');
    expect(useLayoutStore.getState().panelDockState.layers).toBe('minimized');
    s.setPanelDockState('layers', 'docked');
    expect(useLayoutStore.getState().panelDockState.layers).toBe('docked');
  });

  it('raisePanel monotonically increments z and bumps the panel', () => {
    const s = useLayoutStore.getState();
    s.raisePanel('palette');
    expect(useLayoutStore.getState().floatingZ.palette).toBe(1);
    expect(useLayoutStore.getState().topZ).toBe(1);
    s.raisePanel('inspector');
    const after = useLayoutStore.getState();
    expect(after.floatingZ.inspector).toBe(2);
    expect(after.floatingZ.palette).toBe(1);
    expect(after.topZ).toBe(2);
  });

  it('setFloatingPosition only touches the targeted panel', () => {
    const s = useLayoutStore.getState();
    const originalInspector = s.floatingPosition.inspector;
    s.setFloatingPosition('palette', { x: 100, y: 100, w: 200, h: 200 });
    const after = useLayoutStore.getState();
    expect(after.floatingPosition.palette).toEqual({ x: 100, y: 100, w: 200, h: 200 });
    expect(after.floatingPosition.inspector).toEqual(originalInspector);
  });

  it('persists detachable-panel state to localStorage', () => {
    const s = useLayoutStore.getState();
    s.setPanelDockState('palette', 'floating');
    s.setFloatingPosition('palette', { x: 12, y: 34, w: 400, h: 300 });
    s.raisePanel('palette');
    const raw = localStorage.getItem('h5-editor-layout');
    expect(raw).not.toBeNull();
    const wrapper = JSON.parse(raw ?? '{}') as { state?: Partial<LayoutState> };
    const persisted = wrapper.state ?? {};
    expect(persisted.panelDockState?.palette).toBe('floating');
    expect(persisted.floatingPosition?.palette).toEqual({ x: 12, y: 34, w: 400, h: 300 });
    expect(persisted.floatingZ?.palette).toBe(1);
    expect(persisted.topZ).toBe(1);
  });
});

describe('layoutStore — movePanelToSide (Step 30-B cross-column drag)', () => {
  it('moves a panel from left to right when dropped on a right header', () => {
    const s = useLayoutStore.getState();
    // Move 'palette' from left to right at index 1 (after 'inspector').
    s.movePanelToSide('palette', 'left', 'right', 1);

    const after = useLayoutStore.getState();
    expect(after.leftPanelOrder).not.toContain('palette');
    expect(after.rightPanelOrder).toEqual(['inspector', 'palette', 'properties']);
  });

  it('moves a panel from right to left when dropped on a left header', () => {
    const s = useLayoutStore.getState();
    s.movePanelToSide('inspector', 'right', 'left', 0);

    const after = useLayoutStore.getState();
    expect(after.rightPanelOrder).not.toContain('inspector');
    expect(after.leftPanelOrder).toEqual(['inspector', 'palette', 'assets', 'layers']);
  });

  it('clamps targetIndex to the valid range when crossing columns', () => {
    const s = useLayoutStore.getState();
    s.movePanelToSide('palette', 'left', 'right', 999);

    const after = useLayoutStore.getState();
    // 'palette' lands at the end of right order.
    expect(after.rightPanelOrder[after.rightPanelOrder.length - 1]).toBe('palette');
  });

  it('does nothing when the source panel id is not in the source order', () => {
    const s = useLayoutStore.getState();
    const beforeLeft = [...s.leftPanelOrder];
    const beforeRight = [...s.rightPanelOrder];
    s.movePanelToSide('inspector', 'left', 'right', 0);

    const after = useLayoutStore.getState();
    expect(after.leftPanelOrder).toEqual(beforeLeft);
    expect(after.rightPanelOrder).toEqual(beforeRight);
  });

  it('within-column reorder uses existing moveItem logic (source === target)', () => {
    const s = useLayoutStore.getState();
    s.movePanelToSide('layers', 'left', 'left', 0);

    const after = useLayoutStore.getState();
    expect(after.leftPanelOrder).toEqual(['layers', 'palette', 'assets']);
  });
});

describe('layoutStore — togglePanelHidden (Step 30-B Window menu)', () => {
  it('starts every panel visible', () => {
    const s = useLayoutStore.getState();
    expect(s.panelHidden.palette).toBe(false);
    expect(s.panelHidden.console).toBe(false);
  });

  it('togglePanelHidden flips a single panel', () => {
    const s = useLayoutStore.getState();
    s.togglePanelHidden('palette');
    expect(useLayoutStore.getState().panelHidden.palette).toBe(true);
    s.togglePanelHidden('palette');
    expect(useLayoutStore.getState().panelHidden.palette).toBe(false);
  });

  it('toggling one panel leaves others alone', () => {
    const s = useLayoutStore.getState();
    s.togglePanelHidden('palette');
    const after = useLayoutStore.getState();
    expect(after.panelHidden.palette).toBe(true);
    expect(after.panelHidden.assets).toBe(false);
    expect(after.panelHidden.console).toBe(false);
  });

  it('panelDockState is preserved when a panel is hidden (so it can re-appear in the same place)', () => {
    const s = useLayoutStore.getState();
    s.setPanelDockState('inspector', 'floating');
    s.setFloatingPosition('inspector', { x: 99, y: 99, w: 200, h: 200 });
    s.togglePanelHidden('inspector');

    const after = useLayoutStore.getState();
    expect(after.panelHidden.inspector).toBe(true);
    expect(after.panelDockState.inspector).toBe('floating');
    expect(after.floatingPosition.inspector).toEqual({ x: 99, y: 99, w: 200, h: 200 });
  });

  it('persists panelHidden to localStorage', () => {
    const s = useLayoutStore.getState();
    s.togglePanelHidden('palette');
    const raw = localStorage.getItem('h5-editor-layout');
    expect(raw).not.toBeNull();
    const wrapper = JSON.parse(raw ?? '{}') as { state?: Partial<LayoutState> };
    const persisted = wrapper.state ?? {};
    expect(persisted.panelHidden?.palette).toBe(true);
  });
});

describe('layoutStore — workspace presets (Step 30-B Phase 2B)', () => {
  it('starts with no presets', () => {
    expect(useLayoutStore.getState().presets).toEqual({});
  });

  it('savePreset captures every layout field under the given name', () => {
    const s = useLayoutStore.getState();
    s.setLeftWidth(400);
    s.setPanelDockState('inspector', 'floating');
    s.setFloatingPosition('inspector', { x: 50, y: 60, w: 250, h: 220 });
    s.raisePanel('inspector');
    s.savePreset('My Layout');

    const preset = useLayoutStore.getState().presets['My Layout'];
    expect(preset).toBeDefined();
    expect(preset?.leftWidth).toBe(400);
    expect(preset?.panelDockState.inspector).toBe('floating');
    expect(preset?.floatingPosition.inspector).toEqual({ x: 50, y: 60, w: 250, h: 220 });
    expect(preset?.floatingZ.inspector).toBe(1);
    expect(preset?.topZ).toBe(1);
  });

  it('savePreset overwrites silently when the name already exists', () => {
    const s = useLayoutStore.getState();
    s.savePreset('Foo');
    s.setLeftWidth(500);
    s.savePreset('Foo');
    expect(Object.keys(useLayoutStore.getState().presets)).toEqual(['Foo']);
    expect(useLayoutStore.getState().presets['Foo']?.leftWidth).toBe(500);
  });

  it('savePreset rejects empty / whitespace-only names', () => {
    const s = useLayoutStore.getState();
    s.savePreset('');
    s.savePreset('   ');
    expect(useLayoutStore.getState().presets).toEqual({});
  });

  it('applyPreset restores every captured field', () => {
    const s = useLayoutStore.getState();
    s.setLeftWidth(420);
    s.setRightWidth(380);
    s.setPanelDockState('layers', 'floating');
    s.setFloatingPosition('layers', { x: 7, y: 8, w: 200, h: 200 });
    s.togglePanelHidden('console');
    s.savePreset('Snapshot');

    // Mutate everything to nonsense values.
    s.setLeftWidth(200);
    s.setRightWidth(200);
    s.setPanelDockState('layers', 'docked');
    s.togglePanelHidden('palette');

    s.applyPreset('Snapshot');
    const after = useLayoutStore.getState();
    expect(after.leftWidth).toBe(420);
    expect(after.rightWidth).toBe(380);
    expect(after.panelDockState.layers).toBe('floating');
    expect(after.floatingPosition.layers).toEqual({ x: 7, y: 8, w: 200, h: 200 });
    expect(after.panelHidden.console).toBe(true);
    // Hidden state from before the apply is also overwritten (preset wins).
    expect(after.panelHidden.palette).toBe(false);
  });

  it('applyPreset is a no-op when the name does not exist', () => {
    const s = useLayoutStore.getState();
    s.setLeftWidth(330);
    s.applyPreset('Nonexistent');
    expect(useLayoutStore.getState().leftWidth).toBe(330);
  });

  it('deletePreset removes the named preset only', () => {
    const s = useLayoutStore.getState();
    s.savePreset('A');
    s.savePreset('B');
    s.deletePreset('A');
    const presets = useLayoutStore.getState().presets;
    expect(Object.keys(presets)).toEqual(['B']);
  });

  it('deletePreset is a no-op when the name does not exist', () => {
    const s = useLayoutStore.getState();
    s.savePreset('Keep');
    s.deletePreset('Nope');
    expect(Object.keys(useLayoutStore.getState().presets)).toEqual(['Keep']);
  });

  it('persists presets to localStorage', () => {
    const s = useLayoutStore.getState();
    s.savePreset('Persisted');
    const raw = localStorage.getItem('h5-editor-layout');
    expect(raw).not.toBeNull();
    const wrapper = JSON.parse(raw ?? '{}') as { state?: Partial<LayoutState> };
    const persisted = wrapper.state ?? {};
    expect(persisted.presets?.['Persisted']).toBeDefined();
    expect(persisted.presets?.['Persisted']?.name).toBe('Persisted');
  });
});
