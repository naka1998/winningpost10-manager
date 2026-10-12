import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

const mockBreedingRecordService = {
  findAll: mockFindAll,
  create: mockCreate,
  update: mockUpdate,
  delete: mockDelete,
};

const mockHorseFindAll = vi.fn<() => Promise<Horse[]>>();
const mockHorseCreate = vi.fn();

const mockSettingsService = {
  getAll: vi.fn().mockResolvedValue({
    currentYear: 2026,
    pedigreeDepth: 4,
    rankSystem: [],
    dbVersion: 1,
  }),
  updateCurrentYear: vi.fn(),
  updatePedigreeDepth: vi.fn(),
};

// IMPORTANT: Return a stable object reference to prevent infinite re-renders
// from useCallback/useEffect dependency chains
const mockRepoContext = {
  horseRepository: { findAll: mockHorseFindAll, create: mockHorseCreate },
  breedingRecordRepository: { findAll: mockFindAll },
};

vi.mock('@/app/repository-context', () => ({
  useRepositoryContext: () => mockRepoContext,
}));

vi.mock('@/app/service-context', () => ({
  useServiceContext: () => ({
    breedingRecordService: mockBreedingRecordService,
    settingsService: mockSettingsService,
  }),
}));

const testRecords = [createTestRecord({ id: 1 }), createTestRecord({ id: 2, year: 2025 })];

const testHorses = [
  createTestHorse({ id: 10, name: 'テスト牝馬', sex: '牝', status: '繁殖牝馬' }),
  createTestHorse({ id: 11, name: '別牝馬', sex: '牝', status: '繁殖牝馬' }),
  createTestHorse({ id: 20, name: 'テスト種牡馬', sex: '牡', status: '種牡馬' }),
];

describe('useBreedingRecordListPage', () => {
  afterEach(() => {
    cleanup();
  });

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
    useBreedingRecordStore.setState({
      records: testRecords,
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

  async function renderAndFlush() {
    const { useBreedingRecordListPage } = await import('./useBreedingRecordListPage');
    return renderHook(() => useBreedingRecordListPage());
  }

  it('currentYearがsettingsから取得される', async () => {
    const { result } = await renderAndFlush();
    expect(result.current.currentYear).toBe(2026);
  });

  it('mares/stallionsがhorsesから正しくフィルタされる', async () => {
    const { result } = await renderAndFlush();
    // Wait for the initial load effect to populate horses
    await waitFor(() => {
      expect(result.current.mares.length).toBeGreaterThan(0);
    });
    expect(result.current.mares).toHaveLength(2);
    expect(result.current.stallions).toHaveLength(1);
    expect(result.current.mares[0].status).toBe('繁殖牝馬');
    expect(result.current.stallions[0].status).toBe('種牡馬');
  });

  it('handleCreateでeditTargetがnullになりダイアログが開く', async () => {
    const { result } = await renderAndFlush();
    act(() => {
      result.current.handleCreate();
    });
    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.editTarget).toBeNull();
  });

  it('handleEditで対象レコードがセットされダイアログが開く', async () => {
    const record = createTestRecord({ id: 5 });
    const { result } = await renderAndFlush();
    act(() => {
      result.current.handleEdit(record);
    });
    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.editTarget).toBe(record);
  });

  it('handleDeleteで対象レコードが削除されdeleteTargetがクリアされる', async () => {
    const record = createTestRecord({ id: 3 });
    const { result } = await renderAndFlush();
    act(() => {
      result.current.setDeleteTarget(record);
    });
    expect(result.current.deleteTarget).toBe(record);

    await act(async () => {
      await result.current.handleDelete();
    });
    expect(mockDelete).toHaveBeenCalledWith(3);
    expect(result.current.deleteTarget).toBeNull();
  });

  it('handleFilterChangeでフィルタが更新される', async () => {
    const { result } = await renderAndFlush();
    act(() => {
      result.current.handleFilterChange('year', '2025');
    });
    expect(useBreedingRecordStore.getState().filter.year).toBe(2025);
  });

  it('handleFilterChangeで空文字がundefinedに変換される', async () => {
    useBreedingRecordStore.setState({ filter: { year: 2025 } });
    const { result } = await renderAndFlush();
    act(() => {
      result.current.handleFilterChange('year', '');
    });
    expect(useBreedingRecordStore.getState().filter.year).toBeUndefined();
  });

  it('handleSubmitで新規種牡馬を自動登録する', async () => {
    const { result } = await renderAndFlush();
    await act(async () => {
      await result.current.handleSubmit({
        mareId: 10,
        sireId: 0,
        sireName: '新規種牡馬',
        year: 2026,
      });
    });
    expect(mockHorseCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: '新規種牡馬', status: '種牡馬' }),
    );
    expect(mockCreate).toHaveBeenCalled();
  });
});
