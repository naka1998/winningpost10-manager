import { createContext, useContext } from 'react';
import type { HorseService } from '@/features/horses/service';
import type { LineageService } from '@/features/lineages/service';
import type { SettingsService } from '@/features/settings/service';
import type { BreedingRecordService } from '@/features/breeding-records/service';

export interface ServiceContextValue {
  horseService: HorseService;
  lineageService: LineageService;
  settingsService: SettingsService;
  breedingRecordService: BreedingRecordService;
}

export const ServiceContext = createContext<ServiceContextValue | null>(null);

export function useServiceContext(): ServiceContextValue {
  const ctx = useContext(ServiceContext);
  if (!ctx) {
    throw new Error('useServiceContext must be used within a ServiceProvider');
  }
  return ctx;
}
