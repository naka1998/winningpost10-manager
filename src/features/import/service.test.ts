import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HorseRepository } from '@/features/horses/repository';
import { createHorseRepository } from '@/features/horses/repository';
import type { YearlyStatusRepository } from '@/features/horses/yearly-status-repository';
import { createYearlyStatusRepository } from '@/features/horses/yearly-status-repository';
import type { Horse } from '@/features/horses/types';
import type { LineageRepository } from '@/features/lineages/repository';
import { createLineageRepository } from '@/features/lineages/repository';
import type { DatabaseConnection } from '@/database/connection';
import { createTestDatabase } from '@/database/connection.test-utils';
import { runMigrations } from '@/database/migrations';
import type { ParsedHorseRow } from './types';
import { createImportService } from './service';

function buildParsedRow(overrides?: Partial<ParsedHorseRow>): ParsedHorseRow {
  return {
    name: 'テスト馬',
    sex: '牡',
    birthYear: 2024,
    country: '日',
    sireName: '父馬',
    damName: '母馬',
    sireLineageName: 'サンデーサイレンス系',
    mareLineName: null,
    spRank: 'S+',
    spValue: 79,
    powerRank: 'A',
    powerValue: 70,
    instantRank: 'B',
    instantValue: 60,
    staminaRank: 'A',
    staminaValue: 70,
    mentalRank: 'A+',
    mentalValue: 75,
    wisdomRank: 'B',
    wisdomValue: 60,
    turfAptitude: '◎',
    dirtAptitude: '○',
    distanceMin: 1600,
    distanceMax: 2400,
    growthType: '普通',
    runningStyle: '差し',
    traits: ['大舞台'],
    raceRecord: '10戦7勝',
    jockey: '武豊',
    isHistorical: false,
    ...overrides,
  };
}

