export interface BroodmareSummary {
  id: number;
  name: string;
  birthYear: number | null;
  age: number | null;
  breedingStartYear: number | null;
  offspringCount: number;
  activeOffspringCount: number;
  bestGrade: string | null;
}

export interface BroodmareOffspring {
  id: number;
  name: string;
  birthYear: number | null;
  sex: string | null;
  status: string;
  sireName: string | null;
  bestGrade: string | null;
}

export interface LineageDistribution {
  name: string;
  count: number;
}

export interface BroodmareFilter {
  sortBy?: 'name' | 'birthYear' | 'offspringCount' | 'breedingStartYear';
  sortOrder?: 'asc' | 'desc';
}
