import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRacePlanStore } from './store';
import type { RacePlanRepository } from './repository';
import type { RacePlanWithHorseName } from './types';

function createMockPlan(overrides: Partial<RacePlanWithHorseName> = {}): RacePlanWithHorseName {
  return {
    id: 1,
    horseId: 10,
    year: 2026,
    country: '日',
    distanceBand: 'マイル',
    grade: 'G1',
    notes: null,
    createdAt: '2026-01-01 00:00:00',
    updatedAt: '2026-01-01 00:00:00',
    horseName: 'テスト馬',
    ...overrides,
  };
}

function createMockRepo(plans: RacePlanWithHorseName[] = [createMockPlan()]): RacePlanRepository {
  return {
    findById: vi.fn(),
    findAll: vi.fn().mockResolvedValue(plans),
    findByYear: vi.fn().mockResolvedValue(plans),
    create: vi.fn().mockResolvedValue(createMockPlan({ id: 100 })),
    update: vi.fn().mockResolvedValue(createMockPlan({ id: 1, grade: 'G2' })),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

describe('useRacePlanStore', () => {
  beforeEach(() => {
    useRacePlanStore.setState({
      plans: [],
      isLoading: false,
      error: null,
      year: 2026,
    });
  });

  describe('loadPlans', () => {
    it('loads plans from repository by year', async () => {
      const plans = [createMockPlan({ id: 1 }), createMockPlan({ id: 2, horseName: '別の馬' })];
      const repo = createMockRepo(plans);

      await useRacePlanStore.getState().loadPlans(repo);

      const state = useRacePlanStore.getState();
      expect(state.plans).toHaveLength(2);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(repo.findByYear).toHaveBeenCalledWith(2026);
    });

    it('sets isLoading during fetch', async () => {
      let resolvePlans: (value: RacePlanWithHorseName[]) => void;
      const pendingPromise = new Promise<RacePlanWithHorseName[]>((resolve) => {
        resolvePlans = resolve;
      });
      const repo = createMockRepo();
      repo.findByYear = vi.fn().mockReturnValue(pendingPromise);

      const loadPromise = useRacePlanStore.getState().loadPlans(repo);
      expect(useRacePlanStore.getState().isLoading).toBe(true);

      resolvePlans!([createMockPlan()]);
      await loadPromise;
      expect(useRacePlanStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      const repo = createMockRepo();
      repo.findByYear = vi.fn().mockRejectedValue(new Error('DB error'));

      await useRacePlanStore.getState().loadPlans(repo);

      const state = useRacePlanStore.getState();
      expect(state.error).toBe('DB error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('createPlan', () => {
    it('creates a plan and reloads list', async () => {
      const repo = createMockRepo();
      await useRacePlanStore.getState().createPlan(repo, {
        horseId: 10,
        year: 2026,
        country: '日',
        distanceBand: 'マイル',
        grade: 'G1',
      });

      expect(repo.create).toHaveBeenCalledWith({
        horseId: 10,
        year: 2026,
        country: '日',
        distanceBand: 'マイル',
        grade: 'G1',
      });
      expect(repo.findByYear).toHaveBeenCalledTimes(1);
    });
  });

  describe('updatePlan', () => {
    it('updates a plan and reloads list', async () => {
      const repo = createMockRepo();
      await useRacePlanStore.getState().updatePlan(repo, 1, { grade: 'G2' });

      expect(repo.update).toHaveBeenCalledWith(1, { grade: 'G2' });
      expect(repo.findByYear).toHaveBeenCalledTimes(1);
    });
  });

  describe('deletePlan', () => {
    it('deletes a plan and reloads list', async () => {
      const repo = createMockRepo();
      await useRacePlanStore.getState().deletePlan(repo, 1);

      expect(repo.delete).toHaveBeenCalledWith(1);
      expect(repo.findByYear).toHaveBeenCalledTimes(1);
    });
  });

  describe('setYear', () => {
    it('updates the year', () => {
      useRacePlanStore.getState().setYear(2027);
      expect(useRacePlanStore.getState().year).toBe(2027);
    });
  });

  describe('getDuplicateHorses', () => {
    it('returns empty array when no duplicates', () => {
      useRacePlanStore.setState({
        plans: [
          createMockPlan({
            id: 1,
            horseId: 10,
            horseName: '馬A',
            country: '日',
            distanceBand: 'マイル',
            grade: 'G1',
          }),
          createMockPlan({
            id: 2,
            horseId: 20,
            horseName: '馬B',
            country: '米',
            distanceBand: '中距離',
            grade: 'G1',
          }),
        ],
      });

      const duplicates = useRacePlanStore.getState().getDuplicateHorses();
      expect(duplicates).toEqual([]);
    });

    it('detects same horse in multiple cells', () => {
      useRacePlanStore.setState({
        plans: [
          createMockPlan({
            id: 1,
            horseId: 10,
            horseName: '馬A',
            country: '日',
            distanceBand: 'マイル',
            grade: 'G1',
          }),
          createMockPlan({
            id: 2,
            horseId: 10,
            horseName: '馬A',
            country: '日',
            distanceBand: '中距離',
            grade: 'G2',
          }),
          createMockPlan({
            id: 3,
            horseId: 20,
            horseName: '馬B',
            country: '米',
            distanceBand: '長距離',
            grade: 'G1',
          }),
        ],
      });

      const duplicates = useRacePlanStore.getState().getDuplicateHorses();
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].horseId).toBe(10);
      expect(duplicates[0].horseName).toBe('馬A');
      expect(duplicates[0].cells).toHaveLength(2);
    });

    it('detects multiple horses with duplicates', () => {
      useRacePlanStore.setState({
        plans: [
          createMockPlan({
            id: 1,
            horseId: 10,
            horseName: '馬A',
            country: '日',
            distanceBand: 'マイル',
            grade: 'G1',
          }),
          createMockPlan({
            id: 2,
            horseId: 10,
            horseName: '馬A',
            country: '米',
            distanceBand: '中距離',
            grade: 'G2',
          }),
          createMockPlan({
            id: 3,
            horseId: 20,
            horseName: '馬B',
            country: '欧',
            distanceBand: '長距離',
            grade: 'G1',
          }),
          createMockPlan({
            id: 4,
            horseId: 20,
            horseName: '馬B',
            country: '日',
            distanceBand: '短距離',
            grade: 'G3',
          }),
        ],
      });

      const duplicates = useRacePlanStore.getState().getDuplicateHorses();
      expect(duplicates).toHaveLength(2);
    });
  });
});
