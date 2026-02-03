"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./auth-provider";

type ProgressWithBook = {
  book_id: string;
  current_chapter_id: string;
  current_sentence_position: number;
  sentences_read: number;
  last_read_at: string;
  book_title_en: string;
  book_title_ja: string;
  book_cefr_level: string;
  chapter_number: number;
  chapter_sentence_count: number;
};

export default function ContinueReading() {
  const { user, loading: authLoading } = useAuth();
  const [progress, setProgress] = useState<ProgressWithBook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const fetchProgress = async () => {
      // 最新の読書進捗を1件取得
      const { data } = await supabase
        .from("reading_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_completed", false)
        .order("last_read_at", { ascending: false })
        .limit(1)
        .single();

      if (!data) {
        setLoading(false);
        return;
      }

      const rp = data as { book_id: string; current_chapter_id: string; current_sentence_position: number; sentences_read: number; last_read_at: string };

      // 書籍情報を取得
      const { data: book } = await supabase
        .from("books")
        .select("title_en, title_ja, cefr_level")
        .eq("id", rp.book_id)
        .single();

      // 章情報を取得
      const { data: chapter } = await supabase
        .from("chapters")
        .select("chapter_number, sentence_count")
        .eq("id", rp.current_chapter_id)
        .single();

      if (book && chapter) {
        setProgress({
          book_id: rp.book_id,
          current_chapter_id: rp.current_chapter_id,
          current_sentence_position: rp.current_sentence_position,
          sentences_read: rp.sentences_read,
          last_read_at: rp.last_read_at,
          book_title_en: (book as { title_en: string }).title_en,
          book_title_ja: (book as { title_ja: string }).title_ja,
          book_cefr_level: (book as { cefr_level: string }).cefr_level,
          chapter_number: (chapter as { chapter_number: number }).chapter_number,
          chapter_sentence_count: (chapter as { sentence_count: number }).sentence_count,
        });
      }
      setLoading(false);
    };

    fetchProgress();
  }, [user, authLoading]);

  if (authLoading || loading || !progress) return null;

  const chapterProgress = progress.chapter_sentence_count > 0
    ? Math.round((progress.current_sentence_position / progress.chapter_sentence_count) * 100)
    : 0;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3 text-foreground">続きから読む</h2>
      <Link
        href={`/read/${progress.book_id}/${progress.current_chapter_id}`}
        className="block bg-accent/10 border border-accent/30 rounded-xl p-4 hover:bg-accent/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-16 bg-accent/20 rounded-lg flex-shrink-0 flex items-center justify-center text-xl">
            📖
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground">{progress.book_title_en}</h3>
            <p className="text-xs text-muted-foreground">{progress.book_title_ja}</p>
            <p className="text-xs text-muted-foreground mt-1">
              第{progress.chapter_number}章 · {chapterProgress}%
            </p>
            <div className="mt-2 h-1.5 bg-accent/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full"
                style={{ width: `${chapterProgress}%` }}
              />
            </div>
          </div>
          <span className="text-accent text-sm font-medium">読む →</span>
        </div>
      </Link>
    </div>
  );
}
