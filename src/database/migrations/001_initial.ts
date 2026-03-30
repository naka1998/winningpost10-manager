import type { DatabaseConnection } from '../connection';
import { seedPresetLineages } from '../seed/preset-lineages';

const CREATE_TABLES = `
-- 系統マスタ
CREATE TABLE IF NOT EXISTS lineages (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL UNIQUE,
  lineage_type      TEXT    NOT NULL,
  parent_lineage_id INTEGER REFERENCES lineages(id),
  sp_st_type        TEXT,
  notes             TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now')),

  CHECK (lineage_type IN ('parent', 'child')),
  CHECK (sp_st_type IN ('SP', 'ST', NULL))
);

-- 馬マスタ
CREATE TABLE IF NOT EXISTS horses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  sex           TEXT,
  birth_year    INTEGER,
  country       TEXT,
  is_historical INTEGER DEFAULT 0,
  mare_line     TEXT,
  status        TEXT    DEFAULT 'ancestor',
  sire_id       INTEGER REFERENCES horses(id),
  dam_id        INTEGER REFERENCES horses(id),
  lineage_id    INTEGER REFERENCES lineages(id),
  factors       TEXT,
  notes         TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),

  CHECK (status IN ('現役','繁殖牝馬','種牡馬','引退','売却済','ancestor')),
  UNIQUE (name, birth_year)
);

-- 年度別ステータス
CREATE TABLE IF NOT EXISTS yearly_statuses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  horse_id        INTEGER NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  year            INTEGER NOT NULL,
  sp_rank         TEXT,
  sp_value        INTEGER,
  power_rank      TEXT,
  power_value     INTEGER,
  instant_rank    TEXT,
  instant_value   INTEGER,
  stamina_rank    TEXT,
  stamina_value   INTEGER,
  mental_rank     TEXT,
  mental_value    INTEGER,
  wisdom_rank     TEXT,
  wisdom_value    INTEGER,
  sub_params      INTEGER,
  turf_aptitude   TEXT,
  dirt_aptitude   TEXT,
  turf_quality    TEXT,
  distance_min    INTEGER,
  distance_max    INTEGER,
  growth_type     TEXT,
  running_style   TEXT,
  traits          TEXT,
  jockey          TEXT,
  grade           TEXT,
  race_record     TEXT,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (horse_id, year)
);

-- 配合記録
CREATE TABLE IF NOT EXISTS breeding_records (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  mare_id       INTEGER NOT NULL REFERENCES horses(id),
  sire_id       INTEGER NOT NULL REFERENCES horses(id),
  year          INTEGER NOT NULL,
  evaluation    TEXT,
  theories_json TEXT,
  total_power   INTEGER,
  offspring_id  INTEGER REFERENCES horses(id),
  notes         TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- レース計画
CREATE TABLE IF NOT EXISTS race_plans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  horse_id      INTEGER NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  year          INTEGER NOT NULL,
  country       TEXT,
  distance_band TEXT,
  grade         TEXT,
  notes         TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- インポート履歴
CREATE TABLE IF NOT EXISTS import_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  imported_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  game_year    INTEGER NOT NULL,
  file_name    TEXT,
  record_count INTEGER NOT NULL DEFAULT 0,
  new_count    INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  status       TEXT    NOT NULL DEFAULT 'success',
  error_detail TEXT,

  CHECK (status IN ('success', 'partial', 'failed'))
);
`;

const CREATE_INDEXES = `
-- 馬名検索
CREATE INDEX IF NOT EXISTS idx_horses_name ON horses(name);

-- ステータス別の馬一覧
CREATE INDEX IF NOT EXISTS idx_horses_status ON horses(status);

-- 系統別の馬一覧
CREATE INDEX IF NOT EXISTS idx_horses_lineage ON horses(lineage_id);

-- 父馬・母馬からの逆引き
CREATE INDEX IF NOT EXISTS idx_horses_sire ON horses(sire_id);
CREATE INDEX IF NOT EXISTS idx_horses_dam ON horses(dam_id);

-- 年度別ステータス検索
CREATE INDEX IF NOT EXISTS idx_yearly_statuses_horse_year ON yearly_statuses(horse_id, year);
CREATE INDEX IF NOT EXISTS idx_yearly_statuses_year ON yearly_statuses(year);

-- 系統マスタの親系統検索
CREATE INDEX IF NOT EXISTS idx_lineages_parent ON lineages(parent_lineage_id);

-- 配合記録の検索
CREATE INDEX IF NOT EXISTS idx_breeding_records_mare ON breeding_records(mare_id);
CREATE INDEX IF NOT EXISTS idx_breeding_records_sire ON breeding_records(sire_id);
CREATE INDEX IF NOT EXISTS idx_breeding_records_year ON breeding_records(year);

-- レース計画の検索
CREATE INDEX IF NOT EXISTS idx_race_plans_horse_year ON race_plans(horse_id, year);
CREATE INDEX IF NOT EXISTS idx_race_plans_year ON race_plans(year);
`;

const INITIAL_SETTINGS = `
INSERT OR IGNORE INTO game_settings (key, value) VALUES ('current_year', '2025');
INSERT OR IGNORE INTO game_settings (key, value) VALUES ('pedigree_depth', '4');
INSERT OR IGNORE INTO game_settings (key, value) VALUES ('rank_system', '{"ranks":["S+","S","A+","A","B+","B","C+","C","D+","D","E+","E"]}');
`;

export async function up(db: DatabaseConnection): Promise<void> {
  await db.exec(CREATE_TABLES);
  await db.exec(CREATE_INDEXES);
  await db.exec(INITIAL_SETTINGS);
  await seedPresetLineages(db);
}
