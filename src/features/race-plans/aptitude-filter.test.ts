import { describe, expect, it } from 'vitest';
import type { YearlyStatus } from '@/features/horses/types';
import { hasSurfaceAptitude, hasDistanceAptitude } from './aptitude-filter';

function makeStatus(overrides: Partial<YearlyStatus> = {}): YearlyStatus {
  return {
    id: 1,
    horseId: 1,
    year: 2026,
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
    subParams: null,
    turfAptitude: null,
    dirtAptitude: null,
    turfQuality: null,
    distanceMin: null,
    distanceMax: null,
    growthType: null,
    runningStyle: null,
    traits: null,
    jockey: null,
    grade: null,
    raceRecord: null,
    notes: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('hasSurfaceAptitude', () => {
  it('returns true when status is undefined (no data)', () => {
    expect(hasSurfaceAptitude(undefined, '芝')).toBe(true);
  });

  it('returns true when turfAptitude is null', () => {
    expect(hasSurfaceAptitude(makeStatus({ turfAptitude: null }), '芝')).toBe(true);
  });

  it('returns true for ◎', () => {
    expect(hasSurfaceAptitude(makeStatus({ turfAptitude: '◎' }), '芝')).toBe(true);
  });

  it('returns true for ○', () => {
    expect(hasSurfaceAptitude(makeStatus({ turfAptitude: '○' }), '芝')).toBe(true);
  });

  it('returns false for △', () => {
    expect(hasSurfaceAptitude(makeStatus({ turfAptitude: '△' }), '芝')).toBe(false);
  });

  it('returns false for ×', () => {
    expect(hasSurfaceAptitude(makeStatus({ turfAptitude: '×' }), '芝')).toBe(false);
  });

  it('checks dirtAptitude when surface is ダート', () => {
    expect(hasSurfaceAptitude(makeStatus({ dirtAptitude: '◎' }), 'ダート')).toBe(true);
    expect(hasSurfaceAptitude(makeStatus({ dirtAptitude: '×' }), 'ダート')).toBe(false);
  });

  it('checks turfAptitude for 芝 even when dirtAptitude is bad', () => {
    expect(hasSurfaceAptitude(makeStatus({ turfAptitude: '◎', dirtAptitude: '×' }), '芝')).toBe(
      true,
    );
  });
});

describe('hasDistanceAptitude', () => {
  it('returns true when status is undefined', () => {
    expect(hasDistanceAptitude(undefined, 'マイル')).toBe(true);
  });

  it('returns true when distanceMin is null', () => {
    expect(
      hasDistanceAptitude(makeStatus({ distanceMin: null, distanceMax: 2000 }), 'マイル'),
    ).toBe(true);
  });

  it('returns true when distanceMax is null', () => {
    expect(
      hasDistanceAptitude(makeStatus({ distanceMin: 1400, distanceMax: null }), 'マイル'),
    ).toBe(true);
  });

  it('returns true when horse range exactly matches distance band', () => {
    // マイル = 1400-1800
    expect(
      hasDistanceAptitude(makeStatus({ distanceMin: 1400, distanceMax: 1800 }), 'マイル'),
    ).toBe(true);
  });

  it('returns false when horse range does not overlap', () => {
    // 馬2400-3200 vs マイル1400-1800
    expect(
      hasDistanceAptitude(makeStatus({ distanceMin: 2400, distanceMax: 3200 }), 'マイル'),
    ).toBe(false);
  });

  it('returns true when horse range partially overlaps', () => {
    // 馬1200-2400 vs マイル1400-1800
    expect(
      hasDistanceAptitude(makeStatus({ distanceMin: 1200, distanceMax: 2400 }), 'マイル'),
    ).toBe(true);
  });

  it('returns true when ranges touch at boundary', () => {
    // 馬1800-2200 vs マイル1400-1800 → touch at 1800
    expect(
      hasDistanceAptitude(makeStatus({ distanceMin: 1800, distanceMax: 2200 }), 'マイル'),
    ).toBe(true);
  });

  it('returns false when horse range is just below band', () => {
    // 馬1000-1300 vs マイル1400-1800
    expect(
      hasDistanceAptitude(makeStatus({ distanceMin: 1000, distanceMax: 1300 }), 'マイル'),
    ).toBe(false);
  });

  it('handles 長距離 band (open-ended upper range)', () => {
    // 長距離 = 2400-9999, 馬2600-3200
    expect(
      hasDistanceAptitude(makeStatus({ distanceMin: 2600, distanceMax: 3200 }), '長距離'),
    ).toBe(true);
    // 馬1400-1800 vs 長距離 → no overlap
    expect(
      hasDistanceAptitude(makeStatus({ distanceMin: 1400, distanceMax: 1800 }), '長距離'),
    ).toBe(false);
  });

  it('handles 短距離 band (starts at 0)', () => {
    // 短距離 = 0-1400, 馬1000-1200
    expect(
      hasDistanceAptitude(makeStatus({ distanceMin: 1000, distanceMax: 1200 }), '短距離'),
    ).toBe(true);
    // 馬1800-2200 vs 短距離 → no overlap
    expect(
      hasDistanceAptitude(makeStatus({ distanceMin: 1800, distanceMax: 2200 }), '短距離'),
    ).toBe(false);
  });
});
