import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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

function createTestHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: 1,
    name: 'テスト馬',
    sex: '牡',
    birthYear: 2023,
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

const mockOnSelect = vi.fn();
const mockOnOpenChange = vi.fn();
const mockHorseFindAll = vi.fn();

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

describe('HorseSelectDialog', () => {
  const allHorses = [
    createTestHorse({ id: 1, name: '3歳牡馬', sex: '牡', birthYear: 2023 }),
    createTestHorse({ id: 2, name: '3歳牝馬', sex: '牝', birthYear: 2023 }),
    createTestHorse({ id: 3, name: '4歳牡馬', sex: '牡', birthYear: 2022 }),
    createTestHorse({ id: 4, name: '4歳牝馬', sex: '牝', birthYear: 2022 }),
    createTestHorse({ id: 5, name: '5歳馬', sex: '牡', birthYear: 2021 }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockHorseFindAll.mockResolvedValue(allHorses);
  });

  afterEach(() => {
    cleanup();
  });

  async function renderDialog(
    props: {
      classicPath?: string | null;
      year?: number;
    } = {},
  ) {
    const { HorseSelectDialog } = await import('./HorseSelectDialog');
    render(
      <HorseSelectDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        horseRepository={mockHorseRepo}
        onSelect={mockOnSelect}
        cellLabel="テスト"
        classicPath={props.classicPath ?? null}
        year={props.year ?? 2026}
      />,
    );
    // Wait for horses to load
    await screen.findByText('馬を選択...');
  }

  it('通常セルでは全現役馬を表示する', async () => {
    await renderDialog();

    const trigger = screen.getByRole('combobox');
    const user = userEvent.setup();
    await user.click(trigger);

    // All 5 horses should be visible
    expect(screen.getByText('3歳牡馬')).toBeInTheDocument();
    expect(screen.getByText('3歳牝馬')).toBeInTheDocument();
    expect(screen.getByText('4歳牡馬')).toBeInTheDocument();
    expect(screen.getByText('4歳牝馬')).toBeInTheDocument();
    expect(screen.getByText('5歳馬')).toBeInTheDocument();
  });

  it('三冠路線では3歳馬のみ表示する', async () => {
    await renderDialog({ classicPath: '三冠', year: 2026 });

    const trigger = screen.getByRole('combobox');
    const user = userEvent.setup();
    await user.click(trigger);

    // Only 3-year-olds (birthYear 2023 for year 2026)
    expect(screen.getByText('3歳牡馬')).toBeInTheDocument();
    expect(screen.getByText('3歳牝馬')).toBeInTheDocument();
    expect(screen.queryByText('4歳牡馬')).toBeNull();
    expect(screen.queryByText('4歳牝馬')).toBeNull();
    expect(screen.queryByText('5歳馬')).toBeNull();
  });

  it('牝馬三冠路線では3歳牝馬のみ表示する', async () => {
    await renderDialog({ classicPath: '牝馬三冠', year: 2026 });

    const trigger = screen.getByRole('combobox');
    const user = userEvent.setup();
    await user.click(trigger);

    // Only 3-year-old fillies
    expect(screen.getByText('3歳牝馬')).toBeInTheDocument();
    expect(screen.queryByText('3歳牡馬')).toBeNull();
    expect(screen.queryByText('4歳牝馬')).toBeNull();
  });

  it('トリプルティアラ路線では3歳牝馬のみ表示する', async () => {
    await renderDialog({ classicPath: 'トリプルティアラ', year: 2026 });

    const trigger = screen.getByRole('combobox');
    const user = userEvent.setup();
    await user.click(trigger);

    expect(screen.getByText('3歳牝馬')).toBeInTheDocument();
    expect(screen.queryByText('3歳牡馬')).toBeNull();
  });

  it('マイル路線では3歳馬のみ表示する（牡牝問わず）', async () => {
    await renderDialog({ classicPath: 'マイル', year: 2026 });

    const trigger = screen.getByRole('combobox');
    const user = userEvent.setup();
    await user.click(trigger);

    expect(screen.getByText('3歳牡馬')).toBeInTheDocument();
    expect(screen.getByText('3歳牝馬')).toBeInTheDocument();
    expect(screen.queryByText('4歳牡馬')).toBeNull();
  });
});
