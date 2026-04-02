import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '@/database/connection.test-utils';
import type { DatabaseConnection } from '@/database/connection';
import { runMigrations } from '@/database/migrations';
import { createHorseRepository, type HorseRepository } from '@/features/horses/repository';
import { createBreedingRecordRepository, type BreedingRecordRepository } from './repository';

describe('BreedingRecordRepository', () => {
  let db: DatabaseConnection;
  let repo: BreedingRecordRepository;
  let horseRepo: HorseRepository;
  let mareId: number;
  let sireId: number;
  let offspringId: number;

  beforeEach(async () => {
    db = createTestDatabase();
    await runMigrations(db);
    horseRepo = createHorseRepository(db);
    repo = createBreedingRecordRepository(db);

    const mare = await horseRepo.create({
      name: 'テスト牝馬',
      sex: '牝',
      birthYear: 2018,
      status: '繁殖牝馬',
    });
    const sire = await horseRepo.create({
      name: 'テスト種牡馬',
      sex: '牡',
      birthYear: 2016,
      status: '種牡馬',
    });
    const offspring = await horseRepo.create({
      name: 'テスト産駒',
      sex: '牡',
      birthYear: 2024,
      status: '現役',
    });
    mareId = mare.id;
    sireId = sire.id;
    offspringId = offspring.id;
  });

  describe('findAll', () => {
    it('returns empty array initially', async () => {
      const records = await repo.findAll();
      expect(records).toEqual([]);
    });
  });

  describe('create and findById', () => {
    it('creates a record and returns it with horse names', async () => {
      const record = await repo.create({
        mareId,
        sireId,
        year: 2024,
        evaluation: 'A',
      });

      expect(record.id).toBeGreaterThan(0);
      expect(record.mareId).toBe(mareId);
      expect(record.sireId).toBe(sireId);
      expect(record.year).toBe(2024);
      expect(record.evaluation).toBe('A');
      expect(record.mareName).toBe('テスト牝馬');
      expect(record.sireName).toBe('テスト種牡馬');
      expect(record.offspringName).toBeNull();
    });

    it('findById returns record with names', async () => {
      const created = await repo.create({ mareId, sireId, year: 2024 });
      const found = await repo.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.mareName).toBe('テスト牝馬');
      expect(found!.sireName).toBe('テスト種牡馬');
    });

    it('findById returns null for non-existent id', async () => {
      const found = await repo.findById(9999);
      expect(found).toBeNull();
    });

    it('stores and retrieves theories as JSON', async () => {
      const theories = [
        { name: 'ニックス', points: 6 },
        { name: 'インブリード', points: 4 },
      ];
      const record = await repo.create({
        mareId,
        sireId,
        year: 2024,
        theories,
      });

      const found = await repo.findById(record.id);
      expect(found!.theories).toEqual(theories);
    });

    it('creates record with offspring and returns offspring name', async () => {
      const record = await repo.create({
        mareId,
        sireId,
        year: 2024,
        offspringId,
      });

      expect(record.offspringId).toBe(offspringId);
      expect(record.offspringName).toBe('テスト産駒');
    });
  });

  describe('update', () => {
    it('updates fields and returns updated record with names', async () => {
      const created = await repo.create({
        mareId,
        sireId,
        year: 2024,
        evaluation: 'B',
      });

      const updated = await repo.update(created.id, {
        evaluation: 'A',
        totalPower: 120,
      });

      expect(updated.evaluation).toBe('A');
      expect(updated.totalPower).toBe(120);
      expect(updated.mareName).toBe('テスト牝馬');
    });

    it('updates to link offspring after birth', async () => {
      const created = await repo.create({ mareId, sireId, year: 2024 });
      expect(created.offspringId).toBeNull();

      const updated = await repo.update(created.id, { offspringId });
      expect(updated.offspringId).toBe(offspringId);
      expect(updated.offspringName).toBe('テスト産駒');
    });

    it('returns existing record when no fields to update', async () => {
      const created = await repo.create({
        mareId,
        sireId,
        year: 2024,
        evaluation: 'A',
      });

      const updated = await repo.update(created.id, {});
      expect(updated.evaluation).toBe('A');
    });

    it('throws for non-existent id', async () => {
      await expect(repo.update(9999, { evaluation: 'A' })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('removes a record', async () => {
      const created = await repo.create({ mareId, sireId, year: 2024 });
      await repo.delete(created.id);

      const found = await repo.findById(created.id);
      expect(found).toBeNull();
    });
  });

  describe('constraints', () => {
    it('rejects duplicate mare/year records', async () => {
      await repo.create({ mareId, sireId, year: 2024 });

      await expect(repo.create({ mareId, sireId, year: 2024 })).rejects.toThrow(
        /UNIQUE constraint failed/,
      );
    });

    it('rejects role mismatches for mare and sire', async () => {
      const invalidMare = await horseRepo.create({
        name: '不正繁殖牝馬候補',
        sex: '牡',
        status: '現役',
      });
      const invalidSire = await horseRepo.create({
        name: '不正種牡馬候補',
        sex: '牝',
        status: '現役',
      });

      await expect(repo.create({ mareId: invalidMare.id, sireId, year: 2026 })).rejects.toThrow(
        /mare_id must reference/,
      );

      await expect(repo.create({ mareId, sireId: invalidSire.id, year: 2027 })).rejects.toThrow(
        /sire_id must reference/,
      );
    });
  });

  describe('findAll with filters', () => {
    beforeEach(async () => {
      const mare2 = await horseRepo.create({
        name: '別牝馬',
        sex: '牝',
        birthYear: 2019,
        status: '繁殖牝馬',
      });
      const sire2 = await horseRepo.create({
        name: '別種牡馬',
        sex: '牡',
        birthYear: 2017,
        status: '種牡馬',
      });

      await repo.create({ mareId, sireId, year: 2024, evaluation: 'A' });
      await repo.create({ mareId, sireId: sire2.id, year: 2025, evaluation: 'B' });
      await repo.create({ mareId: mare2.id, sireId, year: 2024, evaluation: 'C' });
    });

    it('filters by mareId', async () => {
      const records = await repo.findAll({ mareId });
      expect(records).toHaveLength(2);
      records.forEach((r) => expect(r.mareId).toBe(mareId));
    });

    it('filters by sireId', async () => {
      const records = await repo.findAll({ sireId });
      expect(records).toHaveLength(2);
      records.forEach((r) => expect(r.sireId).toBe(sireId));
    });

    it('filters by year', async () => {
      const records = await repo.findAll({ year: 2024 });
      expect(records).toHaveLength(2);
      records.forEach((r) => expect(r.year).toBe(2024));
    });

    it('filters by combined criteria', async () => {
      const records = await repo.findAll({ mareId, year: 2024 });
      expect(records).toHaveLength(1);
      expect(records[0].evaluation).toBe('A');
    });

    it('returns all records without filter', async () => {
      const records = await repo.findAll();
      expect(records).toHaveLength(3);
    });
  });
});
