import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLineageStore, filterHierarchy } from './store';
import type { LineageRepository } from './repository';
import type { Lineage, LineageNode } from './types';

function createMockLineage(overrides: Partial<Lineage> = {}): Lineage {
  return {
    id: 1,
    name: 'テスト系',
    lineageType: 'parent',
    parentLineageId: null,
    spStType: null,
    notes: null,
    createdAt: '2026-01-01 00:00:00',
    updatedAt: '2026-01-01 00:00:00',
    ...overrides,
  };
}

function createMockHierarchy(): LineageNode[] {
  return [
    {
      ...createMockLineage({ id: 1, name: 'ノーザンダンサー系' }),
      children: [
        {
          ...createMockLineage({
            id: 10,
            name: 'リファール系',
            lineageType: 'child',
            parentLineageId: 1,
            spStType: 'SP',
          }),
          children: [],
        },
        {
          ...createMockLineage({
            id: 11,
            name: 'ニジンスキー系',
            lineageType: 'child',
            parentLineageId: 1,
            spStType: 'ST',
          }),
          children: [],
        },
      ],
    },
    {
      ...createMockLineage({ id: 2, name: 'サンデーサイレンス系' }),
      children: [
        {
          ...createMockLineage({
            id: 20,
            name: 'ディープインパクト系',
            lineageType: 'child',
            parentLineageId: 2,
            spStType: 'SP',
          }),
          children: [],
        },
      ],
    },
  ];
}

function createMockRepo(hierarchy: LineageNode[] = createMockHierarchy()): LineageRepository {
  return {
    findById: vi.fn(),
    findByName: vi.fn(),
    findAll: vi.fn(),
    getChildren: vi.fn(),
    getHierarchy: vi.fn().mockResolvedValue(hierarchy),
    create: vi.fn().mockResolvedValue(createMockLineage({ id: 100, name: '新規系統' })),
    update: vi
      .fn()
      .mockResolvedValue(createMockLineage({ id: 1, name: '更新系統', spStType: 'ST' })),
  };
}

describe('useLineageStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useLineageStore.setState({
      hierarchy: [],
      parentLineages: [],
      isLoading: false,
      error: null,
      searchQuery: '',
    });
  });

  describe('loadHierarchy', () => {
    it('loads hierarchy data from repository', async () => {
      const repo = createMockRepo();
      await useLineageStore.getState().loadHierarchy(repo);

      const state = useLineageStore.getState();
      expect(state.hierarchy).toHaveLength(2);
      expect(state.hierarchy[0].name).toBe('ノーザンダンサー系');
      expect(state.hierarchy[0].children).toHaveLength(2);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets isLoading during fetch', async () => {
      let resolveHierarchy: (value: LineageNode[]) => void;
      const pendingPromise = new Promise<LineageNode[]>((resolve) => {
        resolveHierarchy = resolve;
      });
      const repo = createMockRepo();
      repo.getHierarchy = vi.fn().mockReturnValue(pendingPromise);

      const loadPromise = useLineageStore.getState().loadHierarchy(repo);
      expect(useLineageStore.getState().isLoading).toBe(true);

      resolveHierarchy!(createMockHierarchy());
      await loadPromise;
      expect(useLineageStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      const repo = createMockRepo();
      repo.getHierarchy = vi.fn().mockRejectedValue(new Error('DB error'));

      await useLineageStore.getState().loadHierarchy(repo);

      const state = useLineageStore.getState();
      expect(state.error).toBe('DB error');
      expect(state.isLoading).toBe(false);
    });

    it('extracts parentLineages from hierarchy', async () => {
      const repo = createMockRepo();
      await useLineageStore.getState().loadHierarchy(repo);

      const state = useLineageStore.getState();
      expect(state.parentLineages).toHaveLength(2);
      expect(state.parentLineages[0].name).toBe('ノーザンダンサー系');
      expect(state.parentLineages[1].name).toBe('サンデーサイレンス系');
    });
  });

  describe('createLineage', () => {
    it('creates a lineage and reloads hierarchy', async () => {
      const repo = createMockRepo();
      await useLineageStore
        .getState()
        .createLineage(repo, { name: '新規系統', lineageType: 'parent' });

      expect(repo.create).toHaveBeenCalledWith({ name: '新規系統', lineageType: 'parent' });
      expect(repo.getHierarchy).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateLineage', () => {
    it('updates a lineage and reloads hierarchy', async () => {
      const repo = createMockRepo();
      await useLineageStore.getState().updateLineage(repo, 1, { spStType: 'ST' });

      expect(repo.update).toHaveBeenCalledWith(1, { spStType: 'ST' });
      expect(repo.getHierarchy).toHaveBeenCalledTimes(1);
    });
  });

  describe('setSearchQuery', () => {
    it('updates searchQuery', () => {
      useLineageStore.getState().setSearchQuery('ダンサー');
      expect(useLineageStore.getState().searchQuery).toBe('ダンサー');
    });
  });

  describe('filterHierarchy', () => {
    const hierarchy = createMockHierarchy();

    it('returns all hierarchy when searchQuery is empty', () => {
      const filtered = filterHierarchy(hierarchy, '');
      expect(filtered).toHaveLength(2);
    });

    it('filters by parent lineage name', () => {
      const filtered = filterHierarchy(hierarchy, 'ノーザンダンサー');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('ノーザンダンサー系');
    });

    it('filters by child lineage name and includes the parent', () => {
      const filtered = filterHierarchy(hierarchy, 'ディープ');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('サンデーサイレンス系');
      expect(filtered[0].children).toHaveLength(1);
      expect(filtered[0].children[0].name).toBe('ディープインパクト系');
    });

    it('filters children within a matching parent', () => {
      const filtered = filterHierarchy(hierarchy, 'リファール');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('ノーザンダンサー系');
      expect(filtered[0].children).toHaveLength(1);
      expect(filtered[0].children[0].name).toBe('リファール系');
    });

    it('returns empty when no match', () => {
      const filtered = filterHierarchy(hierarchy, '存在しない系統');
      expect(filtered).toHaveLength(0);
    });
  });
});
