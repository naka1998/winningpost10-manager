# アーキテクチャ概要

> **対象:** WP ブリーディングマネージャー
> **最終更新:** 2026-03-29

---

## 1. 技術スタック一覧

| カテゴリ | ライブラリ / ツール | バージョン目安 | 役割・選定理由 |
|---------|-------------------|--------------|-------------|
| UIフレームワーク | **React** | 19.x | コンポーネントベースのUI構築。エコシステムが豊富で長期サポートが期待できる |
| 言語 | **TypeScript** | 5.x | 型安全によるバグ防止。IDEサポートの強化 |
| ビルドツール | **Vite** | 6.x | 高速なHMRとビルド。React+TSのゼロコンフィグに近い立ち上げ |
| ルーティング | **TanStack Router** | 1.x | 型安全なルートパラメータ。ファイルベースルーティング対応 |
| UIコンポーネント | **shadcn/ui** (Tailwind CSS) | — | コピー&ペースト型でカスタマイズ自由。Tailwind CSSベースで一貫したデザイン |
| チャート | **Recharts** | 2.x | React向けの宣言的チャートライブラリ。成長チャート・ガントチャートに使用 |
| 状態管理 | **Zustand** | 5.x | 軽量で直感的なAPI。ボイラープレートが少なくStoreの分割が容易 |
| データベース | **wa-sqlite** + **IndexedDB/OPFS** | — | ブラウザ内SQLite。サーバー不要のローカルファーストアーキテクチャを実現 |
| テスト | **Vitest** + **React Testing Library** | — | Viteネイティブで高速。コンポーネントテストとユニットテストを統一 |
| E2Eテスト | **Playwright** | — | 主要フロー（インポート→血統ツリー表示）の自動検証 |
| デプロイ | **GitHub Pages** / **Vercel** | — | 静的サイトホスティング。CI/CDパイプライン連携が容易 |

---

## 2. プロジェクトディレクトリ構成

features/ ベースのモジュール分割を採用する。各featureは画面・ストア・リポジトリ・コンポーネントを自己完結的に持つ。

