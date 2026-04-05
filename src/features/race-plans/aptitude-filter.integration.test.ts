import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '@/database/connection.test-utils';
import type { DatabaseConnection } from '@/database/connection';
import { runMigrations } from '@/database/migrations';
import { createHorseRepository, type HorseRepository } from '@/features/horses/repository';
import {
  createYearlyStatusRepository,
  type YearlyStatusRepository,
} from '@/features/horses/yearly-status-repository';
import type { YearlyStatus } from '@/features/horses/types';
import { hasSurfaceAptitude, hasDistanceAptitude } from './aptitude-filter';

describe('aptitude filtering integration', () => {
  let db: DatabaseConnection;
  let horseRepo: HorseRepository;
  let yearlyRepo: YearlyStatusRepository;
  let horseGoodTurf: number;
  let horseBadTurf: number;
  let horseOutOfDistance: number;

  beforeEach(async () => {
    db = createTestDatabase();
    await runMigrations(db);
    horseRepo = createHorseRepository(db);
    yearlyRepo = createYearlyStatusRepository(db);

    // 3頭作成
    const h1 = await horseRepo.create({
      name: '芝◎馬',
      sex: '牡',
      birthYear: 2022,
      status: '現役',
    });
    const h2 = await horseRepo.create({
      name: '芝×馬',
      sex: '牡',
      birthYear: 2022,
      status: '現役',
    });
    const h3 = await horseRepo.create({
      name: '距離外馬',
      sex: '牡',
      birthYear: 2022,
      status: '現役',
    });
    horseGoodTurf = h1.id;
    horseBadTurf = h2.id;
    horseOutOfDistance = h3.id;

    // yearly_statuses を year=2025 で作成（レース計画は2026年度）
    await yearlyRepo.create({
      horseId: horseGoodTurf,
      year: 2025,
      turfAptitude: '◎',
      dirtAptitude: '○',
      distanceMin: 1400,
      distanceMax: 1800,
    });
    await yearlyRepo.create({
      horseId: horseBadTurf,
      year: 2025,
      turfAptitude: '×',
      dirtAptitude: '◎',
      distanceMin: 1400,
      distanceMax: 1800,
    });
    await yearlyRepo.create({
      horseId: horseOutOfDistance,
      year: 2025,
      turfAptitude: '◎',
      dirtAptitude: '◎',
      distanceMin: 2400,
      distanceMax: 3200,
    });
  });

  it('bug reproduction: findByYear(2026) returns empty when data is from 2025', async () => {
    const statuses = await yearlyRepo.findByYear(2026);
    expect(statuses).toHaveLength(0);

    // All horses pass the filter when no status data is found
    const statusMap = new Map<number, YearlyStatus>();
    for (const s of statuses) {
      statusMap.set(s.horseId, s);
    }

    // 芝×馬 should be filtered out, but passes because status is undefined
    expect(hasSurfaceAptitude(statusMap.get(horseBadTurf), '芝')).toBe(true); // BUG!
  });

  it('findLatestByYear(2026) retrieves 2025 data and filtering works correctly', async () => {
    const statuses = await yearlyRepo.findLatestByYear(2026);
    expect(statuses).toHaveLength(3);

    const statusMap = new Map<number, YearlyStatus>();
    for (const s of statuses) {
      statusMap.set(s.horseId, s);
    }

    // 馬場適性フィルタ（芝セル）
    expect(hasSurfaceAptitude(statusMap.get(horseGoodTurf), '芝')).toBe(true); // ◎ → OK
    expect(hasSurfaceAptitude(statusMap.get(horseBadTurf), '芝')).toBe(false); // × → NG
    expect(hasSurfaceAptitude(statusMap.get(horseOutOfDistance), '芝')).toBe(true); // ◎ → OK

    // 距離適性フィルタ（マイル帯 1400-1800）
    expect(hasDistanceAptitude(statusMap.get(horseGoodTurf), 'マイル')).toBe(true); // 1400-1800 → OK
    expect(hasDistanceAptitude(statusMap.get(horseBadTurf), 'マイル')).toBe(true); // 1400-1800 → OK
    expect(hasDistanceAptitude(statusMap.get(horseOutOfDistance), 'マイル')).toBe(false); // 2400-3200 → NG

    // 芝マイルセルに表示されるのは芝◎馬のみ
    const horseIds = [horseGoodTurf, horseBadTurf, horseOutOfDistance];
    const filtered = horseIds.filter((id) => {
      const status = statusMap.get(id);
      return hasSurfaceAptitude(status, '芝') && hasDistanceAptitude(status, 'マイル');
    });
    expect(filtered).toEqual([horseGoodTurf]);
  });

  it('ダートセルでは dirtAptitude でフィルタされる', async () => {
    const statuses = await yearlyRepo.findLatestByYear(2026);
    const statusMap = new Map<number, YearlyStatus>();
    for (const s of statuses) {
      statusMap.set(s.horseId, s);
    }

    // ダートマイルセル
    expect(hasSurfaceAptitude(statusMap.get(horseGoodTurf), 'ダート')).toBe(true); // ○ → OK
    expect(hasSurfaceAptitude(statusMap.get(horseBadTurf), 'ダート')).toBe(true); // ◎ → OK
    expect(hasSurfaceAptitude(statusMap.get(horseOutOfDistance), 'ダート')).toBe(true); // ◎ → OK
  });
});
