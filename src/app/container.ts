import { initDatabase, type DatabaseConnection } from '@/database/connection';
import { runMigrations } from '@/database/migrations';
import { createHorseRepository } from '@/features/horses/repository';
import { createYearlyStatusRepository } from '@/features/horses/yearly-status-repository';
import { createLineageRepository } from '@/features/lineages/repository';
import { createSettingsRepository } from '@/features/settings/repository';
import { createBreedingRecordRepository } from '@/features/breeding-records/repository';
import { createBroodmareRepository } from '@/features/broodmares/repository';
import type { RepositoryContextValue } from './repository-context';

export interface AppContainer {
  db: DatabaseConnection;
  repositories: RepositoryContextValue;
}

export function createRepositories(db: DatabaseConnection): RepositoryContextValue {
  return {
    horseRepository: createHorseRepository(db),
    yearlyStatusRepository: createYearlyStatusRepository(db),
    lineageRepository: createLineageRepository(db),
    settingsRepository: createSettingsRepository(db),
    breedingRecordRepository: createBreedingRecordRepository(db),
    broodmareRepository: createBroodmareRepository(db),
  };
}

export async function createAppContainer(): Promise<AppContainer> {
  const db = await initDatabase();
  await runMigrations(db);
  return { db, repositories: createRepositories(db) };
}
