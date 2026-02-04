# Novelang アーキテクチャレビューガイド
- 更新日: 2026-02-04
- 目的: レビュー時に「どこを見るか」を短時間で把握するための入口ドキュメント

## ドキュメント構成
- 全体概要（このファイル）: `docs-architecture-review.md`
- コード責務マップ: `docs-code-map.md`
- 処理フロー/シーケンス: `docs-process-flows.md`
- データモデル/ER図: `docs-data-model-er.md`
- 技術的負債（優先度付き）: `docs-tech-debt-priority.md`

## 全体像（要約）
```text
Browser (Client)
  -> Next.js App Router (Server Components / Client Components / API Routes)
     -> Supabase (PostgreSQL + Auth + RLS)
     -> Gemini API (辞書生成 / AI解説)
     -> DeepL API (本文取り込み時の翻訳)
```

## 最短レビュー導線
1. データ構造を把握: `docs-data-model-er.md`
2. 主要画面とAPI責務を把握: `docs-code-map.md`
3. 実行時の流れを把握: `docs-process-flows.md`

## 補足
- セットアップ手順は `README.md` を参照
- 本ドキュメント群は「実装レビュー向け」に絞っている
