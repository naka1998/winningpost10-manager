import { createContext, useContext } from 'react';
import type { DatabaseConnection } from '@/database/connection';

export interface DatabaseContextValue {
  db: DatabaseConnection;
}

export const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function useDatabaseContext(): DatabaseContextValue {
  const ctx = useContext(DatabaseContext);
  if (!ctx) {
    throw new Error('useDatabaseContext must be used within a DatabaseProvider');
  }
  return ctx;
}
