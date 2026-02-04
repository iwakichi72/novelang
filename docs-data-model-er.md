# Novelang データモデル・ER図
- 更新日: 2026-02-04
- 参照元: `supabase/migrations/001_initial_schema.sql`, `supabase/migrations/002_rls_policies.sql`

## 1. ER図
```mermaid
erDiagram
    AUTH_USERS ||--o{ READING_PROGRESS : owns
    AUTH_USERS ||--o{ VOCAB_ITEMS : owns
    AUTH_USERS ||--o{ BOOKMARKS : owns
    AUTH_USERS ||--o{ READING_SESSIONS : owns
    AUTH_USERS ||--o{ DAILY_STATS : owns

    BOOKS ||--o{ CHAPTERS : has
    CHAPTERS ||--o{ SENTENCES : has
    BOOKS ||--o{ READING_PROGRESS : tracks
    CHAPTERS o|--o{ READING_PROGRESS : current_chapter
    BOOKS ||--o{ READING_SESSIONS : session_on

    WORD_ENTRIES ||--o{ VOCAB_ITEMS : referenced_by
    SENTENCES ||--o{ VOCAB_ITEMS : referenced_by
    SENTENCES ||--o{ BOOKMARKS : referenced_by
    SENTENCES ||--o{ AI_DICTIONARY_CACHE : cached_for

    AUTH_USERS {
      uuid id PK
    }

    BOOKS {
      uuid id PK
      text title_en
      text title_ja
      text cefr_level
      int total_chapters
      int total_sentences
      int total_words
      timestamptz created_at
    }

    CHAPTERS {
      uuid id PK
      uuid book_id FK
      int chapter_number
      text title_en
      text title_ja
      int sentence_count
      int word_count
    }

    SENTENCES {
      uuid id PK
      uuid chapter_id FK
      int position
      text text_en
      text text_ja
      numeric difficulty_score
      int word_count
      text cefr_estimate
    }

    WORD_ENTRIES {
      uuid id PK
      text word UK
      text pos
      text meaning_ja
      text pronunciation
      text cefr_level
    }

    READING_PROGRESS {
      uuid id PK
      uuid user_id FK
      uuid book_id FK
      uuid current_chapter_id FK
      int current_sentence_position
      int english_ratio
      int sentences_read
      bool is_completed
      timestamptz last_read_at
    }

    VOCAB_ITEMS {
      uuid id PK
      uuid user_id FK
      uuid word_id FK
      uuid sentence_id FK
      text note
      timestamptz created_at
    }

    BOOKMARKS {
      uuid id PK
      uuid user_id FK
      uuid sentence_id FK
      text note
      timestamptz created_at
    }

    AI_DICTIONARY_CACHE {
      uuid id PK
      text word
      uuid sentence_id FK
      text response_ja
      timestamptz created_at
    }

    READING_SESSIONS {
      uuid id PK
      uuid user_id FK
      uuid book_id FK
      timestamptz started_at
      timestamptz ended_at
      int sentences_read
      int words_looked_up
    }

    DAILY_STATS {
      uuid user_id PK
      date date PK
      int sentences_read
      int minutes_read
      int streak_days
    }
```

## 2. 主要制約
- `chapters`: `UNIQUE (book_id, chapter_number)`
- `sentences`: `UNIQUE (chapter_id, position)`
- `word_entries`: `word` 一意
- `reading_progress`: `UNIQUE (user_id, book_id)`
- `ai_dictionary_cache`: `UNIQUE (word, sentence_id)`
- `daily_stats`: `PRIMARY KEY (user_id, date)`

## 3. RLS要約
- 公開読取: `books`, `chapters`, `sentences`, `word_entries`, `ai_dictionary_cache`
- ユーザー所有: `reading_progress`, `vocab_items`, `bookmarks`, `reading_sessions`, `daily_stats`

## 4. レビュー観点
1. `daily_stats.user_id` は `auth.users` 参照を論理前提として扱っている
2. `reading_progress.current_chapter_id` は nullable（章未確定状態を許容）
3. キャッシュ粒度は `(word, sentence_id)` で、同単語でも文脈ごとに別レコード
