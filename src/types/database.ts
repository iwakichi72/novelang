export type Database = {
  public: {
    Tables: {
      books: {
        Row: Book;
        Insert: Omit<Book, "id" | "created_at">;
        Update: Partial<Omit<Book, "id">>;
      };
      chapters: {
        Row: Chapter;
        Insert: Omit<Chapter, "id">;
        Update: Partial<Omit<Chapter, "id">>;
      };
      sentences: {
        Row: Sentence;
        Insert: Omit<Sentence, "id">;
        Update: Partial<Omit<Sentence, "id">>;
      };
      word_entries: {
        Row: WordEntry;
        Insert: Omit<WordEntry, "id">;
        Update: Partial<Omit<WordEntry, "id">>;
      };
      reading_progress: {
        Row: ReadingProgress;
        Insert: Omit<ReadingProgress, "id">;
        Update: Partial<Omit<ReadingProgress, "id">>;
      };
      vocab_items: {
        Row: VocabItem;
        Insert: Omit<VocabItem, "id" | "created_at">;
        Update: Partial<Omit<VocabItem, "id">>;
      };
      bookmarks: {
        Row: Bookmark;
        Insert: Omit<Bookmark, "id" | "created_at">;
        Update: Partial<Omit<Bookmark, "id">>;
      };
    };
  };
};

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type Book = {
  id: string;
  title_en: string;
  title_ja: string;
  author_en: string;
  author_ja: string;
  cover_image_url: string | null;
  description_ja: string;
  cefr_level: CefrLevel;
  genre_tags: string[];
  total_chapters: number;
  total_sentences: number;
  total_words: number;
  license_type: "PUBLIC_DOMAIN" | "CC" | "LICENSED";
  source_url: string | null;
  created_at: string;
};

export type Chapter = {
  id: string;
  book_id: string;
  chapter_number: number;
  title_en: string;
  title_ja: string;
  sentence_count: number;
  word_count: number;
};

export type Sentence = {
  id: string;
  chapter_id: string;
  position: number;
  text_en: string;
  text_ja: string;
  difficulty_score: number;
  word_count: number;
  cefr_estimate: CefrLevel;
};

export type WordEntry = {
  id: string;
  word: string;
  pos: string;
  meaning_ja: string;
  pronunciation: string | null;
  cefr_level: CefrLevel | null;
};

export type ReadingProgress = {
  id: string;
  user_id: string;
  book_id: string;
  current_chapter_id: string;
  current_sentence_position: number;
  english_ratio: number;
  sentences_read: number;
  is_completed: boolean;
  last_read_at: string;
};

export type VocabItem = {
  id: string;
  user_id: string;
  word_id: string;
  sentence_id: string;
  note: string | null;
  created_at: string;
};

export type Bookmark = {
  id: string;
  user_id: string;
  sentence_id: string;
  note: string | null;
  created_at: string;
};
