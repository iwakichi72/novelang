"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";

type DailyStats = {
  sentences_read: number;
  minutes_read: number;
  streak_days: number;
};

export default function StreakDisplay() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats/daily", {
          headers: { "x-user-id": user.id },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data.today);
          setCurrentStreak(data.currentStreak);
        }
      } catch {
        // エラーは無視
      }
      setLoading(false);
    };

    fetchStats();
  }, [user, authLoading]);

  if (authLoading || loading || !user) return null;

  return (
    <div className="flex items-center gap-4 mb-6 p-4 bg-card-bg rounded-xl border border-card-border">
      {/* ストリーク */}
      <div className="flex items-center gap-2">
        <span className="text-2xl" role="img" aria-label="炎">
          🔥
        </span>
        <div>
          <p className="text-2xl font-bold text-foreground">{currentStreak}</p>
          <p className="text-xs text-muted-foreground">連続日数</p>
        </div>
      </div>

      <div className="w-px h-10 bg-card-border" />

      {/* 今日の読書量 */}
      <div>
        <p className="text-lg font-semibold text-foreground">
          {stats?.sentences_read ?? 0}
          <span className="text-sm font-normal text-muted-foreground ml-1">文</span>
        </p>
        <p className="text-xs text-muted-foreground">今日の読書</p>
      </div>

      {currentStreak > 0 && (
        <>
          <div className="w-px h-10 bg-card-border" />
          <div className="flex-1 text-right">
            <p className="text-xs text-muted-foreground">
              {currentStreak >= 7
                ? "すごい！1週間以上継続中 🎉"
                : currentStreak >= 3
                ? "いい調子です！"
                : "継続は力なり！"}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
