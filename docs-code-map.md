# Novelang コード責務マップ
- 更新日: 2026-02-04

## 主要コード
| ファイル | 役割 | レビュー観点 |
|---|---|---|
| `src/app/layout.tsx` | ルートレイアウト、`ThemeProvider`/`AuthProvider` 注入 | 全画面への副作用 |
| `src/app/page.tsx` | ホーム（書籍一覧、streak、続き読み） | 初期ロード負荷、認証有無の分岐 |
| `src/app/library/[bookId]/page.tsx` | 書籍詳細、章一覧、読書開始導線 | 不正 `bookId` のハンドリング |
| `src/app/read/[bookId]/[chapterId]/page.tsx` | 読書画面のサーバー側データロード | 書籍・章不整合時の挙動 |
| `src/app/read/[bookId]/[chapterId]/reader-view.tsx` | 読書UI本体（表示比率、長押し反転、進捗更新） | スクロール時性能、状態同期 |
| `src/app/read/[bookId]/[chapterId]/dictionary-popup.tsx` | 辞書ポップアップ（通常辞書/AI解説/語彙保存） | API失敗時UX、二重保存 |
| `src/hooks/use-reading-progress.ts` | 読書進捗取得/保存、daily stats 送信 | debounce と離脱時更新の整合性 |
| `src/app/api/dictionary/lookup/route.ts` | 単語辞書API（DB検索→Gemini生成→保存） | JSONパース耐性、競合時再取得 |
| `src/app/api/dictionary/ai/route.ts` | AI解説API（キャッシュ優先） | キャッシュキー、失敗時挙動 |
| `src/app/api/stats/daily/route.ts` | 日次統計API（GET/POST） | 認証方式、streak境界条件 |
| `src/lib/supabase.ts` | 共通データ取得ヘルパー | 例外ハンドリング方針 |
| `scripts/ingest-book.ts` | Gutenberg取り込み、翻訳、難易度算出、DB投入 | 冪等性、外部API失敗復旧 |

## API I/O 要約
| Method | Path | 目的 | 入力 | 出力 |
|---|---|---|---|---|
| `POST` | `/api/dictionary/lookup` | 単語辞書取得/生成 | `word`, `sentenceText?` | `entry`, `generated` |
| `POST` | `/api/dictionary/ai` | 文脈付き AI 解説 | `word`, `sentenceId`, `sentenceText` | `response_ja`, `cached` |
| `GET` | `/api/stats/daily` | 今日の統計/streak取得 | Header: `x-user-id` | `today`, `currentStreak` |
| `POST` | `/api/stats/daily` | 日次統計加算 | Header: `x-user-id`, Body: counts | `success`, `streak_days` |
| `GET` | `/auth/callback` | OAuthコード交換 | `code`, `next?` | redirect |

## テスト配置
- `src/__tests__/reading-utils.test.ts`: 表示比率ロジック境界
- `src/__tests__/ingest-logic.test.ts`: 文分割/難易度/CEFR/Gutenberg抽出
- `src/__tests__/api/dictionary-lookup.test.ts`: 通常辞書API分岐
- `src/__tests__/api/dictionary-ai.test.ts`: AI解説API分岐
- `src/__tests__/api/stats-daily.test.ts`: daily stats と streak 計算

## 差分レビュー順（推奨）
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `src/app/api/dictionary/lookup/route.ts`
4. `src/app/api/dictionary/ai/route.ts`
5. `src/hooks/use-reading-progress.ts`
6. `src/app/api/stats/daily/route.ts`
7. `src/app/read/[bookId]/[chapterId]/reader-view.tsx`
