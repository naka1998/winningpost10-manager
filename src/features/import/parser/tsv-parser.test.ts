import { describe, it, expect } from 'vitest';
import { parseTsv } from './tsv-parser';

// Real TSV data from the user (header + 3 representative rows)
const HEADER =
  '馬名\t国\t年\t性\tSP\tST\tSP率\t力\t瞬\t勝\t柔\t精\t賢\t健\tサ\t芝\tダ\t芝質\t距離適性\t気\t脚質\t成型\t成力\t成度\t成限\t寿命\t調子\t疲労\t闘\t馬体重\t子出\t毛色\t性格\t高\t長\t跳\t小\t左\t右\t脚\t喉\t腰\t遅\t特性\t関係性効果\t父馬\t父系\t母馬\t牝系\t出走\t戦績\t前走\t次走\tクラス\t賞金\t本賞金\t生産国\t馬主\t牧場\t調教師\t騎手\t海外遠征\t現役\t史実\t史実番号\t能力番号\t馬番号\t継承特性\t馬名';

const ROW_CAESAR_JUPITER =
  'シーザジュピター\t日\t5\t牝\t83(82)\t27\t84.7(84.7)\tS+(0)\tB(1)\tD+(1)\tA+(3)\tA+(2)\tD(6)\tC(7)\t72( +8)\t◎\t◎\t1-4(1-5)\t1100～2000m\t激\t追込\t早鍋\t有\t102\t102\t53\t37 ／\t0\t3\t+4(526)\t7\t鹿\t普通\t高\t普\t普\t\t\t\t\t\t\t\t大舞台 鉄砲 牡馬混合 直一気\t闘 学\tシーザスターズ\tグリーンデザート系\tカンパリジュピター\t\t17\t14 -  3 -  0 -  0\t12月2週 - 香港スプリント\t 4月1週 - 大阪杯\tオープン\t133,800\t67,000\t日本\t48\t32\t161\t188\t済\t○\t\t0x7FFF\t0x0591\t0x176F\tSP(非ST優,父,無,ST)\tシーザジュピター';

const ROW_JIN_SHOWDOW =
  '(外)ジンショウドウ\t日\t3\t牡\t78(75)\t50\t78.8(79.6)\tS+(2)\tS(0)\tC+(0)\tG(0)\tA(1)\tS(1)\tA+(1)\t77( +1)\t◎\t○\t1-2(1-3)\t1900～2100m\t激\t追込\t普早\t有\t101\t102\t81\t45 →\t11\t2\t-4(524)\t7\t栗\t頑固\t高\t普\t普\t\t\t\t\t\t×\t\t\t\tジャイアンツコーズウェイ\tストームキャット系\tジンワシントン\t\t4\t 4 -  0 -  0 -  0\t12月3週 - 朝日杯ＦＳ\t 3月2週 - 弥生賞ディープインパクト記念\tオープン\t14,100\t7,100\t米国\t48\t32\t161\t344\t\t○\t\t0x7FFF\t0x0150\t0x1767\tSP(非ST優,母,無,ST)\tジンショウドウ';

const ROW_JIN_BEES =
  'ジンビーズ\t日\t3\t牝\t82(78)\t55\t74.6(82.0)\tE(0)\tA+(0)\tS+(0)\tS(2)\tS(0)\tG(0)\tS+(0)\t75( +1)\t◎\t◎\t1-2(1-3)\t1500～2700m\t普\t先行\t普早\t普\t91\t100\t70\t42 ／\t0\t2\t+6(454)\t10\t栗\t頑固\t低\t普\t普\t\t\t\t\t\t\t\tスタート\t\tキングカメハメハ\tキングマンボ系\tジンチョウウン\tドクサ系\t3\t 3 -  0 -  0 -  0\t12月2週 - 全日本２歳優駿\t 1月2週 - シンザン記念\tオープン\t7,800\t4,100\t日本\t48\t32\t161\t230\t\t○\t\t0x7FFF\t0x008E\t0x1764\tSP(非ST優,父,無,ST)\tジンビーズ';

const TEST_TSV = [HEADER, ROW_CAESAR_JUPITER, ROW_JIN_SHOWDOW, ROW_JIN_BEES].join('\n');

const IMPORT_YEAR = 2026;

