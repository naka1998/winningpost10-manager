import { initDatabase, type DatabaseConnection } from '@/database/connection';
import { runMigrations } from '@/database/migrations';
import { createHorseRepository } from '@/features/horses/repository';
import { createYearlyStatusRepository } from '@/features/horses/yearly-status-repository';
import { createLineageRepository } from '@/features/lineages/repository';
import { createSettingsRepository } from '@/features/settings/repository';
import { createBreedingRecordRepository } from '@/features/breeding-records/repository';
import { createBroodmareRepository } from '@/features/broodmares/repository';
import { createHorseService } from '@/features/horses/service';
import { createLineageService } from '@/features/lineages/service';
import { createSettingsService } from '@/features/settings/service';
import { createBreedingRecordService } from '@/features/breeding-records/service';
import { createRacePlanRepository } from '@/features/race-plans/repository';
import type { RepositoryContextValue } from './repository-context';
import type { ServiceContextValue } from './service-context';

export interface AppContainer {
  db: DatabaseConnection;
  repositories: RepositoryContextValue;
  services: ServiceContextValue;
}

export function createRepositories(db: DatabaseConnection): RepositoryContextValue {
  return {
    horseRepository: createHorseRepository(db),
    yearlyStatusRepository: createYearlyStatusRepository(db),
    lineageRepository: createLineageRepository(db),
    settingsRepository: createSettingsRepository(db),
    breedingRecordRepository: createBreedingRecordRepository(db),
    broodmareRepository: createBroodmareRepository(db),
    racePlanRepository: createRacePlanRepository(db),
  };
}

export function createServices(repositories: RepositoryContextValue): ServiceContextValue {
  return {
    horseService: createHorseService({ horseRepo: repositories.horseRepository }),
    lineageService: createLineageService({ lineageRepo: repositories.lineageRepository }),
    settingsService: createSettingsService({ settingsRepo: repositories.settingsRepository }),
    breedingRecordService: createBreedingRecordService({
      breedingRecordRepo: repositories.breedingRecordRepository,
    }),
  };
}

export async function createAppContainer(): Promise<AppContainer> {
  const db = await initDatabase();
  await runMigrations(db);
  const repositories = createRepositories(db);
  const services = createServices(repositories);
  return { db, repositories, services };
}
