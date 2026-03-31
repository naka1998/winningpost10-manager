import { createContext, useContext } from 'react';
import type { HorseRepository } from '@/features/horses/repository';
import type { LineageRepository } from '@/features/lineages/repository';

export interface RepositoryContextValue {
  horseRepository: HorseRepository;
  lineageRepository: LineageRepository;
}

export const RepositoryContext = createContext<RepositoryContextValue | null>(null);

export function useRepositoryContext(): RepositoryContextValue {
  const ctx = useContext(RepositoryContext);
  if (!ctx) {
    throw new Error('useRepositoryContext must be used within a RepositoryProvider');
  }
  return ctx;
}
