import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBreedingRecordStore } from './store';
import type { BreedingRecordRepository } from './repository';
import type { BreedingRecordWithNames } from './types';

function createMockRecord(
  overrides: Partial<BreedingRecordWithNames> = {},
): BreedingRecordWithNames {
  return {
    id: 1,
    mareId: 10,
    sireId: 20,
    year: 2024,
    evaluation: 'A',
    theories: null,
    totalPower: null,
    offspringId: null,
    notes: null,
    createdAt: '2026-01-01 00:00:00',
    updatedAt: '2026-01-01 00:00:00',
    mareName: 'テスト牝馬',
    sireName: 'テスト種牡馬',
    offspringName: null,
    ...overrides,
  };
}

function createMockRepo(
  records: BreedingRecordWithNames[] = [createMockRecord()],
): BreedingRecordRepository {
  return {
    findById: vi.fn(),
    findAll: vi.fn().mockResolvedValue(records),
    create: vi.fn().mockResolvedValue(createMockRecord({ id: 100 })),
    update: vi.fn().mockResolvedValue(createMockRecord({ id: 1, evaluation: 'S' })),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

describe('useBreedingRecordStore', () => {
  beforeEach(() => {
    useBreedingRecordStore.setState({
      records: [],
      isLoading: false,
      error: null,
      filter: {},
    });
  });

  describe('loadRecords', () => {
    it('loads records from repository', async () => {
      const records = [createMockRecord({ id: 1 }), createMockRecord({ id: 2, evaluation: 'B' })];
      const repo = createMockRepo(records);

      await useBreedingRecordStore.getState().loadRecords(repo);

      const state = useBreedingRecordStore.getState();
      expect(state.records).toHaveLength(2);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets isLoading during fetch', async () => {
      let resolveRecords: (value: BreedingRecordWithNames[]) => void;
      const pendingPromise = new Promise<BreedingRecordWithNames[]>((resolve) => {
        resolveRecords = resolve;
      });
      const repo = createMockRepo();
      repo.findAll = vi.fn().mockReturnValue(pendingPromise);

      const loadPromise = useBreedingRecordStore.getState().loadRecords(repo);
      expect(useBreedingRecordStore.getState().isLoading).toBe(true);

      resolveRecords!([createMockRecord()]);
      await loadPromise;
      expect(useBreedingRecordStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      const repo = createMockRepo();
      repo.findAll = vi.fn().mockRejectedValue(new Error('DB error'));

      await useBreedingRecordStore.getState().loadRecords(repo);

      const state = useBreedingRecordStore.getState();
      expect(state.error).toBe('DB error');
      expect(state.isLoading).toBe(false);
    });

    it('passes current filter to repository', async () => {
      const repo = createMockRepo();
      useBreedingRecordStore.setState({ filter: { year: 2024, mareId: 10 } });

      await useBreedingRecordStore.getState().loadRecords(repo);

      expect(repo.findAll).toHaveBeenCalledWith({ year: 2024, mareId: 10 });
    });
  });

  describe('createRecord', () => {
    it('creates a record and reloads list', async () => {
      const repo = createMockRepo();
      await useBreedingRecordStore
        .getState()
        .createRecord(repo, { mareId: 10, sireId: 20, year: 2024 });

      expect(repo.create).toHaveBeenCalledWith({ mareId: 10, sireId: 20, year: 2024 });
      expect(repo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateRecord', () => {
    it('updates a record and reloads list', async () => {
      const repo = createMockRepo();
      await useBreedingRecordStore.getState().updateRecord(repo, 1, { evaluation: 'S' });

      expect(repo.update).toHaveBeenCalledWith(1, { evaluation: 'S' });
      expect(repo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteRecord', () => {
    it('deletes a record and reloads list', async () => {
      const repo = createMockRepo();
      await useBreedingRecordStore.getState().deleteRecord(repo, 1);

      expect(repo.delete).toHaveBeenCalledWith(1);
      expect(repo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('setFilter', () => {
    it('updates filter partially', () => {
      useBreedingRecordStore.getState().setFilter({ year: 2024 });
      expect(useBreedingRecordStore.getState().filter).toEqual({ year: 2024 });

      useBreedingRecordStore.getState().setFilter({ mareId: 10 });
      expect(useBreedingRecordStore.getState().filter).toEqual({ year: 2024, mareId: 10 });
    });
  });
});
