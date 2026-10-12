import type { LineageRepository } from './repository';
import type { Lineage, LineageCreateInput, LineageNode, LineageUpdateInput } from './types';

export interface LineageService {
  getHierarchy(): Promise<LineageNode[]>;
  create(data: LineageCreateInput): Promise<Lineage>;
  update(id: number, data: LineageUpdateInput): Promise<Lineage>;
}

export function createLineageService(deps: { lineageRepo: LineageRepository }): LineageService {
  return {
    getHierarchy() {
      return deps.lineageRepo.getHierarchy();
    },
    create(data: LineageCreateInput) {
      return deps.lineageRepo.create(data);
    },
    update(id: number, data: LineageUpdateInput) {
      return deps.lineageRepo.update(id, data);
    },
  };
}
