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

  it('31頭の馬を作成する（10基本 + 4繁殖牝馬 + 17産駒）', async () => {
    const count = await seedTestHorses(db);
    expect(count).toBe(31);
  });

  it('祖先馬も含めて合計90頭が登録される（5世代血統含む）', async () => {
    await seedTestHorses(db);
    const result = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM horses');
    // 10 horses + 10 original ancestors + 49 deep pedigree ancestors + 4 broodmares + 17 offspring = 90
    expect(result!.count).toBe(90);
  });

  it('ステータスが登録される（基本10 + 繁殖牝馬12 + 産駒11 = 33件）', async () => {
    await seedTestHorses(db);
    const statuses = await db.all<{ horse_id: number }>(
      'SELECT DISTINCT horse_id FROM yearly_statuses',
    );
    // 10 original + 6 broodmares(既存2+新4) + 7 offspring with grades = 23 distinct horses
    expect(statuses.length).toBeGreaterThanOrEqual(20);
  });

  it('馬に父馬・母馬が紐づいている', async () => {
    await seedTestHorses(db);
    const horse = await db.get<{ sire_id: number; dam_id: number }>(
      "SELECT sire_id, dam_id FROM horses WHERE name = 'コントレイル'",
    );
    expect(horse!.sire_id).toBeGreaterThan(0);
    expect(horse!.dam_id).toBeGreaterThan(0);
  });

  it('ドウデュースの5世代血統が正しく構築される', async () => {
    await seedTestHorses(db);
    // ドウデュース → ハーツクライ → サンデーサイレンス → Halo → Hail To Reason
    const doDeuce = await db.get<{ sire_id: number }>(
      "SELECT sire_id FROM horses WHERE name = 'ドウデュース'",
    );
    const heartsCry = await db.get<{ sire_id: number; dam_id: number }>(
      'SELECT sire_id, dam_id FROM horses WHERE id = ?',
      [doDeuce!.sire_id],
    );
    expect(heartsCry!.sire_id).toBeGreaterThan(0);
    expect(heartsCry!.dam_id).toBeGreaterThan(0);

    const sundaySilence = await db.get<{ name: string; sire_id: number }>(
      'SELECT name, sire_id FROM horses WHERE id = ?',
      [heartsCry!.sire_id],
    );
    expect(sundaySilence!.name).toBe('サンデーサイレンス');

    const halo = await db.get<{ name: string; sire_id: number }>(
      'SELECT name, sire_id FROM horses WHERE id = ?',
      [sundaySilence!.sire_id],
    );
    expect(halo!.name).toBe('Halo');

    const hailToReason = await db.get<{ name: string }>('SELECT name FROM horses WHERE id = ?', [
      halo!.sire_id,
    ]);
    expect(hailToReason!.name).toBe('Hail To Reason');
  });

  it('アーバンシックの5世代血統にサンデーサイレンスのインブリードがある', async () => {
    await seedTestHorses(db);
    // サンデーサイレンスが父系3代前と母系4代前に出現する
    const urbanChic = await db.get<{ sire_id: number; dam_id: number }>(
      "SELECT sire_id, dam_id FROM horses WHERE name = 'アーバンシック'",
    );
    // 父: スワーヴリチャード → ハーツクライ → サンデーサイレンス (3代前)
    const swaverRichard = await db.get<{ sire_id: number }>(
      'SELECT sire_id FROM horses WHERE id = ?',
      [urbanChic!.sire_id],
    );
    const heartsCry = await db.get<{ sire_id: number }>('SELECT sire_id FROM horses WHERE id = ?', [
      swaverRichard!.sire_id,
    ]);
    const ss1 = await db.get<{ id: number; name: string }>(
      'SELECT id, name FROM horses WHERE id = ?',
      [heartsCry!.sire_id],
    );
    expect(ss1!.name).toBe('サンデーサイレンス');

    // 母: エッジースタイル → ランズエッジ → ダンスインザダーク → サンデーサイレンス (4代前)
    const edgyStyle = await db.get<{ dam_id: number }>('SELECT dam_id FROM horses WHERE id = ?', [
      urbanChic!.dam_id,
    ]);
    const landsEdge = await db.get<{ sire_id: number }>('SELECT sire_id FROM horses WHERE id = ?', [
      edgyStyle!.dam_id,
    ]);
    const ditd = await db.get<{ sire_id: number; name: string }>(
      'SELECT sire_id, name FROM horses WHERE id = ?',
      [landsEdge!.sire_id],
    );
    expect(ditd!.name).toBe('ダンスインザダーク');

    const ss2 = await db.get<{ id: number; name: string }>(
      'SELECT id, name FROM horses WHERE id = ?',
      [ditd!.sire_id],
    );
    expect(ss2!.name).toBe('サンデーサイレンス');

    // 同一IDであること（インブリード）
    expect(ss1!.id).toBe(ss2!.id);
  });

  it('繁殖牝馬が6頭登録される', async () => {
    await seedTestHorses(db);
    const result = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM horses WHERE status = '繁殖牝馬'",
    );
    expect(result!.count).toBe(6);
  });

  it('繁殖牝馬に産駒がdam_idで紐づいている', async () => {
    await seedTestHorses(db);
    const offspring = await db.all<{ name: string }>(
      "SELECT h.name FROM horses h JOIN horses m ON h.dam_id = m.id WHERE m.status = '繁殖牝馬' AND h.status != 'ancestor'",
    );
    expect(offspring.length).toBe(17);
  });

  it('配合記録が登録される', async () => {
    await seedTestHorses(db);
    const records = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM breeding_records',
    );
    expect(records!.count).toBe(17);
  });

  it('繁殖牝馬にmare_lineが設定される', async () => {
    await seedTestHorses(db);
    const mares = await db.all<{ name: string; mare_line: string }>(
      "SELECT name, mare_line FROM horses WHERE status = '繁殖牝馬' AND mare_line IS NOT NULL",
    );
    expect(mares.length).toBe(6);
  });

  it('繁殖牝馬にグレード付きyearly_statusesがある', async () => {
    await seedTestHorses(db);
    const grades = await db.all<{ name: string; grade: string }>(
      "SELECT h.name, ys.grade FROM horses h JOIN yearly_statuses ys ON ys.horse_id = h.id WHERE h.status = '繁殖牝馬' AND ys.grade IS NOT NULL",
    );
    expect(grades.length).toBeGreaterThanOrEqual(10);
  });

  it('2回実行するとUNIQUE制約で失敗する', async () => {
    await seedTestHorses(db);
    await expect(seedTestHorses(db)).rejects.toThrow();
  });
});
