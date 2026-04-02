import { describe, expect, it, vi } from 'vitest';
import type { RepositoryContextValue } from './repository-context';

// Mock initDatabase to return a test database
vi.mock('@/database/connection', () => ({
  initDatabase: vi.fn(async () => {
    const { createTestDatabase } = await import('@/database/connection.test-utils');
    return createTestDatabase();
  }),
}));

// Spy on runMigrations so individual tests can override it
vi.mock('@/database/migrations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/database/migrations')>();
  return { ...actual, runMigrations: vi.fn(actual.runMigrations) };
});

describe('createAppContainer', () => {
  it('should return a container with db and all 6 repositories', async () => {
    const { createAppContainer } = await import('./container');
    const container = await createAppContainer();

    expect(container.db).toBeDefined();
    expect(container.repositories.horseRepository).toBeDefined();
    expect(container.repositories.yearlyStatusRepository).toBeDefined();
    expect(container.repositories.lineageRepository).toBeDefined();
    expect(container.repositories.settingsRepository).toBeDefined();
    expect(container.repositories.breedingRecordRepository).toBeDefined();
    expect(container.repositories.broodmareRepository).toBeDefined();
  });

  it('should propagate error when initDatabase fails', async () => {
    const { initDatabase } = await import('@/database/connection');
    const mocked = vi.mocked(initDatabase);
    mocked.mockRejectedValueOnce(new Error('OPFS not available'));

    const { createAppContainer } = await import('./container');
    await expect(createAppContainer()).rejects.toThrow('OPFS not available');
  });

  it('should propagate error when runMigrations fails', async () => {
    const { runMigrations } = await import('@/database/migrations');
    const mocked = vi.mocked(runMigrations);
    mocked.mockRejectedValueOnce(new Error('migration 003 failed'));

    const { createAppContainer } = await import('./container');
    await expect(createAppContainer()).rejects.toThrow('migration 003 failed');
  });

  it('should run migrations so tables exist', async () => {
    const { createAppContainer } = await import('./container');
    const container = await createAppContainer();

    const tables = await container.db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('horses');
    expect(tableNames).toContain('lineages');
    expect(tableNames).toContain('yearly_statuses');
  });
});

describe('createTestAppContainer', () => {
  it('should return a container with db and all 6 repositories', async () => {
    const { createTestAppContainer } = await import('./container.test-utils');
    const container = await createTestAppContainer();

    expect(container.db).toBeDefined();
    expect(container.repositories.horseRepository).toBeDefined();
    expect(container.repositories.yearlyStatusRepository).toBeDefined();
    expect(container.repositories.lineageRepository).toBeDefined();
    expect(container.repositories.settingsRepository).toBeDefined();
    expect(container.repositories.breedingRecordRepository).toBeDefined();
    expect(container.repositories.broodmareRepository).toBeDefined();
  });

  it('should have a functional database', async () => {
    const { createTestAppContainer } = await import('./container.test-utils');
    const container = await createTestAppContainer();

    const tables = await container.db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('horses');
    expect(tableNames).toContain('lineages');
  });

  it('should apply repository overrides', async () => {
    const { createTestAppContainer } = await import('./container.test-utils');
    const mockHorseRepo = {
      findById: vi.fn(),
    } as unknown as RepositoryContextValue['horseRepository'];

    const container = await createTestAppContainer({
      repositoryOverrides: { horseRepository: mockHorseRepo },
    });

    expect(container.repositories.horseRepository).toBe(mockHorseRepo);
    // Other repos should still be real
    expect(container.repositories.lineageRepository).toBeDefined();
    expect(container.repositories.lineageRepository).not.toBe(mockHorseRepo);
  });
});
