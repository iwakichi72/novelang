# Novelang 進捗管理シート

> 最終更新: 2026-02-05

## MVP バックログ

### 完了済み
- [x] #1 プロジェクトセットアップ（Next.js + TypeScript + Tailwind）
- [x] #2 Supabaseテーブル設計＋作成（10テーブル、マイグレーション済み）
- [x] #3 Supabase Auth設定＋Google Sign-In実装（AuthProvider, UserMenu, RLS, コールバック）
- [x] #6 作品一覧画面（Supabaseクエリ対応済み）
- [x] #7 作品詳細画面（Supabaseクエリ対応済み）
- [x] #8 章の文取得API（Supabaseヘルパー関数）
- [x] #9 読書画面（スクロール＋文表示）
- [x] #10 英語量スライダー＋文の英日切替ロジック（4段階）
- [x] #11 文タップ日英切替
- [x] #12 基本辞書データ投入（20語）
- [x] #13 単語タップ→辞書ポップアップ（Supabase対応済み）

### 未着手
- [x] #4 作品データ投入パイプライン — The Happy Prince投入済み（243文）、--translateでLLM翻訳可
- [x] #5 文の難易度スコア計算バッチ — パイプライン内で自動計算（文長＋語彙長ベース）
- [x] #14 読書進捗API（保存/取得）— スクロール追跡＋デバウンス保存
- [x] #15 自動しおり（最終位置保存）— 位置復元付き
- [x] #16 ホーム画面（続きから読む）— ContinueReadingコンポーネント
- [x] #17 Vercelデプロイ＋本番環境構築 — https://novelang.vercel.app/

## β バックログ

- [x] #18 AI辞書API（Bedrock Claude Haiku連携）— /api/dictionary/ai、文脈付き解説
- [x] #19 AI辞書キャッシュ（Supabase）— ai_dictionary_cacheテーブル活用、word+sentence_idで重複排除
- [x] #20 単語帳CRUD API＋画面 — 保存・一覧・削除、出現文コンテキスト付き
- [ ] #21 TTS（Web Speech API連携）
- [ ] #22 連続日数（ストリーク）計算＋表示
- [ ] #23 読書統計画面
- [ ] #24 オンボーディングフロー（レベル選択→おすすめ）
- [ ] #25 Service Workerによるオフラインキャッシュ
- [ ] #26 Apple Sign-In
- [ ] #27 手動しおり（複数）

## 技術メモ

- **DB**: Supabase PostgreSQL（プロジェクトID: oqckkhxnxebhiukmvtrz）
- **ホスティング**: Vercel（https://novelang.vercel.app/）
- **認証**: Supabase Auth + Google Sign-In（@supabase/ssr使用、RLS設定済み）
- **UUID生成**: `gen_random_uuid()`（Supabase標準）
- **シードデータ**: 3冊・2章・10文・20語投入済み
