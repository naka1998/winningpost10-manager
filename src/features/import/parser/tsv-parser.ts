import type { ParsedHorseRow, ParseResult, ParseWarning } from '@/features/import/types';
import { buildColumnMap, type ColumnMap } from './column-mapper';
import {
  ageToBirthYear,
  cleanHorseName,
  extractDistanceRange,
  extractIsHistorical,
  extractRankAndValue,
  extractSpValue,
  extractTraits,
} from './value-extractor';

export function parseTsv(tsvContent: string, importYear: number): ParseResult {
  const rows: ParsedHorseRow[] = [];
  const warnings: ParseWarning[] = [];

  if (!tsvContent.trim()) {
    return { rows, warnings };
  }

  const lines = tsvContent.replace(/\r\n/g, '\n').split('\n');
  const headerLine = lines[0];
  const columnMap = buildColumnMap(headerLine);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cells = line.split('\t');
    const row = parseRow(cells, columnMap, importYear, i + 1, warnings);
    rows.push(row);
  }

  return { rows, warnings };
}

function getCell(cells: string[], index: number): string {
  if (index < 0 || index >= cells.length) return '';
  return cells[index];
}

function getCellOrNull(cells: string[], index: number): string | null {
  const value = getCell(cells, index).trim();
  return value === '' ? null : value;
}

function parseRow(
  cells: string[],
  map: ColumnMap,
  importYear: number,
  rowNumber: number,
  warnings: ParseWarning[],
): ParsedHorseRow {
  const name = cleanHorseName(getCell(cells, map.name));
  const country = getCellOrNull(cells, map.country);
  const sex = getCellOrNull(cells, map.sex);
  const birthYear = ageToBirthYear(getCell(cells, map.age).trim(), importYear);
  const isHistorical = extractIsHistorical(getCell(cells, map.isHistorical));

  // SP value
  const spRaw = getCell(cells, map.sp).trim();
  let spValue: number | null = null;
  if (spRaw) {
    spValue = extractSpValue(spRaw);
    if (spValue === null) {
      warnings.push({
        row: rowNumber,
        column: 'SP',
        message: `値の解析に失敗しました: "${spRaw}"`,
      });
    }
  }

  // Rank+Value abilities
  const power = extractAbility(cells, map.power, '力', rowNumber, warnings);
  const instant = extractAbility(cells, map.instant, '瞬', rowNumber, warnings);
  const stamina = extractAbility(cells, map.stamina, '勝', rowNumber, warnings);
  const mental = extractAbility(cells, map.mental, '精', rowNumber, warnings);
  const wisdom = extractAbility(cells, map.wisdom, '賢', rowNumber, warnings);

  // Aptitudes
  const turfAptitude = getCellOrNull(cells, map.turf);
  const dirtAptitude = getCellOrNull(cells, map.dirt);

  // Distance
  const distanceRaw = getCell(cells, map.distance).trim();
  let distanceMin: number | null = null;
  let distanceMax: number | null = null;
  if (distanceRaw) {
    const dist = extractDistanceRange(distanceRaw);
    if (dist) {
      distanceMin = dist.min;
      distanceMax = dist.max;
    } else {
      warnings.push({
        row: rowNumber,
        column: '距離適性',
        message: `値の解析に失敗しました: "${distanceRaw}"`,
      });
    }
  }

  const growthType = getCellOrNull(cells, map.growthType);
  const runningStyle = getCellOrNull(cells, map.runningStyle);

  // Traits
  const traitsRaw = getCell(cells, map.traits).trim();
  const traits = traitsRaw ? extractTraits(traitsRaw) : null;

  // Pedigree
  const sireName = getCellOrNull(cells, map.sireName);
  const sireLineageName = getCellOrNull(cells, map.sireLineage);
  const damName = getCellOrNull(cells, map.damName);
  const mareLineName = getCellOrNull(cells, map.mareLine);

  // Other
  const raceRecord = getCellOrNull(cells, map.raceRecord);
  const jockey = getCellOrNull(cells, map.jockey);

  return {
    name,
    sex,
    birthYear,
    country,
    sireName,
    damName,
    sireLineageName,
    mareLineName,
    spRank: null,
    spValue,
    powerRank: power.rank,
    powerValue: power.value,
    instantRank: instant.rank,
    instantValue: instant.value,
    staminaRank: stamina.rank,
    staminaValue: stamina.value,
    mentalRank: mental.rank,
    mentalValue: mental.value,
    wisdomRank: wisdom.rank,
    wisdomValue: wisdom.value,
    turfAptitude,
    dirtAptitude,
    distanceMin,
    distanceMax,
    growthType,
    runningStyle,
    traits,
    raceRecord,
    jockey,
    isHistorical,
  };
}

function extractAbility(
  cells: string[],
  index: number,
  columnName: string,
  rowNumber: number,
  warnings: ParseWarning[],
): { rank: string | null; value: number | null } {
  const raw = getCell(cells, index).trim();
  if (!raw) return { rank: null, value: null };

  const result = extractRankAndValue(raw);
  if (!result) {
    warnings.push({
      row: rowNumber,
      column: columnName,
      message: `値の解析に失敗しました: "${raw}"`,
    });
    return { rank: null, value: null };
  }

  return { rank: result.rank, value: result.value };
}
