import { useEffect, useState, type ReactNode } from 'react';
import { initDatabase, type DatabaseConnection } from '@/database/connection';
import { runMigrations } from '@/database/migrations';
import { createHorseRepository } from '@/features/horses/repository';
import { createYearlyStatusRepository } from '@/features/horses/yearly-status-repository';
import { createLineageRepository } from '@/features/lineages/repository';
import { createSettingsRepository } from '@/features/settings/repository';
import { createBreedingRecordRepository } from '@/features/breeding-records/repository';
import { DatabaseContext } from './database-context';
import { RepositoryContext, type RepositoryContextValue } from './repository-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [db, setDb] = useState<DatabaseConnection | null>(null);
  const [repos, setRepos] = useState<RepositoryContextValue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    initDatabase()
      .then(async (connection) => {
        await runMigrations(connection);
        if (!cancelled) {
          setDb(connection);
          setRepos({
            horseRepository: createHorseRepository(connection),
            yearlyStatusRepository: createYearlyStatusRepository(connection),
            lineageRepository: createLineageRepository(connection),
            settingsRepository: createSettingsRepository(connection),
            breedingRecordRepository: createBreedingRecordRepository(connection),
          });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 text-xl font-bold text-destructive">データベース初期化エラー</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!db || !repos) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">データベースを初期化中...</p>
        </div>
      </div>
    );
  }

  return (
    <DatabaseContext.Provider value={{ db }}>
      <RepositoryContext.Provider value={repos}>{children}</RepositoryContext.Provider>
    </DatabaseContext.Provider>
  );
}
