import type { Horse } from '@/features/horses/types';

export interface ParsedHorseRow {
  name: string;
  sex: string | null;
  birthYear: number | null;
  country: string | null;
  sireName: string | null;
  damName: string | null;
  sireLineageName: string | null;
  mareLineName: string | null;
  spRank: string | null;
  spValue: number | null;
  powerRank: string | null;
  powerValue: number | null;
  instantRank: string | null;
  instantValue: number | null;
  staminaRank: string | null;
  staminaValue: number | null;
  mentalRank: string | null;
  mentalValue: number | null;
  wisdomRank: string | null;
  wisdomValue: number | null;
  turfAptitude: string | null;
  dirtAptitude: string | null;
  distanceMin: number | null;
  distanceMax: number | null;
  growthType: string | null;
  runningStyle: string | null;
  traits: string[] | null;
  raceRecord: string | null;
  jockey: string | null;
  isHistorical: boolean;
}

export interface ParseWarning {
  row: number;
  column: string;
  message: string;
}

export interface ParseResult {
  rows: ParsedHorseRow[];
  warnings: ParseWarning[];
}

export interface ImportPreviewRow {
  parsed: ParsedHorseRow;
  action: 'create' | 'update' | 'skip';
  existingHorse?: Horse;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

export interface ImportPreview {
  importYear: number;
  rows: ImportPreviewRow[];
  summary: { newCount: number; updateCount: number; skipCount: number };
}

export interface ImportError {
  row: number;
  horseName: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
}
