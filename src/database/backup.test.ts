import { describe, expect, it, vi } from 'vitest';
import { createBackupFilename, exportDatabase, importDatabase } from './backup';
import type { DatabaseConnection } from './connection';

function createDbMock(): DatabaseConnection {
  return {
    run: vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 })),
    get: vi.fn(),
    all: vi.fn(),
    exec: vi.fn(),
    transaction: vi.fn(async (fn) => fn(createDbMock())),
    close: vi.fn(),
  };
}

describe('backup utilities', () => {
  it('バックアップファイル名の命名規則を満たす', () => {
    const name = createBackupFilename(new Date('2026-04-02T09:30:15Z'));
    expect(name).toBe('wp10-manager-backup-20260402-093015.json');
  });

  it('エクスポート時にメタ情報付きスナップショットを作成できる', async () => {
    const db = createDbMock();
    vi.mocked(db.get).mockResolvedValueOnce({ value: '2' } as never);
    vi.mocked(db.all)
      .mockResolvedValueOnce([
        {
          name: 'game_settings',
          sql: 'CREATE TABLE game_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
        },
      ] as never)
      .mockResolvedValueOnce([{ key: 'current_year', value: '2026' }] as never);

    const result = await exportDatabase(db);

    expect(result.filename).toMatch(/^wp10-manager-backup-\d{8}-\d{6}\.json$/);
    expect(result.blob.type).toBe('application/json');
    expect(db.get).toHaveBeenCalledWith("SELECT value FROM game_settings WHERE key = 'db_version'");
  });

  it('リストア時にスキーマバージョン不一致をガードする', async () => {
    const db = createDbMock();
    vi.mocked(db.get).mockResolvedValueOnce({ value: '3' } as never);
    const file = {
      text: async () =>
        JSON.stringify({
          format: 'wp10-manager-backup-v1',
          exportedAt: '2026-04-02T00:00:00.000Z',
          schemaVersion: 2,
          tables: [],
        }),
    } as File;

    await expect(importDatabase(db, file)).rejects.toThrow('スキーマバージョンが一致しません');
  });
});
