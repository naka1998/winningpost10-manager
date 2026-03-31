export interface GameSettings {
  currentYear: number;
  pedigreeDepth: 4 | 5;
  rankSystem: string[];
  dbVersion: number;
}

export interface SettingRow {
  key: string;
  value: string;
  updatedAt: string;
}
