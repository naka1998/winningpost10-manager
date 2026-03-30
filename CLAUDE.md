# CLAUDE.md

## プロジェクト概要

Winning Post 10 2026 ブリーディングマネージャー。ブラウザ内 SQLite（wa-sqlite）を使ったローカルファーストの個人用 Web アプリ。

## 開発コマンド

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # プロダクションビルド
pnpm test         # Vitest でユニットテスト実行
pnpm test:e2e     # Playwright で E2E テスト実行
pnpm lint         # ESLint 実行
pnpm lint:fix     # ESLint 自動修正
pnpm format       # Prettier で整形
pnpm format:check # Prettier チェック
pnpm typecheck    # TypeScript 型チェック
```

## アーキテクチャ

```
UI (Pages, Components) → Zustand Stores → Repository → wa-sqlite → OPFS/IndexedDB
```

依存方向: UI → Store → Repository → Database（逆方向は禁止）

## コーディング規約

- TypeScript strict モード
- パスエイリアス: `@/` → `src/`
- Prettier: セミコロンあり、シングルクォート、trailingComma: all、printWidth: 100
- ESLint: unused vars = error（`_` プレフィックスは許可）
- Tailwind CSS v4（CSS-first config）

## ディレクトリ構成ルール

- `src/features/` 配下は機能別に自己完結（pages, components, store.ts, repository.ts, types.ts）
- feature 間の依存は Repository 経由のみ
- 共通 UI は `src/components/ui/`（shadcn/ui）と `src/components/shared/`
- DB 操作は `src/database/` の Repository 層を通す

## ルーティング

TanStack Router（コードベース）。ルート定義は `src/app/router.tsx` に集約。

### Phase 1 実装済みルート
- `/` → `/horses` にリダイレクト
- `/horses` — 馬一覧
- `/horses/import` — 読専txtインポート
- `/horses/$horseId` — 馬詳細
- `/horses/$horseId/pedigree` — 血統ツリー
- `/lineages` — 系統マスタ
- `/settings` — 設定

### Phase 2（未実装）
- `/horses/$horseId/growth` — 成長チャート
- `/race-plans/$year` — レース計画
- `/broodmares` — 繁殖牝馬評価
- `/breeding-records` — 配合記録

## デプロイ

GitHub Pages（`base: '/winningpost10-manager/'`）。Vite config と TanStack Router の basepath の両方に設定済み。

## テスト

- ユニット/コンポーネント: Vitest + React Testing Library（`src/` 内に `*.test.ts(x)`）
- E2E: Playwright（`tests/e2e/` 配下）
- テストセットアップ: `src/test/setup.ts`

## 設計ドキュメント

詳細は `docs/` 配下を参照:
- `docs/requirements.md` — 要件定義
- `docs/design/architecture.md` — 技術スタック・構成
- `docs/design/database-schema.md` — DDL・ER図
- `docs/design/data-flow.md` — Repository I/F・インポートフロー
- `docs/design/screen-routing.md` — ルーティング・画面設計
