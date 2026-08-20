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
