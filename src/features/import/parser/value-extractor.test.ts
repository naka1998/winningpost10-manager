import { describe, it, expect } from 'vitest';
import {
  extractSpValue,
  extractRankAndValue,
  extractDistanceRange,
  cleanHorseName,
  extractTraits,
  ageToBirthYear,
  extractIsHistorical,
} from './value-extractor';

describe('extractSpValue', () => {
  it('parses "83(82)" → 83', () => {
    expect(extractSpValue('83(82)')).toBe(83);
  });

  it('parses "76(75)" → 76', () => {
    expect(extractSpValue('76(75)')).toBe(76);
  });

  it('parses "69(67)" → 69', () => {
    expect(extractSpValue('69(67)')).toBe(69);
  });

  it('returns null for empty string', () => {
    expect(extractSpValue('')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(extractSpValue('abc')).toBeNull();
  });
});

describe('extractRankAndValue', () => {
  it('parses "S+(0)" → { rank: "S+", value: 0 }', () => {
    expect(extractRankAndValue('S+(0)')).toEqual({ rank: 'S+', value: 0 });
  });

  it('parses "B(1)" → { rank: "B", value: 1 }', () => {
    expect(extractRankAndValue('B(1)')).toEqual({ rank: 'B', value: 1 });
  });

  it('parses "D+(1)" → { rank: "D+", value: 1 }', () => {
    expect(extractRankAndValue('D+(1)')).toEqual({ rank: 'D+', value: 1 });
  });

  it('parses "A+(3)" → { rank: "A+", value: 3 }', () => {
    expect(extractRankAndValue('A+(3)')).toEqual({ rank: 'A+', value: 3 });
  });

  it('parses "G+(2)" → { rank: "G+", value: 2 }', () => {
    expect(extractRankAndValue('G+(2)')).toEqual({ rank: 'G+', value: 2 });
  });

  it('parses "S(5)" → { rank: "S", value: 5 }', () => {
    expect(extractRankAndValue('S(5)')).toEqual({ rank: 'S', value: 5 });
  });

  it('parses "E(0)" → { rank: "E", value: 0 }', () => {
    expect(extractRankAndValue('E(0)')).toEqual({ rank: 'E', value: 0 });
  });

  it('parses "G(0)" → { rank: "G", value: 0 }', () => {
    expect(extractRankAndValue('G(0)')).toEqual({ rank: 'G', value: 0 });
  });

  it('returns null for empty string', () => {
    expect(extractRankAndValue('')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(extractRankAndValue('abc')).toBeNull();
  });
});

describe('extractDistanceRange', () => {
  it('parses "1100～2000m" → { min: 1100, max: 2000 }', () => {
    expect(extractDistanceRange('1100～2000m')).toEqual({ min: 1100, max: 2000 });
  });

  it('parses "1500～2700m" → { min: 1500, max: 2700 }', () => {
    expect(extractDistanceRange('1500～2700m')).toEqual({ min: 1500, max: 2700 });
  });

  it('parses "1200～1200m" → { min: 1200, max: 1200 }', () => {
    expect(extractDistanceRange('1200～1200m')).toEqual({ min: 1200, max: 1200 });
  });

  it('returns null for empty string', () => {
    expect(extractDistanceRange('')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(extractDistanceRange('abc')).toBeNull();
  });
});

describe('cleanHorseName', () => {
  it('strips (外) prefix', () => {
    expect(cleanHorseName('(外)ジンショウドウ')).toBe('ジンショウドウ');
  });

  it('returns name unchanged when no prefix', () => {
    expect(cleanHorseName('シーザジュピター')).toBe('シーザジュピター');
  });

  it('trims whitespace', () => {
    expect(cleanHorseName('  シーザジュピター  ')).toBe('シーザジュピター');
  });

  it('strips (外) and trims', () => {
    expect(cleanHorseName(' (外)ジントモザワ ')).toBe('ジントモザワ');
  });
});

describe('extractTraits', () => {
  it('splits space-separated traits', () => {
    expect(extractTraits('大舞台 鉄砲 牡馬混合 直一気')).toEqual([
      '大舞台',
      '鉄砲',
      '牡馬混合',
      '直一気',
    ]);
  });

  it('handles single trait', () => {
    expect(extractTraits('叩き良化')).toEqual(['叩き良化']);
  });

  it('returns null for empty string', () => {
    expect(extractTraits('')).toBeNull();
  });

  it('filters out empty strings from extra spaces', () => {
    expect(extractTraits('大舞台  鉄砲')).toEqual(['大舞台', '鉄砲']);
  });

  it('returns null for whitespace-only string', () => {
    expect(extractTraits('   ')).toBeNull();
  });
});

describe('ageToBirthYear', () => {
  it('converts age 5 with importYear 2026 → 2021', () => {
    expect(ageToBirthYear('5', 2026)).toBe(2021);
  });

  it('converts age 3 with importYear 2026 → 2023', () => {
    expect(ageToBirthYear('3', 2026)).toBe(2023);
  });

  it('converts age 4 with importYear 2026 → 2022', () => {
    expect(ageToBirthYear('4', 2026)).toBe(2022);
  });

  it('returns null for non-numeric string', () => {
    expect(ageToBirthYear('abc', 2026)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(ageToBirthYear('', 2026)).toBeNull();
  });
});

describe('extractIsHistorical', () => {
  it('returns false for empty string', () => {
    expect(extractIsHistorical('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(extractIsHistorical('  ')).toBe(false);
  });

  it('returns true for non-empty string', () => {
    expect(extractIsHistorical('○')).toBe(true);
  });
});
