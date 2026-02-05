-- Novelang 初期スキーマ
-- Supabase SQL Editor で実行するか、supabase db push で適用

-- ========== books ==========
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_ja TEXT NOT NULL,
  author_en TEXT NOT NULL,
  author_ja TEXT NOT NULL,
  cover_image_url TEXT,
  description_ja TEXT NOT NULL DEFAULT '',
  cefr_level TEXT NOT NULL CHECK (cefr_level IN ('A1','A2','B1','B2','C1','C2')),
  genre_tags JSONB NOT NULL DEFAULT '[]',
  total_chapters INT NOT NULL DEFAULT 0,
  total_sentences INT NOT NULL DEFAULT 0,
  total_words INT NOT NULL DEFAULT 0,
  license_type TEXT NOT NULL CHECK (license_type IN ('PUBLIC_DOMAIN','CC','LICENSED')),
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== chapters ==========
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  title_ja TEXT NOT NULL DEFAULT '',
  sentence_count INT NOT NULL DEFAULT 0,
  word_count INT NOT NULL DEFAULT 0,
  UNIQUE (book_id, chapter_number)
);

CREATE INDEX idx_chapters_book_id ON chapters(book_id);

-- ========== sentences ==========
CREATE TABLE sentences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  position INT NOT NULL,
  text_en TEXT NOT NULL,
  text_ja TEXT NOT NULL,
  difficulty_score NUMERIC(3,2) NOT NULL DEFAULT 0.50,
  word_count INT NOT NULL DEFAULT 0,
  cefr_estimate TEXT NOT NULL DEFAULT 'B1' CHECK (cefr_estimate IN ('A1','A2','B1','B2','C1','C2')),
  UNIQUE (chapter_id, position)
);

CREATE INDEX idx_sentences_chapter_position ON sentences(chapter_id, position);
CREATE INDEX idx_sentences_chapter_difficulty ON sentences(chapter_id, difficulty_score);

-- ========== word_entries（基本辞書） ==========
CREATE TABLE word_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  pos TEXT NOT NULL DEFAULT '',
  meaning_ja TEXT NOT NULL DEFAULT '',
  pronunciation TEXT,
  cefr_level TEXT CHECK (cefr_level IN ('A1','A2','B1','B2','C1','C2'))
);

CREATE INDEX idx_word_entries_word ON word_entries(word);

-- ========== reading_progress ==========
CREATE TABLE reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  current_chapter_id UUID REFERENCES chapters(id),
  current_sentence_position INT NOT NULL DEFAULT 0,
  english_ratio INT NOT NULL DEFAULT 50 CHECK (english_ratio IN (25, 50, 75, 100)),
  sentences_read INT NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

CREATE INDEX idx_reading_progress_user_last ON reading_progress(user_id, last_read_at DESC);

-- ========== vocab_items ==========
CREATE TABLE vocab_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  word_id UUID NOT NULL REFERENCES word_entries(id),
  sentence_id UUID NOT NULL REFERENCES sentences(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vocab_items_user ON vocab_items(user_id, created_at DESC);

-- ========== bookmarks ==========
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sentence_id UUID NOT NULL REFERENCES sentences(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id, created_at DESC);

-- ========== ai_dictionary_cache ==========
CREATE TABLE ai_dictionary_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  sentence_id UUID NOT NULL REFERENCES sentences(id),
  response_ja TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (word, sentence_id)
);

-- ========== reading_sessions ==========
CREATE TABLE reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES books(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  sentences_read INT NOT NULL DEFAULT 0,
  words_looked_up INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_reading_sessions_user ON reading_sessions(user_id, started_at DESC);

-- ========== daily_stats ==========
CREATE TABLE daily_stats (
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  sentences_read INT NOT NULL DEFAULT 0,
  minutes_read INT NOT NULL DEFAULT 0,
  streak_days INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
