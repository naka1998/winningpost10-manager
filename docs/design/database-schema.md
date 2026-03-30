# データベーススキーマ

> **対象:** WP ブリーディングマネージャー
> **最終更新:** 2026-03-29

---

## 1. テーブル定義（DDL）

### 1.1 horses — 馬マスタ（D1 + D3 統合）

所有馬・祖先馬を問わずすべての馬を保持する。所有馬はD1（基本情報）+ D3（血統）、祖先馬はD3のみ。

```sql
CREATE TABLE horses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,                -- 馬名（冠名含む）
  sex           TEXT,                            -- 牡/牝/セン（祖先馬はNULL可）
  birth_year    INTEGER,                         -- ゲーム内の生まれ年
  country       TEXT,                            -- 日/米/欧
  is_historical INTEGER DEFAULT 0,              -- 0=自家生産馬, 1=史実馬
  mare_line     TEXT,                            -- 牝系名（例: プリティポリー系）
  status        TEXT    DEFAULT 'ancestor',      -- 現役/繁殖牝馬/種牡馬/引退/売却済/ancestor
  sire_id       INTEGER REFERENCES horses(id),   -- 父馬への自己参照FK
  dam_id        INTEGER REFERENCES horses(id),   -- 母馬への自己参照FK
  lineage_id    INTEGER REFERENCES lineages(id), -- 所属系統（子系統）
  factors       TEXT,                            -- 因子リスト（JSON配列: ["スピード","パワー"]）
  notes         TEXT,                            -- 備考
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),

  CHECK (status IN ('現役','繁殖牝馬','種牡馬','引退','売却済','ancestor')),
  UNIQUE (name, birth_year)            -- インポート時の照合キー（馬名+生年で一意識別）
);
```

### 1.2 yearly_statuses — 年度別ステータス（D2）

所有馬の年度ごとのスナップショット。

```sql
CREATE TABLE yearly_statuses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  horse_id        INTEGER NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  year            INTEGER NOT NULL,              -- ゲーム内年度
  -- 能力値（ランク文字列 + 数値の両方を格納可能）
  sp_rank         TEXT,                          -- SP（スピード）ランク: S+, A, B+ 等
  sp_value        INTEGER,                       -- SP 数値（判明時）
  power_rank      TEXT,                          -- 力ランク
  power_value     INTEGER,
  instant_rank    TEXT,                          -- 瞬発力ランク
  instant_value   INTEGER,
  stamina_rank    TEXT,                          -- 勝負根性ランク
  stamina_value   INTEGER,
  mental_rank     TEXT,                          -- 精神力ランク
  mental_value    INTEGER,
  wisdom_rank     TEXT,                          -- 賢さランク
  wisdom_value    INTEGER,
  sub_params      INTEGER,                       -- サブパラ総合値
  -- 適性
  turf_aptitude   TEXT,                          -- 芝適性: ◎/○/×
  dirt_aptitude   TEXT,                          -- ダート適性: ◎/○/×
  turf_quality    TEXT,                          -- 芝質（軽〜重のレンジ表記）
  distance_min    INTEGER,                       -- 距離適性下限 (m)
  distance_max    INTEGER,                       -- 距離適性上限 (m)
  -- 成長・戦術
  growth_type     TEXT,                          -- 成長型: 早熟/普通/晩成 等
  running_style   TEXT,                          -- 脚質: 大逃/逃/先/差/追（JSON配列）
  traits          TEXT,                          -- 保有特性（JSON配列: ["大舞台","鉄砲"]）
  -- 運用情報
  jockey          TEXT,                          -- 主戦騎手
  grade           TEXT,                          -- 出走クラス・目標レース
  race_record     TEXT,                          -- 戦績（例: "17戦14勝"）
  notes           TEXT,                          -- 備考
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (horse_id, year)
);
```

### 1.3 lineages — 系統マスタ

親系統・子系統のマスタデータ。

```sql
CREATE TABLE lineages (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL UNIQUE,       -- 系統名
  lineage_type      TEXT    NOT NULL,              -- parent(親系統) / child(子系統)
  parent_lineage_id INTEGER REFERENCES lineages(id), -- 親系統への参照（子系統の場合）
  sp_st_type        TEXT,                          -- SP系/ST系/無印
  notes             TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now')),

  CHECK (lineage_type IN ('parent', 'child')),
  CHECK (sp_st_type IN ('SP', 'ST', NULL))
);
```

### 1.4 breeding_records — 配合記録

