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
      .mockResolvedValueOnce([] as never)
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
          tables: [
            {
              name: 'game_settings',
              createSql: 'CREATE TABLE game_settings (id INTEGER)',
              rows: [],
            },
            { name: 'lineages', createSql: 'CREATE TABLE lineages (id INTEGER)', rows: [] },
            { name: 'horses', createSql: 'CREATE TABLE horses (id INTEGER)', rows: [] },
            {
              name: 'yearly_statuses',
              createSql: 'CREATE TABLE yearly_statuses (id INTEGER)',
              rows: [],
            },
            {
              name: 'breeding_records',
              createSql: 'CREATE TABLE breeding_records (id INTEGER)',
              rows: [],
            },
          ],
          schemaObjects: [],
        }),
    } as File;

    await expect(importDatabase(db, file)).rejects.toThrow('スキーマバージョンが一致しません');
  });

  it('リストア前に必須テーブル欠落を検出して中断する', async () => {
    const db = createDbMock();
    vi.mocked(db.get).mockResolvedValueOnce({ value: '2' } as never);
    const file = {
      text: async () =>
        JSON.stringify({
          format: 'wp10-manager-backup-v1',
          exportedAt: '2026-04-02T00:00:00.000Z',
          schemaVersion: 2,
          tables: [],
          schemaObjects: [],
        }),
    } as File;

    await expect(importDatabase(db, file)).rejects.toThrow('テーブル定義が含まれていません');
    expect(db.exec).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('リストア前に不正テーブル定義を検出して中断する', async () => {
    const db = createDbMock();
    vi.mocked(db.get).mockResolvedValueOnce({ value: '2' } as never);
    const file = {
      text: async () =>
        JSON.stringify({
          format: 'wp10-manager-backup-v1',
          exportedAt: '2026-04-02T00:00:00.000Z',
          schemaVersion: 2,
          tables: [
            { name: 'game_settings', createSql: 'DROP TABLE game_settings', rows: [] },
            { name: 'lineages', createSql: 'CREATE TABLE lineages (id INTEGER)', rows: [] },
            { name: 'horses', createSql: 'CREATE TABLE horses (id INTEGER)', rows: [] },
            {
              name: 'yearly_statuses',
              createSql: 'CREATE TABLE yearly_statuses (id INTEGER)',
              rows: [],
            },
            {
              name: 'breeding_records',
              createSql: 'CREATE TABLE breeding_records (id INTEGER)',
              rows: [],
            },
          ],
          schemaObjects: [],
        }),
    } as File;

    await expect(importDatabase(db, file)).rejects.toThrow('テーブル定義が不正です');
    expect(db.exec).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
