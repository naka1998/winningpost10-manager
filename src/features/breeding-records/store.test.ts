import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBreedingRecordStore } from './store';
import type { BreedingRecordService } from './service';
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

function createMockService(
  records: BreedingRecordWithNames[] = [createMockRecord()],
): BreedingRecordService {
  return {
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
    it('loads records from service', async () => {
      const records = [createMockRecord({ id: 1 }), createMockRecord({ id: 2, evaluation: 'B' })];
      const service = createMockService(records);

      await useBreedingRecordStore.getState().loadRecords(service);

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
      const service = createMockService();
      service.findAll = vi.fn().mockReturnValue(pendingPromise);

      const loadPromise = useBreedingRecordStore.getState().loadRecords(service);
      expect(useBreedingRecordStore.getState().isLoading).toBe(true);

      resolveRecords!([createMockRecord()]);
      await loadPromise;
      expect(useBreedingRecordStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      const service = createMockService();
      service.findAll = vi.fn().mockRejectedValue(new Error('DB error'));

      await useBreedingRecordStore.getState().loadRecords(service);

      const state = useBreedingRecordStore.getState();
      expect(state.error).toBe('DB error');
      expect(state.isLoading).toBe(false);
    });

    it('passes current filter to service', async () => {
      const service = createMockService();
      useBreedingRecordStore.setState({ filter: { year: 2024, mareId: 10 } });

      await useBreedingRecordStore.getState().loadRecords(service);

      expect(service.findAll).toHaveBeenCalledWith({ year: 2024, mareId: 10 });
    });
  });

  describe('createRecord', () => {
    it('creates a record and reloads list', async () => {
      const service = createMockService();
      await useBreedingRecordStore
        .getState()
        .createRecord(service, { mareId: 10, sireId: 20, year: 2024 });

      expect(service.create).toHaveBeenCalledWith({ mareId: 10, sireId: 20, year: 2024 });
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateRecord', () => {
    it('updates a record and reloads list', async () => {
      const service = createMockService();
      await useBreedingRecordStore.getState().updateRecord(service, 1, { evaluation: 'S' });

      expect(service.update).toHaveBeenCalledWith(1, { evaluation: 'S' });
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteRecord', () => {
    it('deletes a record and reloads list', async () => {
      const service = createMockService();
      await useBreedingRecordStore.getState().deleteRecord(service, 1);

      expect(service.delete).toHaveBeenCalledWith(1);
      expect(service.findAll).toHaveBeenCalledTimes(1);
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
