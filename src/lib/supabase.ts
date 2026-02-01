import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// --- データ取得ヘルパー ---

import type { Book, Chapter, Sentence, WordEntry } from "@/types/database";

export async function getBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Book[];
}

export async function getBook(bookId: string): Promise<Book | null> {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();
  if (error) return null;
  return data as Book;
}

export async function getChapters(bookId: string): Promise<Chapter[]> {
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("book_id", bookId)
    .order("chapter_number", { ascending: true });
  if (error) throw error;
  return data as Chapter[];
}

export async function getSentences(chapterId: string): Promise<Sentence[]> {
  const { data, error } = await supabase
    .from("sentences")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data as Sentence[];
}

export async function getChapter(chapterId: string): Promise<Chapter | null> {
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", chapterId)
    .single();
  if (error) return null;
  return data as Chapter;
}

export async function getWordEntry(word: string): Promise<WordEntry | null> {
  const { data, error } = await supabase
    .from("word_entries")
    .select("*")
    .eq("word", word)
    .single();
  if (error) return null;
  return data as WordEntry;
}
