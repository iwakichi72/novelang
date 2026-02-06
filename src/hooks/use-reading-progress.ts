"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import type { ReadingProgress } from "@/types/database";

export function useReadingProgress(bookId: string, chapterId: string) {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPositionRef = useRef<number>(0);
  const sessionSentencesRef = useRef<number>(0); // このセッションで読んだ文数
  const dailyStatsUpdatedRef = useRef<boolean>(false); // daily_stats更新済みフラグ

  // 進捗を取得
  useEffect(() => {
    if (!user) return;

    const supabase = supabaseRef.current;
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

      // セッション内の読了文数を追跡
      const prevPosition = latestPositionRef.current;
      if (sentencePosition > prevPosition) {
        sessionSentencesRef.current += sentencePosition - prevPosition;
      }
      latestPositionRef.current = sentencePosition;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        const now = new Date().toISOString();
        const { error } = await supabaseRef.current.from("reading_progress").upsert(
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
    [user, bookId, chapterId]
  );

  // daily_statsを更新
  const updateDailyStats = useCallback(async () => {
    if (!user || dailyStatsUpdatedRef.current || sessionSentencesRef.current === 0) return;

    dailyStatsUpdatedRef.current = true;

    try {
      await fetch("/api/stats/daily", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          sentences_read: sessionSentencesRef.current,
          minutes_read: 0, // 簡易版: 時間は追跡しない
        }),
      });
    } catch {
      // エラーは無視
    }
  }, [user]);

  // コンポーネントアンマウント時・ページ離脱時に統計を更新
  useEffect(() => {
    const handleBeforeUnload = () => {
      updateDailyStats();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        updateDailyStats();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      updateDailyStats();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [updateDailyStats]);

  return {
    progress,
    loading,
    savedPosition: progress?.current_sentence_position ?? 0,
    saveProgress,
  };
}
