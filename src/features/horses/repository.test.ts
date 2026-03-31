import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '@/database/connection.test-utils';
import type { DatabaseConnection } from '@/database/connection';
import { runMigrations } from '@/database/migrations';
import { createHorseRepository, type HorseRepository } from './repository';

describe('HorseRepository', () => {
  let db: DatabaseConnection;
  let repo: HorseRepository;

  beforeEach(async () => {
    db = createTestDatabase();
    await runMigrations(db);
    repo = createHorseRepository(db);
  });

  describe('create and findById', () => {
    it('creates a horse and retrieves it by id', async () => {
      const horse = await repo.create({
        name: 'テスト馬',
        sex: '牡',
        birthYear: 2024,
        country: '日',
        status: '現役',
      });

      expect(horse.id).toBeGreaterThan(0);
      expect(horse.name).toBe('テスト馬');
      expect(horse.sex).toBe('牡');
      expect(horse.birthYear).toBe(2024);
      expect(horse.country).toBe('日');
      expect(horse.status).toBe('現役');

      const found = await repo.findById(horse.id);
      expect(found).not.toBeNull();
      expect(found!.name).toBe('テスト馬');
    });

    it('returns null for non-existent id', async () => {
      const found = await repo.findById(9999);
      expect(found).toBeNull();
    });

    it('stores and retrieves factors as JSON', async () => {
      const horse = await repo.create({
        name: 'ファクター馬',
        factors: ['スピード', 'パワー'],
      });

      const found = await repo.findById(horse.id);
      expect(found!.factors).toEqual(['スピード', 'パワー']);
    });
  });

  describe('findByNameAndBirthYear', () => {
    it('finds a horse by name and birth year', async () => {
      await repo.create({ name: '照合馬', birthYear: 2023 });

      const found = await repo.findByNameAndBirthYear('照合馬', 2023);
      expect(found).not.toBeNull();
      expect(found!.name).toBe('照合馬');
    });

    it('returns null when not found', async () => {
      await repo.create({ name: '照合馬', birthYear: 2023 });

      const found = await repo.findByNameAndBirthYear('照合馬', 2024);
      expect(found).toBeNull();
    });
  });

  describe('findAncestorByName', () => {
    it('finds an ancestor horse by name (birth_year is NULL)', async () => {
      await repo.create({ name: '祖先馬', status: 'ancestor' });

      const found = await repo.findAncestorByName('祖先馬');
      expect(found).not.toBeNull();
      expect(found!.name).toBe('祖先馬');
      expect(found!.birthYear).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all horses without filter', async () => {
      await repo.create({ name: '馬A', birthYear: 2023, status: '現役' });
      await repo.create({ name: '馬B', birthYear: 2024, status: '現役' });

      const horses = await repo.findAll();
      expect(horses).toHaveLength(2);
    });

    it('filters by status', async () => {
      await repo.create({ name: '馬A', birthYear: 2023, status: '現役' });
      await repo.create({ name: '馬B', birthYear: 2024, status: '種牡馬' });

      const active = await repo.findAll({ status: '現役' });
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('馬A');
    });

    it('filters by birth year range', async () => {
      await repo.create({ name: '馬A', birthYear: 2020, status: '現役' });
      await repo.create({ name: '馬B', birthYear: 2023, status: '現役' });
      await repo.create({ name: '馬C', birthYear: 2025, status: '現役' });

      const filtered = await repo.findAll({ birthYearFrom: 2022, birthYearTo: 2024 });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('馬B');
    });
  });

  describe('update', () => {
    it('updates horse fields', async () => {
      const horse = await repo.create({ name: '更新馬', birthYear: 2023, status: '現役' });

      const updated = await repo.update(horse.id, { status: '種牡馬' });
      expect(updated.status).toBe('種牡馬');
      expect(updated.name).toBe('更新馬');
    });
  });

  describe('delete', () => {
    it('deletes a horse', async () => {
      const horse = await repo.create({ name: '削除馬', birthYear: 2023 });
      await repo.delete(horse.id);

      const found = await repo.findById(horse.id);
      expect(found).toBeNull();
    });
  });

  describe('getAncestorRows', () => {
    it('returns flat ancestor rows for a horse with parents', async () => {
      // Create a 3-generation pedigree: horse -> sire -> grandsire
      const grandsire = await repo.create({ name: '祖父馬', status: 'ancestor' });
      const sire = await repo.create({
        name: '父馬',
        status: 'ancestor',
        sireId: grandsire.id,
      });
      const dam = await repo.create({ name: '母馬', status: 'ancestor' });
      const horse = await repo.create({
        name: '対象馬',
        birthYear: 2024,
        status: '現役',
        sireId: sire.id,
        damId: dam.id,
      });

      const rows = await repo.getAncestorRows(horse.id, 4);
      expect(rows.length).toBeGreaterThanOrEqual(4);

      const self = rows.find((r) => r.path === '');
      expect(self).not.toBeUndefined();
      expect(self!.name).toBe('対象馬');
      expect(self!.generation).toBe(0);

      const sireRow = rows.find((r) => r.path === 'S');
      expect(sireRow).not.toBeUndefined();
      expect(sireRow!.name).toBe('父馬');
      expect(sireRow!.generation).toBe(1);

      const damRow = rows.find((r) => r.path === 'D');
      expect(damRow).not.toBeUndefined();
      expect(damRow!.name).toBe('母馬');
      expect(damRow!.generation).toBe(1);

      const grandsireRow = rows.find((r) => r.path === 'SS');
      expect(grandsireRow).not.toBeUndefined();
      expect(grandsireRow!.name).toBe('祖父馬');
      expect(grandsireRow!.generation).toBe(2);
    });

    it('returns empty array for non-existent horse', async () => {
      const rows = await repo.getAncestorRows(9999);
      expect(rows).toEqual([]);
    });
  });
});
