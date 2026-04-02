import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '@/database/connection.test-utils';
import type { DatabaseConnection } from '@/database/connection';
import { runMigrations } from '@/database/migrations';
import { createBroodmareRepository, type BroodmareRepository } from './repository';

describe('BroodmareRepository', () => {
  let db: DatabaseConnection;
  let repo: BroodmareRepository;

  beforeEach(async () => {
    db = createTestDatabase();
    await runMigrations(db);
    repo = createBroodmareRepository(db);
  });

  async function insertLineage(name: string): Promise<number> {
    const parent = await db.run("INSERT INTO lineages (name, lineage_type) VALUES (?, 'parent')", [
      `${name}-parent`,
    ]);
    const result = await db.run(
      "INSERT INTO lineages (name, lineage_type, parent_lineage_id) VALUES (?, 'child', ?)",
      [name, parent.lastInsertRowId],
    );
    return result.lastInsertRowId;
  }

  async function insertHorse(
    name: string,
    overrides: Record<string, unknown> = {},
  ): Promise<number> {
    const defaults: Record<string, unknown> = {
      name,
      sex: '牝',
      birth_year: 2015,
      status: 'ancestor',
    };
    const data = { ...defaults, ...overrides };
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const result = await db.run(
      `INSERT INTO horses (${keys.join(', ')}) VALUES (${placeholders})`,
      keys.map((k) => data[k]),
    );
    return result.lastInsertRowId;
  }

  async function insertBreedingRecord(
    mareId: number,
    sireId: number,
    year: number,
    overrides: Record<string, unknown> = {},
  ): Promise<number> {
    const data: Record<string, unknown> = {
      mare_id: mareId,
      sire_id: sireId,
      year,
      ...overrides,
    };
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const result = await db.run(
      `INSERT INTO breeding_records (${keys.join(', ')}) VALUES (${placeholders})`,
      keys.map((k) => data[k]),
    );
    return result.lastInsertRowId;
  }

  async function insertYearlyStatus(
    horseId: number,
    year: number,
    grade: string | null,
  ): Promise<void> {
    await db.run('INSERT INTO yearly_statuses (horse_id, year, grade) VALUES (?, ?, ?)', [
      horseId,
      year,
      grade,
    ]);
  }

  describe('findAllSummaries', () => {
    it('returns empty array when no broodmares exist', async () => {
      const summaries = await repo.findAllSummaries(2026);
      expect(summaries).toEqual([]);
    });

    it('returns broodmare with basic info and age', async () => {
      await insertHorse('テスト牝馬', { status: '繁殖牝馬', birth_year: 2015 });

      const summaries = await repo.findAllSummaries(2026);
      expect(summaries).toHaveLength(1);
      expect(summaries[0].name).toBe('テスト牝馬');
      expect(summaries[0].birthYear).toBe(2015);
      expect(summaries[0].age).toBe(12); // 2026 - 2015 + 1
    });

    it('calculates breeding start year from breeding_records', async () => {
      const mareId = await insertHorse('繁殖牝馬A', { status: '繁殖牝馬', birth_year: 2015 });
      const sireId = await insertHorse('種牡馬A', { status: '種牡馬', sex: '牡' });
      await insertBreedingRecord(mareId, sireId, 2020);
      await insertBreedingRecord(mareId, sireId, 2022);

      const summaries = await repo.findAllSummaries(2026);
      expect(summaries[0].breedingStartYear).toBe(2020);
    });

    it('counts offspring and active offspring correctly', async () => {
      const mareId = await insertHorse('繁殖牝馬B', { status: '繁殖牝馬', birth_year: 2014 });
      await insertHorse('産駒1', { dam_id: mareId, status: '現役', sex: '牡', birth_year: 2021 });
      await insertHorse('産駒2', { dam_id: mareId, status: '現役', sex: '牝', birth_year: 2022 });
      await insertHorse('産駒3', { dam_id: mareId, status: '引退', sex: '牡', birth_year: 2020 });

      const summaries = await repo.findAllSummaries(2026);
      expect(summaries[0].offspringCount).toBe(3);
      expect(summaries[0].activeOffspringCount).toBe(2);
    });

    it('does not count ancestor offspring', async () => {
      const mareId = await insertHorse('繁殖牝馬C', { status: '繁殖牝馬', birth_year: 2014 });
      await insertHorse('産駒1', { dam_id: mareId, status: '現役', sex: '牡', birth_year: 2021 });
      await insertHorse('祖先産駒', { dam_id: mareId, status: 'ancestor' });

      const summaries = await repo.findAllSummaries(2026);
      expect(summaries[0].offspringCount).toBe(1);
    });

    it('returns grade distribution from offspring yearly_statuses', async () => {
      const mareId = await insertHorse('実績牝馬', { status: '繁殖牝馬', birth_year: 2012 });
      const offspring1 = await insertHorse('産駒G3', {
        dam_id: mareId,
        status: '現役',
        birth_year: 2020,
      });
      const offspring2 = await insertHorse('産駒G1', {
        dam_id: mareId,
        status: '現役',
        birth_year: 2021,
      });
      const offspring3 = await insertHorse('産駒G1b', {
        dam_id: mareId,
        status: '現役',
        birth_year: 2022,
      });
      await insertYearlyStatus(offspring1, 2023, 'G3');
      await insertYearlyStatus(offspring2, 2024, 'G1');
      await insertYearlyStatus(offspring3, 2025, 'G1');
      // 繁殖牝馬自身のグレードは含めない
      await insertYearlyStatus(mareId, 2015, 'G2');

      const summaries = await repo.findAllSummaries(2026);
      expect(summaries[0].gradeDistribution).toEqual([
        { grade: 'G1', count: 2 },
        { grade: 'G3', count: 1 },
      ]);
    });

    it('returns empty gradeDistribution when offspring have no grades', async () => {
      const mareId = await insertHorse('無実績牝馬', { status: '繁殖牝馬', birth_year: 2018 });
      await insertHorse('産駒', { dam_id: mareId, status: '現役', birth_year: 2023 });

      const summaries = await repo.findAllSummaries(2026);
      expect(summaries[0].gradeDistribution).toEqual([]);
    });

    it('returns empty gradeDistribution when no offspring', async () => {
      await insertHorse('子なし牝馬', { status: '繁殖牝馬', birth_year: 2018 });

      const summaries = await repo.findAllSummaries(2026);
      expect(summaries[0].gradeDistribution).toEqual([]);
    });

    it('uses best grade per offspring not all grades', async () => {
      const mareId = await insertHorse('実績牝馬2', { status: '繁殖牝馬', birth_year: 2012 });
      const offspring1 = await insertHorse('産駒X', {
        dam_id: mareId,
        status: '現役',
        birth_year: 2020,
      });
      // Same offspring has G3 and G1 → best is G1
      await insertYearlyStatus(offspring1, 2023, 'G3');
      await insertYearlyStatus(offspring1, 2024, 'G1');

      const summaries = await repo.findAllSummaries(2026);
      expect(summaries[0].gradeDistribution).toEqual([{ grade: 'G1', count: 1 }]);
    });

    it('calculates avgGradeScore (G1=5, G2=2, G3=1, none=0)', async () => {
      const mareId = await insertHorse('スコア牝馬', { status: '繁殖牝馬', birth_year: 2012 });
      const o1 = await insertHorse('G1産駒', {
        dam_id: mareId,
        status: '現役',
        birth_year: 2020,
      });
      const o2 = await insertHorse('G3産駒', {
        dam_id: mareId,
        status: '現役',
        birth_year: 2021,
      });
      await insertHorse('無冠産駒', {
        dam_id: mareId,
        status: '現役',
        birth_year: 2022,
      });
      await insertYearlyStatus(o1, 2023, 'G1');
      await insertYearlyStatus(o2, 2024, 'G3');
      // o3 has no grade → score 0

      const summaries = await repo.findAllSummaries(2026);
      // (5 + 1 + 0) / 3 = 2.0
      expect(summaries[0].avgGradeScore).toBe(2);
    });

    it('returns null avgGradeScore when no offspring', async () => {
      await insertHorse('子なし2', { status: '繁殖牝馬', birth_year: 2018 });

      const summaries = await repo.findAllSummaries(2026);
      expect(summaries[0].avgGradeScore).toBeNull();
    });

    it('excludes non-broodmare horses', async () => {
      await insertHorse('現役馬', { status: '現役', sex: '牝', birth_year: 2020 });
      await insertHorse('繁殖牝馬D', { status: '繁殖牝馬', birth_year: 2015 });

      const summaries = await repo.findAllSummaries(2026);
      expect(summaries).toHaveLength(1);
      expect(summaries[0].name).toBe('繁殖牝馬D');
    });

    it('calculates average evaluation and total power from breeding_records', async () => {
      const mareId = await insertHorse('評価牝馬', { status: '繁殖牝馬', birth_year: 2015 });
      const sire1 = await insertHorse('種牡馬1', { status: '種牡馬', sex: '牡' });
      const sire2 = await insertHorse('種牡馬2', { status: '種牡馬', sex: '牡' });
      // S=5, A=4 → avg = 4.5
      await insertBreedingRecord(mareId, sire1, 2020, { evaluation: 'S', total_power: 90 });
      await insertBreedingRecord(mareId, sire2, 2021, { evaluation: 'A', total_power: 80 });

      const summaries = await repo.findAllSummaries(2026);
      expect(summaries[0].avgEvaluation).toBe(4.5);
      expect(summaries[0].avgTotalPower).toBe(85);
    });

    it('returns null averages when no breeding records', async () => {
      await insertHorse('無配合牝馬', { status: '繁殖牝馬', birth_year: 2018 });

      const summaries = await repo.findAllSummaries(2026);
      expect(summaries[0].avgEvaluation).toBeNull();
      expect(summaries[0].avgTotalPower).toBeNull();
    });

    it('sorts by name ascending by default', async () => {
      await insertHorse('Ｂ牝馬', { status: '繁殖牝馬', birth_year: 2015 });
      await insertHorse('Ａ牝馬', { status: '繁殖牝馬', birth_year: 2016 });

      const summaries = await repo.findAllSummaries(2026);
      expect(summaries[0].name).toBe('Ａ牝馬');
      expect(summaries[1].name).toBe('Ｂ牝馬');
    });

    it('sorts by offspringCount descending', async () => {
      const mare1 = await insertHorse('少産駒牝馬', { status: '繁殖牝馬', birth_year: 2015 });
      const mare2 = await insertHorse('多産駒牝馬', { status: '繁殖牝馬', birth_year: 2015 });
      await insertHorse('産駒A', { dam_id: mare1, status: '現役', birth_year: 2021 });
      await insertHorse('産駒B', { dam_id: mare2, status: '現役', birth_year: 2021 });
      await insertHorse('産駒C', { dam_id: mare2, status: '現役', birth_year: 2022 });

      const summaries = await repo.findAllSummaries(2026, {
        sortBy: 'offspringCount',
        sortOrder: 'desc',
      });
      expect(summaries[0].name).toBe('多産駒牝馬');
      expect(summaries[1].name).toBe('少産駒牝馬');
    });
  });

  describe('findOffspring', () => {
    it('returns empty array when no offspring', async () => {
      const mareId = await insertHorse('子なし牝馬', { status: '繁殖牝馬' });
      const offspring = await repo.findOffspring(mareId);
      expect(offspring).toEqual([]);
    });

    it('returns offspring with sire name and best grade', async () => {
      const sireId = await insertHorse('種牡馬X', {
        status: '種牡馬',
        sex: '牡',
        birth_year: 2010,
      });
      const mareId = await insertHorse('繁殖牝馬X', { status: '繁殖牝馬', birth_year: 2012 });
      const offspringId = await insertHorse('子馬X', {
        dam_id: mareId,
        sire_id: sireId,
        status: '現役',
        sex: '牡',
        birth_year: 2020,
      });
      await insertYearlyStatus(offspringId, 2023, 'G2');
      await insertYearlyStatus(offspringId, 2024, 'G1');

      const offspring = await repo.findOffspring(mareId);
      expect(offspring).toHaveLength(1);
      expect(offspring[0].name).toBe('子馬X');
      expect(offspring[0].sex).toBe('牡');
      expect(offspring[0].birthYear).toBe(2020);
      expect(offspring[0].status).toBe('現役');
      expect(offspring[0].sireName).toBe('種牡馬X');
      expect(offspring[0].bestGrade).toBe('G1');
    });

    it('returns breeding record data when offspring_id is linked', async () => {
      const sireId = await insertHorse('種牡馬Z', { status: '種牡馬', sex: '牡' });
      const mareId = await insertHorse('繁殖牝馬Z', { status: '繁殖牝馬', birth_year: 2012 });
      const offspringId = await insertHorse('子馬Z', {
        dam_id: mareId,
        sire_id: sireId,
        status: '現役',
        sex: '牡',
        birth_year: 2022,
      });
      await insertBreedingRecord(mareId, sireId, 2021, {
        offspring_id: offspringId,
        evaluation: 'A',
        total_power: 85,
        notes: 'テストメモ',
      });

      const offspring = await repo.findOffspring(mareId);
      expect(offspring).toHaveLength(1);
      expect(offspring[0].evaluation).toBe('A');
      expect(offspring[0].totalPower).toBe(85);
      expect(offspring[0].breedingNotes).toBe('テストメモ');
    });

    it('returns null breeding data when no breeding record linked', async () => {
      const mareId = await insertHorse('繁殖牝馬W', { status: '繁殖牝馬', birth_year: 2012 });
      await insertHorse('子馬W', {
        dam_id: mareId,
        status: '現役',
        birth_year: 2022,
      });

      const offspring = await repo.findOffspring(mareId);
      expect(offspring[0].evaluation).toBeNull();
      expect(offspring[0].totalPower).toBeNull();
      expect(offspring[0].breedingNotes).toBeNull();
    });

    it('excludes ancestor offspring', async () => {
      const mareId = await insertHorse('繁殖牝馬Y', { status: '繁殖牝馬', birth_year: 2012 });
      await insertHorse('実産駒', { dam_id: mareId, status: '現役', birth_year: 2020 });
      await insertHorse('祖先産駒', { dam_id: mareId, status: 'ancestor' });

      const offspring = await repo.findOffspring(mareId);
      expect(offspring).toHaveLength(1);
      expect(offspring[0].name).toBe('実産駒');
    });
  });

  describe('getSireLineDistribution', () => {
    it('returns empty array when no data', async () => {
      const dist = await repo.getSireLineDistribution();
      expect(dist).toEqual([]);
    });

    it('returns sire lineage distribution of offspring', async () => {
      const lineageA = await insertLineage('テスト系統Ａ');
      const lineageB = await insertLineage('テスト系統Ｂ');
      const sire1 = await insertHorse('種牡馬1', {
        status: '種牡馬',
        sex: '牡',
        lineage_id: lineageA,
      });
      const sire2 = await insertHorse('種牡馬2', {
        status: '種牡馬',
        sex: '牡',
        lineage_id: lineageB,
      });
      const mare = await insertHorse('繁殖牝馬1', { status: '繁殖牝馬' });
      await insertHorse('産駒1', {
        dam_id: mare,
        sire_id: sire1,
        status: '現役',
        birth_year: 2021,
      });
      await insertHorse('産駒2', {
        dam_id: mare,
        sire_id: sire1,
        status: '現役',
        birth_year: 2022,
      });
      await insertHorse('産駒3', {
        dam_id: mare,
        sire_id: sire2,
        status: '現役',
        birth_year: 2023,
      });

      const dist = await repo.getSireLineDistribution();
      expect(dist).toHaveLength(2);
      expect(dist[0]).toEqual({ name: 'テスト系統Ａ', count: 2 });
      expect(dist[1]).toEqual({ name: 'テスト系統Ｂ', count: 1 });
    });
  });

  describe('getDamLineDistribution', () => {
    it('returns empty array when no broodmares have mare_line', async () => {
      await insertHorse('牝馬', { status: '繁殖牝馬' });
      const dist = await repo.getDamLineDistribution();
      expect(dist).toEqual([]);
    });

    it('returns mare_line distribution of broodmares', async () => {
      await insertHorse('牝馬A', { status: '繁殖牝馬', mare_line: 'フロリースカップ系' });
      await insertHorse('牝馬B', { status: '繁殖牝馬', mare_line: 'フロリースカップ系' });
      await insertHorse('牝馬C', { status: '繁殖牝馬', mare_line: 'ビューチフルドリーマー系' });

      const dist = await repo.getDamLineDistribution();
      expect(dist).toHaveLength(2);
      expect(dist[0]).toEqual({ name: 'フロリースカップ系', count: 2 });
      expect(dist[1]).toEqual({ name: 'ビューチフルドリーマー系', count: 1 });
    });
  });

  describe('getStallionDistribution', () => {
    it('returns empty array when no breeding records', async () => {
      const dist = await repo.getStallionDistribution();
      expect(dist).toEqual([]);
    });

    it('returns stallion usage distribution', async () => {
      const sire1 = await insertHorse('ディープ', { status: '種牡馬', sex: '牡' });
      const sire2 = await insertHorse('キタサン', { status: '種牡馬', sex: '牡' });
      const mare1 = await insertHorse('牝馬1', { status: '繁殖牝馬' });
      const mare2 = await insertHorse('牝馬2', { status: '繁殖牝馬' });
      await insertBreedingRecord(mare1, sire1, 2022);
      await insertBreedingRecord(mare1, sire1, 2023);
      await insertBreedingRecord(mare2, sire2, 2023);

      const dist = await repo.getStallionDistribution();
      expect(dist).toHaveLength(2);
      expect(dist[0]).toEqual({ name: 'ディープ', count: 2 });
      expect(dist[1]).toEqual({ name: 'キタサン', count: 1 });
    });
  });
});
