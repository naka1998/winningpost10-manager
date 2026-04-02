export interface BroodmareSummary {
  id: number;
  name: string;
  birthYear: number | null;
  age: number | null;
  breedingStartYear: number | null;
  offspringCount: number;
  activeOffspringCount: number;
  bestGrade: string | null;
  avgEvaluation: number | null;
  avgTotalPower: number | null;
}

export interface BroodmareOffspring {
  id: number;
  name: string;
  birthYear: number | null;
  sex: string | null;
  status: string;
  sireName: string | null;
  bestGrade: string | null;
  evaluation: string | null;
  totalPower: number | null;
  breedingNotes: string | null;
}

export interface LineageDistribution {
  name: string;
  count: number;
}

export interface BroodmareFilter {
  sortBy?: 'name' | 'birthYear' | 'offspringCount' | 'breedingStartYear';
  sortOrder?: 'asc' | 'desc';
}
