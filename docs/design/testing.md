# テスト戦略

> **対象:** WP ブリーディングマネージャー
> **最終更新:** 2026-03-31

---

## 1. テスト方針

### 1.1 Testing Trophy モデル

本アプリは**ローカルファーストの個人用 Web アプリ**であり、サーバー API や認証は存在しない。データ整合性（血統ツリー、インポート処理、配合評価）がアプリの信頼性に直結するため、**Service 層のテストを最重要**とする。

Kent C. Dodds の Testing Trophy モデルを採用し、各層のテスト比重を以下のように配分する。

```
        ╱  E2E  ╲               ← 主要フロー 2-3 本のみ
       ╱──────────╲
      ╱ Component  ╲            ← 主要 UI インタラクション
     ╱──────────────╲
    ╱   Store Test   ╲          ← UI 状態遷移
   ╱──────────────────╲
  ╱   Service Test ★   ╲       ← 最重要：ビジネスロジック
 ╱──────────────────────╲
╱  Repository Integration ╲    ← 実 SQL 検証
╱──────────────────────────╲
│     Unit Test（純関数）     │  ← パーサー、ヘルパー、変換
├──────────────────────────────┤
│   Static Analysis            │  ← TypeScript strict + Oxlint
└──────────────────────────────┘
```

| レイヤー              | 比重     | ツール                             | 速度           |
| --------------------- | -------- | ---------------------------------- | -------------- |
| 静的解析              | 最大     | TypeScript strict + Oxlint         | 即時           |
| ユニットテスト        | 中       | Vitest                             | < 1ms/test     |
| **Service 層テスト**  | **最大** | **Vitest + モック Repository**     | **< 5ms/test** |
| Repository 統合テスト | 中       | Vitest + better-sqlite3 インメモリ | < 50ms/test    |
| Store テスト          | 小       | Vitest + モック Service            | < 5ms/test     |
| コンポーネントテスト  | 小       | Vitest + RTL + jsdom               | < 100ms/test   |
| E2E テスト            | 最小     | Playwright                         | 数秒/test      |

### 1.2 テスト対象の原則

- **テストする**: ビジネスロジック（Service 層）、データアクセス（Repository 層）、純関数（パーサー、変換）
- **テストしない**: shadcn/ui コンポーネントのラッパー、CSS スタイリング、ルーティング定義そのもの

---

## 2. テストレイヤー別方針

### 2.1 静的解析

既存の CI で実施済み。追加設定は不要。

- TypeScript `strict: true` — null 安全、型推論
- Oxlint — unused vars = error、React Hooks ルール

### 2.2 ユニットテスト

**対象:** DB・UI に依存しない純関数。

| 対象           | ファイル                                    | テスト内容                                                             |
| -------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| SQL ビルダー   | `database/base-repository.ts`               | `buildInsert`, `buildUpdate`, `mapRow`, `snakeToCamel`, `camelToSnake` |
| TSV パーサー   | `features/import/parser/tsv-parser.ts`      | 行分割、タブ区切り、エッジケース                                       |
| カラムマッパー | `features/import/parser/column-mapper.ts`   | 列名→フィールド名マッピング                                            |
| 値抽出         | `features/import/parser/value-extractor.ts` | `S+(0)` → rank + value 分離、年齢→生年変換                             |
| ツリー構築     | `features/pedigree/service.ts`              | `buildPedigreeTree()` — 純関数として export                            |

**パターン:**

```typescript
describe('snakeToCamel', () => {
  it('converts snake_case to camelCase', () => {
    expect(snakeToCamel('birth_year')).toBe('birthYear');
  });
});
```

### 2.3 Service 層テスト（最重要）

**対象:** ビジネスロジックを持つ Service 層。モック Repository を注入し、DB 不要で高速にテストする。

#### PedigreeService

