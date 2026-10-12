import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHorseStore } from '../store';
import { useLineageStore } from '@/features/lineages/store';
import type { Horse } from '../types';
import type { LineageNode } from '@/features/lineages/types';

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
    lineageId: 10,
    factors: ['スピード'],
    notes: null,
    createdAt: '2026-01-01 00:00:00',
    updatedAt: '2026-01-01 00:00:00',
    ...overrides,
  };
}

function createTestHierarchy(): LineageNode[] {
  return [
    {
      id: 1,
      name: 'ノーザンダンサー系',
      lineageType: 'parent',
      parentLineageId: null,
      spStType: null,
      notes: null,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      children: [
        {
          id: 10,
          name: 'リファール系',
          lineageType: 'child',
          parentLineageId: 1,
          spStType: 'SP',
          notes: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          children: [],
        },
      ],
    },
  ];
}

const mockHorseService = {
  findAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockLineageService = {
  getHierarchy: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

vi.mock('@/app/service-context', () => ({
  useServiceContext: () => ({
    horseService: mockHorseService,
    lineageService: mockLineageService,
  }),
}));

describe('useHorseListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHorseService.findAll.mockResolvedValue([]);
    mockHorseService.create.mockResolvedValue(createTestHorse({ id: 100 }));
    mockHorseService.update.mockResolvedValue(createTestHorse({ id: 1 }));
    mockHorseService.delete.mockResolvedValue(undefined);
    mockLineageService.getHierarchy.mockResolvedValue(createTestHierarchy());
    useHorseStore.setState({
      horses: [],
      isLoading: false,
      error: null,
      filter: { status: '現役' },
    });
    useLineageStore.setState({
      hierarchy: createTestHierarchy(),
      parentLineages: [],
      isLoading: false,
      error: null,
      searchQuery: '',
    });
  });

  async function renderUseHorseListPage() {
    const { useHorseListPage } = await import('./useHorseListPage');
    return renderHook(() => useHorseListPage());
  }

  it('allLineagesがhierarchyからフラット化される', async () => {
    const { result } = await renderUseHorseListPage();
    expect(result.current.allLineages).toHaveLength(2);
    expect(result.current.allLineages[0].name).toBe('ノーザンダンサー系');
    expect(result.current.allLineages[1].name).toBe('リファール系');
  });

  it('lineageMapがid→name変換を提供する', async () => {
    const { result } = await renderUseHorseListPage();
    expect(result.current.lineageMap.get(1)).toBe('ノーザンダンサー系');
    expect(result.current.lineageMap.get(10)).toBe('リファール系');
  });

  it('currentTabがフィルタ状態から正しく計算される', async () => {
    const { result } = await renderUseHorseListPage();
    // デフォルトは「現役」
    expect(result.current.currentTab).toBe('active');
  });

  it('currentTabが引退タブを正しく判定する', async () => {
    useHorseStore.setState({
      filter: { statuses: ['引退', '種牡馬', '繁殖牝馬', '売却済'] },
    });
    const { result } = await renderUseHorseListPage();
    expect(result.current.currentTab).toBe('retired');
  });

  it('handleCreateでeditTargetがnullになりダイアログが開く', async () => {
    const { result } = await renderUseHorseListPage();
    act(() => {
      result.current.handleCreate();
    });
    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.editTarget).toBeNull();
  });

  it('handleEditで対象馬がセットされダイアログが開く', async () => {
    const horse = createTestHorse({ id: 5, name: 'テスト馬5' });
    const { result } = await renderUseHorseListPage();
    act(() => {
      result.current.handleEdit(horse);
    });
    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.editTarget).toBe(horse);
  });

  it('handleSubmitで新規作成時にcreateHorseが呼ばれる', async () => {
    const { result } = await renderUseHorseListPage();
    await act(async () => {
      await result.current.handleSubmit({ name: '新しい馬', sex: '牡', birthYear: 2023 });
    });
    expect(mockHorseService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: '新しい馬' }),
    );
  });

  it('handleSubmitで更新時にupdateHorseが呼ばれる', async () => {
    const { result } = await renderUseHorseListPage();
    await act(async () => {
      await result.current.handleSubmit({ id: 1, name: '更新馬名' });
    });
    expect(mockHorseService.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: '更新馬名' }),
    );
  });

  it('handleDeleteで対象馬が削除されdeleteTargetがクリアされる', async () => {
    const horse = createTestHorse({ id: 3 });
    const { result } = await renderUseHorseListPage();
    act(() => {
      result.current.setDeleteTarget(horse);
    });
    expect(result.current.deleteTarget).toBe(horse);

    await act(async () => {
      await result.current.handleDelete();
    });
    expect(mockHorseService.delete).toHaveBeenCalledWith(3);
    expect(result.current.deleteTarget).toBeNull();
  });

  it('handleTabChangeでフィルタが更新される', async () => {
    const { result } = await renderUseHorseListPage();
    act(() => {
      result.current.handleTabChange('stallion');
    });
    expect(useHorseStore.getState().filter.status).toBe('種牡馬');
  });

  it('handleFilterChangeで数値フィルタが変換される', async () => {
    const { result } = await renderUseHorseListPage();
    act(() => {
      result.current.handleFilterChange('birthYearFrom', '2010');
    });
    expect(useHorseStore.getState().filter.birthYearFrom).toBe(2010);
  });

  it('handleFilterChangeで空文字がundefinedに変換される', async () => {
    useHorseStore.setState({ filter: { status: '現役', sex: '牡' } });
    const { result } = await renderUseHorseListPage();
    act(() => {
      result.current.handleFilterChange('sex', '');
    });
    expect(useHorseStore.getState().filter.sex).toBeUndefined();
  });
});
