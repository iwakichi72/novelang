# Novelang 処理フロー
- 更新日: 2026-02-04

## 1. 読書開始フロー
1. `/` で書籍一覧を取得
2. `/library/[bookId]` で書籍詳細と章一覧を取得
3. `/read/[bookId]/[chapterId]` で `book/chapter/sentences` を取得
4. `ReaderView` を描画

```mermaid
sequenceDiagram
    participant U as User
    participant H as Home (/)
    participant B as BookPage (/library/[bookId])
    participant R as ReadPage (Server)
    participant DB as Supabase

    U->>H: 書籍を選択
    H->>B: 遷移
    B->>DB: getBook(bookId)
    B->>DB: getChapters(bookId)
    U->>B: 読み始める
    B->>R: /read/[bookId]/[chapterId]
    R->>DB: getBook/getChapter/getSentences
    R-->>U: ReaderView描画
```

## 2. 読書中の進捗保存
1. スクロール位置から現在文位置を算出
2. `saveProgress` を 2 秒 debounce で実行
3. `reading_progress` に upsert
4. 画面離脱時に `POST /api/stats/daily`

## 3. 通常辞書フロー
1. 単語タップで `DictionaryPopup` を開く
2. `POST /api/dictionary/lookup`
3. `word_entries` に既存があれば返却
4. 無ければ Gemini 生成結果を保存して返却

```mermaid
sequenceDiagram
    participant U as User
    participant V as ReaderView
    participant P as DictionaryPopup
    participant API as /api/dictionary/lookup
    participant DB as Supabase
    participant GM as Gemini

    U->>V: 単語タップ
    V->>P: word/sentenceを渡す
    P->>API: POST {word, sentenceText}
    API->>DB: word_entriesを検索
    alt 既存あり
        DB-->>API: entry
        API-->>P: generated=false
    else 既存なし
        API->>GM: 生成リクエスト
        GM-->>API: JSON応答
        API->>DB: word_entriesにinsert
        API-->>P: generated=true
    end
    P-->>U: 辞書表示
```

## 4. AI解説フロー
1. 「詳しくAI解説」押下
2. `POST /api/dictionary/ai`
3. `ai_dictionary_cache` にヒットすれば即返却
4. ヒットしなければ Gemini 生成しキャッシュして返却

```mermaid
sequenceDiagram
    participant U as User
    participant P as DictionaryPopup
    participant API as /api/dictionary/ai
    participant DB as Supabase
    participant GM as Gemini

    U->>P: 詳しくAI解説
    P->>API: POST {word, sentenceId, sentenceText}
    API->>DB: ai_dictionary_cacheを検索
    alt キャッシュあり
        DB-->>API: response_ja
        API-->>P: cached=true
    else キャッシュなし
        API->>GM: 解説生成
        GM-->>API: response_ja
        API->>DB: ai_dictionary_cacheにinsert
        API-->>P: cached=false
    end
    P-->>U: 解説表示
```

## 5. 語彙保存と一覧表示
1. ポップアップで `vocab_items` に insert
2. `/vocab` で `vocab_items` を取得
3. `word_entries` と `sentences` を引いてクライアント側で結合表示
4. 削除時は `vocab_items` から delete

## 6. 日次統計と streak
1. `GET /api/stats/daily` で今日データと最新データを取得
2. 最新日が今日/昨日なら streak 継続、そうでなければ 0
3. `POST /api/stats/daily` で当日分を加算
