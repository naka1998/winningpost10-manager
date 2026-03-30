# データフロー & 状態管理 設計書

## 1. データフロー全体図

```
読専txt → Parser → ImportService → Repository → SQLite
UI       → Zustand Store → Repository → SQLite
SQLite   → Blob → Download（バックアップ）
File     → Blob → SQLite（リストア）
```

---

## 2. Repository インターフェース

すべてのRepositoryは `db: SQLiteAPI` を受け取り、SQLite操作を行う。Store層はRepositoryのみを通じてDBにアクセスする。

### 2.1 HorseRepository

#### インポート時の同一判定ルール

馬の同一性は `UNIQUE(name, birth_year)` で判定する（database-schema.md の DDL 制約と一致）。

- **所有馬（読専txt由来）:** `name` + `birth_year` の組み合わせで一意識別。同一の組み合わせが既に存在すれば update、なければ create。
- **祖先馬（父馬・母馬の自動作成）:** `birth_year` が不明のため `NULL` で登録。SQLite の `UNIQUE` 制約は `NULL` を重複とみなさないため、同名の祖先馬が複数登録される可能性がある。祖先馬の照合は `findAncestorByName` で `name` のみで行い、最初にヒットした1件を使用する。

```typescript
interface HorseRepository {
  // 取得
  findById(id: number): Promise<Horse | null>;
  findByNameAndBirthYear(name: string, birthYear: number): Promise<Horse | null>;
  findAncestorByName(name: string): Promise<Horse | null>; // 祖先馬照合用（birthYear不明時）
  findAll(filter?: HorseFilter): Promise<Horse[]>;
  search(query: string): Promise<Horse[]>;

  // 変更
  create(data: HorseCreateInput): Promise<Horse>;
  update(id: number, data: HorseUpdateInput): Promise<Horse>;
  delete(id: number): Promise<void>;

  // 血統
  getAncestors(id: number, depth: number): Promise<PedigreeNode>;
  getOffspring(id: number): Promise<Horse[]>;
}

interface HorseFilter {
  status?: string;
  lineageId?: number;
  sex?: string;
  birthYearFrom?: number;
  birthYearTo?: number;
  sortBy?: 'name' | 'birth_year' | 'status';
  sortOrder?: 'asc' | 'desc';
}
```

### 2.2 YearlyStatusRepository

```typescript
interface YearlyStatusRepository {
  findByHorseId(horseId: number): Promise<YearlyStatus[]>;
  findByYear(year: number): Promise<YearlyStatus[]>;
  findByHorseAndYear(horseId: number, year: number): Promise<YearlyStatus | null>;
  upsert(horseId: number, year: number, data: YearlyStatusInput): Promise<YearlyStatus>;
  delete(id: number): Promise<void>;
}
```

### 2.3 LineageRepository

```typescript
interface LineageRepository {
  findById(id: number): Promise<Lineage | null>;
  findByName(name: string): Promise<Lineage | null>;
  findAll(): Promise<Lineage[]>;
  getChildren(parentId: number): Promise<Lineage[]>;
  getHierarchy(): Promise<LineageNode[]>; // 親系統→子系統のツリー
  create(data: LineageCreateInput): Promise<Lineage>;
  update(id: number, data: LineageUpdateInput): Promise<Lineage>;
}
```

### 2.4 BreedingRecordRepository

```typescript
interface BreedingRecordRepository {
  findAll(filter?: BreedingRecordFilter): Promise<BreedingRecord[]>;
  findByMare(mareId: number): Promise<BreedingRecord[]>;
  create(data: BreedingRecordCreateInput): Promise<BreedingRecord>;
  update(id: number, data: BreedingRecordUpdateInput): Promise<BreedingRecord>;
  delete(id: number): Promise<void>;
}
```

### 2.5 ImportLogRepository

```typescript
interface ImportLogRepository {
  findAll(): Promise<ImportLog[]>;
  create(data: ImportLogCreateInput): Promise<ImportLog>;
}
```

---

## 3. 読専txtインポートの入出力契約

### 3.1 パーサー

```typescript
// 入力: 読専txtファイルの内容（文字列）
// 出力: パース済みの行データ配列
interface TxtParser {
  parse(content: string): ParseResult;
}

interface ParseResult {
  rows: ParsedHorseRow[];
  warnings: ParseWarning[];    // スキップした列、変換できなかった値など
}

interface ParsedHorseRow {
  // D1: 馬基本情報
  name: string;
  sex: string | null;          // 牡/牝/セン
  birthYear: number | null;    // 「年」列から算出（年齢→生年変換はインポート年度を使用）。nullの場合エラー扱い
  country: string | null;      // 日/米/欧
  sireName: string | null;     // 父馬名（horse照合に使用）
  damName: string | null;      // 母馬名（horse照合に使用）
  sireLineageName: string | null; // 父系名（lineage照合に使用）
  mareLineName: string | null; // 牝系名
  // D2: 年度別ステータス
  spRank: string | null;
  spValue: number | null;      // 「S+(0)」→ 0
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
  turfAptitude: string | null;
  dirtAptitude: string | null;
  distanceMin: number | null;
  distanceMax: number | null;
  growthType: string | null;
  runningStyle: string | null;
  traits: string[] | null;
  raceRecord: string | null;
  jockey: string | null;
  // その他
  isHistorical: boolean;
}

interface ParseWarning {
  row: number;
  column: string;
  message: string;
}
```

