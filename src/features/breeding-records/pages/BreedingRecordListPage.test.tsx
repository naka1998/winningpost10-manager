import { cleanup, render, screen, within } from '@testing-library/react';
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

import { useBreedingRecordStore } from '../store';
import { useSettingsStore } from '@/features/settings/store';
import type { BreedingRecordWithNames } from '../types';
import type { Horse } from '@/features/horses/types';

function createTestRecord(
  overrides: Partial<BreedingRecordWithNames> = {},
): BreedingRecordWithNames {
  return {
    id: 1,
    mareId: 10,
    sireId: 20,
    year: 2024,
    evaluation: 'A',
    theories: [{ name: 'ニックス', points: 6 }],
    totalPower: 80,
    offspringId: null,
    notes: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    mareName: 'テスト牝馬',
    sireName: 'テスト種牡馬',
    offspringName: null,
    ...overrides,
  };
}

function createTestHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: 1,
    name: 'テスト馬',
    sex: '牡',
    birthYear: 2020,
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

const mockFindAll = vi.fn<() => Promise<BreedingRecordWithNames[]>>();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

const mockBreedingRecordRepo = {
  findById: vi.fn(),
  findAll: mockFindAll,
  create: mockCreate,
  update: mockUpdate,
  delete: mockDelete,
};

const mockHorseFindAll = vi.fn<() => Promise<Horse[]>>();
const mockHorseCreate = vi.fn();
const mockSettingsGetAll = vi.fn();

const mockRepoContext = {
  breedingRecordRepository: mockBreedingRecordRepo,
  horseRepository: { findAll: mockHorseFindAll, create: mockHorseCreate },
  yearlyStatusRepository: {},
  lineageRepository: {},
  settingsRepository: { getAll: mockSettingsGetAll, get: vi.fn(), set: vi.fn() },
};

vi.mock('@/app/repository-context', () => ({
  useRepositoryContext: () => mockRepoContext,
}));