種牡馬×繁殖牝馬の配合実績。

```sql
CREATE TABLE breeding_records (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  mare_id       INTEGER NOT NULL REFERENCES horses(id),
  sire_id       INTEGER NOT NULL REFERENCES horses(id),
  year          INTEGER NOT NULL,                  -- 配合年度
  evaluation    TEXT,                              -- 配合評価（A/B/C等）
  theories_json TEXT,                              -- 成立理論（JSON配列: [{name, points}]）
  total_power   INTEGER,                           -- 合計爆発力
  offspring_id  INTEGER REFERENCES horses(id),     -- 産駒（生まれた場合）
  notes         TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### 1.5 race_plans — レース計画

年度ごとの馬のレース路線計画。

```sql
CREATE TABLE race_plans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  horse_id      INTEGER NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  year          INTEGER NOT NULL,
  country       TEXT,                              -- 日/米/欧
  distance_band TEXT,                              -- 短距離/マイル/中距離/中長距離/長距離
  grade         TEXT,                              -- G1/G2/G3/OP 等
  notes         TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### 1.6 game_settings — ゲーム設定

Key-Value形式の設定テーブル。

```sql
CREATE TABLE game_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,                       -- JSON文字列で格納
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 初期データ例:
-- INSERT INTO game_settings (key, value) VALUES ('current_year', '2025');
-- INSERT INTO game_settings (key, value) VALUES ('rank_system', '{"ranks":["S+","S","A+","A","B+","B","C+","C","D+","D","E+","E"]}');
-- INSERT INTO game_settings (key, value) VALUES ('pedigree_depth', '4');
-- INSERT INTO game_settings (key, value) VALUES ('db_version', '1');
```

### 1.7 import_logs — インポート履歴

```sql
CREATE TABLE import_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  imported_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  game_year    INTEGER NOT NULL,                  -- インポート対象の年度
  file_name    TEXT,                              -- 取り込んだファイル名
  record_count INTEGER NOT NULL DEFAULT 0,        -- 取り込み件数
  new_count    INTEGER NOT NULL DEFAULT 0,        -- 新規登録件数
  updated_count INTEGER NOT NULL DEFAULT 0,       -- 更新件数
  status       TEXT    NOT NULL DEFAULT 'success', -- success/partial/failed
  error_detail TEXT,                              -- エラー詳細（失敗時）

  CHECK (status IN ('success', 'partial', 'failed'))
);
```

---

## 2. インデックス設計

主要な検索パターンに対して最適化したインデックスを定義する。

```sql
-- 馬名検索（部分一致はLIKEで実行。完全一致の高速化）
CREATE INDEX idx_horses_name ON horses(name);

-- ステータス別の馬一覧
CREATE INDEX idx_horses_status ON horses(status);

-- 系統別の馬一覧
CREATE INDEX idx_horses_lineage ON horses(lineage_id);

-- 父馬・母馬からの逆引き（血統ツリー構築用）
CREATE INDEX idx_horses_sire ON horses(sire_id);
CREATE INDEX idx_horses_dam ON horses(dam_id);

-- 年度別ステータス検索
CREATE INDEX idx_yearly_statuses_horse_year ON yearly_statuses(horse_id, year);
CREATE INDEX idx_yearly_statuses_year ON yearly_statuses(year);

-- 系統マスタの親系統検索
CREATE INDEX idx_lineages_parent ON lineages(parent_lineage_id);

-- 配合記録の検索
CREATE INDEX idx_breeding_records_mare ON breeding_records(mare_id);
CREATE INDEX idx_breeding_records_sire ON breeding_records(sire_id);
CREATE INDEX idx_breeding_records_year ON breeding_records(year);

-- レース計画の検索
CREATE INDEX idx_race_plans_horse_year ON race_plans(horse_id, year);
CREATE INDEX idx_race_plans_year ON race_plans(year);
```

---

## 3. リレーション図（ER図）

