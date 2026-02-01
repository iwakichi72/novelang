"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import type { ReadingProgress } from "@/types/database";

export function useReadingProgress(bookId: string, chapterId: string) {
  const { user } = useAuth();
  const supabase = createClient();
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPositionRef = useRef<number>(0);

  // 進捗を取得
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      const { data } = await supabase
        .from("reading_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("book_id", bookId)
        .single();

      if (data) {
        setProgress(data as ReadingProgress);
        latestPositionRef.current = (data as ReadingProgress).current_sentence_position;
      }
      setLoading(false);
    };

    fetchProgress();
  }, [user, bookId]);

  // 進捗を保存（デバウンス付き: 2秒後に保存）
  const saveProgress = useCallback(
    (sentencePosition: number, sentencesRead: number) => {
      if (!user) return;
      latestPositionRef.current = sentencePosition;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        const now = new Date().toISOString();
        const { error } = await supabase.from("reading_progress").upsert(
          {
            user_id: user.id,
            book_id: bookId,
            current_chapter_id: chapterId,
            current_sentence_position: sentencePosition,
            english_ratio: 50,
            sentences_read: sentencesRead,
            is_completed: false,
            last_read_at: now,
          } as never,
          { onConflict: "user_id,book_id" }
        );
        if (!error) {
          setProgress((prev) => ({
            ...prev,
            id: prev?.id ?? "",
            user_id: user.id,
            book_id: bookId,
            current_chapter_id: chapterId,
            current_sentence_position: sentencePosition,
            english_ratio: 50,
            sentences_read: sentencesRead,
            is_completed: false,
            last_read_at: now,
          }));
        }
      }, 2000);
    },
    [user, bookId, chapterId, supabase]
  );

  // コンポーネントアンマウント時に未保存の進捗を即座に保存
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return {
    progress,
    loading,
    savedPosition: progress?.current_sentence_position ?? 0,
    saveProgress,
  };
}
