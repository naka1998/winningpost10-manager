import { create } from 'zustand';
import type { SettingsRepository } from './repository';
import type { GameSettings } from './types';

export interface SettingsState {
  settings: GameSettings | null;
  isLoading: boolean;
  error: string | null;

  loadSettings: (repo: SettingsRepository) => Promise<void>;
  updateCurrentYear: (repo: SettingsRepository, year: number) => Promise<void>;
  updatePedigreeDepth: (repo: SettingsRepository, depth: 4 | 5) => Promise<void>;
}

function parseSettings(raw: Record<string, string>): GameSettings {
  const rankSystem = raw.rank_system ? JSON.parse(raw.rank_system).ranks : [];
  return {
    currentYear: Number(raw.current_year) || 2025,
    pedigreeDepth: (Number(raw.pedigree_depth) === 5 ? 5 : 4) as 4 | 5,
    rankSystem,
    dbVersion: Number(raw.db_version) || 1,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  async loadSettings(repo: SettingsRepository) {
    set({ isLoading: true, error: null });
    try {
      const raw = await repo.getAll();
      const settings = parseSettings(raw);
      set({ settings, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  async updateCurrentYear(repo: SettingsRepository, year: number) {
    await repo.set('current_year', String(year));
    await get().loadSettings(repo);
  },

  async updatePedigreeDepth(repo: SettingsRepository, depth: 4 | 5) {
    await repo.set('pedigree_depth', String(depth));
    await get().loadSettings(repo);
  },
}));
