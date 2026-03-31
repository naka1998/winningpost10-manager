import { create } from 'zustand';
import type { HorseRepository } from './repository';
import type { Horse, HorseCreateInput, HorseFilter, HorseUpdateInput } from './types';

export interface HorseState {
  horses: Horse[];
  isLoading: boolean;
  error: string | null;
  filter: HorseFilter;

  loadHorses: (repo: HorseRepository) => Promise<void>;
  createHorse: (repo: HorseRepository, data: HorseCreateInput) => Promise<void>;
  updateHorse: (repo: HorseRepository, id: number, data: HorseUpdateInput) => Promise<void>;
  deleteHorse: (repo: HorseRepository, id: number) => Promise<void>;
  setFilter: (filter: Partial<HorseFilter>) => void;
}

export const useHorseStore = create<HorseState>((set, get) => ({
  horses: [],
  isLoading: false,
  error: null,
  filter: {},

  async loadHorses(repo: HorseRepository) {
    set({ isLoading: true, error: null });
    try {
      const horses = await repo.findAll(get().filter);
      set({ horses, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  async createHorse(repo: HorseRepository, data: HorseCreateInput) {
    await repo.create(data);
    await get().loadHorses(repo);
  },

  async updateHorse(repo: HorseRepository, id: number, data: HorseUpdateInput) {
    await repo.update(id, data);
    await get().loadHorses(repo);
  },

  async deleteHorse(repo: HorseRepository, id: number) {
    await repo.delete(id);
    await get().loadHorses(repo);
  },

  setFilter(filter: Partial<HorseFilter>) {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
  },
}));
