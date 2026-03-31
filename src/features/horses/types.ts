export interface Horse {
  id: number;
  name: string;
  sex: string | null;
  birthYear: number | null;
  country: string | null;
  isHistorical: boolean;
  mareLine: string | null;
  status: string;
  sireId: number | null;
  damId: number | null;
  lineageId: number | null;
  factors: string[] | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HorseCreateInput {
  name: string;
  sex?: string | null;
  birthYear?: number | null;
  country?: string | null;
  isHistorical?: boolean;
  mareLine?: string | null;
  status?: string;
  sireId?: number | null;
  damId?: number | null;
  lineageId?: number | null;
  factors?: string[] | null;
  notes?: string | null;
}

export interface HorseUpdateInput {
  name?: string;
  sex?: string | null;
  birthYear?: number | null;
  country?: string | null;
  isHistorical?: boolean;
  mareLine?: string | null;
  status?: string;
  sireId?: number | null;
  damId?: number | null;
  lineageId?: number | null;
  factors?: string[] | null;
  notes?: string | null;
}

export interface HorseFilter {
  status?: string;
  lineageId?: number;
  sex?: string;
  birthYearFrom?: number;
  birthYearTo?: number;
  sortBy?: 'name' | 'birth_year' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/** Flat row returned by the ancestor recursive CTE query (snake_case DB columns). */
export interface YearlyStatus {
  id: number;
  horseId: number;
  year: number;
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
  subParams: number | null;
  turfAptitude: string | null;
  dirtAptitude: string | null;
  turfQuality: string | null;
  distanceMin: number | null;
  distanceMax: number | null;
  growthType: string | null;
  runningStyle: string[] | null;
  traits: string[] | null;
  jockey: string | null;
  grade: string | null;
  raceRecord: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface YearlyStatusCreateInput {
  horseId: number;
  year: number;
  spRank?: string | null;
  spValue?: number | null;
  powerRank?: string | null;
  powerValue?: number | null;
  instantRank?: string | null;
  instantValue?: number | null;
  staminaRank?: string | null;
  staminaValue?: number | null;
  mentalRank?: string | null;
  mentalValue?: number | null;
  wisdomRank?: string | null;
  wisdomValue?: number | null;
  subParams?: number | null;
  turfAptitude?: string | null;
  dirtAptitude?: string | null;
  turfQuality?: string | null;
  distanceMin?: number | null;
  distanceMax?: number | null;
  growthType?: string | null;
  runningStyle?: string[] | null;
  traits?: string[] | null;
  jockey?: string | null;
  grade?: string | null;
  raceRecord?: string | null;
  notes?: string | null;
}

export interface YearlyStatusUpdateInput {
  year?: number;
  spRank?: string | null;
  spValue?: number | null;
  powerRank?: string | null;
  powerValue?: number | null;
  instantRank?: string | null;
  instantValue?: number | null;
  staminaRank?: string | null;
  staminaValue?: number | null;
  mentalRank?: string | null;
  mentalValue?: number | null;
  wisdomRank?: string | null;
  wisdomValue?: number | null;
  subParams?: number | null;
  turfAptitude?: string | null;
  dirtAptitude?: string | null;
  turfQuality?: string | null;
  distanceMin?: number | null;
  distanceMax?: number | null;
  growthType?: string | null;
  runningStyle?: string[] | null;
  traits?: string[] | null;
  jockey?: string | null;
  grade?: string | null;
  raceRecord?: string | null;
  notes?: string | null;
}

export interface PedigreeRow {
  id: number;
  name: string;
  generation: number;
  position: string;
  path: string;
  factors: string | null;
  lineage_name: string | null;
  sp_st_type: string | null;
  parent_lineage_name: string | null;
}

export interface PedigreeNode {
  id: number;
  name: string;
  generation: number;
  position: string;
  path: string;
  factors: string[] | null;
  lineageName: string | null;
  spStType: string | null;
  parentLineageName: string | null;
  sire?: PedigreeNode;
  dam?: PedigreeNode;
}