describe('parseTsv', () => {
  describe('with real TSV data', () => {
    it('returns correct number of parsed rows', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows).toHaveLength(3);
    });

    it('parses horse name correctly, stripping (外) prefix', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].name).toBe('シーザジュピター');
      expect(result.rows[1].name).toBe('ジンショウドウ');
      expect(result.rows[2].name).toBe('ジンビーズ');
    });

    it('parses country field', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].country).toBe('日');
      expect(result.rows[1].country).toBe('日');
    });

    it('converts age to birthYear using importYear', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].birthYear).toBe(2021); // 2026 - 5
      expect(result.rows[1].birthYear).toBe(2023); // 2026 - 3
      expect(result.rows[2].birthYear).toBe(2023); // 2026 - 3
    });

    it('parses sex field', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].sex).toBe('牝');
      expect(result.rows[1].sex).toBe('牡');
    });

    it('extracts SP value from "83(82)" format', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].spValue).toBe(83);
      expect(result.rows[1].spValue).toBe(78);
    });

    it('extracts rank and value for power field', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].powerRank).toBe('S+');
      expect(result.rows[0].powerValue).toBe(0);
    });

    it('extracts rank and value for instant field', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].instantRank).toBe('B');
      expect(result.rows[0].instantValue).toBe(1);
    });

    it('extracts rank and value for stamina field', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].staminaRank).toBe('D+');
      expect(result.rows[0].staminaValue).toBe(1);
    });

    it('extracts rank and value for mental field', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].mentalRank).toBe('A+');
      expect(result.rows[0].mentalValue).toBe(2);
    });

    it('extracts rank and value for wisdom field', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].wisdomRank).toBe('D');
      expect(result.rows[0].wisdomValue).toBe(6);
    });

    it('parses turf aptitude', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].turfAptitude).toBe('◎');
      expect(result.rows[1].turfAptitude).toBe('◎');
    });

    it('parses dirt aptitude', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].dirtAptitude).toBe('◎');
      expect(result.rows[1].dirtAptitude).toBe('○');
    });

    it('extracts distance range min and max', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].distanceMin).toBe(1100);
      expect(result.rows[0].distanceMax).toBe(2000);
      expect(result.rows[1].distanceMin).toBe(1900);
      expect(result.rows[1].distanceMax).toBe(2100);
    });

    it('parses growth type', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].growthType).toBe('早鍋');
      expect(result.rows[1].growthType).toBe('普早');
    });

    it('parses running style', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].runningStyle).toBe('追込');
      expect(result.rows[2].runningStyle).toBe('先行');
    });

    it('splits traits by space into array', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].traits).toEqual(['大舞台', '鉄砲', '牡馬混合', '直一気']);
      expect(result.rows[2].traits).toEqual(['スタート']);
    });

    it('parses null traits when column is empty', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      // row 1 ((外)ジンショウドウ) has empty traits column
      expect(result.rows[1].traits).toBeNull();
    });

    it('parses sire name', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].sireName).toBe('シーザスターズ');
      expect(result.rows[1].sireName).toBe('ジャイアンツコーズウェイ');
    });

    it('parses sire lineage name', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].sireLineageName).toBe('グリーンデザート系');
      expect(result.rows[2].sireLineageName).toBe('キングマンボ系');
    });

    it('parses dam name', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].damName).toBe('カンパリジュピター');
      expect(result.rows[1].damName).toBe('ジンワシントン');
    });

    it('parses mare line name (null when empty)', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].mareLineName).toBeNull(); // empty in TSV
      expect(result.rows[2].mareLineName).toBe('ドクサ系');
    });

    it('stores race record as-is', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].raceRecord).toBe('14 -  3 -  0 -  0');
    });

    it('parses jockey', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].jockey).toBe('188');
    });

    it('parses isHistorical as boolean', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.rows[0].isHistorical).toBe(false);
      expect(result.rows[1].isHistorical).toBe(false);
    });

    it('returns no warnings for valid data', () => {
      const result = parseTsv(TEST_TSV, IMPORT_YEAR);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('returns empty rows for empty input', () => {
      const result = parseTsv('', IMPORT_YEAR);
      expect(result.rows).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('returns empty rows for header-only input', () => {
      const result = parseTsv(HEADER, IMPORT_YEAR);
      expect(result.rows).toHaveLength(0);
    });

    it('handles \\r\\n line endings', () => {
      const tsvCrLf = [HEADER, ROW_CAESAR_JUPITER].join('\r\n');
      const result = parseTsv(tsvCrLf, IMPORT_YEAR);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('シーザジュピター');
    });

    it('ignores empty trailing lines', () => {
      const tsvTrailing = [HEADER, ROW_CAESAR_JUPITER, '', ''].join('\n');
      const result = parseTsv(tsvTrailing, IMPORT_YEAR);
      expect(result.rows).toHaveLength(1);
    });
  });
});