```
winningpost10-manager/
├── public/
│   └── preset-data/           # プリセットデータ（系統マスタ等のJSON）
├── src/
│   ├── app/
│   │   ├── App.tsx            # アプリルート
│   │   ├── router.tsx         # TanStack Router設定
│   │   └── providers.tsx      # グローバルProvider（DB初期化等）
│   │
│   ├── components/            # 共通UIコンポーネント
│   │   ├── ui/                # shadcn/ui コンポーネント（Button, Dialog等）
│   │   ├── layout/
│   │   │   ├── RootLayout.tsx
│   │   │   ├── SidebarLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Breadcrumbs.tsx
│   │   └── shared/            # アプリ共通コンポーネント
│   │       ├── DataTable.tsx
│   │       ├── ConfirmDialog.tsx
│   │       └── LoadingSpinner.tsx
│   │
│   ├── features/
│   │   ├── horses/            # F01: 馬マスタ管理
│   │   │   ├── components/
│   │   │   │   ├── HorseTable.tsx
│   │   │   │   ├── HorseDetail.tsx
│   │   │   │   ├── HorseForm.tsx
│   │   │   │   └── HorseFilterBar.tsx
│   │   │   ├── pages/
│   │   │   │   ├── HorseListPage.tsx
│   │   │   │   └── HorseDetailPage.tsx
│   │   │   ├── store.ts       # useHorseStore
│   │   │   ├── repository.ts  # HorseRepository
│   │   │   └── types.ts
│   │   │
│   │   ├── pedigree/          # F02: 血統ツリー
│   │   │   ├── components/
│   │   │   │   ├── PedigreeTree.tsx
│   │   │   │   ├── PedigreeNode.tsx
│   │   │   │   ├── InbreedingBadge.tsx
│   │   │   │   └── ViewModeToggle.tsx
│   │   │   ├── pages/
│   │   │   │   └── PedigreePage.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── usePedigreeExpansion.ts
│   │   │   │   └── useInbreedingDetection.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── plans/             # F03: 〆配合プランナー
│   │   │   ├── components/
│   │   │   │   ├── PlanDashboard.tsx
│   │   │   │   ├── SystemRequirementChecklist.tsx
│   │   │   │   ├── GenerationMap.tsx
│   │   │   │   ├── MareReadinessCheck.tsx
│   │   │   │   ├── GanttTimeline.tsx
│   │   │   │   ├── YearlyBreedingPlan.tsx
│   │   │   │   └── StepProgress.tsx
│   │   │   ├── pages/
│   │   │   │   ├── PlanListPage.tsx
│   │   │   │   ├── PlanDetailPage.tsx
│   │   │   │   └── YearlyBreedingPage.tsx
│   │   │   ├── store.ts       # usePlanStore
│   │   │   ├── repository.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── growth/            # F04: 成長トラッキング
│   │   │   ├── components/
│   │   │   │   └── GrowthChart.tsx
│   │   │   ├── pages/
│   │   │   │   └── GrowthPage.tsx
│   │   │   └── types.ts
│   │   │
│   │   ├── breeding-records/  # F05: 配合記録
│   │   │   ├── components/
│   │   │   │   ├── BreedingRecordTable.tsx
│   │   │   │   ├── BreedingRecordForm.tsx
│   │   │   │   └── BreedingEvalCard.tsx
│   │   │   ├── pages/
│   │   │   │   └── BreedingRecordListPage.tsx
│   │   │   ├── store.ts
│   │   │   ├── repository.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── lineages/          # F06: 系統マスタ
│   │   │   ├── components/
│   │   │   │   ├── LineageTable.tsx
│   │   │   │   └── LineageForm.tsx
│   │   │   ├── pages/
│   │   │   │   └── LineageListPage.tsx
│   │   │   ├── store.ts       # useLineageStore
│   │   │   ├── repository.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── import/            # F01: 読専txtインポート
│   │   │   ├── components/
│   │   │   │   ├── ImportWizard.tsx
│   │   │   │   ├── FileDropZone.tsx
│   │   │   │   ├── ImportPreview.tsx
│   │   │   │   └── ImportResult.tsx
│   │   │   ├── pages/
│   │   │   │   └── ImportPage.tsx
│   │   │   ├── parser/
│   │   │   │   ├── tsv-parser.ts
│   │   │   │   ├── column-mapper.ts
│   │   │   │   └── value-extractor.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── race-plans/        # F11: レース計画
│   │   │   ├── components/
│   │   │   │   ├── RacePlanMatrix.tsx
│   │   │   │   └── OverlapWarning.tsx
│   │   │   ├── pages/
│   │   │   │   └── RacePlanPage.tsx
│   │   │   ├── repository.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── broodmares/        # F12: 繁殖牝馬評価
│   │   │   ├── components/
│   │   │   │   ├── BroodmareTable.tsx
│   │   │   │   ├── BroodmareEvalCard.tsx
│   │   │   │   └── BloodlineBalanceChart.tsx
│   │   │   ├── pages/
│   │   │   │   └── BroodmarePage.tsx
│   │   │   ├── repository.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── settings/          # F07: 設定・バックアップ
│   │   │   ├── components/
│   │   │   │   ├── SettingsForm.tsx
│   │   │   │   ├── BackupRestore.tsx
│   │   │   │   └── PresetDataLoader.tsx
│   │   │   ├── pages/
│   │   │   │   └── SettingsPage.tsx
│   │   │   ├── store.ts       # useSettingsStore
│   │   │   └── types.ts
│   │   │
│   │   └── dashboard/         # F08: ダッシュボード（P2）
│   │       ├── components/
│   │       │   └── DashboardSummary.tsx
│   │       └── pages/
│   │           └── DashboardPage.tsx
│   │
│   ├── database/
│   │   ├── connection.ts      # wa-sqlite初期化・接続管理
│   │   ├── migrations/        # マイグレーションファイル
│   │   │   ├── index.ts
│   │   │   └── 001_initial.ts
│   │   ├── seed/              # 初期データ投入
│   │   │   └── preset-lineages.ts
│   │   └── base-repository.ts # リポジトリ基底クラス
│   │
│   ├── lib/
│   │   ├── utils.ts           # ユーティリティ関数
│   │   └── cn.ts              # Tailwindクラス結合ヘルパー
│   │
│   ├── stores/
│   │   └── ui-store.ts        # useUIStore（グローバルUI状態）
│   │
│   ├── types/
│   │   └── global.ts          # グローバル型定義
│   │
│   └── main.tsx               # エントリポイント
│
├── tests/
│   ├── unit/                  # ユニットテスト
│   ├── integration/           # インテグレーションテスト
│   └── e2e/                   # Playwrightテスト
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── eslint.config.js
├── prettier.config.js
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

### ディレクトリ設計方針

- **features/**: 機能単位で自己完結。クロスフィーチャーの依存は `components/shared/` や `database/` を経由
- **database/**: DB接続・マイグレーション・基底リポジトリは共通基盤として集約
- **components/ui/**: shadcn/uiのコンポーネントはここに配置（`npx shadcn-ui add` のデフォルト出力先）
- **stores/**: フィーチャー横断のUIストアのみ。各フィーチャー固有のストアはfeature内に配置

---

## 3. ビルド & デプロイパイプライン

### 3.1 Viteビルド設定

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  base: '/winningpost10-manager/',  // GitHub Pages用
  build: {
    target: 'esnext',               // WASM対応ブラウザ
    outDir: 'dist',
  },
  optimizeDeps: {
    exclude: ['@aspect-build/aspect-wa-sqlite'], // wa-sqlite はWASMなので除外
  },
  worker: {
    format: 'es',                   // Service Worker / Web Worker用
  },
  server: {
    headers: {
      // OPFS利用時に必要なヘッダー
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

### 3.2 デプロイ先

| 環境 | 用途 | 設定 |
|------|------|------|
| **GitHub Pages** | メインのデプロイ先 | `gh-pages` ブランチに `dist/` をデプロイ。`base: '/winningpost10-manager/'` |
| **Vercel** | 代替・プレビュー環境 | リポジトリ連携で自動デプロイ。`base: '/'` に変更 |

> **注意:** OPFS利用時は `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` ヘッダーが必要。GitHub Pagesではカスタムヘッダーを設定できないため、OPFSが利用不可の場合はIndexedDB VFSにフォールバックする。Vercelでは `vercel.json` でヘッダー設定可能。

### 3.3 CI/CD（GitHub Actions）

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## 4. 開発環境設定方針

### 4.1 ESLint

- `eslint.config.js`（Flat Config形式）
- `@typescript-eslint/recommended` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`
- `import/order` でインポート順を統一
- 未使用変数はエラー（`_` プレフィックスのみ許可）

