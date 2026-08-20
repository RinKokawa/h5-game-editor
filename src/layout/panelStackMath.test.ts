import { describe, expect, it } from 'vitest';

import { MIN_PANEL_BODY } from '@state/layoutStore';

import {
  PANEL_HEADER_H,
  SPLITTER_H,
  computeStackGeometry,
  moveItem,
  nextBodyHeight,
} from './panelStackMath';

import type { PanelId } from '@state/layoutStore';


const heights: Readonly<Record<PanelId, number>> = {
  palette: 300,
  assets: 200,
  layers: 260,
  inspector: 280,
  properties: 280,
  console: 200,
};
const allExpanded: Readonly<Record<PanelId, boolean>> = {
  palette: false,
  assets: false,
  layers: false,
  inspector: false,
  properties: false,
  console: false,
};

describe('moveItem', () => {
  it('moves an item forward', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('moves an item backward', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('returns a copy when indices are equal', () => {
    const list = ['a', 'b'];
    const result = moveItem(list, 1, 1);
    expect(result).toEqual(list);
    expect(result).not.toBe(list);
  });

  it('returns a copy for out-of-range indices', () => {
    expect(moveItem(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });
});

describe('computeStackGeometry', () => {
  it('fills with the last expanded dock and subtracts chrome', () => {
    const order: PanelId[] = ['palette', 'assets', 'layers'];
    const available = 1000;
    const { fillId, fillHeight } = computeStackGeometry(
      order,
      heights,
      allExpanded,
      available,
    );
    expect(fillId).toBe('layers');
    // 3 headers + palette body + assets body + 2 splitters below the
    // two non-fill docks.
    const used = 3 * PANEL_HEADER_H + heights.palette + heights.assets + 2 * SPLITTER_H;
    expect(fillHeight).toBe(available - used);
  });

  it('clamps the fill height to MIN_PANEL_BODY when space runs out', () => {
    const order: PanelId[] = ['palette', 'assets', 'layers'];
    const { fillId, fillHeight } = computeStackGeometry(order, heights, allExpanded, 300);
    expect(fillId).toBe('layers');
    expect(fillHeight).toBe(MIN_PANEL_BODY);
  });

  it('treats a collapsed middle dock as header-only with no splitter', () => {
    const order: PanelId[] = ['palette', 'assets', 'layers'];
    const collapsed = { ...allExpanded, assets: true };
    const { fillId, fillHeight } = computeStackGeometry(order, heights, collapsed, 1000);
    expect(fillId).toBe('layers');
    // 3 headers + palette body + 1 splitter (below palette); the collapsed
    // assets dock keeps its header but adds no body and no splitter.
    const used = 3 * PANEL_HEADER_H + heights.palette + SPLITTER_H;
    expect(fillHeight).toBe(1000 - used);
  });

  it('returns no fill dock when everything is collapsed', () => {
    const order: PanelId[] = ['palette', 'assets'];
    const collapsed = { ...allExpanded, palette: true, assets: true };
    const geometry = computeStackGeometry(order, heights, collapsed, 1000);
    expect(geometry.fillId).toBeNull();
    expect(geometry.fillHeight).toBe(0);
  });

  it('makes a lone expanded dock the fill', () => {
    const order: PanelId[] = ['palette'];
    const { fillId, fillHeight } = computeStackGeometry(order, heights, allExpanded, 500);
    expect(fillId).toBe('palette');
    expect(fillHeight).toBe(500 - PANEL_HEADER_H);
  });
});

describe('nextBodyHeight', () => {
  const order: PanelId[] = ['palette', 'assets', 'layers'];

  it('applies the delta within slack', () => {
    const geometry = computeStackGeometry(order, heights, allExpanded, 1000);
    expect(nextBodyHeight(geometry, 'palette', heights, 50)).toBe(350);
  });

  it('caps growth at the fill dock minimum', () => {
    const geometry = computeStackGeometry(order, heights, allExpanded, 1000);
    const fill = geometry.fillHeight;
    // Growing palette by more than the fill's slack saturates the clamp.
    expect(nextBodyHeight(geometry, 'palette', heights, 10_000)).toBe(
      heights.palette + fill - MIN_PANEL_BODY,
    );
  });

  it('never shrinks below MIN_PANEL_BODY', () => {
    const geometry = computeStackGeometry(order, heights, allExpanded, 1000);
    expect(nextBodyHeight(geometry, 'palette', heights, -10_000)).toBe(MIN_PANEL_BODY);
  });

  it('forbids growth when the fill dock is already at its minimum', () => {
    // 300px is far too little for 3 expanded docks → fill sits at MIN.
    const geometry = computeStackGeometry(order, heights, allExpanded, 300);
    expect(geometry.fillHeight).toBe(MIN_PANEL_BODY);
    expect(nextBodyHeight(geometry, 'palette', heights, 40)).toBe(heights.palette);
    // Shrinking is still allowed.
    expect(nextBodyHeight(geometry, 'palette', heights, -40)).toBe(heights.palette - 40);
  });
});