```
┌─────────────────┐       ┌─────────────────┐
│    lineages      │       │  game_settings   │
│─────────────────│       │─────────────────│
│ id (PK)          │       │ key (PK)         │
│ name             │       │ value            │
│ lineage_type     │       └─────────────────┘
│ parent_lineage_id│──┐
│ sp_st_type       │  │   ┌─────────────────┐
└────────┬────────┘  └──→│    lineages      │
         │                │  (自己参照)       │
         │                └─────────────────┘
         │
         │  1:N
         ▼
┌──────────────────────┐
│       horses          │
│──────────────────────│
│ id (PK)               │
│ name                  │
│ sex, birth_year       │
│ country, status       │
│ mare_line, factors    │
│ sire_id (FK→horses)  │──┐
│ dam_id (FK→horses)   │──┤ (自己参照)
│ lineage_id (FK)       │  │
└──────┬───────────────┘  │
       │                   └──→ horses
       │
       ├── 1:N ──→ yearly_statuses
       │           │ id, horse_id, year
       │           │ sp_rank, sp_value, ...
       │           │ traits, race_record
       │           └──────────────────
       │
       ├── 1:N ──→ race_plans
       │           │ id, horse_id, year
       │           │ country, distance_band, grade
       │           └──────────────────
       │
       ├── N:1 ──→ breeding_records (as mare)
       ├── N:1 ──→ breeding_records (as sire)
       │           │ id, mare_id, sire_id, year
       │           │ evaluation, theories_json
       │           │ total_power, offspring_id
       │           └──────────────────
       │
       └── N:1 ──→ lineages

┌─────────────────┐
│  import_logs     │
│─────────────────│
│ id (PK)          │  ※ 他テーブルとの直接FKなし
│ imported_at      │     （インポート履歴の独立記録）
│ game_year        │
│ record_count     │
│ status           │
└─────────────────┘
```

---

## 4. CTE例（再帰クエリ）

### 4.1 4世代血統展開クエリ

指定した馬を起点に4世代（最大15頭の祖先）を展開する。

```sql
WITH RECURSIVE pedigree AS (
  -- 起点: 対象馬
  SELECT
    h.id,
    h.name,
    h.sire_id,
    h.dam_id,
    h.lineage_id,
    h.factors,
    0 AS generation,
    'self' AS position,
    '' AS path
  FROM horses h
  WHERE h.id = :horse_id

  UNION ALL

  -- 父方を再帰展開
  SELECT
    parent.id,
    parent.name,
    parent.sire_id,
    parent.dam_id,
    parent.lineage_id,
    parent.factors,
    p.generation + 1,
    CASE WHEN p.position = 'self' THEN 'sire'
         ELSE p.position || '_sire'
    END,
    p.path || 'S'
  FROM pedigree p
  JOIN horses parent ON parent.id = p.sire_id
  WHERE p.generation < 4

  UNION ALL

  -- 母方を再帰展開
  SELECT
    parent.id,
    parent.name,
    parent.sire_id,
    parent.dam_id,
    parent.lineage_id,
    parent.factors,
    p.generation + 1,
    CASE WHEN p.position = 'self' THEN 'dam'
         ELSE p.position || '_dam'
    END,
    p.path || 'D'
  FROM pedigree p
  JOIN horses parent ON parent.id = p.dam_id
  WHERE p.generation < 4
)
SELECT
  pe.id,
  pe.name,
  pe.generation,
  pe.position,
  pe.path,
  pe.factors,
  l.name AS lineage_name,
  l.sp_st_type,
  pl.name AS parent_lineage_name
FROM pedigree pe
LEFT JOIN lineages l ON l.id = pe.lineage_id
LEFT JOIN lineages pl ON pl.id = l.parent_lineage_id
ORDER BY pe.generation, pe.path;
```

> **5世代対応:** `WHERE p.generation < 4` を `< 5` に変更するだけで5世代展開が可能。

### 4.2 インブリード検出クエリ

血統表内で同一の祖先が複数回出現するケースを検出する。

```sql
WITH RECURSIVE pedigree AS (
  SELECT
    h.id,
    h.name,
    h.sire_id,
    h.dam_id,
    0 AS generation,
    '' AS path
  FROM horses h
  WHERE h.id = :horse_id

  UNION ALL

  SELECT parent.id, parent.name, parent.sire_id, parent.dam_id,
         p.generation + 1, p.path || 'S'
  FROM pedigree p
  JOIN horses parent ON parent.id = p.sire_id
  WHERE p.generation < 4

  UNION ALL

  SELECT parent.id, parent.name, parent.sire_id, parent.dam_id,
         p.generation + 1, p.path || 'D'
  FROM pedigree p
  JOIN horses parent ON parent.id = p.dam_id
  WHERE p.generation < 4
)
SELECT
  id,
  name,
  COUNT(*) AS appearance_count,
  GROUP_CONCAT(generation || '代' , '×') AS cross_notation,
  GROUP_CONCAT(path, ', ') AS paths
FROM pedigree
WHERE generation > 0
GROUP BY id
HAVING COUNT(*) > 1
ORDER BY appearance_count DESC;
```

