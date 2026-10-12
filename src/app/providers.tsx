import { useEffect, useState, type ReactNode } from 'react';
import { createAppContainer, type AppContainer } from './container';
import { DatabaseContext } from './database-context';
import { RepositoryContext } from './repository-context';
import { ServiceContext } from './service-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [container, setContainer] = useState<AppContainer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    createAppContainer()
      .then((c) => {
        if (!cancelled) {
          setContainer(c);
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

  if (!container) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">データベースを初期化中...</p>
        </div>
      </div>
    );
  }

  return (
    <DatabaseContext.Provider value={{ db: container.db }}>
      <RepositoryContext.Provider value={container.repositories}>
        <ServiceContext.Provider value={container.services}>{children}</ServiceContext.Provider>
      </RepositoryContext.Provider>
    </DatabaseContext.Provider>
  );
}
