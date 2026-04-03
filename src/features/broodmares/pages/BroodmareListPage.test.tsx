import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Radix UI polyfills for jsdom
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};

  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

import { useBroodmareStore } from '../store';
import { useSettingsStore } from '@/features/settings/store';
import type { BroodmareSummary, BroodmareOffspring, LineageDistribution } from '../types';

function createTestSummary(overrides: Partial<BroodmareSummary> = {}): BroodmareSummary {
  return {
    id: 1,
    name: 'テスト繁殖牝馬',
    birthYear: 2015,
    age: 12,
    breedingStartYear: 2020,
    offspringCount: 3,
    activeOffspringCount: 2,
    gradeDistribution: [{ grade: 'G1', count: 1 }],
    avgGradeScore: 5.0,
    avgEvaluation: 4.0,
    avgTotalPower: 80,
    ...overrides,
  };
}

function createTestOffspring(overrides: Partial<BroodmareOffspring> = {}): BroodmareOffspring {
  return {
    id: 10,
    name: 'テスト産駒',
    birthYear: 2021,
    sex: '牡',
    status: '現役',
    sireName: 'テスト種牡馬',
    bestGrade: 'G2',
    evaluation: null,
    totalPower: null,
    breedingNotes: null,
    ...overrides,
  };
}

const mockFindAllSummaries = vi.fn<() => Promise<BroodmareSummary[]>>();
const mockFindOffspring = vi.fn<() => Promise<BroodmareOffspring[]>>();
const mockGetSireLineDistribution = vi.fn<() => Promise<LineageDistribution[]>>();
const mockGetDamLineDistribution = vi.fn<() => Promise<LineageDistribution[]>>();
const mockGetStallionDistribution = vi.fn<() => Promise<LineageDistribution[]>>();

const mockRepoContext = {
  broodmareRepository: {
    findAllSummaries: mockFindAllSummaries,
    findOffspring: mockFindOffspring,
    getSireLineDistribution: mockGetSireLineDistribution,
    getDamLineDistribution: mockGetDamLineDistribution,
    getStallionDistribution: mockGetStallionDistribution,
  },
};

const mockSettingsService = {
  getAll: vi.fn(),
  updateCurrentYear: vi.fn(),
  updatePedigreeDepth: vi.fn(),
};

vi.mock('@/app/repository-context', () => ({
  useRepositoryContext: () => mockRepoContext,
}));

vi.mock('@/app/service-context', () => ({
  useServiceContext: () => ({
    settingsService: mockSettingsService,
  }),
}));

// Mock recharts to avoid rendering issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  Cell: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
  CartesianGrid: () => null,
}));

describe('BroodmareListPage', () => {
  const testSummaries = [
    createTestSummary({ id: 1, name: '牝馬A', offspringCount: 3, activeOffspringCount: 2 }),
    createTestSummary({
      id: 2,
      name: '牝馬B',
      birthYear: 2016,
      age: 11,
      breedingStartYear: 2021,
      offspringCount: 1,
      activeOffspringCount: 0,
      gradeDistribution: [{ grade: 'G3', count: 1 }],
      avgGradeScore: 1.0,
    }),
  ];

  const testOffspring = [
    createTestOffspring({ id: 10, name: '産駒1', birthYear: 2022, sex: '牡', status: '現役' }),
    createTestOffspring({ id: 11, name: '産駒2', birthYear: 2021, sex: '牝', status: '引退' }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindAllSummaries.mockResolvedValue(testSummaries);
    mockFindOffspring.mockResolvedValue(testOffspring);
    mockGetSireLineDistribution.mockResolvedValue([
      { name: 'サンデー系', count: 5 },
      { name: 'ミスプロ系', count: 3 },
    ]);
    mockGetDamLineDistribution.mockResolvedValue([{ name: 'フロリースカップ系', count: 4 }]);
    mockGetStallionDistribution.mockResolvedValue([{ name: 'ディープインパクト', count: 6 }]);
    useBroodmareStore.setState({
      summaries: [],
      offspring: {},
      sireLineDistribution: [],
      damLineDistribution: [],
      stallionDistribution: [],
      isLoading: false,
      error: null,
      filter: {},
    });
    mockSettingsService.getAll.mockResolvedValue({
      currentYear: 2026,
      pedigreeDepth: 4,
      rankSystem: [],
      dbVersion: 1,
    });
    useSettingsStore.setState({
      settings: { currentYear: 2026, pedigreeDepth: 4, rankSystem: [], dbVersion: 1 },
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  async function renderAndWait() {
    const { BroodmareListPage } = await import('./BroodmareListPage');
    render(<BroodmareListPage />);
    await screen.findByText('牝馬A');
  }

  it('ヘッダーが表示される', async () => {
    await renderAndWait();
    expect(screen.getByRole('heading', { name: '繁殖牝馬評価' })).toBeInTheDocument();
  });

  it('テーブルに繁殖牝馬が表示される', async () => {
    await renderAndWait();

    expect(screen.getByText('牝馬A')).toBeInTheDocument();
    expect(screen.getByText('牝馬B')).toBeInTheDocument();
    expect(screen.getByText('G1 1頭')).toBeInTheDocument();
    expect(screen.getByText('G3 1頭')).toBeInTheDocument();
  });

  it('産駒数が表示される', async () => {
    await renderAndWait();

    // 牝馬A: 3 offspring, 2 active
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('ローディング状態が表示される', async () => {
    useBroodmareStore.setState({ isLoading: true, summaries: [] });
    const { BroodmareListPage } = await import('./BroodmareListPage');
    render(<BroodmareListPage />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('エラー状態が表示される', async () => {
    mockFindAllSummaries.mockRejectedValue(new Error('データ取得に失敗しました'));
    const { BroodmareListPage } = await import('./BroodmareListPage');
    render(<BroodmareListPage />);
    await screen.findByText('データ取得に失敗しました');
  });

  it('繁殖牝馬がいない場合にメッセージが表示される', async () => {
    mockFindAllSummaries.mockResolvedValue([]);
    const { BroodmareListPage } = await import('./BroodmareListPage');
    render(<BroodmareListPage />);
    await screen.findByText('繁殖牝馬がいません');
  });

  it('行クリックで産駒一覧が展開される', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    // Click the row for 牝馬A
    const row = screen.getByText('牝馬A').closest('tr')!;
    await user.click(row);

    await screen.findByText('産駒1');
    expect(screen.getByText('産駒2')).toBeInTheDocument();
    expect(mockFindOffspring).toHaveBeenCalledWith(1);
  });

  it('タブで全体バランスに切り替えられる', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    const balanceTab = screen.getByRole('tab', { name: '全体バランス' });
    await user.click(balanceTab);

    // Charts should be rendered
    expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0);
  });

  it('個別評価タブがデフォルトで選択されている', async () => {
    await renderAndWait();

    const individualTab = screen.getByRole('tab', { name: '個別評価' });
    expect(individualTab).toHaveAttribute('data-state', 'active');
  });
});
