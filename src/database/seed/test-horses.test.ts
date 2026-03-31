import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '@/database/connection.test-utils';
import { runMigrations } from '@/database/migrations';
import type { DatabaseConnection } from '@/database/connection';
import { seedTestHorses } from './test-horses';

describe('seedTestHorses', () => {
  let db: DatabaseConnection;

  beforeEach(async () => {
    db = createTestDatabase();
    await runMigrations(db);
  });

  it('10頭の馬を作成する', async () => {
    const count = await seedTestHorses(db);
    expect(count).toBe(10);
  });

  it('祖先馬も含めて合計20頭が登録される', async () => {
    await seedTestHorses(db);
    const result = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM horses');
    expect(result!.count).toBe(20);
  });

  it('現役馬にはステータスが登録される', async () => {
    await seedTestHorses(db);
    const statuses = await db.all<{ horse_id: number }>(
      'SELECT DISTINCT horse_id FROM yearly_statuses',
    );
    expect(statuses).toHaveLength(10);
  });

  it('馬に父馬・母馬が紐づいている', async () => {
    await seedTestHorses(db);
    const horse = await db.get<{ sire_id: number; dam_id: number }>(
      "SELECT sire_id, dam_id FROM horses WHERE name = 'コントレイル'",
    );
    expect(horse!.sire_id).toBeGreaterThan(0);
    expect(horse!.dam_id).toBeGreaterThan(0);
  });

  it('2回実行するとUNIQUE制約で失敗する', async () => {
    await seedTestHorses(db);
    await expect(seedTestHorses(db)).rejects.toThrow();
  });
});
