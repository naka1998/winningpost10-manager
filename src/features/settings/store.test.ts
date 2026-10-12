import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from './store';
import type { SettingsService } from './service';
import type { GameSettings } from './types';

function createMockSettings(overrides: Partial<GameSettings> = {}): GameSettings {
  return {
    currentYear: 2025,
    pedigreeDepth: 4,
    rankSystem: ['S+', 'S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E+', 'E'],
    dbVersion: 1,
    ...overrides,
  };
}

function createMockService(settings: GameSettings = createMockSettings()): SettingsService {
  const data = { ...settings };
  return {
    getAll: vi.fn(async () => ({ ...data })),
    updateCurrentYear: vi.fn(async (year: number) => {
      data.currentYear = year;
    }),
    updatePedigreeDepth: vi.fn(async (depth: 4 | 5) => {
      data.pedigreeDepth = depth;
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
    it('設定を読み込み、GameSettingsとしてセットされる', async () => {
      const service = createMockService();
      await useSettingsStore.getState().loadSettings(service);

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
      const service = createMockService();
      service.getAll = vi.fn().mockRejectedValue(new Error('DB error'));

      await useSettingsStore.getState().loadSettings(service);

      const state = useSettingsStore.getState();
      expect(state.error).toBe('DB error');
      expect(state.isLoading).toBe(false);
      expect(state.settings).toBeNull();
    });

    it('読み込み中はisLoadingがtrueになる', async () => {
      const service = createMockService();
      let loadingDuringCall = false;
      service.getAll = vi.fn(async () => {
        loadingDuringCall = useSettingsStore.getState().isLoading;
        return createMockSettings();
      });

      await useSettingsStore.getState().loadSettings(service);
      expect(loadingDuringCall).toBe(true);
    });
  });

  describe('updateCurrentYear', () => {
    it('service.updateCurrentYearが正しい引数で呼ばれ、リロードされる', async () => {
      const service = createMockService();
      await useSettingsStore.getState().loadSettings(service);
      await useSettingsStore.getState().updateCurrentYear(service, 2030);

      expect(service.updateCurrentYear).toHaveBeenCalledWith(2030);
      expect(useSettingsStore.getState().settings!.currentYear).toBe(2030);
    });
  });

  describe('updatePedigreeDepth', () => {
    it('service.updatePedigreeDepthが正しい引数で呼ばれ、リロードされる', async () => {
      const service = createMockService();
      await useSettingsStore.getState().loadSettings(service);
      await useSettingsStore.getState().updatePedigreeDepth(service, 5);

      expect(service.updatePedigreeDepth).toHaveBeenCalledWith(5);
      expect(useSettingsStore.getState().settings!.pedigreeDepth).toBe(5);
    });
  });
});
