"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, PartyPopper, BookOpen, Calendar, Hash } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type DailyStatRecord = {
  date: string;
  sentences_read: number;
  minutes_read: number;
  streak_days: number;
};

type StatsOverview = {
  totalSentences: number;
  totalDays: number;
  currentStreak: number;
  maxStreak: number;
  vocabCount: number;
  weeklyData: DailyStatRecord[];
};

export default function StatsPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    const supabase = createClient();

    const fetchStats = async () => {
      // 過去30日分の統計を取得
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: dailyStats } = await supabase
        .from("daily_stats")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: false });

      // 単語帳の数を取得
      const { count: vocabCount } = await supabase
        .from("vocab_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // 統計を計算
      const records = (dailyStats ?? []) as DailyStatRecord[];
      const totalSentences = records.reduce((sum, r) => sum + r.sentences_read, 0);
      const totalDays = records.length;
      const maxStreak = records.reduce((max, r) => Math.max(max, r.streak_days), 0);

      // 現在のストリーク
      let currentStreak = 0;
      if (records.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        const latestRecord = records[0];
        if (latestRecord.date === today || latestRecord.date === yesterdayStr) {
          currentStreak = latestRecord.streak_days;
        }
      }

      // 過去7日分のデータを取得
      const weeklyData: DailyStatRecord[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const record = records.find((r) => r.date === dateStr);
        weeklyData.push(
          record ?? {
            date: dateStr,
            sentences_read: 0,
            minutes_read: 0,
            streak_days: 0,
          }
        );
      }

      setStats({
        totalSentences,
        totalDays,
        currentStreak,
        maxStreak,
        vocabCount: vocabCount ?? 0,
        weeklyData,
      });
      setLoading(false);
    };

    fetchStats();
  }, [user, authLoading]);

  if (authLoading || (user && loading)) {
    return (
      <div className="min-h-screen bg-muted">
        <header className="bg-card border-b border-border px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="gap-1.5">
                <ArrowLeft className="size-4" />
                戻る
              </Link>
            </Button>
            <h1 className="text-lg font-bold text-foreground">読書統計</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-muted">
        <header className="bg-card border-b border-border px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="gap-1.5">
                <ArrowLeft className="size-4" />
                戻る
              </Link>
            </Button>
            <h1 className="text-lg font-bold text-foreground">読書統計</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-12">
          <p className="text-center text-muted-foreground">
            ログインすると読書統計が見られます
          </p>
        </main>
      </div>
    );
  }

  // 週間グラフの最大値
  const maxSentences = Math.max(...(stats?.weeklyData.map((d) => d.sentences_read) ?? [1]), 1);

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" className="gap-1.5">
              <ArrowLeft className="size-4" />
              戻る
            </Link>
          </Button>
          <h1 className="text-lg font-bold text-foreground">読書統計</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 概要カード */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="size-5 text-orange-500" />
                <p className="text-3xl font-bold text-foreground">
                  {stats?.currentStreak ?? 0}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">連続日数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Hash className="size-5 text-primary" />
                <p className="text-3xl font-bold text-foreground">
                  {stats?.totalSentences ?? 0}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">累計読了文数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="size-5 text-primary" />
                <p className="text-3xl font-bold text-foreground">
                  {stats?.totalDays ?? 0}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">読書した日数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="size-5 text-primary" />
                <p className="text-3xl font-bold text-foreground">
                  {stats?.vocabCount ?? 0}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">保存した単語</p>
            </CardContent>
          </Card>
        </div>

        {/* 最高ストリーク */}
        {(stats?.maxStreak ?? 0) > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">最高連続日数</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {stats?.maxStreak}日
              </p>
            </CardContent>
          </Card>
        )}

        {/* 週間グラフ */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-base font-semibold text-foreground mb-4">
              今週の読書量
            </h2>
            <div className="flex items-end justify-between gap-2 h-32">
              {stats?.weeklyData.map((day) => {
                const height = (day.sentences_read / maxSentences) * 100;
                const date = new Date(day.date);
                const dayName = ["日", "月", "火", "水", "木", "金", "土"][
                  date.getDay()
                ];
                const isToday =
                  day.date === new Date().toISOString().split("T")[0];

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center justify-end h-24">
                      {day.sentences_read > 0 && (
                        <span className="text-xs text-muted-foreground mb-1">
                          {day.sentences_read}
                        </span>
                      )}
                      <div
                        className={`w-full rounded-t transition-all ${
                          isToday ? "bg-primary" : "bg-primary/40"
                        }`}
                        style={{
                          height: `${Math.max(height, day.sentences_read > 0 ? 8 : 0)}%`,
                          minHeight: day.sentences_read > 0 ? "4px" : "0",
                        }}
                      />
                    </div>
                    <span
                      className={`text-xs ${
                        isToday ? "text-primary font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {dayName}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 励ましメッセージ */}
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            {stats?.currentStreak === 0
              ? "今日から読書を始めましょう！"
              : stats?.currentStreak === 1
              ? "いい調子！明日も続けましょう"
              : stats?.currentStreak && stats.currentStreak < 7
              ? `${stats.currentStreak}日連続！あと${7 - stats.currentStreak}日で1週間達成`
              : stats?.currentStreak && stats.currentStreak >= 7
              ? (<>素晴らしい！1週間以上継続中です <PartyPopper className="size-4 inline" /></>)
              : ""}
          </p>
        </div>
      </main>
    </div>
  );
}
