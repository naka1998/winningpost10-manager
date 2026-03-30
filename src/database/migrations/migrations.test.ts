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

    expect(indexNames).toHaveLength(13);
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
    expect(indexNames).toContain('idx_race_plans_horse_year');
    expect(indexNames).toContain('idx_race_plans_year');
  });

  it('sets db_version to 1', async () => {
    await runMigrations(db);

    const row = await db.get<{ value: string }>(
      "SELECT value FROM game_settings WHERE key = 'db_version'",
    );
    expect(row?.value).toBe('1');
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

  it('is idempotent (running twice does not throw)', async () => {
    await runMigrations(db);
    await expect(runMigrations(db)).resolves.not.toThrow();

    // Verify data is not duplicated
    const version = await db.get<{ value: string }>(
      "SELECT value FROM game_settings WHERE key = 'db_version'",
    );
    expect(version?.value).toBe('1');
  });
});
