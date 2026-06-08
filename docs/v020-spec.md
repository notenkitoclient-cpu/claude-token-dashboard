# v0.2.0 spec

## Step1: lib/intelligence/memory.ts

### やること
- ~/.claude/projects/ 以下のJSONLを全スキャン
- プロジェクトごとに抽出:
  - 最後のユーザー発言
  - 最後のtool_use名
  - 最終更新日時
- 結果を ~/.claude-dashboard/memory.json に保存
- 既存の lib/collect.ts の関数をimportして使う

### 作るファイル
- lib/intelligence/memory.ts
- app/api/intelligence/memory/route.ts

### 触らないファイル
lib/ と app/ の既存ファイルは一切変更しない

## Step2: lib/intelligence/scorer.ts
- 停滞時間・エラー率・未完了タスク数からスコア算出
- Step1のmemory.jsonを入力として使う

## Step3: lib/intelligence/scheduler.ts
- JSONLファイルをwatchして入力待ち状態を検知
- 次にやるべきプロジェクトを返す
