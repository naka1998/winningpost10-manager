export type Country = '日' | '米' | '欧';
export type Surface = '芝' | 'ダート';
export type DistanceBand = '短距離' | 'マイル' | '中距離' | '中長距離' | '長距離';
export type ClassicPath = '三冠' | '牝馬三冠' | 'マイル' | 'トリプルティアラ' | 'その他三冠';
export type Grade = 'G1' | 'G2' | '~G3';

export const COUNTRIES: Country[] = ['日', '米', '欧'];
export const SURFACES: Surface[] = ['芝', 'ダート'];
export const DISTANCE_BANDS: DistanceBand[] = ['短距離', 'マイル', '中距離', '中長距離', '長距離'];
export const GRADES: Grade[] = ['G1', 'G2', '~G3'];

/** 距離帯ごとの距離範囲（メートル） */
export const DISTANCE_BAND_RANGES: Record<DistanceBand, { min: number; max: number }> = {
  短距離: { min: 0, max: 1400 },
  マイル: { min: 1400, max: 1800 },
  中距離: { min: 1800, max: 2200 },
  中長距離: { min: 2000, max: 2600 },
  長距離: { min: 2400, max: 9999 },
};

/** 馬場適性で表示対象とする値（◎ と ○ のみ表示、△ と × は非表示） */
export const GOOD_SURFACE_APTITUDES = ['◎', '○'];

/** 国ごとに使える馬場 */
export const COUNTRY_SURFACES: Record<Country, Surface[]> = {
  日: ['芝', 'ダート'],
  米: ['芝', 'ダート'],
  欧: ['芝'],
};

/** 国×馬場ごとの3歳クラシック路線 */
export const COUNTRY_SURFACE_CLASSIC_PATHS: Record<
  Country,
  Partial<Record<Surface, ClassicPath[]>>
> = {
  日: { 芝: ['三冠', '牝馬三冠', 'マイル'] },
  米: { ダート: ['三冠', 'トリプルティアラ'] },
  欧: { 芝: ['三冠', 'その他三冠'] },
};

export interface RacePlan {
  id: number;
  horseId: number;
  year: number;
  country: Country | null;
  surface: Surface | null;
  distanceBand: DistanceBand | null;
  grade: Grade | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RacePlanWithHorseName extends RacePlan {
  horseName: string;
  horseSex: string | null;
  horseBirthYear: number | null;
}

export interface RacePlanCreateInput {
  horseId: number;
  year: number;
  country: Country;
  surface: Surface;
  distanceBand?: DistanceBand | null;
  classicPath?: ClassicPath | null;
  grade?: Grade | null;
  notes?: string | null;
}

export interface RacePlanUpdateInput {
  horseId?: number;
  country?: Country;
  surface?: Surface;
  distanceBand?: DistanceBand | null;
  classicPath?: ClassicPath | null;
  grade?: Grade | null;
  notes?: string | null;
}

export interface RacePlanFilter {
  year?: number;
  horseId?: number;
}

/** セル位置の情報 */
export interface CellLocation {
  country: Country;
  surface: Surface;
  distanceBand?: DistanceBand | null;
  classicPath?: ClassicPath | null;
  grade?: Grade | null;
}

export interface DuplicateHorseWarning {
  horseId: number;
  horseName: string;
  cells: CellLocation[];
}
