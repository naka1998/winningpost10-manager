import { create } from 'zustand';
import type { BroodmareRepository } from './repository';
import type {
  BroodmareFilter,
  BroodmareOffspring,
  BroodmareSummary,
  LineageDistribution,
} from './types';

export interface BroodmareState {
  summaries: BroodmareSummary[];
  offspring: Record<number, BroodmareOffspring[]>;
  sireLineDistribution: LineageDistribution[];
  damLineDistribution: LineageDistribution[];
  stallionDistribution: LineageDistribution[];
  isLoading: boolean;
  error: string | null;
  filter: BroodmareFilter;

  loadSummaries: (repo: BroodmareRepository, currentYear: number) => Promise<void>;
  loadOffspring: (repo: BroodmareRepository, mareId: number) => Promise<void>;
  loadDistributions: (repo: BroodmareRepository) => Promise<void>;
  setFilter: (filter: Partial<BroodmareFilter>) => void;
}

export const useBroodmareStore = create<BroodmareState>((set, get) => ({
  summaries: [],
  offspring: {},
  sireLineDistribution: [],
  damLineDistribution: [],
  stallionDistribution: [],
  isLoading: false,
  error: null,
  filter: {},

  async loadSummaries(repo: BroodmareRepository, currentYear: number) {
    set({ isLoading: true, error: null });
    try {
      const summaries = await repo.findAllSummaries(currentYear, get().filter);
      set({ summaries, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  async loadOffspring(repo: BroodmareRepository, mareId: number) {
    const result = await repo.findOffspring(mareId);
    set((state) => ({
      offspring: { ...state.offspring, [mareId]: result },
    }));
  },

  async loadDistributions(repo: BroodmareRepository) {
    // wa-sqlite does not support concurrent queries, so run sequentially
    const sireLineDistribution = await repo.getSireLineDistribution();
    const damLineDistribution = await repo.getDamLineDistribution();
    const stallionDistribution = await repo.getStallionDistribution();
    set({ sireLineDistribution, damLineDistribution, stallionDistribution });
  },

  setFilter(filter: Partial<BroodmareFilter>) {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
  },
}));
