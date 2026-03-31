import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHorseStore } from './store';
import type { HorseRepository } from './repository';
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

function createMockRepo(horses: Horse[] = [createMockHorse()]): HorseRepository {
  return {
    findById: vi.fn(),
    findByNameAndBirthYear: vi.fn(),
    findAncestorByName: vi.fn(),
    findAll: vi.fn().mockResolvedValue(horses),
    create: vi.fn().mockResolvedValue(createMockHorse({ id: 100, name: '新規馬' })),
    update: vi.fn().mockResolvedValue(createMockHorse({ id: 1, name: '更新馬' })),
    delete: vi.fn().mockResolvedValue(undefined),
    getAncestorRows: vi.fn(),
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
    it('loads horses from repository', async () => {
      const horses = [
        createMockHorse({ id: 1, name: 'ディープインパクト' }),
        createMockHorse({ id: 2, name: 'キタサンブラック' }),
      ];
      const repo = createMockRepo(horses);

      await useHorseStore.getState().loadHorses(repo);

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
      const repo = createMockRepo();
      repo.findAll = vi.fn().mockReturnValue(pendingPromise);

      const loadPromise = useHorseStore.getState().loadHorses(repo);
      expect(useHorseStore.getState().isLoading).toBe(true);

      resolveHorses!([createMockHorse()]);
      await loadPromise;
      expect(useHorseStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      const repo = createMockRepo();
      repo.findAll = vi.fn().mockRejectedValue(new Error('DB error'));

      await useHorseStore.getState().loadHorses(repo);

      const state = useHorseStore.getState();
      expect(state.error).toBe('DB error');
      expect(state.isLoading).toBe(false);
    });

    it('passes current filter to repository', async () => {
      const repo = createMockRepo();
      useHorseStore.setState({ filter: { status: '現役', sex: '牡' } });

      await useHorseStore.getState().loadHorses(repo);

      expect(repo.findAll).toHaveBeenCalledWith({ status: '現役', sex: '牡' });
    });
  });

  describe('createHorse', () => {
    it('creates a horse and reloads list', async () => {
      const repo = createMockRepo();
      await useHorseStore.getState().createHorse(repo, { name: '新規馬', sex: '牝' });

      expect(repo.create).toHaveBeenCalledWith({ name: '新規馬', sex: '牝' });
      expect(repo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateHorse', () => {
    it('updates a horse and reloads list', async () => {
      const repo = createMockRepo();
      await useHorseStore.getState().updateHorse(repo, 1, { name: '更新馬' });

      expect(repo.update).toHaveBeenCalledWith(1, { name: '更新馬' });
      expect(repo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteHorse', () => {
    it('deletes a horse and reloads list', async () => {
      const repo = createMockRepo();
      await useHorseStore.getState().deleteHorse(repo, 1);

      expect(repo.delete).toHaveBeenCalledWith(1);
      expect(repo.findAll).toHaveBeenCalledTimes(1);
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
