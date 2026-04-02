import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PedigreeNode } from '@/features/horses/types';
import type { InbreedingResult } from '../service';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, unknown>;
    [key: string]: unknown;
  }) => {
    let href = to;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        href = href.replace(`$${key}`, String(value));
      }
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

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

function build4GenTree(): PedigreeNode {
  return buildNode({
    id: 1,
    name: '本馬',
    sire: buildNode({
      id: 2,
      name: '父',
      generation: 1,
      path: 'S',
      lineageName: 'サンデーサイレンス系',
      parentLineageName: 'ヘイルトゥリーズン系',
      sire: buildNode({
        id: 4,
        name: '父父',
        generation: 2,
        path: 'SS',
        country: '米',
        lineageName: 'ヘイルトゥリーズン系',
        parentLineageName: 'ターントゥ系',
      }),
      dam: buildNode({
        id: 5,
        name: '父母',
        generation: 2,
        path: 'SD',
        country: '米',
      }),
    }),
    dam: buildNode({
      id: 3,
      name: '母',
      generation: 1,
      path: 'D',
      lineageName: 'ノーザンダンサー系',
      parentLineageName: 'ネイティヴダンサー系',
      sire: buildNode({
        id: 6,
        name: '母父',
        generation: 2,
        path: 'DS',
        country: '欧',
        lineageName: 'ノーザンダンサー系',
        parentLineageName: 'ネイティヴダンサー系',
      }),
      dam: buildNode({
        id: 7,
        name: '母母',
        generation: 2,
        path: 'DD',
        country: '日',
      }),
    }),
  });
}

describe('PedigreeGrid', () => {
  afterEach(() => {
    cleanup();
  });

  async function renderGrid(
    props: {
      tree?: PedigreeNode;
      depth?: 4 | 5;
      viewMode?: 'name' | 'lineage' | 'factor';
      inbreeding?: InbreedingResult[];
    } = {},
  ) {
    const { PedigreeGrid } = await import('./PedigreeGrid');
    return render(
      <PedigreeGrid
        tree={props.tree ?? build4GenTree()}
        depth={props.depth ?? 4}
        viewMode={props.viewMode ?? 'name'}
        inbreeding={props.inbreeding ?? []}
      />,
    );
  }

  it('renders a CSS Grid container', async () => {
    await renderGrid();
    const grid = screen.getByTestId('pedigree-grid');
    expect(grid).toBeInTheDocument();
  });

  it('renders all nodes from the tree', async () => {
    await renderGrid();
    // 7 nodes: 本馬, 父, 母, 父父, 父母, 母父, 母母
    expect(screen.getByText('本馬')).toBeInTheDocument();
    expect(screen.getByText('父')).toBeInTheDocument();
    expect(screen.getByText('母')).toBeInTheDocument();
    expect(screen.getByText('父父')).toBeInTheDocument();
    expect(screen.getByText('父母')).toBeInTheDocument();
    expect(screen.getByText('母父')).toBeInTheDocument();
    expect(screen.getByText('母母')).toBeInTheDocument();
  });

  // Name view
  it('name view shows horse names and country flags', async () => {
    const tree = build4GenTree();
    await renderGrid({ tree, viewMode: 'name' });

    expect(screen.getByText('父父')).toBeInTheDocument();
    // 米 country horses: 父父, 父母 → exactly 2 US flags
    expect(screen.getAllByText('🇺🇸')).toHaveLength(2);
    // 欧 country horse: 母父 → exactly 1 EU flag
    expect(screen.getAllByText('🇪🇺')).toHaveLength(1);
    // 日 country horse: 母母 → exactly 1 JP flag
    expect(screen.getAllByText('🇯🇵')).toHaveLength(1);
  });

  it('name view shows each country flag correctly', async () => {
    // Test each flag individually with a single-node tree
    for (const [country, flag] of [
      ['日', '🇯🇵'],
      ['米', '🇺🇸'],
      ['欧', '🇪🇺'],
    ] as const) {
      cleanup();
      const { PedigreeGrid } = await import('./PedigreeGrid');
      render(
        <PedigreeGrid
          tree={buildNode({ id: 1, name: `${country}の馬`, country })}
          depth={4}
          viewMode="name"
          inbreeding={[]}
        />,
      );
      expect(screen.getByText(flag)).toBeInTheDocument();
    }
  });

  it('name view does not show flag when country is null', async () => {
    const tree = buildNode({ id: 1, name: '無国籍馬', country: null });
    await renderGrid({ tree, viewMode: 'name' });
    expect(screen.getByText('無国籍馬')).toBeInTheDocument();
    expect(screen.queryByText('🇯🇵')).not.toBeInTheDocument();
    expect(screen.queryByText('🇺🇸')).not.toBeInTheDocument();
    expect(screen.queryByText('🇪🇺')).not.toBeInTheDocument();
  });

  // Lineage view
  it('lineage view shows lineage names', async () => {
    await renderGrid({ viewMode: 'lineage' });
    expect(screen.getAllByText('サンデーサイレンス系').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('ノーザンダンサー系').length).toBeGreaterThanOrEqual(1);
  });

  it('lineage view shows parent lineage names', async () => {
    await renderGrid({ viewMode: 'lineage' });
    // ヘイルトゥリーズン系 appears both as lineageName (on 父父) and parentLineageName (on 父)
    expect(screen.getAllByText('ヘイルトゥリーズン系').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('ネイティヴダンサー系').length).toBeGreaterThanOrEqual(1);
  });

  // Factor view
  it('factor view shows SP/ST type and factors', async () => {
    const tree = buildNode({
      id: 1,
      name: '本馬',
      spStType: 'SP',
      factors: ['スピード', 'パワー'],
      sire: buildNode({
        id: 2,
        name: '父',
        generation: 1,
        path: 'S',
        spStType: 'ST',
        factors: ['スタミナ'],
      }),
    });
    await renderGrid({ tree, viewMode: 'factor' });

    expect(screen.getByText('SP')).toBeInTheDocument();
    expect(screen.getByText('ST')).toBeInTheDocument();
    expect(screen.getByText('スピード')).toBeInTheDocument();
    expect(screen.getByText('パワー')).toBeInTheDocument();
    expect(screen.getByText('スタミナ')).toBeInTheDocument();
  });

  // Inbreeding highlight
  it('highlights inbred ancestors', async () => {
    const inbreeding: InbreedingResult[] = [
      { ancestorName: '父父', ancestorId: 4, paths: ['2', '3'], notation: '2×3' },
    ];
    await renderGrid({ inbreeding });

    const highlightedCell = screen.getByTestId('pedigree-cell-4');
    expect(highlightedCell.className).toMatch(/ring/);
  });

  // Ancestor click navigation
  it('ancestor nodes are clickable links to detail page', async () => {
    await renderGrid();

    // 父 (id=2) should link to /horses/2
    const sireLink = screen.getByRole('link', { name: /父父/ });
    expect(sireLink).toHaveAttribute('href', '/horses/4');
  });

  it('root node (generation 0) is not a link', async () => {
    await renderGrid();

    // 本馬 should not be wrapped in a link
    const rootCell = screen.getByTestId('pedigree-cell-1');
    const links = within(rootCell).queryAllByRole('link');
    expect(links).toHaveLength(0);
  });

  // Parent lineage color coding
  it('applies lineage-based background colors', async () => {
    await renderGrid();

    // 父 has parentLineageName='ヘイルトゥリーズン系', which should have a specific color
    const sireCell = screen.getByTestId('pedigree-cell-2');
    expect(sireCell.className).toMatch(/bg-/);
  });
});
