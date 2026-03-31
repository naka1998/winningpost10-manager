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
