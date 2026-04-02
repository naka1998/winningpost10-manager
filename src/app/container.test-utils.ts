import { createTestDatabase } from '@/database/connection.test-utils';
import { runMigrations } from '@/database/migrations';
import { createRepositories, type AppContainer } from './container';
import type { RepositoryContextValue } from './repository-context';

export interface TestAppContainerOptions {
  repositoryOverrides?: Partial<RepositoryContextValue>;
}

export async function createTestAppContainer(
  options?: TestAppContainerOptions,
): Promise<AppContainer> {
  const db = createTestDatabase();
  await runMigrations(db);
  const defaults = createRepositories(db);
  const repositories: RepositoryContextValue = {
    ...defaults,
    ...options?.repositoryOverrides,
  };
  return { db, repositories };
}