| テストケース        | 検証内容                                                  |
| ------------------- | --------------------------------------------------------- |
| ツリー構築（4世代） | 父母→祖父母→曾祖父母の正しいリンク                        |
| ツリー構築（5世代） | 5世代目まで展開                                           |
| 祖先データなし      | `null` を返す                                             |
| インブリード検出    | 同一祖先 ID が複数パスに出現 → `3×4` 等のクロス表記を生成 |
| 因子の JSON パース  | `factors` 文字列→配列変換、不正 JSON のフォールバック     |

**テストパターン:**

```typescript
describe('PedigreeService', () => {
  it('builds a 4-generation pedigree tree', async () => {
    const mockRepo = {
      getAncestorRows: vi.fn().mockResolvedValue([
        { id: 1, name: '本馬', generation: 0, path: '', ... },
        { id: 2, name: '父',   generation: 1, path: 'S', ... },
        { id: 3, name: '母',   generation: 1, path: 'D', ... },
        // ...
      ]),
    };
    const service = createPedigreeService({ horseRepo: mockRepo as HorseRepository });
    const tree = await service.getPedigreeTree(1);

    expect(tree).not.toBeNull();
    expect(tree!.name).toBe('本馬');
    expect(tree!.sire?.name).toBe('父');
    expect(tree!.dam?.name).toBe('母');
  });
});
```

#### ImportService

| テストケース                   | 検証内容                                                        |
| ------------------------------ | --------------------------------------------------------------- |
| preview — 新規馬               | `findByNameAndBirthYear` が null → action = 'create'            |
| preview — 既存馬               | `findByNameAndBirthYear` がヒット → action = 'update'、差分計算 |
| preview — 変更なし             | 既存データと同値 → action = 'skip'                              |
| preview — birthYear null       | エラー行としてマーク                                            |
| execute — 正常                 | create/update の件数、import_logs への記録                      |
| execute — 父馬自動作成         | `findAncestorByName` が null → ancestor として自動 create       |
| execute — 系統自動作成         | `findByName` が null → lineage 自動 create                      |
| execute — ロールバック         | 途中エラーで全行巻き戻し、`success: false`                      |
| execute — 部分インポートしない | 1行エラーでも全体ロールバック                                   |

#### BreedingEvalService（Phase 2）

| テストケース | 検証内容                           |
| ------------ | ---------------------------------- |
| 爆発力計算   | 理論ポイントの合算                 |
| 配合理論判定 | ニックス、インブリード等の成立判定 |

### 2.4 Repository 統合テスト

**対象:** SQL の正確性を実 DB で検証。既存パターンを継続・拡張。

**パターン（既存）:**

```typescript
describe('HorseRepository', () => {
  let db: DatabaseConnection;
  let repo: HorseRepository;

  beforeEach(async () => {
    db = createTestDatabase();
    await runMigrations(db);
    repo = createHorseRepository(db);
  });

  it('creates and retrieves a horse', async () => { ... });
});
```

| 対象 Repository          | 重点テスト                                   |
| ------------------------ | -------------------------------------------- |
| HorseRepository          | CRUD、フィルタ、`getAncestorRows` の再帰 CTE |
| LineageRepository        | 階層取得、プリセットデータ                   |
| YearlyStatusRepository   | UPSERT、年度別検索                           |
| BreedingRecordRepository | 牝馬別検索                                   |
| ImportLogRepository      | 作成・一覧                                   |

### 2.5 Store テスト

**対象:** Zustand Store の UI 状態遷移。モック Service/Repository を注入。

```typescript
describe('HorseStore', () => {
  it('sets isLoading during fetch', async () => {
    const mockRepo = { findAll: vi.fn().mockResolvedValue([]) };
    const store = createHorseStore({ horseRepo: mockRepo as HorseRepository });
    const promise = store.getState().fetchHorses();
    expect(store.getState().isLoading).toBe(true);
    await promise;
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().horses).toEqual([]);
  });
});
```

### 2.6 コンポーネントテスト

**対象:** ユーザーインタラクションを持つ主要コンポーネント。

