import { create } from 'zustand';
import type { BreedingRecordService } from './service';
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

  loadRecords: (service: BreedingRecordService) => Promise<void>;
  createRecord: (service: BreedingRecordService, data: BreedingRecordCreateInput) => Promise<void>;
  updateRecord: (
    service: BreedingRecordService,
    id: number,
    data: BreedingRecordUpdateInput,
  ) => Promise<void>;
  deleteRecord: (service: BreedingRecordService, id: number) => Promise<void>;
  setFilter: (filter: Partial<BreedingRecordFilter>) => void;
}

export const useBreedingRecordStore = create<BreedingRecordState>((set, get) => ({
  records: [],
  isLoading: false,
  error: null,
  filter: {},

  async loadRecords(service: BreedingRecordService) {
    set({ isLoading: true, error: null });
    try {
      const records = await service.findAll(get().filter);
      set({ records, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  async createRecord(service: BreedingRecordService, data: BreedingRecordCreateInput) {
    await service.create(data);
    await get().loadRecords(service);
  },

  async updateRecord(service: BreedingRecordService, id: number, data: BreedingRecordUpdateInput) {
    await service.update(id, data);
    await get().loadRecords(service);
  },

  async deleteRecord(service: BreedingRecordService, id: number) {
    await service.delete(id);
    await get().loadRecords(service);
  },

  setFilter(filter: Partial<BreedingRecordFilter>) {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
  },
}));