**出力例:**

| id | name | appearance_count | cross_notation | paths |
|----|------|-----------------|----------------|-------|
| 42 | ノーザンダンサー | 2 | 3代×4代 | SSS, DSDS |

---

## 5. マイグレーション戦略

### 5.1 バージョン管理

`game_settings` テーブルの `db_version` キーでスキーマバージョンを管理する。

```typescript
// database/migrations/index.ts
interface Migration {
  version: number;
  description: string;
  up: (db: SQLiteAPI) => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: '初期スキーマ作成',
    up: async (db) => {
      // 全テーブル・インデックスのCREATE文を実行
    },
  },
  // 将来のマイグレーション
  // { version: 2, description: '...', up: async (db) => { ... } },
];

export async function runMigrations(db: SQLiteAPI): Promise<void> {
  const currentVersion = await getCurrentVersion(db); // game_settings から取得
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      await migration.up(db);
      await setVersion(db, migration.version);
    }
  }
}
```

### 5.2 初期データ投入（シード）

マイグレーション v1 の一部として、以下のプリセットデータを投入する:

1. **系統マスタ（100〜200件）**: WP10のデフォルト親系統・子系統
2. **主要種牡馬のD3データ（100〜300件）**: 血統表に頻出する祖先馬の馬名・系統・因子
3. **ゲーム設定の初期値**: `current_year`, `pedigree_depth`, `rank_system`

プリセットデータは `public/preset-data/` にJSONとして配置し、初回起動時にインポートする。

---

## 6. SQLite WASM永続化

### 6.1 wa-sqlite + VFS構成

```typescript
// database/connection.ts
import SQLiteAsyncESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import { IDBBatchAtomicVFS } from 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js';
import { OPFSCoopSyncVFS } from 'wa-sqlite/src/examples/OPFSCoopSyncVFS.js';
import * as SQLite from 'wa-sqlite';

const DB_NAME = 'wp-breeding-manager';

export async function createDatabase(): Promise<{ db: number; sqlite3: SQLiteAPI }> {
  const module = await SQLiteAsyncESMFactory();
  const sqlite3 = SQLite.Factory(module);

  let vfs: SQLiteVFS;
  try {
    // OPFS利用可能チェック（COOP/COEPヘッダー必要）
    if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
      vfs = new OPFSCoopSyncVFS(DB_NAME);
    } else {
      throw new Error('OPFS not available');
    }
  } catch {
    // IndexedDBにフォールバック
    vfs = new IDBBatchAtomicVFS(DB_NAME);
  }

  sqlite3.vfs_register(vfs, true);
  const db = await sqlite3.open_v2(DB_NAME);

  // WAL モード有効化（パフォーマンス向上）
  await sqlite3.exec(db, 'PRAGMA journal_mode=WAL;');
  await sqlite3.exec(db, 'PRAGMA foreign_keys=ON;');

  return { db, sqlite3 };
}
```

### 6.2 バックアップ・リストア

```typescript
// バックアップ（エクスポート）
export async function exportDatabase(sqlite3: SQLiteAPI, db: number): Promise<Blob> {
  const data = sqlite3.serialize(db); // Uint8Array
  return new Blob([data], { type: 'application/x-sqlite3' });
}

// リストア（インポート）
export async function importDatabase(
  sqlite3: SQLiteAPI,
  db: number,
  file: File
): Promise<void> {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  sqlite3.deserialize(db, data);
}
```

---

## 7. マルチプロファイル・マルチバージョンに関するスコープ

### 7.1 現行スコープ（v1）

現行スキーマは **単一プロファイル・単一ゲームバージョン（WP10 2026）** を前提とする。`profile_id` や `game_version` に相当するカラムは設けない。

### 7.2 将来拡張時の方針（F10対応時）

マルチプロファイル対応（F10, P3）の実装時には、以下の方針で拡張する:

1. **`profiles` テーブルを新設** — プロファイル名・ゲームバージョン・作成日時を管理
2. **主要テーブルに `profile_id` カラムを追加** — `horses`, `game_settings` 等のルートエンティティに `profile_id` FKを追加し、プロファイルごとにデータ空間を分離
3. **DBファイル分離は行わない** — 単一DBファイル内でプロファイルを分離する（バックアップ・リストアの単位はDB全体のまま）
4. **マイグレーションで対応** — v1→v2マイグレーションで既存データにデフォルトプロファイルを割り当て