| コンポーネント | テスト内容                                     |
| -------------- | ---------------------------------------------- |
| ImportWizard   | ファイル選択→プレビュー表示→実行ボタンのフロー |
| HorseFilterBar | フィルタ変更→コールバック呼び出し              |
| PedigreeTree   | ツリーノードのレンダリング、ビュー切替         |

**パターン:**

```typescript
it('calls onFilterChange when status is selected', async () => {
  const onFilterChange = vi.fn();
  render(
    renderWithProviders(<HorseFilterBar onFilterChange={onFilterChange} />)
  );
  await userEvent.selectOptions(screen.getByRole('combobox'), '現役');
  expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ status: '現役' }));
});
```

### 2.7 E2E テスト

**対象:** 主要ユーザーフロー 2-3 本のみ。Playwright + Chromium。

| フロー                | ステップ                                                    |
| --------------------- | ----------------------------------------------------------- |
| インポート→一覧確認   | ファイルアップロード → プレビュー確認 → 実行 → 馬一覧に反映 |
| 血統ツリー表示        | 馬詳細 → 血統タブ → 4世代ツリーが表示される                 |
| バックアップ/リストア | 設定 → エクスポート → DB 削除 → インポート → データ復元     |

---

## 3. テスタビリティのためのアーキテクチャ

### 3.1 レイヤー構成

```
UI (Pages, Components)
  ↓
Zustand Store（UI 状態管理のみ）
  ↓
Service（ビジネスロジック）  ← 新設
  ↓
Repository（データアクセスのみ）
  ↓
wa-sqlite
```

**依存の方向:** UI → Store → Service → Repository → Database（逆方向は禁止）

### 3.2 Service 層の設計パターン

Service はファクトリ関数で生成し、Repository を引数で受け取る（DI パターン）。

```typescript
// ファクトリ関数パターン
export function createPedigreeService(deps: {
  horseRepo: HorseRepository;
}): PedigreeService {
  return {
    async getPedigreeTree(horseId, depth) { ... },
    detectInbreeding(tree) { ... },
  };
}
```

**テスト時:** モック Repository を注入。DB 不要。

```typescript
const service = createPedigreeService({
  horseRepo: createMockHorseRepository(),
});
```

**本番時:** 実 Repository を注入。

```typescript
const service = createPedigreeService({
  horseRepo: createHorseRepository(db),
});
```

### 3.3 Store の設計パターン

Store もファクトリ関数で生成し、Service / Repository を引数で受け取る。

```typescript
export function createHorseStore(deps: {
  horseRepo: HorseRepository;
  pedigreeService: PedigreeService;
}) {
  return create<HorseStore>((set) => ({
    // UI 状態管理のみ。ビジネスロジックは Service に委譲
  }));
}
```

### 3.4 Repository Context

コンポーネントが Repository / Service にアクセスするための React Context。

```typescript
// src/app/repository-context.ts
export interface RepositoryContextValue {
  horseRepository: HorseRepository;
  lineageRepository: LineageRepository;
}

export const RepositoryContext = createContext<RepositoryContextValue | null>(null);
export function useRepositoryContext(): RepositoryContextValue { ... }
```

`Providers` コンポーネントで DB 初期化後に Repository を生成し、Context で提供する。

---

## 4. テストユーティリティ

### 4.1 `createTestDatabase()`（既存）

`src/database/connection.test-utils.ts` — better-sqlite3 インメモリ DB。Repository 統合テストで使用。

### 4.2 テストデータファクトリ

`src/test/factories.ts` — テスト用データの生成ヘルパー。

```typescript
export function buildHorse(overrides?: Partial<HorseCreateInput>): HorseCreateInput {
  return {
    name: 'テスト馬',
    sex: '牡',
    birthYear: 2020,
    country: '日',
    status: 'active',
    ...overrides,
  };
}

export function buildPedigreeRow(overrides?: Partial<PedigreeRow>): PedigreeRow {
  return {
    id: 1,
    name: 'テスト馬',
    generation: 0,
    position: 'self',
    path: '',
    factors: null,
    lineage_name: null,
    sp_st_type: null,
    parent_lineage_name: null,
    ...overrides,
  };
}
```

