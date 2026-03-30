import Database from 'better-sqlite3';
import type { DatabaseConnection } from './connection';

export function createTestDatabase(): DatabaseConnection {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const connection: DatabaseConnection = {
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

    async transaction<T>(fn: (conn: DatabaseConnection) => Promise<T>): Promise<T> {
      db.exec('BEGIN');
      try {
        const result = await fn(connection);
        db.exec('COMMIT');
        return result;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    async close() {
      db.close();
    },
  };

  return connection;
}
