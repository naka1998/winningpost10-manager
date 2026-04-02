import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createTestDatabase } from '@/database/connection.test-utils';
import { runMigrations } from '@/database/migrations';
import { createHorseRepository, type HorseRepository } from '@/features/horses/repository';
import {
  createYearlyStatusRepository,
  type YearlyStatusRepository,
} from '@/features/horses/yearly-status-repository';
import { createLineageRepository, type LineageRepository } from '@/features/lineages/repository';
import { createSettingsRepository, type SettingsRepository } from '@/features/settings/repository';
import {
  createBreedingRecordRepository,
  type BreedingRecordRepository,
} from '@/features/breeding-records/repository';
import {
  createBroodmareRepository,
  type BroodmareRepository,
} from '@/features/broodmares/repository';
import { DatabaseContext } from '@/app/database-context';
import { RepositoryContext, type RepositoryContextValue } from '@/app/repository-context';

interface ProvidersOptions {
  repositoryOverrides?: Partial<RepositoryContextValue>;
}

/**
 * Render a component wrapped with DatabaseContext and RepositoryContext
 * backed by an in-memory test database.
 *
 * Optionally override individual repositories with mocks.
 */
export async function renderWithProviders(
  ui: ReactElement,
  options?: ProvidersOptions & Omit<RenderOptions, 'wrapper'>,
) {
  const db = createTestDatabase();
  await runMigrations(db);

  const repos: RepositoryContextValue = {
    horseRepository:
      (options?.repositoryOverrides?.horseRepository as HorseRepository) ??
      createHorseRepository(db),
    yearlyStatusRepository:
      (options?.repositoryOverrides?.yearlyStatusRepository as YearlyStatusRepository) ??
      createYearlyStatusRepository(db),
    lineageRepository:
      (options?.repositoryOverrides?.lineageRepository as LineageRepository) ??
      createLineageRepository(db),
    settingsRepository:
      (options?.repositoryOverrides?.settingsRepository as SettingsRepository) ??
      createSettingsRepository(db),
    breedingRecordRepository:
      (options?.repositoryOverrides?.breedingRecordRepository as BreedingRecordRepository) ??
      createBreedingRecordRepository(db),
    broodmareRepository:
      (options?.repositoryOverrides?.broodmareRepository as BroodmareRepository) ??
      createBroodmareRepository(db),
  };

  const { repositoryOverrides: _, ...renderOptions } = options ?? {};

  return render(ui, {
    wrapper: ({ children }) => (
      <DatabaseContext.Provider value={{ db }}>
        <RepositoryContext.Provider value={repos}>{children}</RepositoryContext.Provider>
      </DatabaseContext.Provider>
    ),
    ...renderOptions,
  });
}
