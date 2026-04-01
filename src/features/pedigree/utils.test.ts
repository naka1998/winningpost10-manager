import { describe, expect, it } from 'vitest';
import type { PedigreeNode } from '@/features/horses/types';
import type { InbreedingResult } from './service';
import { flattenTree, getInbreedingHighlightIds, getLineageColor } from './utils';

function buildNode(overrides: Partial<PedigreeNode> = {}): PedigreeNode {
  return {
    id: 1,
    name: 'テスト馬',
    country: null,
    generation: 0,
    position: 'self',
    path: '',
    factors: null,
    lineageName: null,
    spStType: null,
    parentLineageName: null,
    ...overrides,
  };
}

describe('flattenTree', () => {
  it('returns a single cell for a root-only tree (depth=4)', () => {
    const tree = buildNode({ id: 1, name: '本馬' });
    const cells = flattenTree(tree, 4);

    expect(cells).toHaveLength(1);
    expect(cells[0].node.name).toBe('本馬');
    expect(cells[0].column).toBe(0);
    expect(cells[0].rowStart).toBe(1);
    expect(cells[0].rowSpan).toBe(16); // 2^4 = 16
  });

  it('computes correct grid positions for 3 nodes (root + sire + dam)', () => {
    const tree = buildNode({
      id: 1,
      name: '本馬',
      sire: buildNode({ id: 2, name: '父', generation: 1, path: 'S' }),
      dam: buildNode({ id: 3, name: '母', generation: 1, path: 'D' }),
    });
    const cells = flattenTree(tree, 4);

    // root: col=0, row=1, span=16
    const root = cells.find((c) => c.node.name === '本馬')!;
    expect(root.column).toBe(0);
    expect(root.rowStart).toBe(1);
    expect(root.rowSpan).toBe(16);

    // sire: col=1, row=1, span=8
    const sire = cells.find((c) => c.node.name === '父')!;
    expect(sire.column).toBe(1);
    expect(sire.rowStart).toBe(1);
    expect(sire.rowSpan).toBe(8);

    // dam: col=1, row=9, span=8
    const dam = cells.find((c) => c.node.name === '母')!;
    expect(dam.column).toBe(1);
    expect(dam.rowStart).toBe(9);
    expect(dam.rowSpan).toBe(8);
  });

  it('computes correct positions for a 3-generation tree', () => {
    const tree = buildNode({
      id: 1,
      name: '本馬',
      sire: buildNode({
        id: 2,
        name: '父',
        generation: 1,
        path: 'S',
        sire: buildNode({ id: 4, name: '父父', generation: 2, path: 'SS' }),
        dam: buildNode({ id: 5, name: '父母', generation: 2, path: 'SD' }),
      }),
      dam: buildNode({
        id: 3,
        name: '母',
        generation: 1,
        path: 'D',
        sire: buildNode({ id: 6, name: '母父', generation: 2, path: 'DS' }),
        dam: buildNode({ id: 7, name: '母母', generation: 2, path: 'DD' }),
      }),
    });
    const cells = flattenTree(tree, 4);

    expect(cells).toHaveLength(7);

    // Gen 2 nodes have rowSpan = 16 / 2^2 = 4
    const sireSire = cells.find((c) => c.node.name === '父父')!;
    expect(sireSire.column).toBe(2);
    expect(sireSire.rowStart).toBe(1);
    expect(sireSire.rowSpan).toBe(4);

    const sireDam = cells.find((c) => c.node.name === '父母')!;
    expect(sireDam.column).toBe(2);
    expect(sireDam.rowStart).toBe(5);
    expect(sireDam.rowSpan).toBe(4);

    const damSire = cells.find((c) => c.node.name === '母父')!;
    expect(damSire.column).toBe(2);
    expect(damSire.rowStart).toBe(9);
    expect(damSire.rowSpan).toBe(4);

    const damDam = cells.find((c) => c.node.name === '母母')!;
    expect(damDam.column).toBe(2);
    expect(damDam.rowStart).toBe(13);
    expect(damDam.rowSpan).toBe(4);
  });

  it('handles depth=5 with correct total rows (32)', () => {
    const tree = buildNode({ id: 1, name: '本馬' });
    const cells = flattenTree(tree, 5);

    expect(cells[0].rowSpan).toBe(32); // 2^5 = 32
  });

  it('computes row positions using path-based indexing', () => {
    // Build a 4-generation tree to test leaf positions
    const tree = buildNode({
      id: 1,
      name: '本馬',
      sire: buildNode({
        id: 2,
        generation: 1,
        path: 'S',
        sire: buildNode({
          id: 4,
          generation: 2,
          path: 'SS',
          sire: buildNode({
            id: 8,
            generation: 3,
            path: 'SSS',
            sire: buildNode({ id: 16, name: 'SSSS', generation: 4, path: 'SSSS' }),
            dam: buildNode({ id: 17, name: 'SSSD', generation: 4, path: 'SSSD' }),
          }),
        }),
      }),
    });
    const cells = flattenTree(tree, 4);

    // SSSS: gen 4, first leaf → col=4, row=1, span=1
    const ssss = cells.find((c) => c.node.name === 'SSSS')!;
    expect(ssss.column).toBe(4);
    expect(ssss.rowStart).toBe(1);
    expect(ssss.rowSpan).toBe(1);

    // SSSD: gen 4, second leaf → col=4, row=2, span=1
    const sssd = cells.find((c) => c.node.name === 'SSSD')!;
    expect(sssd.column).toBe(4);
    expect(sssd.rowStart).toBe(2);
    expect(sssd.rowSpan).toBe(1);
  });
});

describe('getLineageColor', () => {
  it('returns the same color for the same lineage name', () => {
    const color1 = getLineageColor('ナスルーラ系');
    const color2 = getLineageColor('ナスルーラ系');
    expect(color1).toBe(color2);
  });

  it('returns different colors for different lineage names', () => {
    const color1 = getLineageColor('ナスルーラ系');
    const color2 = getLineageColor('ノーザンダンサー系');
    expect(color1).not.toBe(color2);
  });

  it('returns a default color for null', () => {
    const color = getLineageColor(null);
    expect(color).toBeDefined();
    expect(typeof color).toBe('string');
  });
});

describe('getInbreedingHighlightIds', () => {
  it('returns an empty set when there are no inbreeding results', () => {
    const ids = getInbreedingHighlightIds([]);
    expect(ids.size).toBe(0);
  });

  it('returns the correct set of ancestor IDs', () => {
    const results: InbreedingResult[] = [
      { ancestorName: '祖先A', ancestorId: 10, paths: ['3', '4'], notation: '3×4' },
      { ancestorName: '祖先B', ancestorId: 20, paths: ['2', '2'], notation: '2×2' },
    ];
    const ids = getInbreedingHighlightIds(results);
    expect(ids.size).toBe(2);
    expect(ids.has(10)).toBe(true);
    expect(ids.has(20)).toBe(true);
  });
});
