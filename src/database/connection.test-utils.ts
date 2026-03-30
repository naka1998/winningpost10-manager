import Database from 'better-sqlite3';
import type { DatabaseConnection } from './connection';

export function createTestDatabase(): DatabaseConnection {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return {
    async run(sql: string, params?: unknown[]) {
      const stmt = db.prepare(sql);
      const result = stmt.run(...(params ?? []));
      return {
        changes: result.changes,
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },

    async get<T = Record<string, unknown>>(sql: string, params?: unknown[]) {
      const stmt = db.prepare(sql);
      return stmt.get(...(params ?? [])) as T | undefined;
    },

    async all<T = Record<string, unknown>>(sql: string, params?: unknown[]) {
      const stmt = db.prepare(sql);
      return stmt.all(...(params ?? [])) as T[];
    },

    async exec(sql: string) {
      db.exec(sql);
    },

    async close() {
      db.close();
    },
  };
}
