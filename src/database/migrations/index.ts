import type { DatabaseConnection } from '../connection';
import { up as initialMigration } from './001_initial';
import { up as constraintsHardeningMigration } from './002_constraints_hardening';
import { up as lineagesParentDemotionGuardMigration } from './003_lineages_parent_demotion_guard';

interface Migration {
  version: number;
  description: string;
  up: (db: DatabaseConnection) => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: '初期スキーマ作成',
    up: initialMigration,
  },
  {
    version: 2,
    description: '制約強化と updated_at トリガー追加',
    up: constraintsHardeningMigration,
  },
  {
    version: 3,
    description: 'lineages 親降格ガードを強化',
    up: lineagesParentDemotionGuardMigration,
  },
];

/**
 * Bootstrap the game_settings table and run all pending migrations.
 */
export async function runMigrations(db: DatabaseConnection): Promise<void> {
  // Bootstrap: ensure game_settings table exists before checking version
  await db.exec(`
    CREATE TABLE IF NOT EXISTS game_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const currentVersion = await getCurrentVersion(db);

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      await db.transaction(async (tx) => {
        await migration.up(tx);
        await setVersion(tx, migration.version);
      });
    }
  }
}

async function getCurrentVersion(db: DatabaseConnection): Promise<number> {
  const row = await db.get<{ value: string }>(
    "SELECT value FROM game_settings WHERE key = 'db_version'",
  );
  return row ? parseInt(row.value, 10) : 0;
}

async function setVersion(db: DatabaseConnection, version: number): Promise<void> {
  await db.run(
    "INSERT OR REPLACE INTO game_settings (key, value, updated_at) VALUES ('db_version', ?, datetime('now'))",
    [String(version)],
  );
}
