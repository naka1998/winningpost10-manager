import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '@/database/connection.test-utils';
import type { DatabaseConnection } from '@/database/connection';
import { runMigrations } from '@/database/migrations';
import { createLineageRepository, type LineageRepository } from './repository';

describe('LineageRepository', () => {
  let db: DatabaseConnection;
  let repo: LineageRepository;

  beforeEach(async () => {
    db = createTestDatabase();
    await runMigrations(db);
    repo = createLineageRepository(db);
  });

  describe('findAll', () => {
    it('returns all preset lineages', async () => {
      const lineages = await repo.findAll();
      expect(lineages.length).toBeGreaterThan(0);
    });
  });

  describe('findById and findByName', () => {
    it('finds a preset lineage by name', async () => {
      const lineage = await repo.findByName('ノーザンダンサー系');
      expect(lineage).not.toBeNull();
      expect(lineage!.lineageType).toBe('parent');
    });

    it('finds a lineage by id', async () => {
      const byName = await repo.findByName('ノーザンダンサー系');
      const byId = await repo.findById(byName!.id);
      expect(byId).not.toBeNull();
      expect(byId!.name).toBe('ノーザンダンサー系');
    });

    it('returns null for non-existent id', async () => {
      const found = await repo.findById(9999);
      expect(found).toBeNull();
    });
  });

  describe('getChildren', () => {
    it('returns child lineages for a parent', async () => {
      const parent = await repo.findByName('ノーザンダンサー系');
      const children = await repo.getChildren(parent!.id);

      expect(children.length).toBeGreaterThan(0);
      const childNames = children.map((c) => c.name);
      expect(childNames).toContain('サドラーズウェルズ系');
      expect(childNames).toContain('ダンジグ系');
    });
  });

  describe('getHierarchy', () => {
    it('returns parent lineages with their children', async () => {
      const hierarchy = await repo.getHierarchy();

      expect(hierarchy.length).toBeGreaterThan(0);

      // Every node should be a parent
      for (const node of hierarchy) {
        expect(node.lineageType).toBe('parent');
      }

      // Find ノーザンダンサー系 and check children
      const nd = hierarchy.find((h) => h.name === 'ノーザンダンサー系');
      expect(nd).not.toBeUndefined();
      expect(nd!.children.length).toBeGreaterThan(0);

      const childNames = nd!.children.map((c) => c.name);
      expect(childNames).toContain('リファール系');
    });
  });

  describe('create', () => {
    it('creates a new lineage', async () => {
      const lineage = await repo.create({
        name: 'テスト系',
        lineageType: 'child',
        spStType: 'SP',
      });

      expect(lineage.id).toBeGreaterThan(0);
      expect(lineage.name).toBe('テスト系');
      expect(lineage.lineageType).toBe('child');
      expect(lineage.spStType).toBe('SP');
    });
  });

  describe('update', () => {
    it('updates a lineage', async () => {
      const lineage = await repo.create({
        name: '更新系',
        lineageType: 'parent',
      });

      const updated = await repo.update(lineage.id, { spStType: 'ST' });
      expect(updated.spStType).toBe('ST');
      expect(updated.name).toBe('更新系');
    });
  });
});
