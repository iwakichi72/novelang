# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## コマンド

```bash
npm run dev          # 開発サーバー起動 (http://localhost:3000)
npm run build        # プロダクションビルド
npm run lint         # ESLint実行
npm run start        # プロダクションサーバー起動
npm test             # Vitestテスト実行（watchモード）
npm run test:run     # テスト1回実行（CI用）

# 作品データ投入
npx tsx scripts/ingest-book.ts              # スタブ翻訳（API不要）
npx tsx scripts/ingest-book.ts --translate  # DeepL翻訳（DEEPL_API_KEY必要）
```

## アーキテクチャ

英語小説の多読支援PWAアプリ。文単位で日英切替、英語量4段階調整（25%/50%/75%/100%）、AI辞書を提供。

### 技術スタック
- **Next.js (App Router)** + TypeScript + Tailwind CSS v4
- **Supabase**: PostgreSQL (DB) + Auth (Google Sign-In)
- **Gemini API**: 辞書ルックアップ (`gemini-2.0-flash`) + AI辞書の文脈説明 (`gemini-2.5-flash`)
- **DeepL API**: 作品投入時のバッチ翻訳
- **Vercel**: ホスティング

### Supabaseクライアントの使い分け
- `src/lib/supabase.ts` — サーバーサイド用（anon key）。データ取得ヘルパー関数群
- `src/lib/supabase/server.ts` — Server Component用（cookie経由の認証付き）
- `src/lib/supabase/client.ts` — クライアントコンポーネント用（ブラウザ認証付き）
- API Routes内では `@supabase/supabase-js` を直接importし、`SUPABASE_SERVICE_ROLE_KEY` でRLSバイパス

### データフロー

**読書画面** (`/read/[bookId]/[chapterId]`):
1. `page.tsx` (Server Component) が Supabase から book/chapter/sentences を取得
2. `reader-view.tsx` (Client Component) が文の表示・タップ切替・英語量調整を制御
3. 単語タップ → `dictionary-popup.tsx` → `POST /api/dictionary/lookup` (word_entries検索、ミス時はGemini生成+DB登録)
4. 「詳しく」ボタン → `POST /api/dictionary/ai` (Gemini文脈説明、ai_dictionary_cacheにキャッシュ)

**作品投入パイプライン** (`scripts/ingest-book.ts`):
Project Gutenberg → テキスト抽出 → 文分割 → DeepL翻訳 → difficulty_score計算 → Supabase格納

### 主要テーブル
`books` → `chapters` → `sentences` (1:N:N)。`sentences`は`text_en`/`text_ja`ペアと`difficulty_score`を持ち、英語量調整のスコア閾値に使用。`word_entries`は辞書データ（Geminiで自動生成・蓄積）。`reading_progress`はユーザーごとの読書位置。

### 環境変数 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
DEEPL_API_KEY
```

## テスト

- **フレームワーク**: Vitest 4 + jsdom + @testing-library/react
- **設定**: `vitest.config.ts`、セットアップ `src/__tests__/setup.ts`
- **テストファイル配置**: `src/__tests__/` 以下（`api/`, `lib/` サブディレクトリ）
- **APIルートテストのモック戦略**: `vi.hoisted()` 内でSupabaseチェーンモックを生成し `vi.mock("@supabase/supabase-js")` に渡す。外部API（Gemini等）は `global.fetch` をモック
- **注意**: `estimateDifficulty()` は平均単語長3文字未満の入力で負のスコアを返しうる（`Math.max` 未適用）
- **ユーティリティ切り出し**: `getDefaultLang()` は `src/lib/reading-utils.ts` に独立関数として配置（テスタビリティのため `reader-view.tsx` から分離）

## コーディング規約
- コミットメッセージは1行の日本語でシンプルに
- UIテキストは日本語（ターゲットユーザーは日本人）
- Supabaseのスキーマ変更は `supabase/migrations/` にSQL追加
