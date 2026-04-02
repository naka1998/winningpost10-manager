# WP ブリーディングマネージャー

Winning Post 10 2026 のプレイデータを管理・分析し、〆配合の計画から実行までを支援する個人用 Web アプリケーション。

## 現在のスコープ（Phase 1: MVP）

- **F01:** 馬マスタ管理（読専 txt インポート含む）
- **F02:** 血統ツリー描画（3 ビュー）
- **F06:** 系統マスタ管理
- プリセットデータ投入

> Phase 2 以降: 成長トラッキング(F04)、配合記録(F05)、レース計画(F11)、繁殖牝馬評価(F12)

## 技術スタック

| カテゴリ          | 技術                                   |
| ----------------- | -------------------------------------- |
| UI                | React 19 + TypeScript 5                |
| ビルド            | Vite 8（Rolldown）                     |
| ルーティング      | TanStack Router 1.x                    |
| UI コンポーネント | shadcn/ui + Tailwind CSS v4            |
| 状態管理          | Zustand 5                              |
| データベース      | wa-sqlite（ブラウザ内 SQLite）         |
| リンター          | Oxlint                                 |
| フォーマッター    | Oxfmt                                  |
| テスト            | Vitest + React Testing Library         |
| E2E               | Playwright                             |
| デプロイ          | Cloudflare Workers（静的アセット配信） |

## 前提条件

- **Node.js** 22+
- **pnpm** 10+

## セットアップ

```bash
pnpm install
```

## 開発

```bash
pnpm dev
```

http://localhost:5173/ で起動します。

## テスト

```bash
# ユニット / コンポーネントテスト
pnpm test

# E2E テスト（Playwright スモーク）
pnpm test:e2e
```

E2E スモークでは以下の主要フローを自動検証します。

- 読専TSVのインポート（プレビュー〜実行）
- インポート設定（年度）の更新とプレビュー反映
- インポート完了後に「新しいインポート」へ戻る導線

GitHub Actions では `ci` ジョブに加えて `e2e` ジョブを実行し、PR 時にも退行を検知します。

## ビルド

```bash
pnpm build
pnpm preview   # ビルド結果のプレビュー
```

## Lint & Format

```bash
pnpm lint          # Oxlint
pnpm lint:fix      # Oxlint (自動修正)
pnpm format        # Oxfmt (書き込み)
pnpm format:check  # Oxfmt (チェックのみ)
pnpm typecheck     # TypeScript 型チェック
```

## デプロイ

Cloudflare Workers（静的アセット配信）にデプロイ。`wrangler deploy` で実行。

## ディレクトリ構成

```
src/
├── app/              # App, Router, Providers
├── components/
│   ├── ui/           # shadcn/ui コンポーネント
│   ├── layout/       # RootLayout, SidebarLayout
│   └── shared/       # 共通コンポーネント
├── features/         # 機能別モジュール（自己完結）
│   ├── horses/       # F01: 馬マスタ
│   ├── import/       # F01: 読専txtインポート
│   ├── pedigree/     # F02: 血統ツリー
│   ├── lineages/     # F06: 系統マスタ
│   └── settings/     # F07: 設定
├── database/         # wa-sqlite 接続, migrations
├── lib/              # ユーティリティ
├── stores/           # グローバル UI ストア
└── types/            # 共通型定義
```

## 設計ドキュメント

- [要件定義](docs/requirements.md)
- [アーキテクチャ](docs/design/architecture.md)
- [データベーススキーマ](docs/design/database-schema.md)
- [データフロー](docs/design/data-flow.md)
- [画面設計 & ルーティング](docs/design/screen-routing.md)