### 4.2 Prettier

- `prettier.config.js`
- セミコロンあり、シングルクォート、末尾カンマ（all）
- printWidth: 100
- Tailwind CSS用の `prettier-plugin-tailwindcss` でクラス順を自動整列

### 4.3 Vitest

- `vitest.config.ts`（Vite設定を継承）
- テスト対象: `src/**/*.test.ts`, `src/**/*.test.tsx`
- カバレッジ: `@vitest/coverage-v8`
- インメモリSQLiteでリポジトリ層のテストを実行
- React Testing Libraryと組み合わせてコンポーネントテスト

### 4.4 その他

- **TypeScript**: `strict: true`、パスエイリアス `@/` → `src/`
- **husky + lint-staged**: コミット時にESLint + Prettierを自動実行
- **Node.js**: 20 LTS

---

## 5. 主要ライブラリ詳細

### 5.1 SQLite WASM (wa-sqlite) + 永続化

#### 構成概要

ブラウザ内でSQLiteを動作させ、データをローカルに永続化する。サーバーは不要。

```
┌─────────────────────────────────────────────┐
│  Repository層（TypeScript）                    │
│  SQL文の組み立て・実行                          │
├─────────────────────────────────────────────┤
│  wa-sqlite（SQLite WASMバインディング）         │
│  SQLite本体をWebAssemblyで実行                  │
├─────────────────────────────────────────────┤
│  VFS（Virtual File System）                    │
│  ┌─────────────┐  ┌───────────────────┐      │
│  │ OPFS VFS     │  │ IndexedDB VFS     │      │
│  │ (推奨・高速) │  │ (フォールバック)   │      │
│  └─────────────┘  └───────────────────┘      │
├─────────────────────────────────────────────┤
│  ブラウザストレージ                             │
│  OPFS (Origin Private File System) / IndexedDB │
└─────────────────────────────────────────────┘
```

#### VFS選択戦略

1. **OPFS（推奨）**: `navigator.storage.getDirectory()` が利用可能かつCOOPヘッダーが設定されている場合に使用。ファイルベースのアクセスで高速
2. **IndexedDB（フォールバック）**: OPFSが利用できない環境（GitHub Pages等）で自動的にフォールバック。wa-sqliteの `IDBBatchAtomicVFS` を使用

#### 初期化フロー

```typescript
// database/connection.ts
import SQLiteAsyncESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import * as SQLite from 'wa-sqlite';

let db: SQLiteAPI;

export async function initDatabase(): Promise<void> {
  const module = await SQLiteAsyncESMFactory();
  const sqlite3 = SQLite.Factory(module);

  // OPFS利用可能チェック → フォールバック
  const vfs = await selectVFS(module);

  db = await sqlite3.open_v2('wp-breeding-manager.db');
  await runMigrations(db);
}
```

