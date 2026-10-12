import { create } from 'zustand';
import type { LineageService } from './service';
import type { Lineage, LineageCreateInput, LineageNode, LineageUpdateInput } from './types';

export function filterHierarchy(hierarchy: LineageNode[], searchQuery: string): LineageNode[] {
  if (!searchQuery.trim()) return hierarchy;

  const q = searchQuery.trim().toLowerCase();
  const result: LineageNode[] = [];

  for (const parent of hierarchy) {
    const parentMatches = parent.name.toLowerCase().includes(q);
    const matchingChildren = parent.children.filter((child) =>
      child.name.toLowerCase().includes(q),
    );

    if (parentMatches) {
      result.push({ ...parent });
    } else if (matchingChildren.length > 0) {
      result.push({ ...parent, children: matchingChildren });
    }
  }

  return result;
}

export interface LineageState {
  hierarchy: LineageNode[];
  parentLineages: Lineage[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  loadHierarchy: (service: LineageService) => Promise<void>;
  createLineage: (service: LineageService, data: LineageCreateInput) => Promise<void>;
  updateLineage: (service: LineageService, id: number, data: LineageUpdateInput) => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export const useLineageStore = create<LineageState>((set, get) => ({
  hierarchy: [],
  parentLineages: [],
  isLoading: false,
  error: null,
  searchQuery: '',

  async loadHierarchy(service: LineageService) {
    set({ isLoading: true, error: null });
    try {
      const hierarchy = await service.getHierarchy();
      const parentLineages = hierarchy.map(({ children: _children, ...parent }) => parent);
      set({ hierarchy, parentLineages, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  async createLineage(service: LineageService, data: LineageCreateInput) {
    await service.create(data);
    await get().loadHierarchy(service);
  },

  async updateLineage(service: LineageService, id: number, data: LineageUpdateInput) {
    await service.update(id, data);
    await get().loadHierarchy(service);
  },

  setSearchQuery(query: string) {
    set({ searchQuery: query });
  },
}));
