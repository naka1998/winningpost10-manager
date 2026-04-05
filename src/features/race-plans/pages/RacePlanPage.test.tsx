import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRacePlanStore } from '../store';
import type { RacePlanWithHorseName } from '../types';
import type { Horse } from '@/features/horses/types';

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

function createTestPlan(overrides: Partial<RacePlanWithHorseName> = {}): RacePlanWithHorseName {
  return {
    id: 1,
    horseId: 10,
    year: 2026,
    country: '日',
    surface: '芝',
    distanceBand: 'マイル',
    grade: 'G1',
    notes: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    horseName: 'テスト馬',
    horseSex: '牡',
    horseBirthYear: 2022,
    ...overrides,
  };
}

function createTestHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: 10,
    name: 'テスト馬',
    sex: '牡',
    birthYear: 2022,
    country: '日',
    isHistorical: false,
    mareLine: null,
    status: '現役',
    sireId: null,
    damId: null,
    lineageId: null,
    factors: null,
    notes: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

const mockFindByYear = vi.fn<() => Promise<RacePlanWithHorseName[]>>();
const mockCreate = vi.fn();
const mockDelete = vi.fn();
const mockHorseFindAll = vi.fn<() => Promise<Horse[]>>();

const mockRacePlanRepo = {
  findById: vi.fn(),
  findAll: vi.fn(),
  findByYear: mockFindByYear,
  create: mockCreate,
  update: vi.fn(),
  delete: mockDelete,
};

const mockHorseRepo = {
  findById: vi.fn(),
  findByName: vi.fn(),
  findByNameAndBirthYear: vi.fn(),
  findAncestorByName: vi.fn(),
  findAll: mockHorseFindAll,
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getAncestorRows: vi.fn(),
};

vi.mock('@/app/repository-context', () => ({
  useRepositoryContext: () => ({
    racePlanRepository: mockRacePlanRepo,
    horseRepository: mockHorseRepo,
    yearlyStatusRepository: {
      findById: vi.fn(),
      findByHorseId: vi.fn(),
      findByHorseAndYear: vi.fn(),
      findByYear: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    lineageRepository: {},
    settingsRepository: {},
    breedingRecordRepository: {},
    broodmareRepository: {},
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ year: 2026 }),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

describe('RacePlanPage', () => {
  const testPlans = [
    createTestPlan({ id: 1, horseName: 'スピードスター', surface: '芝' }),
    createTestPlan({
      id: 2,
      horseId: 20,
      horseName: 'パワーランナー',
      country: '米',
      surface: 'ダート',
      distanceBand: '中距離',
      grade: 'G2',
    }),
  ];

  const testHorses = [
    createTestHorse({ id: 10, name: 'スピードスター' }),
    createTestHorse({ id: 20, name: 'パワーランナー' }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindByYear.mockResolvedValue(testPlans);
    mockHorseFindAll.mockResolvedValue(testHorses);
    mockCreate.mockResolvedValue(createTestPlan({ id: 100 }));
    mockDelete.mockResolvedValue(undefined);
    useRacePlanStore.setState({
      plans: [],
      isLoading: false,
      error: null,
      year: 2026,
    });
  });

  afterEach(() => {
    cleanup();
  });

  async function renderAndWait() {
    const { RacePlanPage } = await import('./RacePlanPage');
    render(<RacePlanPage />);
    await screen.findByText(/スピードスター/, {}, { timeout: 3000 });
  }

  it('ヘッダーと年度セレクトが表示される', async () => {
    await renderAndWait();

    expect(screen.getByRole('heading', { name: 'レース計画' })).toBeInTheDocument();
    expect(screen.getByText('年度:')).toBeInTheDocument();
  });

  it('芝/ダートタブが表示される', async () => {
    await renderAndWait();

    expect(screen.getByRole('tab', { name: '芝' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'ダート' })).toBeInTheDocument();
  });

  it('マトリクスが表示される', async () => {
    await renderAndWait();

    expect(screen.getByText('日')).toBeInTheDocument();
    expect(screen.getByText('米')).toBeInTheDocument();
    expect(screen.getByText('欧')).toBeInTheDocument();
  });

  it('配置された馬名が表示される', async () => {
    await renderAndWait();

    expect(screen.getByText(/スピードスター/)).toBeInTheDocument();
  });

  it('ローディング状態が表示される', async () => {
    mockFindByYear.mockImplementation(() => new Promise<RacePlanWithHorseName[]>(() => {}));

    const { RacePlanPage } = await import('./RacePlanPage');
    render(<RacePlanPage />);

    await screen.findByText('読み込み中...', {}, { timeout: 3000 });
  });

  it('エラー状態が表示される', async () => {
    mockFindByYear.mockRejectedValue(new Error('データ取得に失敗'));

    const { RacePlanPage } = await import('./RacePlanPage');
    render(<RacePlanPage />);

    await screen.findByText('データ取得に失敗', {}, { timeout: 3000 });
  });

  it('重複警告が表示される', async () => {
    const duplicatePlans = [
      createTestPlan({
        id: 1,
        horseId: 10,
        horseName: '重複馬',
        country: '日',
        surface: '芝',
        distanceBand: 'マイル',
        grade: 'G1',
      }),
      createTestPlan({
        id: 2,
        horseId: 10,
        horseName: '重複馬',
        country: '日',
        surface: '芝',
        distanceBand: '中距離',
        grade: 'G2',
      }),
    ];
    mockFindByYear.mockResolvedValue(duplicatePlans);

    const { RacePlanPage } = await import('./RacePlanPage');
    render(<RacePlanPage />);
    await screen.findByText('重複配置の警告', {}, { timeout: 3000 });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