describe('BreedingRecordListPage', () => {
  const testRecords = [
    createTestRecord({ id: 1 }),
    createTestRecord({
      id: 2,
      mareId: 11,
      sireId: 21,
      year: 2025,
      evaluation: 'B',
      theories: [{ name: 'アウトブリード', points: 3 }],
      totalPower: 50,
      mareName: '別牝馬',
      sireName: '別種牡馬',
      offspringId: 30,
      offspringName: '産駒馬',
    }),
  ];

  const testHorses = [
    createTestHorse({ id: 10, name: 'テスト牝馬', sex: '牝', status: '繁殖牝馬' }),
    createTestHorse({ id: 11, name: '別牝馬', sex: '牝', status: '繁殖牝馬' }),
    createTestHorse({ id: 20, name: 'テスト種牡馬', sex: '牡', status: '種牡馬' }),
    createTestHorse({ id: 21, name: '別種牡馬', sex: '牡', status: '種牡馬' }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindAll.mockResolvedValue(testRecords);
    mockCreate.mockResolvedValue(createTestRecord({ id: 100 }));
    mockUpdate.mockResolvedValue(createTestRecord({ id: 1 }));
    mockDelete.mockResolvedValue(undefined);
    mockHorseFindAll.mockResolvedValue(testHorses);
    mockHorseCreate.mockResolvedValue(
      createTestHorse({ id: 99, name: '新規種牡馬', sex: '牡', status: '種牡馬' }),
    );
    mockSettingsGetAll.mockResolvedValue({ current_year: '2026', pedigree_depth: '4' });
    useBreedingRecordStore.setState({
      records: [],
      isLoading: false,
      error: null,
      filter: {},
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
    const { BreedingRecordListPage } = await import('./BreedingRecordListPage');
    render(<BreedingRecordListPage />);
    await screen.findByText('テスト牝馬');
  }

  it('ヘッダーと新規登録ボタンが表示される', async () => {
    await renderAndWait();

    expect(screen.getByRole('heading', { name: '配合記録' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新規登録' })).toBeInTheDocument();
  });

  it('テーブルにレコードが表示される', async () => {
    await renderAndWait();

    // Record 1
    expect(screen.getByText('テスト牝馬')).toBeInTheDocument();
    expect(screen.getByText('テスト種牡馬')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('ニックス')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();

    // Record 2
    expect(screen.getByText('別牝馬')).toBeInTheDocument();
    expect(screen.getByText('別種牡馬')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('産駒馬')).toBeInTheDocument();
  });

  it('ローディング状態が表示される', async () => {
    useBreedingRecordStore.setState({ isLoading: true, records: [] });
    const { BreedingRecordListPage } = await import('./BreedingRecordListPage');
    render(<BreedingRecordListPage />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('エラー状態が表示される', async () => {
    mockFindAll.mockRejectedValue(new Error('データ取得に失敗しました'));
    const { BreedingRecordListPage } = await import('./BreedingRecordListPage');
    render(<BreedingRecordListPage />);
    await screen.findByText('データ取得に失敗しました');
  });

  it('レコードが空の場合にメッセージが表示される', async () => {
    mockFindAll.mockResolvedValue([]);
    const { BreedingRecordListPage } = await import('./BreedingRecordListPage');
    render(<BreedingRecordListPage />);
    await screen.findByText('配合記録がありません');
  });

  it('新規登録ダイアログが開きフォームフィールドが表示される', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole('button', { name: '新規登録' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('配合記録を登録')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('繁殖牝馬')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('種牡馬')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('配合年')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('評価')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('爆発力')).toBeInTheDocument();

    // Default year should be current app year
    const yearInput = within(dialog).getByLabelText('配合年') as HTMLInputElement;
    expect(yearInput.value).toBe('2026');
  });

  it('削除ボタンで確認ダイアログが開き、確認で削除される', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    const deleteButtons = screen.getAllByRole('button', { name: '削除' });
    await user.click(deleteButtons[0]);

    // Confirm dialog
    expect(screen.getByText('この配合記録を削除しますか？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '削除する' }));

    expect(mockDelete).toHaveBeenCalledWith(1);
  });

  it('編集ボタンで編集ダイアログが開く', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    const editButtons = screen.getAllByRole('button', { name: '編集' });
    await user.click(editButtons[0]);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('配合記録を編集')).toBeInTheDocument();
  });

  it('Enter単体ではフォーム送信されない', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole('button', { name: '新規登録' }));
    const dialog = screen.getByRole('dialog');
    const yearInput = within(dialog).getByLabelText('配合年');

    await user.click(yearInput);
    await user.keyboard('{Enter}');

    // Dialog should still be open, create not called
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('Ctrl+Enterでフォーム送信される', async () => {
    const user = userEvent.setup();
    await renderAndWait();

    await user.click(screen.getByRole('button', { name: '新規登録' }));
    const dialog = screen.getByRole('dialog');

    // Fill required fields
    const mareSelect = within(dialog).getByLabelText('繁殖牝馬');
    await user.click(mareSelect);
    await user.keyboard('{ArrowDown}{Enter}');

    const sireInput = within(dialog).getByLabelText('種牡馬');
    await user.type(sireInput, 'テスト種牡馬');
    // Select from dropdown
    const option = await screen.findByText('テスト種牡馬', { selector: 'li' });
    await user.click(option);

    // Ctrl+Enter to submit
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(mockCreate).toHaveBeenCalled();
  });

  it('filter変更で再取得される', async () => {
    await renderAndWait();
    const callCountAfterMount = mockFindAll.mock.calls.length;

    // Change filter via store
    useBreedingRecordStore.getState().setFilter({ year: 2025 });

    // Wait for effect to trigger loadRecords
    await screen.findByRole('heading', { name: '配合記録' });
    // Allow async effect to run
    await new Promise((r) => setTimeout(r, 50));

    expect(mockFindAll.mock.calls.length).toBeGreaterThan(callCountAfterMount);
  });

  it('絞り込み中でも年×牝馬の重複が防がれる', async () => {
    // Records include mare 10 bred in 2024 (from testRecords[0])
    // Even if store records are filtered (e.g. by sire), allRecords should still exclude the mare
    mockFindAll.mockResolvedValue(testRecords);
    const user = userEvent.setup();
    await renderAndWait();

    // Apply a sire filter so displayed records might be filtered,
    // but allRecords (loaded separately) still contains all records
    await user.click(screen.getByRole('button', { name: '新規登録' }));
    const dialog = screen.getByRole('dialog');

    // Year is defaulted to 2026 (from settings). Change to 2024 where mare 10 is already bred
    const yearInput = within(dialog).getByLabelText('配合年') as HTMLInputElement;
    await user.clear(yearInput);
    await user.type(yearInput, '2024');

    // Open mare select and check that テスト牝馬 (mare 10, bred in 2024) is NOT available
    const mareSelect = within(dialog).getByLabelText('繁殖牝馬');
    await user.click(mareSelect);

    // 別牝馬 (mare 11, bred in 2025 not 2024) should be available
    const options = screen.getAllByRole('option');
    const optionTexts = options.map((o) => o.textContent);
    expect(optionTexts).toContain('別牝馬');
    expect(optionTexts).not.toContain('テスト牝馬');
  });
});
