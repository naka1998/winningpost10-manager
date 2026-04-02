import { describe, it, expect, vi } from 'vitest';
import type { HorseRepository } from '@/features/horses/repository';
import type { PedigreeRow } from './service';
import { buildPedigreeTree, createPedigreeService } from './service';

function buildRow(overrides: Partial<PedigreeRow>): PedigreeRow {
  return {
    id: 1,
    name: 'テスト馬',
    country: null,
    generation: 0,
    position: 'self',
    path: '',
    factors: null,
    lineage_name: null,
    sp_st_type: null,
    parent_lineage_name: null,
    ...overrides,
  };
}

function createMockHorseRepo(overrides?: Partial<HorseRepository>): HorseRepository {
  return {
    findById: vi.fn(),
    findByName: vi.fn(),
    findByNameAndBirthYear: vi.fn(),
    findAncestorByName: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getAncestorRows: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as HorseRepository;
}

describe('buildPedigreeTree', () => {
  it('builds a single-node tree from one row', () => {
    const rows = [buildRow({ id: 1, name: '本馬', generation: 0, path: '' })];
    const tree = buildPedigreeTree(rows);

    expect(tree.id).toBe(1);
    expect(tree.name).toBe('本馬');
    expect(tree.sire).toBeUndefined();
    expect(tree.dam).toBeUndefined();
  });

  it('links sire and dam to the root node', () => {
    const rows = [
      buildRow({ id: 1, name: '本馬', generation: 0, path: '' }),
      buildRow({ id: 2, name: '父', generation: 1, position: 'sire', path: 'S' }),
      buildRow({ id: 3, name: '母', generation: 1, position: 'dam', path: 'D' }),
    ];
    const tree = buildPedigreeTree(rows);

    expect(tree.sire?.name).toBe('父');
    expect(tree.sire?.generation).toBe(1);
    expect(tree.dam?.name).toBe('母');
    expect(tree.dam?.generation).toBe(1);
  });

  it('builds a 3-generation tree', () => {
    const rows = [
      buildRow({ id: 1, name: '本馬', generation: 0, path: '' }),
      buildRow({ id: 2, name: '父', generation: 1, path: 'S' }),
      buildRow({ id: 3, name: '母', generation: 1, path: 'D' }),
      buildRow({ id: 4, name: '父父', generation: 2, path: 'SS' }),
      buildRow({ id: 5, name: '父母', generation: 2, path: 'SD' }),
      buildRow({ id: 6, name: '母父', generation: 2, path: 'DS' }),
      buildRow({ id: 7, name: '母母', generation: 2, path: 'DD' }),
    ];
    const tree = buildPedigreeTree(rows);

    expect(tree.sire?.sire?.name).toBe('父父');
    expect(tree.sire?.dam?.name).toBe('父母');
    expect(tree.dam?.sire?.name).toBe('母父');
    expect(tree.dam?.dam?.name).toBe('母母');
  });

  it('parses factors JSON string into array', () => {
    const rows = [buildRow({ id: 1, name: '本馬', path: '', factors: '["スピード","パワー"]' })];
    const tree = buildPedigreeTree(rows);
    expect(tree.factors).toEqual(['スピード', 'パワー']);
  });

  it('handles invalid factors JSON gracefully', () => {
    const rows = [buildRow({ id: 1, name: '本馬', path: '', factors: 'invalid' })];
    const tree = buildPedigreeTree(rows);
    expect(tree.factors).toBeNull();
  });

  it('maps lineage fields correctly', () => {
    const rows = [
      buildRow({
        id: 1,
        name: '本馬',
        path: '',
        lineage_name: 'サンデーサイレンス系',
        sp_st_type: 'SP',
        parent_lineage_name: 'ヘイルトゥリーズン系',
      }),
    ];
    const tree = buildPedigreeTree(rows);
    expect(tree.lineageName).toBe('サンデーサイレンス系');
    expect(tree.spStType).toBe('SP');
    expect(tree.parentLineageName).toBe('ヘイルトゥリーズン系');
  });
});

describe('PedigreeService', () => {
  describe('getPedigreeTree', () => {
    it('returns a pedigree tree from ancestor rows', async () => {
      const mockRepo = createMockHorseRepo({
        getAncestorRows: vi
          .fn()
          .mockResolvedValue([
            buildRow({ id: 1, name: '本馬', generation: 0, path: '' }),
            buildRow({ id: 2, name: '父', generation: 1, path: 'S' }),
            buildRow({ id: 3, name: '母', generation: 1, path: 'D' }),
          ]),
      });
      const service = createPedigreeService({ horseRepo: mockRepo });

      const tree = await service.getPedigreeTree(1);
      expect(tree).not.toBeNull();
      expect(tree!.name).toBe('本馬');
      expect(tree!.sire?.name).toBe('父');
      expect(tree!.dam?.name).toBe('母');
      expect(mockRepo.getAncestorRows).toHaveBeenCalledWith(1, 4);
    });

    it('returns null when no ancestor rows found', async () => {
      const mockRepo = createMockHorseRepo({
        getAncestorRows: vi.fn().mockResolvedValue([]),
      });
      const service = createPedigreeService({ horseRepo: mockRepo });

      const tree = await service.getPedigreeTree(9999);
      expect(tree).toBeNull();
    });

    it('passes custom depth to repository', async () => {
      const mockRepo = createMockHorseRepo({
        getAncestorRows: vi
          .fn()
          .mockResolvedValue([buildRow({ id: 1, name: '本馬', generation: 0, path: '' })]),
      });
      const service = createPedigreeService({ horseRepo: mockRepo });

      await service.getPedigreeTree(1, 5);
      expect(mockRepo.getAncestorRows).toHaveBeenCalledWith(1, 5);
    });
  });

  describe('detectInbreeding', () => {
    it('detects no inbreeding when all ancestors are unique', () => {
      const service = createPedigreeService({ horseRepo: createMockHorseRepo() });

      const rows = [
        buildRow({ id: 1, name: '本馬', generation: 0, path: '' }),
        buildRow({ id: 2, name: '父', generation: 1, path: 'S' }),
        buildRow({ id: 3, name: '母', generation: 1, path: 'D' }),
        buildRow({ id: 4, name: '父父', generation: 2, path: 'SS' }),
        buildRow({ id: 5, name: '母父', generation: 2, path: 'DS' }),
      ];
      const tree = buildPedigreeTree(rows);
      const inbreeding = service.detectInbreeding(tree);
      expect(inbreeding).toEqual([]);
    });

    it('detects 3×4 inbreeding (same ancestor at generation 3 and 4)', () => {
      const service = createPedigreeService({ horseRepo: createMockHorseRepo() });

      // Common ancestor (id=10) appears at generation 3 (SSS) and generation 4 (DSSS)
      // Using a simplified pedigree where we manually build the tree
      const rows = [
        buildRow({ id: 1, name: '本馬', generation: 0, path: '' }),
        buildRow({ id: 2, name: '父', generation: 1, path: 'S' }),
        buildRow({ id: 3, name: '母', generation: 1, path: 'D' }),
        buildRow({ id: 4, name: '父父', generation: 2, path: 'SS' }),
        buildRow({ id: 5, name: '母父', generation: 2, path: 'DS' }),
        buildRow({ id: 10, name: '共通祖先', generation: 3, path: 'SSS' }),
        buildRow({ id: 6, name: '母父父', generation: 3, path: 'DSS' }),
        buildRow({ id: 10, name: '共通祖先', generation: 4, path: 'DSSS' }),
      ];
      const tree = buildPedigreeTree(rows);
      const inbreeding = service.detectInbreeding(tree);

      expect(inbreeding).toHaveLength(1);
      expect(inbreeding[0].ancestorName).toBe('共通祖先');
      expect(inbreeding[0].ancestorId).toBe(10);
      expect(inbreeding[0].notation).toBe('3×4');
    });

    it('detects multiple inbreeding crosses', () => {
      const service = createPedigreeService({ horseRepo: createMockHorseRepo() });

      const rows = [
        buildRow({ id: 1, name: '本馬', generation: 0, path: '' }),
        buildRow({ id: 2, name: '父', generation: 1, path: 'S' }),
        buildRow({ id: 3, name: '母', generation: 1, path: 'D' }),
        // Ancestor A appears at generation 2 on both sides
        buildRow({ id: 10, name: '祖先A', generation: 2, path: 'SS' }),
        buildRow({ id: 10, name: '祖先A', generation: 2, path: 'DS' }),
        // Need intermediate nodes for the tree to be properly linked
        buildRow({ id: 11, name: '父母', generation: 2, path: 'SD' }),
        buildRow({ id: 12, name: '母母', generation: 2, path: 'DD' }),
        // Ancestor B appears at generation 3 on both sides
        buildRow({ id: 20, name: '祖先B', generation: 3, path: 'SDS' }),
        buildRow({ id: 20, name: '祖先B', generation: 3, path: 'DDS' }),
      ];
      const tree = buildPedigreeTree(rows);
      const inbreeding = service.detectInbreeding(tree);

      expect(inbreeding).toHaveLength(2);
      const names = inbreeding.map((i) => i.ancestorName).sort();
      expect(names).toEqual(['祖先A', '祖先B']);
    });
  });
});
