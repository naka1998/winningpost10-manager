import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PedigreeRow } from '@/features/horses/types';

function buildRow(overrides: Partial<PedigreeRow> = {}): PedigreeRow {
  return {
    id: 1,
    name: 'テスト馬',
    country: null,
    generation: 0,
    position: 'self',
    path: '',
    factors: null,
    lineage_name: null,
    sp_st_type: null,
    parent_lineage_name: null,
    ...overrides,
  };
}

const mockGetAncestorRows = vi.fn<(id: number, depth?: number) => Promise<PedigreeRow[]>>();
const mockFindById = vi.fn();

const mockHorseRepo = {
  findById: mockFindById,
  findByNameAndBirthYear: vi.fn(),
  findAncestorByName: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getAncestorRows: mockGetAncestorRows,
};

vi.mock('@/app/repository-context', () => ({
  useRepositoryContext: () => ({
    horseRepository: mockHorseRepo,
    yearlyStatusRepository: {
      findById: vi.fn(),
      findByHorseId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    lineageRepository: {
      findById: vi.fn(),
      findByName: vi.fn(),
      findAll: vi.fn(),
      getChildren: vi.fn(),
      getHierarchy: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    settingsRepository: {
      get: vi.fn(),
      set: vi.fn(),
      getAll: vi.fn(),
    },
  }),
}));

vi.mock('@/components/ui/toggle-group', () => {
  const ToggleGroupContext = React.createContext<{
    value?: string;
    onValueChange?: (v: string) => void;
  }>({});
  function ToggleGroup({
    value,
    onValueChange,
    children,
  }: {
    type: string;
    value?: string;
    onValueChange?: (v: string) => void;
    children: React.ReactNode;
  }) {
    return (
      <ToggleGroupContext.Provider value={{ value, onValueChange }}>
        <div role="group" data-value={value}>
          {children}
        </div>
      </ToggleGroupContext.Provider>
    );
  }
  function ToggleGroupItem({ value, children }: { value: string; children: React.ReactNode }) {
    const ctx = React.useContext(ToggleGroupContext);
    return (
      <button
        type="button"
        data-value={value}
        data-state={ctx.value === value ? 'on' : 'off'}
        onClick={() => ctx.onValueChange?.(value)}
      >
        {children}
      </button>
    );
  }
  return { ToggleGroup, ToggleGroupItem };
});

let mockHorseId = 1;

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ horseId: mockHorseId }),
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

function build3GenRows(): PedigreeRow[] {
  return [
    buildRow({ id: 1, name: '本馬', country: '日', generation: 0, path: '' }),
    buildRow({
      id: 2,
      name: '父',
      country: '米',
      generation: 1,
      position: 'sire',
      path: 'S',
      lineage_name: 'サンデーサイレンス系',
      parent_lineage_name: 'ヘイルトゥリーズン系',
    }),
    buildRow({
      id: 3,
      name: '母',
      country: '欧',
      generation: 1,
      position: 'dam',
      path: 'D',
      lineage_name: 'ノーザンダンサー系',
      parent_lineage_name: 'ネイティヴダンサー系',
    }),
    buildRow({ id: 4, name: '父父', generation: 2, path: 'SS' }),
    buildRow({ id: 5, name: '父母', generation: 2, path: 'SD' }),
    buildRow({ id: 6, name: '母父', generation: 2, path: 'DS' }),
    buildRow({ id: 7, name: '母母', generation: 2, path: 'DD' }),
  ];
}

function buildInbredRows(): PedigreeRow[] {
  return [
    buildRow({ id: 1, name: '本馬', generation: 0, path: '' }),
    buildRow({ id: 2, name: '父', generation: 1, path: 'S' }),
    buildRow({ id: 3, name: '母', generation: 1, path: 'D' }),
    buildRow({ id: 10, name: '共通祖先', generation: 2, path: 'SS' }),
    buildRow({ id: 5, name: '父母', generation: 2, path: 'SD' }),
    buildRow({ id: 10, name: '共通祖先', generation: 2, path: 'DS' }),
    buildRow({ id: 7, name: '母母', generation: 2, path: 'DD' }),
  ];
}