### 4.3 `renderWithProviders()`

`src/test/test-utils.tsx` — コンポーネントテスト用ラッパー。

```typescript
export function renderWithProviders(
  ui: React.ReactElement,
  options?: {
    repositoryOverrides?: Partial<RepositoryContextValue>;
  },
) {
  const db = createTestDatabase();
  // マイグレーション実行 + Repository 生成 + Context 提供
  return render(
    <RepositoryContext.Provider value={repos}>
      {ui}
    </RepositoryContext.Provider>,
  );
}
```

---

## 5. ファイル配置 & 命名規則

| 種別                   | ファイルパターン     | 配置場所                              |
| ---------------------- | -------------------- | ------------------------------------- |
| ユニットテスト         | `*.test.ts`          | 対象ファイルと同ディレクトリ          |
| Service テスト         | `service.test.ts`    | `src/features/{feature}/`             |
| Repository テスト      | `repository.test.ts` | `src/features/{feature}/`             |
| Store テスト           | `store.test.ts`      | `src/features/{feature}/`             |
| コンポーネントテスト   | `*.test.tsx`         | `src/features/{feature}/components/`  |
| E2E テスト             | `*.spec.ts`          | `tests/e2e/`                          |
| テストヘルパー         | `*.test-utils.ts`    | 利用側と同ディレクトリ or `src/test/` |
| テストデータファクトリ | `factories.ts`       | `src/test/`                           |

### 命名規則

- `describe` ブロック: クラス名またはモジュール名
- `it` / `test`: 振る舞いを日本語または英語で記述（プロジェクト内で統一）
- テストデータファクトリ: `build{Entity}()` 命名（例: `buildHorse()`, `buildLineage()`）

---

## 6. CI 統合

### 現行パイプライン

```yaml
Lint → TypeCheck → Test (pnpm test) → Build
```

### 追加予定

```yaml
Lint → TypeCheck → Test (with coverage) → Build → E2E (main のみ)
```

- **カバレッジ**: `@vitest/coverage-v8` を導入。Service 層 90%+、Repository 層 80%+ を目標
- **E2E**: `main` ブランチへのプッシュ時のみ実行（PR では省略して CI 時間を短縮）

---

## 7. テスト優先順位マトリクス

Phase 1（実装済み機能）と Phase 2（未実装機能）に分けて優先度を定義する。

### Phase 1（P0: 最優先）

| 対象                     | レイヤー   | 優先度 | 理由                                                   |
| ------------------------ | ---------- | ------ | ------------------------------------------------------ |
| PedigreeService          | Service    | ★★★    | ツリー構築・インブリード検出はアプリの核心機能         |
| ImportService            | Service    | ★★★    | インポートの差分判定・ロールバックはデータ整合性に直結 |
| TxtParser                | Unit       | ★★★    | 不正入力への耐性がインポート品質を決める               |
| HorseRepository          | Repository | ★★☆    | 再帰 CTE、フィルタの SQL 正確性                        |
| LineageRepository        | Repository | ★★☆    | 階層取得の正確性                                       |
| マイグレーション         | Repository | ★★☆    | スキーマの冪等性（実装済み）                           |
| base-repository ヘルパー | Unit       | ★☆☆    | `buildInsert`, `mapRow` 等の変換                       |

### Phase 2（P1: 機能実装時）

| 対象                      | レイヤー   | 優先度 | 理由                         |
| ------------------------- | ---------- | ------ | ---------------------------- |
| BreedingEvalService       | Service    | ★★★    | 配合理論の判定ロジック       |
| YearlyStatusRepository    | Repository | ★★☆    | UPSERT の正確性              |
| HorseStore / LineageStore | Store      | ★☆☆    | UI 状態遷移                  |
| ImportWizard              | Component  | ★☆☆    | ステップ遷移のフロー         |
| インポート→一覧 E2E       | E2E        | ★☆☆    | クリティカルパスの端到端検証 |
