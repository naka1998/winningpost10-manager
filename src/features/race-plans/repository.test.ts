import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '@/database/connection.test-utils';
import type { DatabaseConnection } from '@/database/connection';
import { runMigrations } from '@/database/migrations';
import { createHorseRepository, type HorseRepository } from '@/features/horses/repository';
import { createRacePlanRepository, type RacePlanRepository } from './repository';

describe('RacePlanRepository', () => {
  let db: DatabaseConnection;
  let repo: RacePlanRepository;
  let horseRepo: HorseRepository;
  let horseId1: number;
  let horseId2: number;

  beforeEach(async () => {
    db = createTestDatabase();
    await runMigrations(db);
    horseRepo = createHorseRepository(db);
    repo = createRacePlanRepository(db);

    const horse1 = await horseRepo.create({
      name: 'テスト馬1',
      sex: '牡',
      birthYear: 2022,
      status: '現役',
    });
    const horse2 = await horseRepo.create({
      name: 'テスト馬2',
      sex: '牝',
      birthYear: 2023,
      status: '現役',
    });
    horseId1 = horse1.id;
    horseId2 = horse2.id;
  });

  describe('findAll', () => {
    it('returns empty array initially', async () => {
      const plans = await repo.findAll();
      expect(plans).toEqual([]);
    });
  });

  describe('create and findById', () => {
    it('creates a plan with surface and returns it with horse name', async () => {
      const plan = await repo.create({
        horseId: horseId1,
        year: 2026,
        country: '日',
        surface: '芝',
        distanceBand: 'マイル',
        grade: 'G1',
      });

      expect(plan.id).toBeGreaterThan(0);
      expect(plan.horseId).toBe(horseId1);
      expect(plan.year).toBe(2026);
      expect(plan.country).toBe('日');
      expect(plan.surface).toBe('芝');
      expect(plan.distanceBand).toBe('マイル');
      expect(plan.grade).toBe('G1');
      expect(plan.horseName).toBe('テスト馬1');
    });

    it('creates a dirt plan', async () => {
      const plan = await repo.create({
        horseId: horseId1,
        year: 2026,
        country: '米',
        surface: 'ダート',
        distanceBand: '中距離',
        grade: 'G1',
      });

      expect(plan.surface).toBe('ダート');
      expect(plan.country).toBe('米');
    });

    it('creates a classic path plan without grade', async () => {
      const plan = await repo.create({
        horseId: horseId1,
        year: 2026,
        country: '日',
        surface: '芝',
        classicPath: '三冠',
      });

      expect(plan.distanceBand).toBeNull();
      expect(plan.grade).toBeNull();
      expect(plan.notes).toContain('三冠');
    });

    it('findById returns plan with horse name', async () => {
      const created = await repo.create({
        horseId: horseId1,
        year: 2026,
        country: '日',
        surface: '芝',
        distanceBand: '中距離',
        grade: 'G2',
      });
      const found = await repo.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.surface).toBe('芝');
      expect(found!.horseName).toBe('テスト馬1');
    });

    it('findById returns null for non-existent id', async () => {
      const found = await repo.findById(9999);
      expect(found).toBeNull();
    });

    it('creates plan with notes', async () => {
      const plan = await repo.create({
        horseId: horseId1,
        year: 2026,
        country: '米',
        surface: 'ダート',
        distanceBand: '長距離',
        grade: 'G1',
        notes: 'BCクラシック狙い',
      });

      expect(plan.notes).toBe('BCクラシック狙い');
    });
  });

  describe('findByYear', () => {
    it('returns plans for specified year', async () => {
      await repo.create({
        horseId: horseId1,
        year: 2026,
        country: '日',
        surface: '芝',
        distanceBand: 'マイル',
        grade: 'G1',
      });
      await repo.create({
        horseId: horseId2,
        year: 2026,
        country: '欧',
        surface: '芝',
        distanceBand: '中距離',
        grade: 'G1',
      });
      await repo.create({
        horseId: horseId1,
        year: 2027,
        country: '日',
        surface: 'ダート',
        distanceBand: '短距離',
        grade: 'G3',
      });

      const plans2026 = await repo.findByYear(2026);
      expect(plans2026).toHaveLength(2);
      plans2026.forEach((p) => expect(p.year).toBe(2026));

      const plans2027 = await repo.findByYear(2027);
      expect(plans2027).toHaveLength(1);
      expect(plans2027[0].surface).toBe('ダート');
    });

    it('returns empty array for year with no plans', async () => {
      const plans = await repo.findByYear(2030);
      expect(plans).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates fields including surface and returns updated plan', async () => {
      const created = await repo.create({
        horseId: horseId1,
        year: 2026,
        country: '日',
        surface: '芝',
        distanceBand: 'マイル',
        grade: 'G1',
      });

      const updated = await repo.update(created.id, {
        surface: 'ダート',
        country: '米',
        grade: 'G2',
        notes: '路線変更',
      });

      expect(updated.surface).toBe('ダート');
      expect(updated.country).toBe('米');
      expect(updated.grade).toBe('G2');
      expect(updated.notes).toBe('路線変更');
      expect(updated.distanceBand).toBe('マイル');
      expect(updated.horseName).toBe('テスト馬1');
    });

    it('returns existing plan when no fields to update', async () => {
      const created = await repo.create({
        horseId: horseId1,
        year: 2026,
        country: '日',
        surface: '芝',
        distanceBand: 'マイル',
        grade: 'G1',
      });

      const updated = await repo.update(created.id, {});
      expect(updated.country).toBe('日');
      expect(updated.surface).toBe('芝');
    });

    it('throws for non-existent id', async () => {
      await expect(repo.update(9999, { grade: 'G3' })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('removes a plan', async () => {
      const created = await repo.create({
        horseId: horseId1,
        year: 2026,
        country: '日',
        surface: '芝',
        distanceBand: 'マイル',
        grade: 'G1',
      });
      await repo.delete(created.id);

      const found = await repo.findById(created.id);
      expect(found).toBeNull();
    });
  });

  describe('findAll with filters', () => {
    beforeEach(async () => {
      await repo.create({
        horseId: horseId1,
        year: 2026,
        country: '日',
        surface: '芝',
        distanceBand: 'マイル',
        grade: 'G1',
      });
      await repo.create({
        horseId: horseId1,
        year: 2027,
        country: '米',
        surface: 'ダート',
        distanceBand: '中距離',
        grade: 'G2',
      });
      await repo.create({
        horseId: horseId2,
        year: 2026,
        country: '欧',
        surface: '芝',
        distanceBand: '長距離',
        grade: 'G1',
      });
    });

    it('filters by year', async () => {
      const plans = await repo.findAll({ year: 2026 });
      expect(plans).toHaveLength(2);
      plans.forEach((p) => expect(p.year).toBe(2026));
    });

    it('filters by horseId', async () => {
      const plans = await repo.findAll({ horseId: horseId1 });
      expect(plans).toHaveLength(2);
      plans.forEach((p) => expect(p.horseId).toBe(horseId1));
    });

    it('filters by combined criteria', async () => {
      const plans = await repo.findAll({ year: 2026, horseId: horseId1 });
      expect(plans).toHaveLength(1);
      expect(plans[0].surface).toBe('芝');
    });

    it('returns all plans without filter', async () => {
      const plans = await repo.findAll();
      expect(plans).toHaveLength(3);
    });
  });

  describe('duplicate horse detection', () => {
    it('allows same horse in multiple cells for same year', async () => {
      await repo.create({
        horseId: horseId1,
        year: 2026,
        country: '日',
        surface: '芝',
        distanceBand: 'マイル',
        grade: 'G1',
      });
      await repo.create({
        horseId: horseId1,
        year: 2026,
        country: '日',
        surface: '芝',
        distanceBand: '中距離',
        grade: 'G2',
      });

      const plans = await repo.findByYear(2026);
      const horse1Plans = plans.filter((p) => p.horseId === horseId1);
      expect(horse1Plans).toHaveLength(2);
    });
  });
});