describe('PedigreePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHorseId = 1;
    mockGetAncestorRows.mockResolvedValue(build3GenRows());
    mockFindById.mockResolvedValue({
      id: 1,
      name: '本馬',
      sex: '牡',
      birthYear: 2020,
      country: '日',
      isHistorical: false,
      mareLine: null,
      status: '現役',
      sireId: 2,
      damId: 3,
      lineageId: null,
      factors: null,
      notes: null,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
  });

  afterEach(() => {
    cleanup();
  });

  async function renderAndWait() {
    const { PedigreePage } = await import('./PedigreePage');
    render(<PedigreePage />);
    await screen.findByRole('heading', { name: '本馬' });
  }

  it('displays the pedigree tree after loading', async () => {
    await renderAndWait();

    expect(screen.getByRole('heading', { name: '本馬' })).toBeInTheDocument();
    expect(screen.getByText('※ この機能はおまけです')).toBeInTheDocument();
    expect(screen.getAllByText('父').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('母').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('pedigree-grid')).toBeInTheDocument();
  });

  it('fetches pedigree data with default depth=4', async () => {
    await renderAndWait();
    expect(mockGetAncestorRows).toHaveBeenCalledWith(1, 4);
  });

  it('toggles between 4-gen and 5-gen views', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    const gen5Button = screen.getByRole('button', { name: '5世代' });
    await user.click(gen5Button);

    expect(mockGetAncestorRows).toHaveBeenCalledWith(1, 5);
  });

  it('switches between name, lineage, and factor view modes', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    // Default is name view - horse names are visible
    expect(screen.getByText('父')).toBeInTheDocument();

    // Switch to lineage view
    const lineageButton = screen.getByRole('button', { name: '系統' });
    await user.click(lineageButton);

    expect(screen.getAllByText('サンデーサイレンス系').length).toBeGreaterThanOrEqual(1);

    // Switch to factor view
    const factorButton = screen.getByRole('button', { name: '因子' });
    await user.click(factorButton);

    // Factor view should be active (nodes without factors show '-')
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
  });

  it('displays inbreeding badges when inbreeding is detected', async () => {
    mockGetAncestorRows.mockResolvedValue(buildInbredRows());
    await renderAndWait();

    // 共通祖先 appears at generation 2 on both sides → "2×2"
    // The badge displays "共通祖先 2×2"
    expect(screen.getByText('共通祖先 2×2')).toBeInTheDocument();
  });

  it('displays loading state', async () => {
    mockGetAncestorRows.mockImplementation(() => new Promise(() => {})); // never resolves
    const { PedigreePage } = await import('./PedigreePage');
    render(<PedigreePage />);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('displays error when horseId is missing', async () => {
    mockHorseId = undefined as unknown as number;
    const { PedigreePage } = await import('./PedigreePage');
    render(<PedigreePage />);

    await screen.findByText('馬IDが指定されていません');
  });

  it('displays error state', async () => {
    mockGetAncestorRows.mockRejectedValue(new Error('データ取得に失敗しました'));
    const { PedigreePage } = await import('./PedigreePage');
    render(<PedigreePage />);

    await screen.findByText('データ取得に失敗しました');
  });

  it('displays message when no pedigree data found', async () => {
    mockGetAncestorRows.mockResolvedValue([]);
    const { PedigreePage } = await import('./PedigreePage');
    render(<PedigreePage />);

    await screen.findByText('血統データがありません');
  });

  it('has a back link to horse detail page', async () => {
    await renderAndWait();

    const backLink = screen.getByRole('link', { name: /馬詳細/ });
    expect(backLink).toHaveAttribute('href', '/horses/1');
  });
});
