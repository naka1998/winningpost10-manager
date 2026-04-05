import type { DatabaseConnection } from '../connection';

/**
 * race_plans テーブルに surface（馬場）カラムを追加
 */
export async function up(db: DatabaseConnection): Promise<void> {
  await db.exec(`
    ALTER TABLE race_plans ADD COLUMN surface TEXT;
  `);
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_race_plans_year_surface ON race_plans(year, surface);
  `);
}
