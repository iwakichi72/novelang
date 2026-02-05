-- RLSポリシー設定

-- 公開テーブル: 誰でも読み取り可
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books_public_read" ON books FOR SELECT USING (true);

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chapters_public_read" ON chapters FOR SELECT USING (true);

ALTER TABLE sentences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sentences_public_read" ON sentences FOR SELECT USING (true);

ALTER TABLE word_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "word_entries_public_read" ON word_entries FOR SELECT USING (true);

ALTER TABLE ai_dictionary_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_cache_public_read" ON ai_dictionary_cache FOR SELECT USING (true);

-- ユーザー固有テーブル: 自分のデータのみ
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reading_progress_own" ON reading_progress
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE vocab_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vocab_items_own" ON vocab_items
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks_own" ON bookmarks
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reading_sessions_own" ON reading_sessions
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_stats_own" ON daily_stats
  FOR ALL USING (auth.uid() = user_id);
