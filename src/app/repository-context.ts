import { createContext, useContext } from 'react';
import type { HorseRepository } from '@/features/horses/repository';
import type { YearlyStatusRepository } from '@/features/horses/yearly-status-repository';
import type { LineageRepository } from '@/features/lineages/repository';
import type { SettingsRepository } from '@/features/settings/repository';
import type { BreedingRecordRepository } from '@/features/breeding-records/repository';
import type { BroodmareRepository } from '@/features/broodmares/repository';
import type { RacePlanRepository } from '@/features/race-plans/repository';

export interface RepositoryContextValue {
  horseRepository: HorseRepository;
  yearlyStatusRepository: YearlyStatusRepository;
  lineageRepository: LineageRepository;
  settingsRepository: SettingsRepository;
  breedingRecordRepository: BreedingRecordRepository;
  broodmareRepository: BroodmareRepository;
  racePlanRepository: RacePlanRepository;
}

export const RepositoryContext = createContext<RepositoryContextValue | null>(null);

export function useRepositoryContext(): RepositoryContextValue {
  const ctx = useContext(RepositoryContext);
  if (!ctx) {
    throw new Error('useRepositoryContext must be used within a RepositoryProvider');
  }
  return ctx;
}
