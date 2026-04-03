import type { HorseRepository } from './repository';
import type { Horse, HorseCreateInput, HorseFilter, HorseUpdateInput } from './types';

export interface HorseService {
  findAll(filter?: HorseFilter): Promise<Horse[]>;
  create(data: HorseCreateInput): Promise<Horse>;
  update(id: number, data: HorseUpdateInput): Promise<Horse>;
  delete(id: number): Promise<void>;
}

export function createHorseService(deps: { horseRepo: HorseRepository }): HorseService {
  return {
    findAll(filter?: HorseFilter) {
      return deps.horseRepo.findAll(filter);
    },
    create(data: HorseCreateInput) {
      return deps.horseRepo.create(data);
    },
    update(id: number, data: HorseUpdateInput) {
      return deps.horseRepo.update(id, data);
    },
    delete(id: number) {
      return deps.horseRepo.delete(id);
    },
  };
}
