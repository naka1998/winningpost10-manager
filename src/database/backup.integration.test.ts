import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runMigrations } from './migrations';
import { createTestDatabase } from './connection.test-utils';
import { exportDatabase, importDatabase } from './backup';

class TestBlob {
  type: string;
  private readonly data: string;

  constructor(parts: BlobPart[], options?: BlobPropertyBag) {
    this.type = options?.type ?? '';
    this.data = parts
      .map((part) =>
        typeof part === 'string' ? part : new TextDecoder().decode(part as Uint8Array),
      )
      .join('');
  }

  async text(): Promise<string> {
    return this.data;
  }
}

async function resetDatabase(db: ReturnType<typeof createTestDatabase>): Promise<void> {
  await db.exec('PRAGMA foreign_keys = OFF;');
  const tables = await db.all<{ name: string }>(`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  `);
  for (const table of tables) {
    await db.exec(`DROP TABLE IF EXISTS "${table.name}"`);
  }
  await db.exec('PRAGMA foreign_keys = ON;');
  await runMigrations(db);
}

describe('backup restore integration', () => {
  let db = createTestDatabase();

  beforeEach(async () => {
    vi.stubGlobal('Blob', TestBlob);
    db = createTestDatabase();
    await runMigrations(db);
  });

  afterEach(async () => {
    await db.close();
    vi.unstubAllGlobals();
  });

  it('バックアップ→DB初期化→リストアで件数と主要関連を復元できる', async () => {
    await db.run('INSERT INTO lineages (name, lineage_type, parent_lineage_id) VALUES (?, ?, ?)', [
      'A系',
      'parent',
      null,
    ]);
    const lineage = await db.get<{ id: number }>('SELECT id FROM lineages WHERE name = ?', ['A系']);
    await db.run(
      'INSERT INTO horses (name, birth_year, sex, lineage_id, status, country) VALUES (?, ?, ?, ?, ?, ?)',
      ['テスト馬', 2026, '牡', lineage?.id ?? null, '現役', '日'],
    );
    const expectedHorseCount = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM horses',
    );
    const expectedLineageCount = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM lineages',
    );

    const backup = await exportDatabase(db);
    const backupContent = await (backup.blob as unknown as TestBlob).text();

    await resetDatabase(db);

    const file = {
      text: async () => backupContent,
    } as File;

    await importDatabase(db, file);

    const horseCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM horses');
    const lineageCount = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM lineages');
    const restored = await db.get<{ name: string; lineage_name: string }>(`
      SELECT h.name, l.name AS lineage_name
      FROM horses h
      LEFT JOIN lineages l ON h.lineage_id = l.id
      WHERE h.name = 'テスト馬'
    `);
    const trigger = await db.get<{ name: string }>(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'trigger'
        AND name = 'trg_lineages_insert_validate'
    `);
    const index = await db.get<{ name: string }>(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'index'
        AND name = 'idx_breeding_records_mare_year_unique'
    `);

    expect(horseCount?.count).toBe(expectedHorseCount?.count);
    expect(lineageCount?.count).toBe(expectedLineageCount?.count);
    expect(restored).toEqual({ name: 'テスト馬', lineage_name: 'A系' });
    expect(trigger?.name).toBe('trg_lineages_insert_validate');
    expect(index?.name).toBe('idx_breeding_records_mare_year_unique');
  });
});
