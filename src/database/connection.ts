import SQLiteAsyncESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import { IDBBatchAtomicVFS } from 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js';
import { OriginPrivateFileSystemVFS } from 'wa-sqlite/src/examples/OriginPrivateFileSystemVFS.js';
import * as SQLite from 'wa-sqlite';

const DB_NAME = 'wp-breeding-manager';

export interface DatabaseConnection {
  run(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowId: number }>;
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

let instance: DatabaseConnection | null = null;

export async function initDatabase(): Promise<DatabaseConnection> {
  if (instance) return instance;

  const module = await SQLiteAsyncESMFactory();
  const sqlite3 = SQLite.Factory(module);

  // VFS selection: OPFS preferred, IndexedDB fallback
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function') {
      const vfs = new OriginPrivateFileSystemVFS(DB_NAME);
      await sqlite3.vfs_register(vfs, true);
    } else {
      throw new Error('OPFS not available');
    }
  } catch {
    const vfs = new IDBBatchAtomicVFS(DB_NAME);
    await sqlite3.vfs_register(vfs, true);
  }

  const db = await sqlite3.open_v2(DB_NAME);

  // Enable WAL mode and foreign keys
  await sqlite3.exec(db, 'PRAGMA journal_mode=WAL;');
  await sqlite3.exec(db, 'PRAGMA foreign_keys=ON;');

  instance = createWaSqliteConnection(sqlite3, db);
  return instance;
}

export function getDatabase(): DatabaseConnection {
  if (!instance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return instance;
}

function createWaSqliteConnection(
  sqlite3: SQLiteAPI,
  db: number,
): DatabaseConnection {
  async function execRows<T>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; changes: number; lastInsertRowId: number }> {
    const rows: T[] = [];

    for await (const stmt of sqlite3.statements(db, sql)) {
      if (params?.length) {
        sqlite3.bind_collection(
          stmt,
          params as (number | string | Uint8Array | number[] | bigint | null)[],
        );
      }

      const columnNames = sqlite3.column_names(stmt);

      while ((await sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
        const rowData = sqlite3.row(stmt);
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < columnNames.length; i++) {
          obj[columnNames[i]] = rowData[i];
        }
        rows.push(obj as T);
      }
    }

    return {
      rows,
      changes: sqlite3.changes(db),
      lastInsertRowId: 0, // wa-sqlite doesn't directly expose last_insert_rowid
    };
  }

  return {
    async run(sql: string, params?: unknown[]) {
      const result = await execRows(sql, params);
      // Get last_insert_rowid via a follow-up query
      let lastInsertRowId = 0;
      if (sql.trimStart().toUpperCase().startsWith('INSERT')) {
        const idResult = await execRows<{ id: number }>('SELECT last_insert_rowid() as id');
        lastInsertRowId = idResult.rows[0]?.id ?? 0;
      }
      return { changes: result.changes, lastInsertRowId };
    },

    async get<T = Record<string, unknown>>(sql: string, params?: unknown[]) {
      const result = await execRows<T>(sql, params);
      return result.rows[0];
    },

    async all<T = Record<string, unknown>>(sql: string, params?: unknown[]) {
      const result = await execRows<T>(sql, params);
      return result.rows;
    },

    async exec(sql: string) {
      await sqlite3.exec(db, sql);
    },

    async close() {
      await sqlite3.close(db);
      instance = null;
    },
  };
}
