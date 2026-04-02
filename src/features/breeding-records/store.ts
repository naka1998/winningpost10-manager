import { create } from 'zustand';
import type { BreedingRecordRepository } from './repository';
import type {
  BreedingRecordCreateInput,
  BreedingRecordFilter,
  BreedingRecordUpdateInput,
  BreedingRecordWithNames,
} from './types';

export interface BreedingRecordState {
  records: BreedingRecordWithNames[];
  isLoading: boolean;
  error: string | null;
  filter: BreedingRecordFilter;

  loadRecords: (repo: BreedingRecordRepository) => Promise<void>;
  createRecord: (repo: BreedingRecordRepository, data: BreedingRecordCreateInput) => Promise<void>;
  updateRecord: (
    repo: BreedingRecordRepository,
    id: number,
    data: BreedingRecordUpdateInput,
  ) => Promise<void>;
  deleteRecord: (repo: BreedingRecordRepository, id: number) => Promise<void>;
  setFilter: (filter: Partial<BreedingRecordFilter>) => void;
}

export const useBreedingRecordStore = create<BreedingRecordState>((set, get) => ({
  records: [],
  isLoading: false,
  error: null,
  filter: {},

  async loadRecords(repo: BreedingRecordRepository) {
    set({ isLoading: true, error: null });
    try {
      const records = await repo.findAll(get().filter);
      set({ records, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  async createRecord(repo: BreedingRecordRepository, data: BreedingRecordCreateInput) {
    await repo.create(data);
    await get().loadRecords(repo);
  },

  async updateRecord(repo: BreedingRecordRepository, id: number, data: BreedingRecordUpdateInput) {
    await repo.update(id, data);
    await get().loadRecords(repo);
  },

  async deleteRecord(repo: BreedingRecordRepository, id: number) {
    await repo.delete(id);
    await get().loadRecords(repo);
  },

  setFilter(filter: Partial<BreedingRecordFilter>) {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
  },
}));
