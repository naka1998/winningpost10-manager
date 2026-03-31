export interface ColumnMap {
  name: number;
  country: number;
  age: number;
  sex: number;
  sp: number;
  power: number;
  instant: number;
  stamina: number;
  mental: number;
  wisdom: number;
  turf: number;
  dirt: number;
  distance: number;
  growthType: number;
  runningStyle: number;
  traits: number;
  sireName: number;
  sireLineage: number;
  damName: number;
  mareLine: number;
  raceRecord: number;
  jockey: number;
  isHistorical: number;
}

export const HEADER_FIELD_MAP: Record<string, keyof ColumnMap> = {
  馬名: 'name',
  国: 'country',
  年: 'age',
  性: 'sex',
  SP: 'sp',
  力: 'power',
  瞬: 'instant',
  勝: 'stamina',
  精: 'mental',
  賢: 'wisdom',
  芝: 'turf',
  ダ: 'dirt',
  距離適性: 'distance',
  成型: 'growthType',
  脚質: 'runningStyle',
  特性: 'traits',
  父馬: 'sireName',
  父系: 'sireLineage',
  母馬: 'damName',
  牝系: 'mareLine',
  戦績: 'raceRecord',
  騎手: 'jockey',
  史実: 'isHistorical',
};

export function buildColumnMap(headerLine: string): ColumnMap {
  const map: ColumnMap = {
    name: -1,
    country: -1,
    age: -1,
    sex: -1,
    sp: -1,
    power: -1,
    instant: -1,
    stamina: -1,
    mental: -1,
    wisdom: -1,
    turf: -1,
    dirt: -1,
    distance: -1,
    growthType: -1,
    runningStyle: -1,
    traits: -1,
    sireName: -1,
    sireLineage: -1,
    damName: -1,
    mareLine: -1,
    raceRecord: -1,
    jockey: -1,
    isHistorical: -1,
  };

  const seen = new Set<string>();
  const headers = headerLine.split('\t');

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].trim();
    const field = HEADER_FIELD_MAP[header];
    if (field && !seen.has(field)) {
      map[field] = i;
      seen.add(field);
    }
  }

  return map;
}
