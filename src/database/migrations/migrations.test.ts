import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '@/database/connection.test-utils';
import type { DatabaseConnection } from '@/database/connection';
import { runMigrations } from './index';

describe('migrations', () => {
  let db: DatabaseConnection;

  beforeEach(() => {
    db = createTestDatabase();
  });

  it('creates all tables on fresh database', async () => {
    await runMigrations(db);

    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('horses');
    expect(tableNames).toContain('yearly_statuses');
    expect(tableNames).toContain('lineages');
    expect(tableNames).toContain('breeding_records');
    expect(tableNames).toContain('race_plans');
    expect(tableNames).toContain('game_settings');
    expect(tableNames).toContain('import_logs');
  });

  it('creates all indexes', async () => {
    await runMigrations(db);

    const indexes = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name",
    );
    const indexNames = indexes.map((i) => i.name);

    expect(indexNames).toHaveLength(14);
    expect(indexNames).toContain('idx_horses_name');
    expect(indexNames).toContain('idx_horses_status');
    expect(indexNames).toContain('idx_horses_lineage');
    expect(indexNames).toContain('idx_horses_sire');
    expect(indexNames).toContain('idx_horses_dam');
    expect(indexNames).toContain('idx_yearly_statuses_horse_year');
    expect(indexNames).toContain('idx_yearly_statuses_year');
    expect(indexNames).toContain('idx_lineages_parent');
    expect(indexNames).toContain('idx_breeding_records_mare');
    expect(indexNames).toContain('idx_breeding_records_sire');
    expect(indexNames).toContain('idx_breeding_records_year');
    expect(indexNames).toContain('idx_breeding_records_mare_year_unique');
    expect(indexNames).toContain('idx_race_plans_horse_year');
    expect(indexNames).toContain('idx_race_plans_year');
  });

  it('sets db_version to 2', async () => {
    await runMigrations(db);

    const row = await db.get<{ value: string }>(
      "SELECT value FROM game_settings WHERE key = 'db_version'",
    );
    expect(row?.value).toBe('2');
  });

  it('inserts initial game settings', async () => {
    await runMigrations(db);

    const currentYear = await db.get<{ value: string }>(
      "SELECT value FROM game_settings WHERE key = 'current_year'",
    );
    expect(currentYear?.value).toBe('2025');

    const depth = await db.get<{ value: string }>(
      "SELECT value FROM game_settings WHERE key = 'pedigree_depth'",
    );
    expect(depth?.value).toBe('4');
  });

  it('seeds preset lineage data', async () => {
    await runMigrations(db);

    const count = await db.get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM lineages');
    expect(count!.cnt).toBeGreaterThan(0);

    // Check parent lineages exist
    const parents = await db.all<{ name: string }>(
      "SELECT name FROM lineages WHERE lineage_type = 'parent'",
    );
    const parentNames = parents.map((p) => p.name);
    expect(parentNames).toContain('ナスルーラ系');
    expect(parentNames).toContain('ノーザンダンサー系');
    expect(parentNames).toContain('サンデーサイレンス系');

    // Check child lineages have parent references
    const deepImpact = await db.get<{ parent_lineage_id: number | null }>(
      "SELECT parent_lineage_id FROM lineages WHERE name = 'ディープインパクト系'",
    );
    expect(deepImpact?.parent_lineage_id).not.toBeNull();
  });

  it('enforces hardening constraints', async () => {
    await runMigrations(db);

    const parent = await db.get<{ id: number }>(
      "SELECT id FROM lineages WHERE lineage_type = 'parent' LIMIT 1",
    );
    const child = await db.get<{ id: number }>(
      "SELECT id FROM lineages WHERE lineage_type = 'child' LIMIT 1",
    );

    await expect(
      db.run('INSERT INTO lineages (name, lineage_type, parent_lineage_id) VALUES (?, ?, ?)', [
        '不正親系統',
        'parent',
        parent!.id,
      ]),
    ).rejects.toThrow(/parent_lineage_id must be NULL/);

    await expect(
      db.run('INSERT INTO lineages (name, lineage_type, parent_lineage_id) VALUES (?, ?, ?)', [
        '不正子系統',
        'child',
        null,
      ]),
    ).rejects.toThrow(/parent_lineage_id is required/);

    await expect(
      db.run('INSERT INTO lineages (name, lineage_type, parent_lineage_id) VALUES (?, ?, ?)', [
        '不正子系統2',
        'child',
        child!.id,
      ]),
    ).rejects.toThrow(/parent must have lineage_type=parent/);

    const mare = await db.run('INSERT INTO horses (name, sex, status) VALUES (?, ?, ?)', [
      '制約牝馬',
      '牝',
      '繁殖牝馬',
    ]);
    const sire = await db.run('INSERT INTO horses (name, sex, status) VALUES (?, ?, ?)', [
      '制約牡馬',
      '牡',
      '種牡馬',
    ]);
    const invalid = await db.run('INSERT INTO horses (name, sex, status) VALUES (?, ?, ?)', [
      '制約セン馬',
      'セ',
      '現役',
    ]);

    await expect(
      db.run('UPDATE horses SET sex = ? WHERE id = ?', ['不明', invalid.lastInsertRowId]),
    ).rejects.toThrow(/horses.sex must be one of/);

    await expect(
      db.run('UPDATE horses SET sire_id = ?, dam_id = ? WHERE id = ?', [
        sire.lastInsertRowId,
        sire.lastInsertRowId,
        mare.lastInsertRowId,
      ]),
    ).rejects.toThrow(/sire_id and dam_id must be different/);

    await db.run('INSERT INTO breeding_records (mare_id, sire_id, year) VALUES (?, ?, ?)', [
      mare.lastInsertRowId,
      sire.lastInsertRowId,
      2025,
    ]);

    await expect(
      db.run('INSERT INTO breeding_records (mare_id, sire_id, year) VALUES (?, ?, ?)', [
        mare.lastInsertRowId,
        sire.lastInsertRowId,
        2025,
      ]),
    ).rejects.toThrow(/UNIQUE constraint failed/);

    await expect(
      db.run('INSERT INTO breeding_records (mare_id, sire_id, year) VALUES (?, ?, ?)', [
        mare.lastInsertRowId,
        mare.lastInsertRowId,
        2026,
      ]),
    ).rejects.toThrow(/mare_id and sire_id must be different/);

    await expect(
      db.run('INSERT INTO breeding_records (mare_id, sire_id, year) VALUES (?, ?, ?)', [
        invalid.lastInsertRowId,
        sire.lastInsertRowId,
        2026,
      ]),
    ).rejects.toThrow(/mare_id must reference/);
  });

  it('updates updated_at automatically on update', async () => {
    await runMigrations(db);

    const lineageId = (
      await db.run('INSERT INTO lineages (name, lineage_type) VALUES (?, ?)', [
        '更新親系統',
        'parent',
      ])
    ).lastInsertRowId;

    const horseId = (
      await db.run('INSERT INTO horses (name, sex, status) VALUES (?, ?, ?)', [
        '更新対象馬',
        '牡',
        '現役',
      ])
    ).lastInsertRowId;

    const mareId = (
      await db.run('INSERT INTO horses (name, sex, status) VALUES (?, ?, ?)', [
        '更新牝馬',
        '牝',
        '繁殖牝馬',
      ])
    ).lastInsertRowId;
    const sireId = (
      await db.run('INSERT INTO horses (name, sex, status) VALUES (?, ?, ?)', [
        '更新種牡馬',
        '牡',
        '種牡馬',
      ])
    ).lastInsertRowId;

    const breedingRecordId = (
      await db.run('INSERT INTO breeding_records (mare_id, sire_id, year) VALUES (?, ?, ?)', [
        mareId,
        sireId,
        2030,
      ])
    ).lastInsertRowId;

    await db.run("UPDATE lineages SET updated_at = '2000-01-01 00:00:00' WHERE id = ?", [
      lineageId,
    ]);
    await db.run("UPDATE horses SET updated_at = '2000-01-01 00:00:00' WHERE id = ?", [horseId]);
    await db.run("UPDATE breeding_records SET updated_at = '2000-01-01 00:00:00' WHERE id = ?", [
      breedingRecordId,
    ]);

    await db.run('UPDATE lineages SET notes = ? WHERE id = ?', ['updated', lineageId]);
    await db.run('UPDATE horses SET notes = ? WHERE id = ?', ['updated', horseId]);
    await db.run('UPDATE breeding_records SET notes = ? WHERE id = ?', [
      'updated',
      breedingRecordId,
    ]);

    const lineage = await db.get<{ updated_at: string }>(
      'SELECT updated_at FROM lineages WHERE id = ?',
      [lineageId],
    );
    const horse = await db.get<{ updated_at: string }>(
      'SELECT updated_at FROM horses WHERE id = ?',
      [horseId],
    );
    const breedingRecord = await db.get<{ updated_at: string }>(
      'SELECT updated_at FROM breeding_records WHERE id = ?',
      [breedingRecordId],
    );

    expect(lineage?.updated_at).not.toBe('2000-01-01 00:00:00');
    expect(horse?.updated_at).not.toBe('2000-01-01 00:00:00');
    expect(breedingRecord?.updated_at).not.toBe('2000-01-01 00:00:00');
  });

  it('is idempotent (running twice does not throw)', async () => {
    await runMigrations(db);
    await expect(runMigrations(db)).resolves.not.toThrow();

    // Verify data is not duplicated
    const version = await db.get<{ value: string }>(
      "SELECT value FROM game_settings WHERE key = 'db_version'",
    );
    expect(version?.value).toBe('2');
  });
});
