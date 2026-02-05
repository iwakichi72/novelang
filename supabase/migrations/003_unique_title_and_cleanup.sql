-- 003: 重複クリーンアップ + UNIQUE制約 + CASCADE DELETE追加
--
-- 問題: books テーブルに UNIQUE 制約がなく、同じ title_en の本が複数登録されうる
-- 対策: 重複を削除し、UNIQUE 制約を追加。CASCADE 未設定の FK も修正

-- ===== 1. 重複データのクリーンアップ =====

-- CASCADE 未設定テーブルから先に孤立予定のレコードを削除

DELETE FROM bookmarks
WHERE sentence_id IN (
  SELECT s.id FROM sentences s
  JOIN chapters c ON s.chapter_id = c.id
  WHERE c.book_id NOT IN (
    SELECT DISTINCT ON (title_en) id
    FROM books
    ORDER BY title_en, created_at DESC
  )
);

DELETE FROM vocab_items
WHERE sentence_id IN (
  SELECT s.id FROM sentences s
  JOIN chapters c ON s.chapter_id = c.id
  WHERE c.book_id NOT IN (
    SELECT DISTINCT ON (title_en) id
    FROM books
    ORDER BY title_en, created_at DESC
  )
);

DELETE FROM ai_dictionary_cache
WHERE sentence_id IN (
  SELECT s.id FROM sentences s
  JOIN chapters c ON s.chapter_id = c.id
  WHERE c.book_id NOT IN (
    SELECT DISTINCT ON (title_en) id
    FROM books
    ORDER BY title_en, created_at DESC
  )
);

DELETE FROM reading_sessions
WHERE book_id NOT IN (
  SELECT DISTINCT ON (title_en) id
  FROM books
  ORDER BY title_en, created_at DESC
);

-- 重複 books を削除（CASCADE で chapters, sentences, reading_progress も自動削除）
DELETE FROM books
WHERE id NOT IN (
  SELECT DISTINCT ON (title_en) id
  FROM books
  ORDER BY title_en, created_at DESC
);

-- ===== 2. UNIQUE 制約追加 =====
-- Skip if constraint already exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'books_title_en_unique'
      AND conrelid = 'books'::regclass
  ) THEN
    ALTER TABLE books ADD CONSTRAINT books_title_en_unique UNIQUE (title_en);
  END IF;
END $$;

-- ===== 3. CASCADE DELETE 未設定の FK を修正 =====

ALTER TABLE bookmarks
  DROP CONSTRAINT bookmarks_sentence_id_fkey,
  ADD CONSTRAINT bookmarks_sentence_id_fkey
    FOREIGN KEY (sentence_id) REFERENCES sentences(id) ON DELETE CASCADE;

ALTER TABLE vocab_items
  DROP CONSTRAINT vocab_items_sentence_id_fkey,
  ADD CONSTRAINT vocab_items_sentence_id_fkey
    FOREIGN KEY (sentence_id) REFERENCES sentences(id) ON DELETE CASCADE;

ALTER TABLE ai_dictionary_cache
  DROP CONSTRAINT ai_dictionary_cache_sentence_id_fkey,
  ADD CONSTRAINT ai_dictionary_cache_sentence_id_fkey
    FOREIGN KEY (sentence_id) REFERENCES sentences(id) ON DELETE CASCADE;

ALTER TABLE reading_sessions
  DROP CONSTRAINT reading_sessions_book_id_fkey,
  ADD CONSTRAINT reading_sessions_book_id_fkey
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;