### 3.2 ImportService（トランザクション境界）

```typescript
interface ImportService {
  /**
   * 読専txtインポートの実行
   * @param content - txtファイルの内容
   * @param importYear - インポート年度（D2のスナップショット年度）
   * @returns インポート結果のサマリ
   *
   * トランザクション境界: previewは非トランザクション、executeは単一トランザクション
   */
  preview(content: string, importYear: number): Promise<ImportPreview>;
  execute(preview: ImportPreview): Promise<ImportResult>;
}

interface ImportPreview {
  importYear: number;
  rows: ImportPreviewRow[];
  summary: { newCount: number; updateCount: number; skipCount: number };
}

interface ImportPreviewRow {
  parsed: ParsedHorseRow;
  action: 'create' | 'update' | 'skip';  // 馬名+生年で照合した結果
  existingHorse?: Horse;                   // update時の既存データ（差分表示用）
  changes?: Record<string, { old: unknown; new: unknown }>; // 変更フィールドと差分
}

interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  logId: number;            // import_logsのID
  errors: ImportError[];
}

interface ImportError {
  row: number;
  horseName: string;
  message: string;
}
```

### 3.3 トランザクション・ロールバック方針

```
execute() のフロー:
  BEGIN TRANSACTION
  ├─ 0. バリデーション:
  │    └─ birthYear が null の行はエラー（読専txtの行は所有馬データのため生年は必須）
  ├─ 1. 各行について:
  │    ├─ 馬名+生年で horses を照合 (findByNameAndBirthYear)
  │    ├─ create の場合:
  │    │    ├─ 父馬・母馬が未登録なら ancestor として自動作成
  │    │    │   （祖先馬は birthYear 不明のため name のみで照合。
  │    │    │    UNIQUE(name, birth_year) は NULL を重複とみなさないため問題なし）
  │    │    ├─ 系統が未登録なら lineages に自動作成
  │    │    └─ horses INSERT + yearly_statuses INSERT
  │    └─ update の場合:
  │         ├─ horses UPDATE（性別・国など不変項目は上書きしない）
  │         └─ yearly_statuses UPSERT（同horse_id+yearなら更新）
  ├─ 2. import_logs INSERT（件数・ファイル名・結果サマリ）
  COMMIT
  └─ エラー発生時 → ROLLBACK（全行を巻き戻し、部分インポートは行わない）
```

**ロールバック条件:**
- birthYear が算出できなかった行が存在する場合
- SQL実行エラー（制約違反、型不整合など）
- 全行が処理される前に例外が発生した場合

**部分インポートは行わない** — 1行でもエラーがあれば全体をロールバックし、エラー内容をユーザーに返す。ユーザーはtxtを修正して再インポートする。

---

## 4. Zustandストア設計

### 4.1 ストア一覧

| ストア | 責務 | 永続化 |
|--------|------|--------|
| `useHorseStore` | 馬マスタCRUD、検索・フィルタ結果のキャッシュ | SQLite経由 |
| `useLineageStore` | 系統マスタCRUD、階層ツリーのキャッシュ | SQLite経由 |
| `useSettingsStore` | ゲーム設定（現在年度等）の取得・更新 | SQLite経由 |
| `useUIStore` | サイドバー開閉、ビューモード、選択状態 | メモリのみ |

### 4.2 Store → Repository 通信パターン

```typescript
// 例: useHorseStore
interface HorseStoreState {
  horses: Horse[];
  selectedHorse: Horse | null;
  filter: HorseFilter;
  isLoading: boolean;
  error: string | null;
}

interface HorseStoreActions {
  fetchHorses: (filter?: HorseFilter) => Promise<void>;
  fetchHorseById: (id: number) => Promise<void>;
  createHorse: (data: HorseCreateInput) => Promise<Horse>;
  updateHorse: (id: number, data: HorseUpdateInput) => Promise<Horse>;
  deleteHorse: (id: number) => Promise<void>;
  importFromTxt: (content: string, importYear: number) => Promise<ImportResult>;
}
```

各アクションは以下のパターンで実行する:

1. `isLoading = true`, `error = null` をセット
2. Repositoryメソッドを呼び出し
3. 成功時: 結果をstateに反映、`isLoading = false`
4. 失敗時: `error` にメッセージをセット、`isLoading = false`

---

## 5. バックアップ・リストア

```typescript
// バックアップ: SQLite → Blob → ダウンロード
export async function exportDatabase(sqlite3: SQLiteAPI, db: number): Promise<Blob> {
  const data = sqlite3.serialize(db);
  return new Blob([data], { type: 'application/x-sqlite3' });
}

// リストア: ファイル → Blob → SQLite（既存DBを完全に置換）
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

ファイル命名規則: `wp10-manager-backup-{YYYYMMDD-HHmmss}.sqlite3`
