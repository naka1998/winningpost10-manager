import type { BreedingRecordRepository } from './repository';
import type {
  BreedingRecordCreateInput,
  BreedingRecordFilter,
  BreedingRecordUpdateInput,
  BreedingRecordWithNames,
} from './types';

export interface BreedingRecordService {
  findAll(filter?: BreedingRecordFilter): Promise<BreedingRecordWithNames[]>;
  create(data: BreedingRecordCreateInput): Promise<BreedingRecordWithNames>;
  update(id: number, data: BreedingRecordUpdateInput): Promise<BreedingRecordWithNames>;
  delete(id: number): Promise<void>;
}

export function createBreedingRecordService(deps: {
  breedingRecordRepo: BreedingRecordRepository;
}): BreedingRecordService {
  return {
    findAll(filter?: BreedingRecordFilter) {
      return deps.breedingRecordRepo.findAll(filter);
    },
    create(data: BreedingRecordCreateInput) {
      return deps.breedingRecordRepo.create(data);
    },
    update(id: number, data: BreedingRecordUpdateInput) {
      return deps.breedingRecordRepo.update(id, data);
    },
    delete(id: number) {
      return deps.breedingRecordRepo.delete(id);
    },
  };
}