function buildExistingHorse(overrides?: Partial<Horse>): Horse {
  return {
    id: 1,
    name: 'テスト馬',
    sex: '牡',
    birthYear: 2024,
    country: '日',
    isHistorical: false,
    mareLine: null,
    status: '現役',
    sireId: null,
    damId: null,
    lineageId: null,
    factors: null,
    notes: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

function createMockHorseRepo(overrides?: Partial<HorseRepository>): HorseRepository {
  return {
    findById: vi.fn(),
    findByNameAndBirthYear: vi.fn().mockResolvedValue(null),
    findAncestorByName: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getAncestorRows: vi.fn(),
    ...overrides,
  } as HorseRepository;
}

function createMockYearlyStatusRepo(
  overrides?: Partial<YearlyStatusRepository>,
): YearlyStatusRepository {
  return {
    findById: vi.fn(),
    findByHorseId: vi.fn(),
    findByHorseAndYear: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  } as YearlyStatusRepository;
}

function createMockLineageRepo(overrides?: Partial<LineageRepository>): LineageRepository {
  return {
    findById: vi.fn(),
    findByName: vi.fn(),
    findAll: vi.fn(),
    getChildren: vi.fn(),
    getHierarchy: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  } as LineageRepository;
}

function createMockDb(overrides?: Partial<DatabaseConnection>): DatabaseConnection {
  return {
    run: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
    exec: vi.fn(),
    transaction: vi.fn(),
    close: vi.fn(),
    ...overrides,
  } as DatabaseConnection;
}

describe('ImportService', () => {
  describe('preview', () => {
    it('marks row as "create" when horse does not exist', async () => {
      const horseRepo = createMockHorseRepo({
        findByNameAndBirthYear: vi.fn().mockResolvedValue(null),
      });
      const service = createImportService({
        db: createMockDb(),
        horseRepo,
        yearlyStatusRepo: createMockYearlyStatusRepo(),
        lineageRepo: createMockLineageRepo(),
      });

      const rows = [buildParsedRow({ name: '新馬', birthYear: 2024 })];
      const preview = await service.preview(rows, 2025);

      expect(preview.rows).toHaveLength(1);
      expect(preview.rows[0].action).toBe('create');
      expect(preview.summary.newCount).toBe(1);
      expect(preview.summary.updateCount).toBe(0);
      expect(preview.summary.skipCount).toBe(0);
    });

    it('marks row as "update" when horse exists with different data', async () => {
      const existing = buildExistingHorse({ name: '既存馬', sex: '牡', country: '日' });
      const horseRepo = createMockHorseRepo({
        findByNameAndBirthYear: vi.fn().mockResolvedValue(existing),
      });
      const service = createImportService({
        db: createMockDb(),
        horseRepo,
        yearlyStatusRepo: createMockYearlyStatusRepo(),
        lineageRepo: createMockLineageRepo(),
      });

      const rows = [buildParsedRow({ name: '既存馬', birthYear: 2024, country: '米' })];
      const preview = await service.preview(rows, 2025);

      expect(preview.rows[0].action).toBe('update');
      expect(preview.rows[0].changes).toHaveProperty('country');
      expect(preview.rows[0].changes!.country).toEqual({ old: '日', new: '米' });
      expect(preview.summary.updateCount).toBe(1);
    });

    it('marks row as "skip" when horse exists with same data', async () => {
      const existing = buildExistingHorse({ name: '既存馬', sex: '牡', country: '日' });
      const horseRepo = createMockHorseRepo({
        findByNameAndBirthYear: vi.fn().mockResolvedValue(existing),
      });
      const service = createImportService({
        db: createMockDb(),
        horseRepo,
        yearlyStatusRepo: createMockYearlyStatusRepo(),
        lineageRepo: createMockLineageRepo(),
      });

      const rows = [buildParsedRow({ name: '既存馬', birthYear: 2024, sex: '牡', country: '日' })];
      const preview = await service.preview(rows, 2025);

      expect(preview.rows[0].action).toBe('skip');
      expect(preview.summary.skipCount).toBe(1);
    });

    it('marks row as "invalid" when birthYear is null', async () => {
      const service = createImportService({
        db: createMockDb(),
        horseRepo: createMockHorseRepo(),
        yearlyStatusRepo: createMockYearlyStatusRepo(),
        lineageRepo: createMockLineageRepo(),
      });

      const rows = [buildParsedRow({ name: '生年不明馬', birthYear: null })];
      const preview = await service.preview(rows, 2025);

      expect(preview.rows[0].action).toBe('invalid');
      expect(preview.rows[0].skipReason).toBeDefined();
      expect(preview.summary.invalidCount).toBe(1);
      expect(preview.summary.skipCount).toBe(0);
    });

    it('handles multiple rows with mixed actions', async () => {
      const existing = buildExistingHorse({ name: '既存馬', sex: '牡', country: '日' });
      const horseRepo = createMockHorseRepo({
        findByNameAndBirthYear: vi.fn().mockImplementation(async (name: string) => {
          if (name === '既存馬') return existing;
          return null;
        }),
      });
      const service = createImportService({
        db: createMockDb(),
        horseRepo,
        yearlyStatusRepo: createMockYearlyStatusRepo(),
        lineageRepo: createMockLineageRepo(),
      });

      const rows = [
        buildParsedRow({ name: '新馬', birthYear: 2024 }),
        buildParsedRow({ name: '既存馬', birthYear: 2024, sex: '牡', country: '日' }),
        buildParsedRow({ name: '生年不明', birthYear: null }),
      ];
      const preview = await service.preview(rows, 2025);

      expect(preview.summary.newCount).toBe(1);
      expect(preview.summary.skipCount).toBe(1);
      expect(preview.summary.invalidCount).toBe(1);
      expect(preview.importYear).toBe(2025);
    });

    it('sets importYear on the preview result', async () => {
      const service = createImportService({
        db: createMockDb(),
        horseRepo: createMockHorseRepo(),
        yearlyStatusRepo: createMockYearlyStatusRepo(),
        lineageRepo: createMockLineageRepo(),
      });

      const preview = await service.preview([], 2026);
      expect(preview.importYear).toBe(2026);
      expect(preview.rows).toHaveLength(0);
    });
  });

  describe('execute (integration)', () => {
    let db: DatabaseConnection;

    beforeEach(async () => {
      db = createTestDatabase();
      await runMigrations(db);
    });

    function createServiceWithRealDb() {
      return createImportService({
        db,
        horseRepo: createHorseRepository(db),
        yearlyStatusRepo: createYearlyStatusRepository(db),
        lineageRepo: createLineageRepository(db),
      });
    }

    it('creates new horses with ancestors and yearly statuses', async () => {
      const service = createServiceWithRealDb();

      const rows = [buildParsedRow({ name: 'テスト馬A', birthYear: 2023 })];
      const preview = await service.preview(rows, 2026);
      expect(preview.summary.newCount).toBe(1);

      const result = await service.execute(preview);
      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify horse was created
      const horse = await db.get<Record<string, unknown>>(
        'SELECT * FROM horses WHERE name = ? AND birth_year = ?',
        ['テスト馬A', 2023],
      );
      expect(horse).toBeDefined();
      expect(horse!.sex).toBe('牡');
      expect(horse!.country).toBe('日');
      expect(horse!.status).toBe('現役');

      // Verify sire was auto-created as ancestor
      const sire = await db.get<Record<string, unknown>>(
        'SELECT * FROM horses WHERE name = ? AND birth_year IS NULL',
        ['父馬'],
      );
      expect(sire).toBeDefined();
      expect(sire!.status).toBe('ancestor');

      // Verify dam was auto-created as ancestor
      const dam = await db.get<Record<string, unknown>>(
        'SELECT * FROM horses WHERE name = ? AND birth_year IS NULL',
        ['母馬'],
      );
      expect(dam).toBeDefined();

      // Verify yearly status was created
      const status = await db.get<Record<string, unknown>>(
        'SELECT * FROM yearly_statuses WHERE horse_id = ? AND year = ?',
        [horse!.id, 2026],
      );
      expect(status).toBeDefined();
      expect(status!.sp_value).toBe(79);
      expect(status!.power_rank).toBe('A');

      // Verify lineage was auto-created
      const lineage = await db.get<Record<string, unknown>>(
        'SELECT * FROM lineages WHERE name = ?',
        ['サンデーサイレンス系'],
      );
      expect(lineage).toBeDefined();
    });

    it('updates existing horses and upserts yearly statuses', async () => {
      const service = createServiceWithRealDb();

      // First import to create the horse
      const rows1 = [buildParsedRow({ name: '更新テスト馬', birthYear: 2023 })];
      const preview1 = await service.preview(rows1, 2025);
      await service.execute(preview1);

      // Second import with changed data
      const rows2 = [
        buildParsedRow({
          name: '更新テスト馬',
          birthYear: 2023,
          mareLineName: 'ドクサ系',
          spValue: 85,
        }),
      ];
      const preview2 = await service.preview(rows2, 2026);
      expect(preview2.summary.updateCount).toBe(1);

      const result = await service.execute(preview2);
      expect(result.success).toBe(true);
      expect(result.updated).toBe(1);

      // Verify new yearly status was created for year 2026
      const horse = await db.get<Record<string, unknown>>(
        'SELECT * FROM horses WHERE name = ? AND birth_year = ?',
        ['更新テスト馬', 2023],
      );
      const statuses = await db.all<Record<string, unknown>>(
        'SELECT * FROM yearly_statuses WHERE horse_id = ? ORDER BY year',
        [horse!.id],
      );
      expect(statuses).toHaveLength(2); // 2025 and 2026
      expect(statuses[1].sp_value).toBe(85);
    });

    it('records import log on success', async () => {
      const service = createServiceWithRealDb();

      const rows = [buildParsedRow({ name: 'ログテスト馬', birthYear: 2023 })];
      const preview = await service.preview(rows, 2026);
      await service.execute(preview);

      const log = await db.get<Record<string, unknown>>(
        'SELECT * FROM import_logs ORDER BY id DESC LIMIT 1',
      );
      expect(log).toBeDefined();
      expect(log!.game_year).toBe(2026);
      expect(log!.new_count).toBe(1);
      expect(log!.status).toBe('success');
    });

    it('does not duplicate ancestors when importing multiple horses with same sire', async () => {
      const service = createServiceWithRealDb();

      const rows = [
        buildParsedRow({ name: '兄', birthYear: 2022, sireName: '共通父馬' }),
        buildParsedRow({ name: '弟', birthYear: 2023, sireName: '共通父馬' }),
      ];
      const preview = await service.preview(rows, 2026);
      const result = await service.execute(preview);

      expect(result.created).toBe(2);

      // Only one ancestor with this name should exist
      const sires = await db.all<Record<string, unknown>>(
        'SELECT * FROM horses WHERE name = ? AND birth_year IS NULL',
        ['共通父馬'],
      );
      expect(sires).toHaveLength(1);
    });

    it('rolls back entire transaction on error', async () => {
      // Create a horse first
      await db.run("INSERT INTO horses (name, birth_year, status) VALUES ('既存馬', 2023, '現役')");

      const service = createServiceWithRealDb();

      // Build a preview with a row that will cause a constraint violation
      // (duplicate name + birth_year without going through preview)
      const preview = {
        importYear: 2026,
        rows: [
          {
            parsed: buildParsedRow({ name: '正常馬', birthYear: 2024 }),
            action: 'create' as const,
          },
          {
            // This row has action 'create' but the horse already exists in DB
            // The UNIQUE constraint on (name, birth_year) will cause an error
            parsed: buildParsedRow({ name: '既存馬', birthYear: 2023 }),
            action: 'create' as const,
          },
        ],
        summary: { newCount: 2, updateCount: 0, skipCount: 0, invalidCount: 0 },
      };

      await expect(service.execute(preview)).rejects.toThrow();

      // Verify rollback: the first horse should NOT have been created
      const horse = await db.get<Record<string, unknown>>(
        'SELECT * FROM horses WHERE name = ? AND birth_year = ?',
        ['正常馬', 2024],
      );
      expect(horse).toBeUndefined();
    });
  });
});
