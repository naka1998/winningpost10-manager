import type { SettingsRepository } from './repository';
import type { GameSettings } from './types';

export interface SettingsService {
  getAll(): Promise<GameSettings>;
  updateCurrentYear(year: number): Promise<void>;
  updatePedigreeDepth(depth: 4 | 5): Promise<void>;
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

export function createSettingsService(deps: { settingsRepo: SettingsRepository }): SettingsService {
  return {
    async getAll() {
      const raw = await deps.settingsRepo.getAll();
      return parseSettings(raw);
    },
    async updateCurrentYear(year: number) {
      await deps.settingsRepo.set('current_year', String(year));
    },
    async updatePedigreeDepth(depth: 4 | 5) {
      await deps.settingsRepo.set('pedigree_depth', String(depth));
    },
  };
}
