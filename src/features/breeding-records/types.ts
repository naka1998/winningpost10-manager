export interface BreedingTheory {
  name: string;
  points: number;
}

export interface BreedingRecord {
  id: number;
  mareId: number;
  sireId: number;
  year: number;
  evaluation: string | null;
  theories: BreedingTheory[] | null;
  totalPower: number | null;
  offspringId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BreedingRecordWithNames extends BreedingRecord {
  mareName: string;
  sireName: string;
  offspringName: string | null;
}

export interface BreedingRecordCreateInput {
  mareId: number;
  sireId: number;
  year: number;
  evaluation?: string | null;
  theories?: BreedingTheory[] | null;
  totalPower?: number | null;
  offspringId?: number | null;
  notes?: string | null;
}

export interface BreedingRecordUpdateInput {
  mareId?: number;
  sireId?: number;
  year?: number;
  evaluation?: string | null;
  theories?: BreedingTheory[] | null;
  totalPower?: number | null;
  offspringId?: number | null;
  notes?: string | null;
}

export interface BreedingRecordFilter {
  mareId?: number;
  sireId?: number;
  year?: number;
}
