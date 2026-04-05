import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '@/database/connection.test-utils';
import type { DatabaseConnection } from '@/database/connection';
import { runMigrations } from '@/database/migrations';
import { createHorseRepository, type HorseRepository } from './repository';
import {
  createYearlyStatusRepository,
  type YearlyStatusRepository,
} from './yearly-status-repository';

describe('YearlyStatusRepository', () => {
  let db: DatabaseConnection;
  let horseRepo: HorseRepository;
  let repo: YearlyStatusRepository;
  let horseId: number;

  beforeEach(async () => {
    db = createTestDatabase();
    await runMigrations(db);
    horseRepo = createHorseRepository(db);
    repo = createYearlyStatusRepository(db);

    // Create a test horse for yearly statuses
    const horse = await horseRepo.create({
      name: 'テスト馬',
      sex: '牡',
      birthYear: 2020,
      status: '現役',
    });
    horseId = horse.id;
  });

  describe('create and findById', () => {
    it('creates a yearly status and retrieves it by id', async () => {
      const status = await repo.create({
        horseId,
        year: 2023,
        spRank: 'A',
        spValue: 75,
        powerRank: 'B+',
        turfAptitude: '◎',
        dirtAptitude: '○',
        distanceMin: 1600,
        distanceMax: 2400,
        growthType: '普通',
        raceRecord: '10戦7勝',
      });

      expect(status.id).toBeGreaterThan(0);
      expect(status.horseId).toBe(horseId);
      expect(status.year).toBe(2023);
      expect(status.spRank).toBe('A');
      expect(status.spValue).toBe(75);
      expect(status.powerRank).toBe('B+');
      expect(status.turfAptitude).toBe('◎');
      expect(status.dirtAptitude).toBe('○');
      expect(status.distanceMin).toBe(1600);
      expect(status.distanceMax).toBe(2400);
      expect(status.growthType).toBe('普通');
      expect(status.raceRecord).toBe('10戦7勝');

      const found = await repo.findById(status.id);
      expect(found).not.toBeNull();
      expect(found!.year).toBe(2023);
      expect(found!.spRank).toBe('A');
    });

    it('returns null for non-existent id', async () => {
      const found = await repo.findById(9999);
      expect(found).toBeNull();
    });

    it('stores and retrieves JSON fields (runningStyle, traits)', async () => {
      const status = await repo.create({
        horseId,
        year: 2023,
        runningStyle: ['先', '差'],
        traits: ['大舞台', '鉄砲'],
      });

      const found = await repo.findById(status.id);
      expect(found!.runningStyle).toEqual(['先', '差']);
      expect(found!.traits).toEqual(['大舞台', '鉄砲']);
    });
  });

  describe('findByHorseId', () => {
    it('returns statuses for a horse sorted by year DESC', async () => {
      await repo.create({ horseId, year: 2022, spRank: 'B' });
      await repo.create({ horseId, year: 2024, spRank: 'A' });
      await repo.create({ horseId, year: 2023, spRank: 'B+' });

      const statuses = await repo.findByHorseId(horseId);
      expect(statuses).toHaveLength(3);
      expect(statuses[0].year).toBe(2024);
      expect(statuses[1].year).toBe(2023);
      expect(statuses[2].year).toBe(2022);
    });

    it('returns empty array for horse with no statuses', async () => {
      const statuses = await repo.findByHorseId(horseId);
      expect(statuses).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates yearly status fields', async () => {
      const status = await repo.create({
        horseId,
        year: 2023,
        spRank: 'B',
        spValue: 65,
      });

      const updated = await repo.update(status.id, {
        spRank: 'A',
        spValue: 78,
        jockey: 'ルメール',
      });

      expect(updated.spRank).toBe('A');
      expect(updated.spValue).toBe(78);
      expect(updated.jockey).toBe('ルメール');
      expect(updated.year).toBe(2023);
    });

    it('throws error for non-existent id', async () => {
      await expect(repo.update(9999, { spRank: 'A' })).rejects.toThrow(
        'YearlyStatus not found: id=9999',
      );
    });
  });

  describe('delete', () => {
    it('deletes a yearly status', async () => {
      const status = await repo.create({ horseId, year: 2023 });
      await repo.delete(status.id);

      const found = await repo.findById(status.id);
      expect(found).toBeNull();
    });
  });

  describe('UNIQUE constraint', () => {
    it('rejects duplicate horse_id + year combination', async () => {
      await repo.create({ horseId, year: 2023 });
      await expect(repo.create({ horseId, year: 2023 })).rejects.toThrow();
    });
  });

  describe('findLatestByYear', () => {
    it('returns data from exact year match', async () => {
      await repo.create({ horseId, year: 2026, turfAptitude: '◎' });

      const results = await repo.findLatestByYear(2026);
      expect(results).toHaveLength(1);
      expect(results[0].horseId).toBe(horseId);
      expect(results[0].turfAptitude).toBe('◎');
    });

    it('falls back to earlier year when exact year has no data', async () => {
      await repo.create({ horseId, year: 2025, turfAptitude: '○' });

      const results = await repo.findLatestByYear(2026);
      expect(results).toHaveLength(1);
      expect(results[0].year).toBe(2025);
      expect(results[0].turfAptitude).toBe('○');
    });

    it('uses most recent year within bound', async () => {
      await repo.create({ horseId, year: 2024, turfAptitude: '△' });
      await repo.create({ horseId, year: 2025, turfAptitude: '◎' });

      const results = await repo.findLatestByYear(2026);
      expect(results).toHaveLength(1);
      expect(results[0].year).toBe(2025);
      expect(results[0].turfAptitude).toBe('◎');
    });

    it('does not return future data', async () => {
      await repo.create({ horseId, year: 2027, turfAptitude: '◎' });

      const results = await repo.findLatestByYear(2026);
      expect(results).toHaveLength(0);
    });

    it('returns data for multiple horses with different years', async () => {
      const horse2 = await horseRepo.create({
        name: '馬B',
        sex: '牝',
        birthYear: 2021,
        status: '現役',
      });
      await repo.create({ horseId, year: 2025, turfAptitude: '◎' });
      await repo.create({ horseId: horse2.id, year: 2026, dirtAptitude: '○' });

      const results = await repo.findLatestByYear(2026);
      expect(results).toHaveLength(2);
      const ids = results.map((r) => r.horseId);
      expect(ids).toContain(horseId);
      expect(ids).toContain(horse2.id);
    });

    it('returns empty array when no data exists', async () => {
      const results = await repo.findLatestByYear(2026);
      expect(results).toHaveLength(0);
    });

    it('bug reproduction: findByYear misses data from different year, findLatestByYear finds it', async () => {
      await repo.create({
        horseId,
        year: 2025,
        turfAptitude: '×',
        distanceMin: 1400,
        distanceMax: 1800,
      });

      // findByYear(2026) returns empty — this is the bug
      const byYear = await repo.findByYear(2026);
      expect(byYear).toHaveLength(0);

      // findLatestByYear(2026) returns the 2025 data — this is the fix
      const latest = await repo.findLatestByYear(2026);
      expect(latest).toHaveLength(1);
      expect(latest[0].turfAptitude).toBe('×');
    });
  });
});
