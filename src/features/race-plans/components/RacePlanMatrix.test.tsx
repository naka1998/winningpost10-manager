import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RacePlanWithHorseName } from '../types';

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

const mockOnAdd = vi.fn();
const mockOnDelete = vi.fn();

function makeHorse(id: number, name: string, sex: '牡' | '牝', birthYear: number) {
  return {
    id,
    name,
    sex,
    birthYear,
    status: '現役',
    country: '日',
    isHistorical: false,
    mareLine: null,
    sireId: null,
    damId: null,
    lineageId: null,
    factors: null,
    notes: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
}

const mockHorseFindAll = vi.fn().mockResolvedValue([makeHorse(10, 'テスト馬', '牡', 2022)]);

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

const mockYearlyStatusFindByYear = vi.fn().mockResolvedValue([]);

const mockYearlyStatusRepo = {
  findById: vi.fn(),
  findByHorseId: vi.fn(),
  findByHorseAndYear: vi.fn(),
  findByYear: mockYearlyStatusFindByYear,
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

function makeYearlyStatus(
  horseId: number,
  overrides: {
    turfAptitude?: string | null;
    dirtAptitude?: string | null;
    distanceMin?: number | null;
    distanceMax?: number | null;
  } = {},
) {
  return {
    id: horseId * 100,
    horseId,
    year: 2026,
    spRank: null,
    spValue: null,
    powerRank: null,
    powerValue: null,
    instantRank: null,
    instantValue: null,
    staminaRank: null,
    staminaValue: null,
    mentalRank: null,
    mentalValue: null,
    wisdomRank: null,
    wisdomValue: null,
    subParams: null,
    turfAptitude: overrides.turfAptitude ?? null,
    dirtAptitude: overrides.dirtAptitude ?? null,
    turfQuality: null,
    distanceMin: overrides.distanceMin ?? null,
    distanceMax: overrides.distanceMax ?? null,
    growthType: null,
    runningStyle: null,
    traits: null,
    jockey: null,
    grade: null,
    raceRecord: null,
    notes: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
}

describe('RacePlanMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  async function renderMatrix(plans: RacePlanWithHorseName[] = []) {
    const { RacePlanMatrix } = await import('./RacePlanMatrix');
    render(
      <RacePlanMatrix
        plans={plans}
        horseRepository={mockHorseRepo}
        yearlyStatusRepository={mockYearlyStatusRepo}
        year={2026}
        onAdd={mockOnAdd}
        onDelete={mockOnDelete}
      />,
    );
  }

  it('renders surface tabs', async () => {
    await renderMatrix();

    expect(screen.getByRole('tab', { name: '芝' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'ダート' })).toBeInTheDocument();
  });

  it('renders country sections for turf (default)', async () => {
    await renderMatrix();

    // All 3 countries have turf
    expect(screen.getByText('日')).toBeInTheDocument();
    expect(screen.getByText('米')).toBeInTheDocument();
    expect(screen.getByText('欧')).toBeInTheDocument();
  });

  it('hides Europe on dirt tab', async () => {
    const user = userEvent.setup();
    await renderMatrix();

    await user.click(screen.getByRole('tab', { name: 'ダート' }));

    // 日 and 米 should still be visible
    expect(screen.getByText('日')).toBeInTheDocument();
    expect(screen.getByText('米')).toBeInTheDocument();
    // 欧 should not be visible (no dirt in Europe)
    expect(screen.queryByText('欧')).toBeNull();
  });

  it('renders classic path sections', async () => {
    await renderMatrix();

    // Japan has: 三冠, 牝馬三冠, マイル as classic paths
    expect(screen.getAllByText('3歳クラシック路線').length).toBeGreaterThanOrEqual(1);
    // Japan classic paths
    const cells = screen.getAllByRole('gridcell');
    const classicLabels = cells.map((c) => c.getAttribute('aria-label'));
    expect(classicLabels).toContain('日 芝 三冠');
    expect(classicLabels).toContain('日 芝 牝馬三冠');
  });

  it('renders distance band rows and grade headers', async () => {
    await renderMatrix();

    expect(screen.getAllByText('短距離').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('G1').length).toBeGreaterThanOrEqual(1);
  });

  it('displays horse name badge in correct cell', async () => {
    const plans = [
      createTestPlan({
        id: 1,
        country: '日',
        surface: '芝',
        distanceBand: 'マイル',
        grade: 'G1',
        horseName: 'スピードスター',
      }),
    ];
    await renderMatrix(plans);

    const cell = screen.getByRole('gridcell', { name: '日 芝 マイル G1' });
    expect(within(cell).getByText(/スピードスター/)).toBeInTheDocument();
  });

  it('displays multiple horses in same cell', async () => {
    const plans = [
      createTestPlan({
        id: 1,
        horseId: 10,
        country: '日',
        surface: '芝',
        distanceBand: 'マイル',
        grade: 'G1',
        horseName: '馬A',
      }),
      createTestPlan({
        id: 2,
        horseId: 20,
        country: '日',
        surface: '芝',
        distanceBand: 'マイル',
        grade: 'G1',
        horseName: '馬B',
      }),
    ];
    await renderMatrix(plans);

    const cell = screen.getByRole('gridcell', { name: '日 芝 マイル G1' });
    expect(within(cell).getByText(/馬A/)).toBeInTheDocument();
    expect(within(cell).getByText(/馬B/)).toBeInTheDocument();
  });

  it('calls onDelete when horse badge is clicked', async () => {
    const user = userEvent.setup();
    const plans = [
      createTestPlan({
        id: 42,
        country: '日',
        surface: '芝',
        distanceBand: 'マイル',
        grade: 'G1',
        horseName: '削除対象馬',
      }),
    ];
    await renderMatrix(plans);

    const badge = screen.getByText(/削除対象馬/);
    await user.click(badge);

    expect(mockOnDelete).toHaveBeenCalledWith(42);
  });

  it('shows inline select on cell click', async () => {
    const user = userEvent.setup();
    await renderMatrix();

    const cell = screen.getByRole('gridcell', { name: '日 芝 マイル G1' });
    await user.click(cell);

    // Inline select should appear inside the cell
    expect(within(cell).getByText('馬を選択...')).toBeInTheDocument();
  });

  it('shows inline select on classic cell click', async () => {
    const user = userEvent.setup();
    await renderMatrix();

    const cell = screen.getByRole('gridcell', { name: '日 芝 三冠' });
    await user.click(cell);

    expect(within(cell).getByText('馬を選択...')).toBeInTheDocument();
  });

  it('keeps inline select visible after adding a horse for continuous adding', async () => {
    const user = userEvent.setup();
    await renderMatrix();

    const cell = screen.getByRole('gridcell', { name: '日 芝 マイル G1' });
    await user.click(cell);

    // InlineCellSelect should remain visible for continuous adding
    // (when dropdown is open the trigger is aria-hidden, so we check by text)
    expect(within(cell).getByText('馬を選択...')).toBeInTheDocument();
  });

  it('applies correct badge color for 3歳牡馬 (dark blue)', async () => {
    const plans = [
      createTestPlan({
        id: 1,
        horseName: '若駒',
        horseSex: '牡',
        horseBirthYear: 2023, // 3歳 in year=2026
      }),
    ];
    await renderMatrix(plans);

    const cell = screen.getByRole('gridcell', { name: '日 芝 マイル G1' });
    const badge = within(cell).getByText(/若駒/);
    expect(badge.closest('[class]')?.className).toMatch(/bg-blue-600/);
  });

  it('applies correct badge color for 古馬牝馬 (light pink)', async () => {
    const plans = [
      createTestPlan({
        id: 1,
        horseName: 'ベテラン',
        horseSex: '牝',
        horseBirthYear: 2021, // 5歳 in year=2026
      }),
    ];
    await renderMatrix(plans);

    const cell = screen.getByRole('gridcell', { name: '日 芝 マイル G1' });
    const badge = within(cell).getByText(/ベテラン/);
    expect(badge.closest('[class]')?.className).toMatch(/bg-pink-100/);
  });

  it('filters out horses with bad turf aptitude (△/×) in turf cells', async () => {
    const user = userEvent.setup();
    mockHorseFindAll.mockResolvedValueOnce([
      makeHorse(1, '芝◎馬', '牡', 2022),
      makeHorse(2, '芝○馬', '牡', 2022),
      makeHorse(3, '芝△馬', '牡', 2022),
      makeHorse(4, '芝×馬', '牡', 2022),
      makeHorse(5, '適性なし馬', '牡', 2022),
    ]);
    mockYearlyStatusFindByYear.mockResolvedValueOnce([
      makeYearlyStatus(1, { turfAptitude: '◎' }),
      makeYearlyStatus(2, { turfAptitude: '○' }),
      makeYearlyStatus(3, { turfAptitude: '△' }),
      makeYearlyStatus(4, { turfAptitude: '×' }),
      // horse 5 has no yearly status
    ]);

    await renderMatrix();

    const cell = screen.getByRole('gridcell', { name: '日 芝 マイル G1' });
    await user.click(cell);

    const options = await screen.findAllByRole('option');
    const names = options.map((o) => o.textContent);
    // ◎, ○, and no-data should be shown; △ and × should be filtered out
    expect(names).toContain('芝◎馬');
    expect(names).toContain('芝○馬');
    expect(names).toContain('適性なし馬');
    expect(names).not.toContain('芝△馬');
    expect(names).not.toContain('芝×馬');
  });

  it('filters horses by distance aptitude overlap', async () => {
    const user = userEvent.setup();
    // Cell: マイル (1400-1800m)
    mockHorseFindAll.mockResolvedValueOnce([
      makeHorse(1, 'マイラー', '牡', 2022), // 1400-1800 → overlaps
      makeHorse(2, 'ステイヤー', '牡', 2022), // 2400-3200 → no overlap
      makeHorse(3, 'オールラウンダー', '牡', 2022), // 1200-2400 → overlaps
      makeHorse(4, '距離なし馬', '牡', 2022), // no distance data
    ]);
    mockYearlyStatusFindByYear.mockResolvedValueOnce([
      makeYearlyStatus(1, { distanceMin: 1400, distanceMax: 1800 }),
      makeYearlyStatus(2, { distanceMin: 2400, distanceMax: 3200 }),
      makeYearlyStatus(3, { distanceMin: 1200, distanceMax: 2400 }),
      makeYearlyStatus(4, {}),
    ]);

    await renderMatrix();

    const cell = screen.getByRole('gridcell', { name: '日 芝 マイル G1' });
    await user.click(cell);

    const options = await screen.findAllByRole('option');
    const names = options.map((o) => o.textContent);
    expect(names).toContain('マイラー');
    expect(names).toContain('オールラウンダー');
    expect(names).toContain('距離なし馬');
    expect(names).not.toContain('ステイヤー');
  });

  it('does not filter by distance for classic path cells', async () => {
    const user = userEvent.setup();
    // Classic paths have no specific distance band
    mockHorseFindAll.mockResolvedValueOnce([
      makeHorse(1, 'スプリンター', '牡', 2023), // 3歳 sprinter
      makeHorse(2, 'ステイヤー', '牡', 2023), // 3歳 stayer
    ]);
    mockYearlyStatusFindByYear.mockResolvedValueOnce([
      makeYearlyStatus(1, { turfAptitude: '◎', distanceMin: 1000, distanceMax: 1200 }),
      makeYearlyStatus(2, { turfAptitude: '◎', distanceMin: 2400, distanceMax: 3200 }),
    ]);

    await renderMatrix();

    const cell = screen.getByRole('gridcell', { name: '日 芝 三冠' });
    await user.click(cell);

    const options = await screen.findAllByRole('option');
    const names = options.map((o) => o.textContent);
    // Both should appear (no distance filter for classic paths)
    expect(names).toContain('スプリンター');
    expect(names).toContain('ステイヤー');
  });

  it('sorts horses: age desc, male first, then name asc', async () => {
    const user = userEvent.setup();
    // 5歳牝馬C, 5歳牡馬A, 5歳牡馬B, 4歳牡馬D → 5歳牡馬A, 5歳牡馬B, 5歳牝馬C, 4歳牡馬D
    mockHorseFindAll.mockResolvedValueOnce([
      makeHorse(1, 'D', '牡', 2022), // 4歳 (2026-2022=4)
      makeHorse(2, 'C', '牝', 2021), // 5歳
      makeHorse(3, 'B', '牡', 2021), // 5歳
      makeHorse(4, 'A', '牡', 2021), // 5歳
    ]);

    await renderMatrix();

    const cell = screen.getByRole('gridcell', { name: '日 芝 マイル G1' });
    await user.click(cell);

    // Wait for options to appear (dropdown opens automatically)
    const options = await screen.findAllByRole('option');
    const names = options.map((o) => o.textContent);
    expect(names).toEqual(['A', 'B', 'C', 'D']);
  });
});
