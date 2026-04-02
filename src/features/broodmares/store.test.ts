import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBroodmareStore } from './store';
import type { BroodmareRepository } from './repository';
import type { BroodmareSummary, BroodmareOffspring, LineageDistribution } from './types';

function createMockSummary(overrides: Partial<BroodmareSummary> = {}): BroodmareSummary {
  return {
    id: 1,
    name: 'テスト繁殖牝馬',
    birthYear: 2015,
    age: 12,
    breedingStartYear: 2020,
    offspringCount: 3,
    activeOffspringCount: 2,
    bestGrade: 'G1',
    ...overrides,
  };
}

function createMockOffspring(overrides: Partial<BroodmareOffspring> = {}): BroodmareOffspring {
  return {
    id: 10,
    name: 'テスト産駒',
    birthYear: 2021,
    sex: '牡',
    status: '現役',
    sireName: 'テスト種牡馬',
    bestGrade: 'G2',
    ...overrides,
  };
}

function createMockRepo(
  summaries: BroodmareSummary[] = [createMockSummary()],
): BroodmareRepository {
  return {
    findAllSummaries: vi.fn().mockResolvedValue(summaries),
    findOffspring: vi.fn().mockResolvedValue([createMockOffspring()]),
    getSireLineDistribution: vi
      .fn()
      .mockResolvedValue([{ name: 'SS系', count: 3 }] as LineageDistribution[]),
    getDamLineDistribution: vi
      .fn()
      .mockResolvedValue([{ name: 'フロリースカップ系', count: 2 }] as LineageDistribution[]),
    getStallionDistribution: vi
      .fn()
      .mockResolvedValue([{ name: 'ディープ', count: 5 }] as LineageDistribution[]),
  };
}

describe('useBroodmareStore', () => {
  beforeEach(() => {
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
  });

  describe('loadSummaries', () => {
    it('loads summaries from repository', async () => {
      const summaries = [
        createMockSummary({ id: 1, name: '牝馬A' }),
        createMockSummary({ id: 2, name: '牝馬B' }),
      ];
      const repo = createMockRepo(summaries);

      await useBroodmareStore.getState().loadSummaries(repo, 2026);

      const state = useBroodmareStore.getState();
      expect(state.summaries).toHaveLength(2);
      expect(state.summaries[0].name).toBe('牝馬A');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets isLoading during fetch', async () => {
      let resolve: (value: BroodmareSummary[]) => void;
      const pending = new Promise<BroodmareSummary[]>((r) => {
        resolve = r;
      });
      const repo = createMockRepo();
      repo.findAllSummaries = vi.fn().mockReturnValue(pending);

      const loadPromise = useBroodmareStore.getState().loadSummaries(repo, 2026);
      expect(useBroodmareStore.getState().isLoading).toBe(true);

      resolve!([createMockSummary()]);
      await loadPromise;
      expect(useBroodmareStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      const repo = createMockRepo();
      repo.findAllSummaries = vi.fn().mockRejectedValue(new Error('DB error'));

      await useBroodmareStore.getState().loadSummaries(repo, 2026);

      const state = useBroodmareStore.getState();
      expect(state.error).toBe('DB error');
      expect(state.isLoading).toBe(false);
    });

    it('passes current filter to repository', async () => {
      const repo = createMockRepo();
      useBroodmareStore.setState({ filter: { sortBy: 'offspringCount', sortOrder: 'desc' } });

      await useBroodmareStore.getState().loadSummaries(repo, 2026);

      expect(repo.findAllSummaries).toHaveBeenCalledWith(2026, {
        sortBy: 'offspringCount',
        sortOrder: 'desc',
      });
    });
  });

  describe('loadOffspring', () => {
    it('loads offspring for a mare', async () => {
      const repo = createMockRepo();
      const offspring = [createMockOffspring({ id: 10, name: '産駒A' })];
      repo.findOffspring = vi.fn().mockResolvedValue(offspring);

      await useBroodmareStore.getState().loadOffspring(repo, 5);

      const state = useBroodmareStore.getState();
      expect(state.offspring[5]).toHaveLength(1);
      expect(state.offspring[5][0].name).toBe('産駒A');
      expect(repo.findOffspring).toHaveBeenCalledWith(5);
    });
  });

  describe('loadDistributions', () => {
    it('loads all three distributions', async () => {
      const repo = createMockRepo();

      await useBroodmareStore.getState().loadDistributions(repo);

      const state = useBroodmareStore.getState();
      expect(state.sireLineDistribution).toEqual([{ name: 'SS系', count: 3 }]);
      expect(state.damLineDistribution).toEqual([{ name: 'フロリースカップ系', count: 2 }]);
      expect(state.stallionDistribution).toEqual([{ name: 'ディープ', count: 5 }]);
    });
  });

  describe('setFilter', () => {
    it('updates filter partially', () => {
      useBroodmareStore.getState().setFilter({ sortBy: 'name' });
      expect(useBroodmareStore.getState().filter).toEqual({ sortBy: 'name' });

      useBroodmareStore.getState().setFilter({ sortOrder: 'desc' });
      expect(useBroodmareStore.getState().filter).toEqual({ sortBy: 'name', sortOrder: 'desc' });
    });
  });
});
