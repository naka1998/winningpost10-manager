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
    distanceBand: 'マイル',
    grade: 'G1',
    notes: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    horseName: 'テスト馬',
    ...overrides,
  };
}

const mockOnAdd = vi.fn();
const mockOnDelete = vi.fn();
const mockHorseFindAll = vi.fn().mockResolvedValue([
  {
    id: 10,
    name: 'テスト馬',
    sex: '牡',
    birthYear: 2022,
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
  },
]);

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
        onAdd={mockOnAdd}
        onDelete={mockOnDelete}
      />,
    );
  }

  it('renders country sections', async () => {
    await renderMatrix();

    expect(screen.getByText('日')).toBeInTheDocument();
    expect(screen.getByText('米')).toBeInTheDocument();
    expect(screen.getByText('欧')).toBeInTheDocument();
  });

  it('renders distance band rows', async () => {
    await renderMatrix();

    expect(screen.getAllByText('短距離')).toHaveLength(3);
    expect(screen.getAllByText('マイル')).toHaveLength(3);
    expect(screen.getAllByText('中距離')).toHaveLength(3);
    expect(screen.getAllByText('中長距離')).toHaveLength(3);
    expect(screen.getAllByText('長距離')).toHaveLength(3);
  });

  it('renders grade column headers', async () => {
    await renderMatrix();

    expect(screen.getAllByText('G1')).toHaveLength(3);
    expect(screen.getAllByText('G2')).toHaveLength(3);
    expect(screen.getAllByText('G3')).toHaveLength(3);
    expect(screen.getAllByText('OP')).toHaveLength(3);
  });

  it('displays horse name badge in correct cell', async () => {
    const plans = [
      createTestPlan({
        id: 1,
        country: '日',
        distanceBand: 'マイル',
        grade: 'G1',
        horseName: 'スピードスター',
      }),
    ];
    await renderMatrix(plans);

    const cell = screen.getByRole('gridcell', { name: '日 マイル G1' });
    expect(within(cell).getByText(/スピードスター/)).toBeInTheDocument();
  });

  it('displays multiple horses in same cell', async () => {
    const plans = [
      createTestPlan({
        id: 1,
        horseId: 10,
        country: '日',
        distanceBand: 'マイル',
        grade: 'G1',
        horseName: '馬A',
      }),
      createTestPlan({
        id: 2,
        horseId: 20,
        country: '日',
        distanceBand: 'マイル',
        grade: 'G1',
        horseName: '馬B',
      }),
    ];
    await renderMatrix(plans);

    const cell = screen.getByRole('gridcell', { name: '日 マイル G1' });
    expect(within(cell).getByText(/馬A/)).toBeInTheDocument();
    expect(within(cell).getByText(/馬B/)).toBeInTheDocument();
  });

  it('calls onDelete when horse badge is clicked', async () => {
    const user = userEvent.setup();
    const plans = [
      createTestPlan({
        id: 42,
        country: '日',
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

  it('opens horse select dialog on cell click', async () => {
    const user = userEvent.setup();
    await renderMatrix();

    const cell = screen.getByRole('gridcell', { name: '日 マイル G1' });
    await user.click(cell);

    expect(screen.getByText(/馬を配置: 日 マイル G1/)).toBeInTheDocument();
  });
});
