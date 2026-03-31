import { describe, it, expect, vi } from 'vitest';
import type { HorseRepository } from '@/features/horses/repository';
import type { Horse } from '@/features/horses/types';
import type { LineageRepository } from '@/features/lineages/repository';
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
    runningStyle: '差',
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

describe('ImportService', () => {
  describe('preview', () => {
    it('marks row as "create" when horse does not exist', async () => {
      const horseRepo = createMockHorseRepo({
        findByNameAndBirthYear: vi.fn().mockResolvedValue(null),
      });
      const service = createImportService({
        horseRepo,
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
        horseRepo,
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
        horseRepo,
        lineageRepo: createMockLineageRepo(),
      });

      const rows = [buildParsedRow({ name: '既存馬', birthYear: 2024, sex: '牡', country: '日' })];
      const preview = await service.preview(rows, 2025);

      expect(preview.rows[0].action).toBe('skip');
      expect(preview.summary.skipCount).toBe(1);
    });

    it('marks row as "skip" when birthYear is null', async () => {
      const service = createImportService({
        horseRepo: createMockHorseRepo(),
        lineageRepo: createMockLineageRepo(),
      });

      const rows = [buildParsedRow({ name: '生年不明馬', birthYear: null })];
      const preview = await service.preview(rows, 2025);

      expect(preview.rows[0].action).toBe('skip');
      expect(preview.summary.skipCount).toBe(1);
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
        horseRepo,
        lineageRepo: createMockLineageRepo(),
      });

      const rows = [
        buildParsedRow({ name: '新馬', birthYear: 2024 }),
        buildParsedRow({ name: '既存馬', birthYear: 2024, sex: '牡', country: '日' }),
        buildParsedRow({ name: '生年不明', birthYear: null }),
      ];
      const preview = await service.preview(rows, 2025);

      expect(preview.summary.newCount).toBe(1);
      expect(preview.summary.skipCount).toBe(2);
      expect(preview.importYear).toBe(2025);
    });

    it('sets importYear on the preview result', async () => {
      const service = createImportService({
        horseRepo: createMockHorseRepo(),
        lineageRepo: createMockLineageRepo(),
      });

      const preview = await service.preview([], 2026);
      expect(preview.importYear).toBe(2026);
      expect(preview.rows).toHaveLength(0);
    });
  });
});
