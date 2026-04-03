import { create } from 'zustand';
import type { HorseService } from './service';
import type { Horse, HorseCreateInput, HorseFilter, HorseUpdateInput } from './types';

export interface HorseState {
  horses: Horse[];
  isLoading: boolean;
  error: string | null;
  filter: HorseFilter;

  loadHorses: (service: HorseService) => Promise<void>;
  createHorse: (service: HorseService, data: HorseCreateInput) => Promise<void>;
  updateHorse: (service: HorseService, id: number, data: HorseUpdateInput) => Promise<void>;
  deleteHorse: (service: HorseService, id: number) => Promise<void>;
  setFilter: (filter: Partial<HorseFilter>) => void;
}

export const useHorseStore = create<HorseState>((set, get) => ({
  horses: [],
  isLoading: false,
  error: null,
  filter: { status: '現役' },

  async loadHorses(service: HorseService) {
    set({ isLoading: true, error: null });
    try {
      const horses = await service.findAll(get().filter);
      set({ horses, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  async createHorse(service: HorseService, data: HorseCreateInput) {
    await service.create(data);
    await get().loadHorses(service);
  },

  async updateHorse(service: HorseService, id: number, data: HorseUpdateInput) {
    await service.update(id, data);
    await get().loadHorses(service);
  },

  async deleteHorse(service: HorseService, id: number) {
    await service.delete(id);
    await get().loadHorses(service);
  },

  setFilter(filter: Partial<HorseFilter>) {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
  },
}));
