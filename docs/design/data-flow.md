1. Zustandストア設計

useHorseStore - 馬マスタCRUD、検索/フィルタ
useLineageStore - 系統マスタCRUD、階層管理
usePlanStore - 〆配合プランと4軸進捗（系統確立/世代進行/繁殖牝馬準備/年度配合）
useSettingsStore - ゲーム設定、現在年度
useUIStore - UIステート（サイドバー開閉、ビューモード等）
各ストアのTypeScript型定義と主要アクション一覧
2. Repositoryパターン

Zustand → Repository → SQLite の3層通信フロー
各Repositoryのインターフェース例（HorseRepository, LineageRepository等）
トランザクション・エラーハンドリング方針
3. 読専txtインポートフロー

ファイル選択 → TSVパース → プレビュー（差分: 新規/更新/変更なし）→ バッチ挿入/更新 → ログ記録
フロー図（テキスト/ASCII）
4. パーサー設計

ヘッダー行からカラム位置を動的決定、未知カラムはスキップ
カラム名→DBフィールドのマッピングテーブル
能力値「S+(0)」→ ランク「S+」抽出ロジック
年齢→生年逆算、父母馬名→horse検索/作成ロジック
5. バックアップ/リストア

SQLite DBファイルをBlobとしてexport/import
ファイル形式・命名規則
6. テスト戦略

Repository層: Vitestでインメモリ SQLite CRUDテスト
パーサー: 各種フォーマットのユニットテスト
コンポーネント: React Testing Libraryで主要画面テスト
E2E: Playwrightで主要フロー（インポート→血統ツリー表示）
7. データフロー全体図

読専txt → Parser → Repository → SQLite
UI → Zustand → Repository → SQLite
SQLite → Blob → Download（バックアップ）
File → Blob → SQLite（リストア）
