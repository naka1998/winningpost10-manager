import type { HorseCreateInput } from '@/features/horses/types';
import type { LineageCreateInput } from '@/features/lineages/types';
import type { PedigreeRow } from '@/features/horses/types';
import type { ParsedHorseRow } from '@/features/import/types';
import type { BreedingRecordCreateInput } from '@/features/breeding-records/types';

export function buildHorse(overrides?: Partial<HorseCreateInput>): HorseCreateInput {
  return {
    name: 'テスト馬',
    sex: '牡',
    birthYear: 2020,
    country: '日',
    status: 'active',
    ...overrides,
  };
}

export function buildLineage(overrides?: Partial<LineageCreateInput>): LineageCreateInput {
  return {
    name: 'テスト系統',
    lineageType: 'child',
    parentLineageId: null,
    spStType: null,
    ...overrides,
  };
}

export function buildPedigreeRow(overrides?: Partial<PedigreeRow>): PedigreeRow {
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

export function buildParsedHorseRow(overrides?: Partial<ParsedHorseRow>): ParsedHorseRow {
  return {
    name: 'テスト馬',
    sex: '牡',
    birthYear: 2024,
    country: '日',
    sireName: '父馬',
    damName: '母馬',
    sireLineageName: 'サンデーサイレンス系',
    mareLineName: null,
    spRank: 'A',
    spValue: 70,
    powerRank: 'A',
    powerValue: 70,
    instantRank: 'B',
    instantValue: 60,
    staminaRank: 'A',
    staminaValue: 70,
    mentalRank: 'A',
    mentalValue: 70,
    wisdomRank: 'B',
    wisdomValue: 60,
    turfAptitude: '◎',
    dirtAptitude: '○',
    distanceMin: 1600,
    distanceMax: 2400,
    growthType: '普通',
    runningStyle: '差',
    traits: null,
    raceRecord: null,
    jockey: null,
    isHistorical: false,
    ...overrides,
  };
}

export function buildBreedingRecordCreateInput(
  overrides?: Partial<BreedingRecordCreateInput>,
): BreedingRecordCreateInput {
  return {
    mareId: 1,
    sireId: 2,
    year: 2024,
    ...overrides,
  };
}
