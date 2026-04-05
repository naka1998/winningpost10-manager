import { create } from 'zustand';
import type { RacePlanRepository } from './repository';
import type {
  RacePlanCreateInput,
  RacePlanUpdateInput,
  RacePlanWithHorseName,
  DuplicateHorseWarning,
} from './types';

export interface RacePlanState {
  plans: RacePlanWithHorseName[];
  isLoading: boolean;
  error: string | null;
  year: number;

  loadPlans: (repo: RacePlanRepository) => Promise<void>;
  createPlan: (repo: RacePlanRepository, data: RacePlanCreateInput) => Promise<void>;
  updatePlan: (repo: RacePlanRepository, id: number, data: RacePlanUpdateInput) => Promise<void>;
  deletePlan: (repo: RacePlanRepository, id: number) => Promise<void>;
  setYear: (year: number) => void;
  getDuplicateHorses: () => DuplicateHorseWarning[];
}

export const useRacePlanStore = create<RacePlanState>((set, get) => ({
  plans: [],
  isLoading: false,
  error: null,
  year: 2026,

  async loadPlans(repo: RacePlanRepository) {
    set({ isLoading: true, error: null });
    try {
      const plans = await repo.findByYear(get().year);
      set({ plans, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  async createPlan(repo: RacePlanRepository, data: RacePlanCreateInput) {
    await repo.create(data);
    await get().loadPlans(repo);
  },

  async updatePlan(repo: RacePlanRepository, id: number, data: RacePlanUpdateInput) {
    await repo.update(id, data);
    await get().loadPlans(repo);
  },

  async deletePlan(repo: RacePlanRepository, id: number) {
    await repo.delete(id);
    await get().loadPlans(repo);
  },

  setYear(year: number) {
    set({ year });
  },

  getDuplicateHorses(): DuplicateHorseWarning[] {
    const { plans } = get();
    const horseMap = new Map<
      number,
      { horseName: string; cells: DuplicateHorseWarning['cells'] }
    >();

    for (const plan of plans) {
      if (!plan.country || !plan.distanceBand || !plan.grade) continue;
      const existing = horseMap.get(plan.horseId);
      if (existing) {
        existing.cells.push({
          country: plan.country,
          distanceBand: plan.distanceBand,
          grade: plan.grade,
        });
      } else {
        horseMap.set(plan.horseId, {
          horseName: plan.horseName,
          cells: [{ country: plan.country, distanceBand: plan.distanceBand, grade: plan.grade }],
        });
      }
    }

    const duplicates: DuplicateHorseWarning[] = [];
    for (const [horseId, { horseName, cells }] of horseMap) {
      if (cells.length > 1) {
        duplicates.push({ horseId, horseName, cells });
      }
    }
    return duplicates;
  },
}));
