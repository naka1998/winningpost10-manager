import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHorseStore } from './store';
import type { HorseService } from './service';
import type { Horse } from './types';

function createMockHorse(overrides: Partial<Horse> = {}): Horse {
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
    createdAt: '2026-01-01 00:00:00',
    updatedAt: '2026-01-01 00:00:00',
    ...overrides,
  };
}

function createMockService(horses: Horse[] = [createMockHorse()]): HorseService {
  return {
    findAll: vi.fn().mockResolvedValue(horses),
    create: vi.fn().mockResolvedValue(createMockHorse({ id: 100, name: '新規馬' })),
    update: vi.fn().mockResolvedValue(createMockHorse({ id: 1, name: '更新馬' })),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

describe('useHorseStore', () => {
  beforeEach(() => {
    useHorseStore.setState({
      horses: [],
      isLoading: false,
      error: null,
      filter: {},
    });
  });

  describe('loadHorses', () => {
    it('loads horses from service', async () => {
      const horses = [
        createMockHorse({ id: 1, name: 'ディープインパクト' }),
        createMockHorse({ id: 2, name: 'キタサンブラック' }),
      ];
      const service = createMockService(horses);

      await useHorseStore.getState().loadHorses(service);

      const state = useHorseStore.getState();
      expect(state.horses).toHaveLength(2);
      expect(state.horses[0].name).toBe('ディープインパクト');
      expect(state.horses[1].name).toBe('キタサンブラック');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets isLoading during fetch', async () => {
      let resolveHorses: (value: Horse[]) => void;
      const pendingPromise = new Promise<Horse[]>((resolve) => {
        resolveHorses = resolve;
      });
      const service = createMockService();
      service.findAll = vi.fn().mockReturnValue(pendingPromise);

      const loadPromise = useHorseStore.getState().loadHorses(service);
      expect(useHorseStore.getState().isLoading).toBe(true);

      resolveHorses!([createMockHorse()]);
      await loadPromise;
      expect(useHorseStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      const service = createMockService();
      service.findAll = vi.fn().mockRejectedValue(new Error('DB error'));

      await useHorseStore.getState().loadHorses(service);

      const state = useHorseStore.getState();
      expect(state.error).toBe('DB error');
      expect(state.isLoading).toBe(false);
    });

    it('passes current filter to service', async () => {
      const service = createMockService();
      useHorseStore.setState({ filter: { status: '現役', sex: '牡' } });

      await useHorseStore.getState().loadHorses(service);

      expect(service.findAll).toHaveBeenCalledWith({ status: '現役', sex: '牡' });
    });
  });

  describe('createHorse', () => {
    it('creates a horse and reloads list', async () => {
      const service = createMockService();
      await useHorseStore.getState().createHorse(service, { name: '新規馬', sex: '牝' });

      expect(service.create).toHaveBeenCalledWith({ name: '新規馬', sex: '牝' });
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateHorse', () => {
    it('updates a horse and reloads list', async () => {
      const service = createMockService();
      await useHorseStore.getState().updateHorse(service, 1, { name: '更新馬' });

      expect(service.update).toHaveBeenCalledWith(1, { name: '更新馬' });
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteHorse', () => {
    it('deletes a horse and reloads list', async () => {
      const service = createMockService();
      await useHorseStore.getState().deleteHorse(service, 1);

      expect(service.delete).toHaveBeenCalledWith(1);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('setFilter', () => {
    it('updates filter partially', () => {
      useHorseStore.getState().setFilter({ status: '現役' });
      expect(useHorseStore.getState().filter).toEqual({ status: '現役' });

      useHorseStore.getState().setFilter({ sex: '牡' });
      expect(useHorseStore.getState().filter).toEqual({ status: '現役', sex: '牡' });
    });

    it('overwrites existing filter keys', () => {
      useHorseStore.setState({ filter: { status: '現役', sex: '牡' } });
      useHorseStore.getState().setFilter({ status: '繁殖牝馬' });
      expect(useHorseStore.getState().filter).toEqual({ status: '繁殖牝馬', sex: '牡' });
    });
  });
});
