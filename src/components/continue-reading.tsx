"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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

type ProgressQueryRow = {
  book_id: string;
  current_chapter_id: string;
  current_sentence_position: number;
  sentences_read: number;
  last_read_at: string;
  book: {
    title_en: string;
    title_ja: string;
    cefr_level: string;
  } | null;
  chapter: {
    chapter_number: number;
    sentence_count: number;
  } | null;
};

export default function ContinueReading() {
  const { user, loading: authLoading } = useAuth();
  const [progress, setProgress] = useState<ProgressWithBook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    const supabase = createClient();
    const fetchProgress = async () => {
      const { data } = await supabase
        .from("reading_progress")
        .select(`
          book_id,
          current_chapter_id,
          current_sentence_position,
          sentences_read,
          last_read_at,
          book:books!reading_progress_book_id_fkey (
            title_en,
            title_ja,
            cefr_level
          ),
          chapter:chapters!reading_progress_current_chapter_id_fkey (
            chapter_number,
            sentence_count
          )
        `)
        .eq("user_id", user.id)
        .eq("is_completed", false)
        .order("last_read_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) {
        setLoading(false);
        return;
      }

      const rp = data as ProgressQueryRow;
      if (rp.book && rp.chapter) {
        setProgress({
          book_id: rp.book_id,
          current_chapter_id: rp.current_chapter_id,
          current_sentence_position: rp.current_sentence_position,
          sentences_read: rp.sentences_read,
          last_read_at: rp.last_read_at,
          book_title_en: rp.book.title_en,
          book_title_ja: rp.book.title_ja,
          book_cefr_level: rp.book.cefr_level,
          chapter_number: rp.chapter.chapter_number,
          chapter_sentence_count: rp.chapter.sentence_count,
        });
      }
      setLoading(false);
    };

    fetchProgress();
  }, [user, authLoading]);

  if (authLoading || !user || (user && loading) || !progress) return null;

  const chapterProgress =
    progress.chapter_sentence_count > 0
      ? Math.round(
          (progress.current_sentence_position / progress.chapter_sentence_count) *
            100
        )
      : 0;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-4 text-foreground">続きから読む</h2>
      <Link href={`/read/${progress.book_id}/${progress.current_chapter_id}`}>
        <Card className="hover:shadow-md transition-all duration-200 border-primary/40 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="size-12 bg-primary/15 rounded-lg flex-shrink-0 flex items-center justify-center">
              <BookOpen className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground">{progress.book_title_en}</h3>
              <p className="text-xs text-muted-foreground">{progress.book_title_ja}</p>
              <p className="text-xs text-muted-foreground mt-1">
                第{progress.chapter_number}章 · {chapterProgress}%
              </p>
              <Progress value={chapterProgress} className="mt-2 h-1.5" />
            </div>
            <div className="flex items-center gap-1 text-primary text-sm font-medium">
              読む <ArrowRight className="size-4" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
