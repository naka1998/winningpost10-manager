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
    findByName: vi.fn().mockResolvedValue([]),
    findByNameAndBirthYear: vi.fn().mockResolvedValue(null),
    findAncestorByName: vi.fn().mockResolvedValue(null),
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
      const horseRepo = createMockHorseRepo();
      const service = createImportService({
        db: createMockDb(),
        horseRepo,
        yearlyStatusRepo: createMockYearlyStatusRepo(),
        lineageRepo: createMockLineageRepo(),
      });

      const rows = [buildParsedRow({ name: '新馬', birthYear: 2024 })];
      const preview = await service.preview(rows, 2025, '現役');

      expect(preview.rows).toHaveLength(1);
      expect(preview.rows[0].action).toBe('create');
      expect(preview.summary.newCount).toBe(1);
    });

    it('marks row as "update" when horse exists with different data', async () => {
      const existing = buildExistingHorse({ name: '既存馬', country: '日' });
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
      const preview = await service.preview(rows, 2025, '現役');

      expect(preview.rows[0].action).toBe('update');
      expect(preview.rows[0].changes).toHaveProperty('country');
      expect(preview.summary.updateCount).toBe(1);
    });

    it('marks row as "update" when ancestor exists by name (ancestor match)', async () => {
      const ancestor = buildExistingHorse({
        name: '既存祖先馬',
        birthYear: null,
        status: 'ancestor',
      });
      const horseRepo = createMockHorseRepo({
        findByNameAndBirthYear: vi.fn().mockResolvedValue(null),
        findAncestorByName: vi.fn().mockResolvedValue(ancestor),
      });
      const service = createImportService({
        db: createMockDb(),
        horseRepo,
        yearlyStatusRepo: createMockYearlyStatusRepo(),
        lineageRepo: createMockLineageRepo(),
      });

      const rows = [buildParsedRow({ name: '既存祖先馬', birthYear: 2024 })];
      const preview = await service.preview(rows, 2025, '種牡馬');

      expect(preview.rows[0].action).toBe('update');
      expect(preview.rows[0].existingHorse!.status).toBe('ancestor');
      expect(preview.summary.updateCount).toBe(1);
    });

    it('marks row as "update" when exactly one horse exists with same name', async () => {
      const existing = buildExistingHorse({
        name: '同名既存馬',
        birthYear: 2021,
        status: '現役',
      });
      const horseRepo = createMockHorseRepo({
        findByNameAndBirthYear: vi.fn().mockResolvedValue(null),
        findAncestorByName: vi.fn().mockResolvedValue(null),
        findByName: vi.fn().mockResolvedValue([existing]),
      });
      const service = createImportService({
        db: createMockDb(),
        horseRepo,
        yearlyStatusRepo: createMockYearlyStatusRepo(),
        lineageRepo: createMockLineageRepo(),
      });

      const rows = [buildParsedRow({ name: '同名既存馬', birthYear: 2023 })];
      const preview = await service.preview(rows, 2025, '現役');

      expect(preview.rows[0].action).toBe('update');
      expect(preview.summary.updateCount).toBe(1);
      expect(preview.summary.newCount).toBe(0);
    });

    it('marks row as "skip" when horse exists with same D1 data and no D2 data', async () => {
      const existing = buildExistingHorse({
        name: '同一馬',
        sex: '牡',
        country: '日',
        status: '現役',
      });
      const horseRepo = createMockHorseRepo({
        findByNameAndBirthYear: vi.fn().mockResolvedValue(existing),
      });
      const service = createImportService({
        db: createMockDb(),
        horseRepo,
        yearlyStatusRepo: createMockYearlyStatusRepo(),
        lineageRepo: createMockLineageRepo(),
      });

      // Row with matching D1, no D2, no D3 (everything null)
      const rows = [
        {
          name: '同一馬',
          sex: '牡' as string | null,
          birthYear: 2024 as number | null,
          country: '日' as string | null,
          isHistorical: false,
          sireName: null,
          damName: null,
          sireLineageName: null,
          mareLineName: null,
          spRank: null,
          spValue: null,
          powerRank: null,
          powerValue: null,
          instantRank: null,
          instantValue: null,
          staminaRank: null,
          staminaValue: null,
          mentalRank: null,
          mentalValue: null,
          wisdomRank: null,
          wisdomValue: null,
          turfAptitude: null,
          dirtAptitude: null,
          distanceMin: null,
          distanceMax: null,
          growthType: null,
          runningStyle: null,
          traits: null,
          raceRecord: null,
          jockey: null,
        },
      ];
      const preview = await service.preview(rows, 2025, '現役');

      expect(preview.rows[0].action).toBe('skip');
      expect(preview.summary.skipCount).toBe(1);
    });

    it('marks row as "update" when D2 data is present (yearly status)', async () => {
      const existing = buildExistingHorse({
        name: '同一馬',
        sex: '牡',
        country: '日',
        status: '現役',
      });
      const horseRepo = createMockHorseRepo({
        findByNameAndBirthYear: vi.fn().mockResolvedValue(existing),
      });
      const service = createImportService({
        db: createMockDb(),
        horseRepo,
        yearlyStatusRepo: createMockYearlyStatusRepo(),
        lineageRepo: createMockLineageRepo(),
      });

      // Same D1 but with D2 data → update
      const rows = [buildParsedRow({ name: '同一馬', birthYear: 2024, sex: '牡', country: '日' })];
      const preview = await service.preview(rows, 2025, '現役');

      expect(preview.rows[0].action).toBe('update');
      expect(preview.rows[0].changes).toHaveProperty('yearlyStatus');
      expect(preview.summary.updateCount).toBe(1);
    });

    it('marks row as "invalid" when birthYear is null', async () => {
      const service = createImportService({
        db: createMockDb(),
        horseRepo: createMockHorseRepo(),
        yearlyStatusRepo: createMockYearlyStatusRepo(),
        lineageRepo: createMockLineageRepo(),
      });

      const rows = [buildParsedRow({ name: '生年不明馬', birthYear: null })];
      const preview = await service.preview(rows, 2025, '現役');

      expect(preview.rows[0].action).toBe('invalid');
      expect(preview.summary.invalidCount).toBe(1);
    });

    it('sets importStatus on the preview result', async () => {
      const service = createImportService({
        db: createMockDb(),
        horseRepo: createMockHorseRepo(),
        yearlyStatusRepo: createMockYearlyStatusRepo(),
        lineageRepo: createMockLineageRepo(),
      });

      const preview = await service.preview([], 2026, '種牡馬');
      expect(preview.importStatus).toBe('種牡馬');
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

    it('creates new horses with the specified status', async () => {
      const service = createServiceWithRealDb();

      const rows = [buildParsedRow({ name: 'テスト種牡馬', birthYear: 2020 })];
      const preview = await service.preview(rows, 2026, '種牡馬');
      const result = await service.execute(preview);

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);

      const horse = await db.get<Record<string, unknown>>('SELECT * FROM horses WHERE name = ?', [
        'テスト種牡馬',
      ]);
      expect(horse!.status).toBe('種牡馬');
    });

    it('creates new horses with ancestors and yearly statuses', async () => {
      const service = createServiceWithRealDb();

      const rows = [buildParsedRow({ name: 'テスト馬A', birthYear: 2023 })];
      const preview = await service.preview(rows, 2026, '現役');
      const result = await service.execute(preview);

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);

      // Verify sire was auto-created as ancestor
      const sire = await db.get<Record<string, unknown>>(
        'SELECT * FROM horses WHERE name = ? AND birth_year IS NULL',
        ['父馬'],
      );
      expect(sire).toBeDefined();
      expect(sire!.status).toBe('ancestor');

      // Verify yearly status was created
      const horse = await db.get<Record<string, unknown>>('SELECT * FROM horses WHERE name = ?', [
        'テスト馬A',
      ]);
      const status = await db.get<Record<string, unknown>>(
        'SELECT * FROM yearly_statuses WHERE horse_id = ? AND year = ?',
        [horse!.id, 2026],
      );
      expect(status).toBeDefined();
      expect(status!.sp_value).toBe(79);
    });

    it('auto-creates unknown lineage as parent without failing import', async () => {
      const service = createServiceWithRealDb();

      const rows = [
        buildParsedRow({
          name: '未知系統テスト馬',
          birthYear: 2023,
          sireLineageName: '未知の系統',
        }),
      ];
      const preview = await service.preview(rows, 2026, '現役');
      const result = await service.execute(preview);

      expect(result.success).toBe(true);

      const lineage = await db.get<Record<string, unknown>>(
        'SELECT * FROM lineages WHERE name = ?',
        ['未知の系統'],
      );
      expect(lineage).toBeDefined();
      expect(lineage!.lineage_type).toBe('parent');
      expect(lineage!.parent_lineage_id).toBeNull();
    });

    it('updates existing horse even when update payload includes unknown lineage', async () => {
      const service = createServiceWithRealDb();

      const initialRows = [buildParsedRow({ name: '更新未知系統馬', birthYear: 2023 })];
      const initialPreview = await service.preview(initialRows, 2025, '現役');
      await service.execute(initialPreview);

      const updateRows = [
        buildParsedRow({
          name: '更新未知系統馬',
          birthYear: 2023,
          sireLineageName: '更新時未知系統',
          spValue: 92,
        }),
      ];
      const updatePreview = await service.preview(updateRows, 2026, '種牡馬');
      const updateResult = await service.execute(updatePreview);

      expect(updateResult.success).toBe(true);
      expect(updateResult.updated).toBe(1);

      const lineage = await db.get<Record<string, unknown>>(
        'SELECT * FROM lineages WHERE name = ?',
        ['更新時未知系統'],
      );
      expect(lineage).toBeDefined();
      expect(lineage!.lineage_type).toBe('parent');
    });

    it('overwrites existing horse data on update (name-based match)', async () => {
      const service = createServiceWithRealDb();

      // First import creates the horse as 現役
      const rows1 = [buildParsedRow({ name: '上書きテスト馬', birthYear: 2023 })];
      const preview1 = await service.preview(rows1, 2025, '現役');
      await service.execute(preview1);

      // Second import with same name → update (overwrite)
      const rows2 = [
        buildParsedRow({
          name: '上書きテスト馬',
          birthYear: 2023,
          sex: '牝',
          country: '米',
          spValue: 90,
        }),
      ];
      const preview2 = await service.preview(rows2, 2026, '繁殖牝馬');
      expect(preview2.summary.updateCount).toBe(1);

      const result = await service.execute(preview2);
      expect(result.updated).toBe(1);

      // Verify horse data was overwritten
      const horse = await db.get<Record<string, unknown>>('SELECT * FROM horses WHERE name = ?', [
        '上書きテスト馬',
      ]);
      expect(horse!.sex).toBe('牝');
      expect(horse!.country).toBe('米');
      expect(horse!.status).toBe('繁殖牝馬');
    });

    it('does not create duplicate horse when only birthYear differs but name matches uniquely', async () => {
      const service = createServiceWithRealDb();

      const firstRows = [buildParsedRow({ name: '同名上書き馬', birthYear: 2021, country: '日' })];
      const firstPreview = await service.preview(firstRows, 2025, '現役');
      await service.execute(firstPreview);

      const secondRows = [buildParsedRow({ name: '同名上書き馬', birthYear: 2023, country: '米' })];
      const secondPreview = await service.preview(secondRows, 2026, '種牡馬');
      expect(secondPreview.summary.updateCount).toBe(1);
      expect(secondPreview.summary.newCount).toBe(0);

      await service.execute(secondPreview);

      const horses = await db.all<Record<string, unknown>>('SELECT * FROM horses WHERE name = ?', [
        '同名上書き馬',
      ]);
      expect(horses).toHaveLength(1);
      expect(horses[0].birth_year).toBe(2023);
      expect(horses[0].country).toBe('米');
      expect(horses[0].status).toBe('種牡馬');
    });

    it('overwrites ancestor horse when importing with same name', async () => {
      const service = createServiceWithRealDb();

      // Create a horse that auto-creates an ancestor named '父馬'
      const rows1 = [buildParsedRow({ name: 'テスト子馬', birthYear: 2023, sireName: '父馬' })];
      const preview1 = await service.preview(rows1, 2025, '現役');
      await service.execute(preview1);

      // Verify ancestor exists
      const ancestor = await db.get<Record<string, unknown>>(
        'SELECT * FROM horses WHERE name = ? AND birth_year IS NULL',
        ['父馬'],
      );
      expect(ancestor).toBeDefined();
      expect(ancestor!.status).toBe('ancestor');

      // Now import '父馬' as 種牡馬 → should update the ancestor
      const rows2 = [
        buildParsedRow({
          name: '父馬',
          birthYear: 2018,
          sex: '牡',
          country: '米',
          sireName: '祖父馬',
          damName: '祖母馬',
        }),
      ];
      const preview2 = await service.preview(rows2, 2026, '種牡馬');
      expect(preview2.summary.updateCount).toBe(1);

      const result = await service.execute(preview2);
      expect(result.updated).toBe(1);

      // Verify the ancestor was updated (overwritten)
      const updated = await db.get<Record<string, unknown>>('SELECT * FROM horses WHERE id = ?', [
        ancestor!.id,
      ]);
      expect(updated!.birth_year).toBe(2018);
      expect(updated!.sex).toBe('牡');
      expect(updated!.country).toBe('米');
      expect(updated!.status).toBe('種牡馬');
    });

    it('preserves existing pedigree when parsed data has null sire/dam', async () => {
      const service = createServiceWithRealDb();

      // First import: create horse with sire and dam
      const rows1 = [buildParsedRow({ name: '血統保持馬', birthYear: 2023 })];
      const preview1 = await service.preview(rows1, 2025, '現役');
      await service.execute(preview1);

      // Verify sire was created
      const horse1 = await db.get<Record<string, unknown>>(
        'SELECT * FROM horses WHERE name = ? AND birth_year = ?',
        ['血統保持馬', 2023],
      );
      expect(horse1!.sire_id).not.toBeNull();
      expect(horse1!.dam_id).not.toBeNull();
      const originalSireId = horse1!.sire_id;
      const originalDamId = horse1!.dam_id;

      // Second import: same horse but with null sire/dam (partial data)
      const rows2 = [
        buildParsedRow({
          name: '血統保持馬',
          birthYear: 2023,
          sireName: null,
          damName: null,
          sireLineageName: null,
          spValue: 90,
        }),
      ];
      const preview2 = await service.preview(rows2, 2026, '現役');
      await service.execute(preview2);

      // Verify pedigree was NOT cleared
      const horse2 = await db.get<Record<string, unknown>>(
        'SELECT * FROM horses WHERE name = ? AND birth_year = ?',
        ['血統保持馬', 2023],
      );
      expect(horse2!.sire_id).toBe(originalSireId);
      expect(horse2!.dam_id).toBe(originalDamId);
    });

    it('records import log on success', async () => {
      const service = createServiceWithRealDb();

      const rows = [buildParsedRow({ name: 'ログテスト馬', birthYear: 2023 })];
      const preview = await service.preview(rows, 2026, '現役');
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
      const preview = await service.preview(rows, 2026, '現役');
      const result = await service.execute(preview);

      expect(result.created).toBe(2);

      const sires = await db.all<Record<string, unknown>>(
        'SELECT * FROM horses WHERE name = ? AND birth_year IS NULL',
        ['共通父馬'],
      );
      expect(sires).toHaveLength(1);
    });

    it('rolls back entire transaction on error and records failed import log', async () => {
      await db.run("INSERT INTO horses (name, birth_year, status) VALUES ('既存馬', 2023, '現役')");

      const service = createServiceWithRealDb();

      const preview = {
        importYear: 2026,
        importStatus: '現役',
        rows: [
          {
            parsed: buildParsedRow({ name: '正常馬', birthYear: 2024 }),
            action: 'create' as const,
          },
          {
            parsed: buildParsedRow({ name: '既存馬', birthYear: 2023 }),
            action: 'create' as const,
          },
        ],
        summary: { newCount: 2, updateCount: 0, skipCount: 0, invalidCount: 0 },
      };

      const result = await service.execute(preview);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('phase=');

      const horse = await db.get<Record<string, unknown>>(
        'SELECT * FROM horses WHERE name = ? AND birth_year = ?',
        ['正常馬', 2024],
      );
      expect(horse).toBeUndefined();

      const failedLog = await db.get<Record<string, unknown>>(
        "SELECT * FROM import_logs WHERE status = 'failed' ORDER BY id DESC LIMIT 1",
      );
      expect(failedLog).toBeDefined();
      expect(failedLog!.status).toBe('failed');
      expect(failedLog!.error_detail).not.toBeNull();
    });
  });
});
