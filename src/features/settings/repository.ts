import type { DatabaseConnection } from '@/database/connection';

export interface SettingsRepository {
  get(key: string): Promise<string | null>;
  getAll(): Promise<Record<string, string>>;
  set(key: string, value: string): Promise<void>;
}

export function createSettingsRepository(db: DatabaseConnection): SettingsRepository {
  return {
    async get(key: string) {
      const row = await db.get<{ value: string }>('SELECT value FROM game_settings WHERE key = ?', [
        key,
      ]);
      return row ? row.value : null;
    },

    async getAll() {
      const rows = await db.all<{ key: string; value: string }>(
        'SELECT key, value FROM game_settings',
      );
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.key] = row.value;
      }
      return result;
    },

    async set(key: string, value: string) {
      await db.run(
        "INSERT OR REPLACE INTO game_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))",
        [key, value],
      );
    },
  };
}