#### データ規模とパフォーマンス

要件書の想定規模（馬500頭、年度ステータス2,000件、系統200件）はブラウザ内SQLiteで十分に処理可能。WITH RECURSIVEによる5世代展開も即座に返る。

### 5.2 TanStack Router

#### ルーティング戦略

- **コードベースルーティング**を採用（ファイルベースではなく明示的なルート定義）
- 型安全なパラメータ: `$horseId`, `$planId`, `$year` はすべて型付き
- レイアウトのネスト: `RootLayout` → `SidebarLayout` → 各ページ

```typescript
// app/router.tsx
import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router';

const rootRoute = createRootRoute({
  component: RootLayout,
});

const sidebarRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'sidebar',
  component: SidebarLayout,
});

const horsesRoute = createRoute({
  getParentRoute: () => sidebarRoute,
  path: '/horses',
  component: HorseListPage,
});

const horseDetailRoute = createRoute({
  getParentRoute: () => sidebarRoute,
  path: '/horses/$horseId',
  component: HorseDetailPage,
});
// ... 他のルート定義
```

#### 検索パラメータの活用

馬一覧のフィルタ・ソート条件はURL検索パラメータとして管理し、ブラウザバックやブックマークに対応:

```
/horses?status=現役&lineage=ノーザンダンサー系&sort=name
```

### 5.3 shadcn/ui セットアップ方針

- `npx shadcn-ui@latest init` で初期化。`src/components/ui/` に配置
- 使用するコンポーネントのみ追加（Button, Input, Dialog, Select, Table, Tabs, Card, Badge, Tooltip等）
- テーマカラーはデフォルトをベースにカスタマイズ（競馬をイメージしたグリーン系）
- ダークモードは当面サポートしない（シングルテーマ）
- `components.json` で `tailwind.cssVariables: true` を設定

---

## 6. アーキテクチャ図

### 6.1 全体レイヤー構成

```
┌──────────────────────────────────────────────────────────┐
│                      UI層 (React)                         │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Pages        │  │  Components  │  │  Layouts      │   │
│  │  (各画面)     │  │  (共通UI)    │  │  (レイアウト) │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘   │
│         │                  │                              │
│         ▼                  ▼                              │
│  ┌──────────────────────────────────────────────────┐    │
│  │              Zustand Store層                       │    │
│  │  useHorseStore / useLineageStore / usePlanStore   │    │
│  │  useSettingsStore / useUIStore                     │    │
│  └──────────────────────┬───────────────────────────┘    │
│                          │                                │
├──────────────────────────┼────────────────────────────────┤
│                          ▼                                │
│  ┌──────────────────────────────────────────────────┐    │
│  │              Repository層                          │    │
│  │  HorseRepository / LineageRepository              │    │
│  │  PlanRepository / BreedingRecordRepository        │    │
│  │  SettingsRepository / ImportLogRepository         │    │
│  └──────────────────────┬───────────────────────────┘    │
│                          │                                │
├──────────────────────────┼────────────────────────────────┤
│                          ▼                                │
│  ┌──────────────────────────────────────────────────┐    │
│  │              Database層 (wa-sqlite)                │    │
│  │  SQLite WASM + VFS (OPFS / IndexedDB)             │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 6.2 データフロー

```
読専txt                      ユーザー操作
  │                              │
  ▼                              ▼
TSVパーサー                  React UI
  │                              │
  ▼                              ▼
ImportService ──────────→ Zustand Store
                               │
                               ▼
                          Repository
                               │
                               ▼
                          wa-sqlite (SQL実行)
                               │
                               ▼
                          OPFS / IndexedDB（永続化）
                               │
                               ▼
                          Blobエクスポート（バックアップ）
```

### 6.3 主要な依存関係の方向

```
UI → Store → Repository → Database

※ 上位層は下位層に依存するが、逆方向の依存は禁止
※ features/ 間のクロス依存は Repository層 を経由して最小限に
※ Parser（import/parser/）は Repository を直接利用してバッチ挿入
```

---

## 7. セキュリティ・プライバシー

- **完全ローカル**: すべてのデータはブラウザ内に保持。外部サーバーへの送信なし
- **認証不要**: シングルユーザー・ローカルアプリのため認証機構は設けない
- **バックアップファイル**: SQLite DBのBlobをそのままダウンロード。暗号化は不要（個人データのため）
- **XSS対策**: Reactの標準エスケープ + `dangerouslySetInnerHTML` の使用禁止
