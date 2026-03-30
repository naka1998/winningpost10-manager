import { useEffect, useState, type ReactNode } from 'react';
import { initDatabase, type DatabaseConnection } from '@/database/connection';
import { runMigrations } from '@/database/migrations';
import { DatabaseContext } from './database-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [db, setDb] = useState<DatabaseConnection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    initDatabase()
      .then(async (connection) => {
        await runMigrations(connection);
        if (!cancelled) {
          setDb(connection);
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
          <h1 className="mb-2 text-xl font-bold text-red-600">データベース初期化エラー</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!db) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">データベースを初期化中...</p>
        </div>
      </div>
    );
  }

  return <DatabaseContext.Provider value={{ db }}>{children}</DatabaseContext.Provider>;
}
