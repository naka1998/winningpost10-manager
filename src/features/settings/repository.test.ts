import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '@/database/connection.test-utils';
import { runMigrations } from '@/database/migrations';
import type { DatabaseConnection } from '@/database/connection';
import { createSettingsRepository, type SettingsRepository } from './repository';

describe('SettingsRepository', () => {
  let db: DatabaseConnection;
  let repo: SettingsRepository;

  beforeEach(async () => {
    db = createTestDatabase();
    await runMigrations(db);
    repo = createSettingsRepository(db);
  });

  describe('get', () => {
    it('シード済みの current_year を取得できる', async () => {
      const value = await repo.get('current_year');
      expect(value).toBe('2025');
    });

    it('シード済みの pedigree_depth を取得できる', async () => {
      const value = await repo.get('pedigree_depth');
      expect(value).toBe('4');
    });

    it('シード済みの rank_system を取得できる', async () => {
      const value = await repo.get('rank_system');
      expect(value).not.toBeNull();
      const parsed = JSON.parse(value!);
      expect(parsed.ranks).toContain('S+');
      expect(parsed.ranks).toContain('E');
    });

    it('存在しないキーで null を返す', async () => {
      const value = await repo.get('nonexistent_key');
      expect(value).toBeNull();
    });
  });

  describe('getAll', () => {
    it('全設定を取得できる', async () => {
      const all = await repo.getAll();
      expect(all).toHaveProperty('current_year', '2025');
      expect(all).toHaveProperty('pedigree_depth', '4');
      expect(all).toHaveProperty('rank_system');
      expect(all).toHaveProperty('db_version');
    });
  });

  describe('set', () => {
    it('既存キーを更新できる', async () => {
      await repo.set('current_year', '2026');
      const value = await repo.get('current_year');
      expect(value).toBe('2026');
    });

    it('新規キーを挿入できる', async () => {
      await repo.set('custom_key', 'custom_value');
      const value = await repo.get('custom_key');
      expect(value).toBe('custom_value');
    });

    it('更新後も他の設定に影響しない', async () => {
      await repo.set('current_year', '2030');
      const depth = await repo.get('pedigree_depth');
      expect(depth).toBe('4');
    });
  });
});
