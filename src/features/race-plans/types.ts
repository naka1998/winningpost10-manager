export type Country = '日' | '米' | '欧';
export type DistanceBand = '短距離' | 'マイル' | '中距離' | '中長距離' | '長距離';
export type Grade = 'G1' | 'G2' | 'G3' | 'OP';

export const COUNTRIES: Country[] = ['日', '米', '欧'];
export const DISTANCE_BANDS: DistanceBand[] = ['短距離', 'マイル', '中距離', '中長距離', '長距離'];
export const GRADES: Grade[] = ['G1', 'G2', 'G3', 'OP'];

export interface RacePlan {
  id: number;
  horseId: number;
  year: number;
  country: Country | null;
  distanceBand: DistanceBand | null;
  grade: Grade | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RacePlanWithHorseName extends RacePlan {
  horseName: string;
}

export interface RacePlanCreateInput {
  horseId: number;
  year: number;
  country: Country;
  distanceBand: DistanceBand;
  grade: Grade;
  notes?: string | null;
}

export interface RacePlanUpdateInput {
  horseId?: number;
  country?: Country;
  distanceBand?: DistanceBand;
  grade?: Grade;
  notes?: string | null;
}

export interface RacePlanFilter {
  year?: number;
  horseId?: number;
}

export interface DuplicateHorseWarning {
  horseId: number;
  horseName: string;
  cells: { country: Country; distanceBand: DistanceBand; grade: Grade }[];
}
