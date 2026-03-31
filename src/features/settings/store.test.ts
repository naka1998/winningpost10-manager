import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from './store';
import type { SettingsRepository } from './repository';

function createMockRepo(
  data: Record<string, string> = {
    current_year: '2025',
    pedigree_depth: '4',
    rank_system: '{"ranks":["S+","S","A+","A","B+","B","C+","C","D+","D","E+","E"]}',
    db_version: '1',
  },
): SettingsRepository {
  return {
    get: vi.fn(async (key: string) => data[key] ?? null),
    getAll: vi.fn(async () => ({ ...data })),
    set: vi.fn(async (key: string, value: string) => {
      data[key] = value;
    }),
  };
}

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settings: null,
      isLoading: false,
      error: null,
    });
  });

  describe('loadSettings', () => {
    it('設定を読み込み、GameSettingsにパースされる', async () => {
      const repo = createMockRepo();
      await useSettingsStore.getState().loadSettings(repo);

      const state = useSettingsStore.getState();
      expect(state.settings).not.toBeNull();
      expect(state.settings!.currentYear).toBe(2025);
      expect(state.settings!.pedigreeDepth).toBe(4);
      expect(state.settings!.rankSystem).toEqual([
        'S+',
        'S',
        'A+',
        'A',
        'B+',
        'B',
        'C+',
        'C',
        'D+',
        'D',
        'E+',
        'E',
      ]);
      expect(state.settings!.dbVersion).toBe(1);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('エラー時にerrorがセットされる', async () => {
      const repo = createMockRepo();
      repo.getAll = vi.fn().mockRejectedValue(new Error('DB error'));

      await useSettingsStore.getState().loadSettings(repo);

      const state = useSettingsStore.getState();
      expect(state.error).toBe('DB error');
      expect(state.isLoading).toBe(false);
      expect(state.settings).toBeNull();
    });

    it('読み込み中はisLoadingがtrueになる', async () => {
      const repo = createMockRepo();
      let loadingDuringCall = false;
      repo.getAll = vi.fn(async () => {
        loadingDuringCall = useSettingsStore.getState().isLoading;
        return {
          current_year: '2025',
          pedigree_depth: '4',
          rank_system: '{"ranks":[]}',
          db_version: '1',
        };
      });

      await useSettingsStore.getState().loadSettings(repo);
      expect(loadingDuringCall).toBe(true);
    });
  });

  describe('updateCurrentYear', () => {
    it('repo.setが正しい引数で呼ばれ、リロードされる', async () => {
      const repo = createMockRepo();
      await useSettingsStore.getState().loadSettings(repo);
      await useSettingsStore.getState().updateCurrentYear(repo, 2030);

      expect(repo.set).toHaveBeenCalledWith('current_year', '2030');
      expect(useSettingsStore.getState().settings!.currentYear).toBe(2030);
    });
  });

  describe('updatePedigreeDepth', () => {
    it('repo.setが正しい引数で呼ばれ、リロードされる', async () => {
      const repo = createMockRepo();
      await useSettingsStore.getState().loadSettings(repo);
      await useSettingsStore.getState().updatePedigreeDepth(repo, 5);

      expect(repo.set).toHaveBeenCalledWith('pedigree_depth', '5');
      expect(useSettingsStore.getState().settings!.pedigreeDepth).toBe(5);
    });
  });
});
