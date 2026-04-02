import { describe, it, expect } from 'vitest';
import { parseTsv, decodeWithAutoDetect } from './tsv-parser';
import { buildFullTsv, buildFullTsvNoTrailingTab, HEADER_ROW, DATA_ROWS } from './test-fixtures';

const IMPORT_YEAR = 2026;

describe('parseTsv', () => {
  describe('full 22-row real data', () => {
    const result = parseTsv(buildFullTsvNoTrailingTab(), IMPORT_YEAR);

    it('parses all 22 rows', () => {
      expect(result.rows).toHaveLength(22);
    });

    it('produces no warnings for valid data', () => {
      expect(result.warnings).toHaveLength(0);
    });

    // --- Horse name parsing ---
    it('parses plain horse names', () => {
      expect(result.rows[0].name).toBe('シーザジュピター');
      expect(result.rows[1].name).toBe('ジンキヨモト');
      expect(result.rows[19].name).toBe('ジンアオイダンガン');
    });

    it('strips (外) prefix from horse names', () => {
      expect(result.rows[6].name).toBe('ジンショウドウ');
      expect(result.rows[8].name).toBe('ジントモザワ');
      expect(result.rows[11].name).toBe('ジンパピヨン');
      expect(result.rows[15].name).toBe('ジンジュース');
    });

    // --- Country ---
    it('parses all countries: 日/米/欧', () => {
      expect(result.rows[0].country).toBe('日'); // シーザジュピター
      expect(result.rows[1].country).toBe('米'); // ジンキヨモト
      expect(result.rows[3].country).toBe('欧'); // ジンタクト
    });

    // --- Age → birthYear ---
    it('converts age to birthYear for various ages', () => {
      expect(result.rows[0].birthYear).toBe(2021); // age 5 → 2026-5
      expect(result.rows[1].birthYear).toBe(2022); // age 4 → 2026-4
      expect(result.rows[2].birthYear).toBe(2023); // age 3 → 2026-3
    });

    // --- Sex ---
    it('parses sex (牡/牝)', () => {
      expect(result.rows[0].sex).toBe('牝');
      expect(result.rows[1].sex).toBe('牡');
    });

    // --- SP ---
    it('extracts SP value from various formats', () => {
      expect(result.rows[0].spValue).toBe(83);
      expect(result.rows[20].spValue).toBe(69);
      expect(result.rows[1].spValue).toBe(82);
    });

    it('sets spRank to null (SP has no letter rank)', () => {
      expect(result.rows[0].spRank).toBeNull();
    });

    // --- Ability ranks: full range G to S+ ---
    it('parses G rank', () => {
      expect(result.rows[7].powerRank).toBe('G'); // ジンオクイ power=G(0)
      expect(result.rows[2].wisdomRank).toBe('G'); // ジンビーズ wisdom=G(0)
    });

    it('parses G+ rank', () => {
      expect(result.rows[3].instantRank).toBe('G+'); // ジンタクト instant=G+(2)
    });

    it('parses F and F+ ranks', () => {
      expect(result.rows[1].staminaRank).toBe('F'); // ジンキヨモト stamina=F(2)
      expect(result.rows[10].powerRank).toBe('F+'); // ジンライアー power=F+(3)
    });

    it('parses E and E+ ranks', () => {
      expect(result.rows[2].powerRank).toBe('E'); // ジンビーズ power=E(0)
      expect(result.rows[10].staminaRank).toBe('E+'); // ジンライアー stamina=E+(0)
    });

    it('parses D and D+ ranks', () => {
      expect(result.rows[0].wisdomRank).toBe('D'); // シーザジュピター wisdom=D(6)
      expect(result.rows[0].staminaRank).toBe('D+'); // シーザジュピター stamina=D+(1)
    });

    it('parses C and C+ ranks', () => {
      expect(result.rows[4].staminaRank).toBe('C'); // ジンヒジリ stamina=C(3)
      expect(result.rows[4].instantRank).toBe('C+'); // ジンヒジリ instant=C+(2)
    });

    it('parses B and B+ ranks', () => {
      expect(result.rows[0].instantRank).toBe('B'); // シーザジュピター instant=B(1)
      expect(result.rows[1].instantRank).toBe('B+'); // ジンキヨモト instant=B+(1)
    });

    it('parses A and A+ ranks', () => {
      expect(result.rows[1].mentalRank).toBe('A'); // ジンキヨモト mental=A(6)
      expect(result.rows[0].mentalRank).toBe('A+'); // シーザジュピター mental=A+(2)
    });

    it('parses S and S+ ranks', () => {
      expect(result.rows[6].instantRank).toBe('S'); // ジンショウドウ instant=S(0)
      expect(result.rows[0].powerRank).toBe('S+'); // シーザジュピター power=S+(0)
    });

    it('parses ability values correctly', () => {
      expect(result.rows[0].powerValue).toBe(0);
      expect(result.rows[10].mentalValue).toBe(10); // ジンライアー mental=C+(10)
      expect(result.rows[11].instantValue).toBe(7); // ジンパピヨン instant=S(7)
      expect(result.rows[5].mentalValue).toBe(8); // ジンタキモト mental=S+(8)
    });

    // --- Turf/Dirt aptitude ---
    it('parses ◎ aptitude', () => {
      expect(result.rows[0].turfAptitude).toBe('◎');
      expect(result.rows[0].dirtAptitude).toBe('◎');
    });

    it('parses ○ aptitude', () => {
      expect(result.rows[6].dirtAptitude).toBe('○');
      expect(result.rows[14].turfAptitude).toBe('○');
    });

    it('parses △ aptitude', () => {
      expect(result.rows[1].turfAptitude).toBe('△'); // ジンキヨモト
      expect(result.rows[20].dirtAptitude).toBe('△'); // ジンブロウィン
    });

    it('parses × aptitude', () => {
      expect(result.rows[4].dirtAptitude).toBe('×'); // ジンヒジリ
      expect(result.rows[21].turfAptitude).toBe('×'); // ジンウチョウテン
    });

    // --- Distance ---
    it('parses various distance ranges', () => {
      expect(result.rows[0].distanceMin).toBe(1100);
      expect(result.rows[0].distanceMax).toBe(2000);
      expect(result.rows[12].distanceMin).toBe(1200); // same min/max
      expect(result.rows[12].distanceMax).toBe(1200);
      expect(result.rows[14].distanceMin).toBe(1700);
      expect(result.rows[14].distanceMax).toBe(2900);
    });

    // --- Running style ---
    it('parses all running styles', () => {
      expect(result.rows[0].runningStyle).toBe('追込');
      expect(result.rows[1].runningStyle).toBe('差し');
      expect(result.rows[2].runningStyle).toBe('先行');
      expect(result.rows[7].runningStyle).toBe('逃げ');
      expect(result.rows[14].runningStyle).toBe('自在');
    });

    // --- Growth type ---
    it('parses all growth types', () => {
      expect(result.rows[0].growthType).toBe('早鍋');
      expect(result.rows[1].growthType).toBe('普遅');
      expect(result.rows[2].growthType).toBe('普早');
      expect(result.rows[7].growthType).toBe('超晩');
      expect(result.rows[9].growthType).toBe('覚醒');
      expect(result.rows[19].growthType).toBe('早熟');
      expect(result.rows[3].growthType).toBe('普鍋');
    });

    // --- Traits ---
    it('parses multiple traits', () => {
      expect(result.rows[0].traits).toEqual(['大舞台', '鉄砲', '牡馬混合', '直一気']);
      expect(result.rows[9].traits).toEqual(['大舞台', '直一気', '学習能力']);
    });

    it('parses single trait', () => {
      expect(result.rows[1].traits).toEqual(['叩き良化']);
      expect(result.rows[2].traits).toEqual(['スタート']);
      expect(result.rows[3].traits).toEqual(['二の脚']);
    });

    it('parses two traits', () => {
      expect(result.rows[8].traits).toEqual(['鉄砲', 'スタート']);
      expect(result.rows[17].traits).toEqual(['スタート', '完全燃焼']);
    });

    it('returns null for empty traits', () => {
      expect(result.rows[4].traits).toBeNull(); // ジンヒジリ
      expect(result.rows[6].traits).toBeNull(); // ジンショウドウ
      expect(result.rows[10].traits).toBeNull(); // ジンライアー
    });

    // --- Pedigree ---
    it('parses sire and dam names', () => {
      expect(result.rows[0].sireName).toBe('シーザスターズ');
      expect(result.rows[0].damName).toBe('カンパリジュピター');
      expect(result.rows[6].sireName).toBe('ジャイアンツコーズウェイ');
      expect(result.rows[6].damName).toBe('ジンワシントン');
    });

    it('parses sire lineage names', () => {
      expect(result.rows[0].sireLineageName).toBe('グリーンデザート系');
      expect(result.rows[1].sireLineageName).toBe('マンノウォー系');
      expect(result.rows[6].sireLineageName).toBe('ストームキャット系');
    });

    it('parses mare line when present', () => {
      expect(result.rows[1].mareLineName).toBe('エスサーディー系');
      expect(result.rows[2].mareLineName).toBe('ドクサ系');
      expect(result.rows[9].mareLineName).toBe('リメンブランス系');
    });

    it('returns null for empty mare line', () => {
      expect(result.rows[0].mareLineName).toBeNull();
      expect(result.rows[6].mareLineName).toBeNull();
      expect(result.rows[10].mareLineName).toBeNull();
    });

    // --- Race record ---
    it('parses race records (trimmed)', () => {
      expect(result.rows[0].raceRecord).toBe('14 -  3 -  0 -  0');
      expect(result.rows[1].raceRecord).toBe('6 -  1 -  2 -  1');
    });

    it('parses unraced horse record', () => {
      expect(result.rows[12].raceRecord).toBe('0 -  0 -  0 -  0');
      expect(result.rows[13].raceRecord).toBe('0 -  0 -  0 -  0');
    });

    // --- isHistorical ---
    it('parses isHistorical as false for all owned horses', () => {
      for (const row of result.rows) {
        expect(row.isHistorical).toBe(false);
      }
    });
  });

  describe('trailing tab handling', () => {
    it('parses data with trailing tabs (real 読専 output format)', () => {
      const tsvWithTrailingTabs = buildFullTsv();
      const result = parseTsv(tsvWithTrailingTabs, IMPORT_YEAR);
      expect(result.rows).toHaveLength(22);
      expect(result.rows[0].name).toBe('シーザジュピター');
      expect(result.rows[0].birthYear).toBe(2021);
      expect(result.rows[6].name).toBe('ジンショウドウ');
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('decodeWithAutoDetect', () => {
    it('decodes UTF-8 buffer correctly', () => {
      const content = '馬名\t国\t年\nテスト馬\t日\t3';
      const buffer = new TextEncoder().encode(content).buffer as ArrayBuffer;
      const result = decodeWithAutoDetect(buffer);
      expect(result).toContain('馬名');
      expect(result).toContain('テスト馬');
    });

    it('decodes Shift-JIS buffer correctly', () => {
      // "馬名\t国\n" in Shift-JIS
      const sjisBytes = new Uint8Array([0x94, 0x6e, 0x96, 0xbc, 0x09, 0x8d, 0x91, 0x0a]);
      const result = decodeWithAutoDetect(sjisBytes.buffer as ArrayBuffer);
      expect(result).toContain('馬名');
      expect(result).toContain('国');
    });

    it('falls back to UTF-8 for unknown encoding', () => {
      const content = 'unknown\theader\ndata\tvalue';
      const buffer = new TextEncoder().encode(content).buffer as ArrayBuffer;
      const result = decodeWithAutoDetect(buffer);
      expect(result).toBe(content);
    });
  });

  describe('edge cases', () => {
    it('returns empty rows for empty input', () => {
      const result = parseTsv('', IMPORT_YEAR);
      expect(result.rows).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('returns empty rows for header-only input', () => {
      const result = parseTsv(HEADER_ROW, IMPORT_YEAR);
      expect(result.rows).toHaveLength(0);
    });

    it('handles \\r\\n line endings', () => {
      const tsvCrLf = [HEADER_ROW, DATA_ROWS[0]].join('\r\n');
      const result = parseTsv(tsvCrLf, IMPORT_YEAR);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('シーザジュピター');
    });

    it('ignores empty trailing lines', () => {
      const tsvTrailing = [HEADER_ROW, DATA_ROWS[0], '', ''].join('\n');
      const result = parseTsv(tsvTrailing, IMPORT_YEAR);
      expect(result.rows).toHaveLength(1);
    });

    it('parses single row correctly', () => {
      const tsv = [HEADER_ROW, DATA_ROWS[6]].join('\n');
      const result = parseTsv(tsv, IMPORT_YEAR);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('ジンショウドウ');
      expect(result.rows[0].sireName).toBe('ジャイアンツコーズウェイ');
    });
  });
});
