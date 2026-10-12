import { create } from 'zustand';
import type { SettingsService } from './service';
import type { GameSettings } from './types';

export interface SettingsState {
  settings: GameSettings | null;
  isLoading: boolean;
  error: string | null;

  loadSettings: (service: SettingsService) => Promise<void>;
  updateCurrentYear: (service: SettingsService, year: number) => Promise<void>;
  updatePedigreeDepth: (service: SettingsService, depth: 4 | 5) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  async loadSettings(service: SettingsService) {
    set({ isLoading: true, error: null });
    try {
      const settings = await service.getAll();
      set({ settings, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  async updateCurrentYear(service: SettingsService, year: number) {
    await service.updateCurrentYear(year);
    await get().loadSettings(service);
  },

  async updatePedigreeDepth(service: SettingsService, depth: 4 | 5) {
    await service.updatePedigreeDepth(depth);
    await get().loadSettings(service);
  },
}));
