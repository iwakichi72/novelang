# Novelang - 英語小説を挫折せずに読む

英語量を調整しながら小説で多読。文タップで日英切替、AI辞書で快適に読み進められるWebアプリ。

## 技術スタック

- **フロントエンド**: Next.js (App Router) + TypeScript + Tailwind CSS
- **DB/認証**: Supabase (PostgreSQL + Auth)
- **翻訳**: DeepL API（作品投入時のバッチ翻訳）
- **AI辞書**: Gemini API（辞書ルックアップ + 文脈説明）
- **ホスティング**: Vercel

## セットアップ

```bash
npm install
```

`.env.local` に以下を設定:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
DEEPL_API_KEY=...
```

## 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 で開く。

## テスト

```bash
# 監視モード
npm test

# 1回実行
npm run test:run

# カバレッジ
npm run test:coverage
```

現在は `src/__tests__` で API ルート・取り込みロジック・読書ユーティリティなどを Vitest で検証している。

## 作品データ投入

```bash
# スタブ翻訳（API不要）
npx tsx scripts/ingest-book.ts

# DeepL翻訳（DEEPL_API_KEY必要）
npx tsx scripts/ingest-book.ts --translate
```

## 検証方法

### PC ブラウザ

1. `npm run dev` で起動
2. http://localhost:3000 にアクセス
3. Google認証でログイン
4. 作品を選択 → 読書画面で文タップ（日英切替）、単語タップ（辞書ポップアップ）を確認
5. 英語量スライダー（25%/50%/75%/100%）の切替を確認
6. 単語保存（＋ボタン）→ `/vocab` で単語帳を確認

### スマホ PWA

#### iPhone (Safari)

1. iPhoneのSafariで開発サーバーまたはデプロイ先URLにアクセス
2. 共有ボタン（□↑）→「ホーム画面に追加」をタップ
3. ホーム画面から起動し、スタンドアロン表示（アドレスバーなし）になることを確認
4. ノッチ/Dynamic Island部分にヘッダーが被らないことを確認
5. 読書画面のフッター（英語量スライダー）がホームインジケータと被らないことを確認
6. 辞書ポップアップがフッターの上に正しく表示されることを確認
7. ダブルタップでズームしないことを確認

#### Android (Chrome)

1. Chromeでアクセス
2. メニュー（⋮）→「ホーム画面に追加」または「アプリをインストール」をタップ
3. ホーム画面から起動し、スタンドアロン表示になることを確認
4. 上記iPhone手順の4〜7と同様の確認

### 辞書機能

1. 読書画面で英単語をタップ → 辞書ポップアップが表示される
2. `word_entries` に登録済みの単語 → DBから即座に表示される
3. 未登録の単語 → Gemini APIで生成され表示される（初回のみ1-2秒）
4. 同じ単語を再度タップ → DBから即座に表示される（Gemini呼び出しなし）
5. 「詳しく（AI辞書）」ボタン → 文脈に合った詳細説明が表示される
