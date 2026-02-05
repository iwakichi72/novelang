import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 今日の日付を取得（UTC）
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// 昨日の日付を取得（UTC）
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

// GET: ユーザーの今日の統計とストリークを取得
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getTodayDate();

  // 今日の統計を取得
  const { data: todayStats } = await supabase
    .from("daily_stats")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  // 最新のストリーク情報を取得（今日または昨日のレコード）
  const { data: latestStats } = await supabase
    .from("daily_stats")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  // 現在のストリークを計算
  let currentStreak = 0;
  if (latestStats) {
    const latestDate = latestStats.date;
    const yesterday = getYesterdayDate();

    if (latestDate === today) {
      currentStreak = latestStats.streak_days;
    } else if (latestDate === yesterday) {
      currentStreak = latestStats.streak_days;
    }
    // それ以外（2日以上前）はストリークリセット（0）
  }

  return NextResponse.json({
    today: todayStats ?? {
      sentences_read: 0,
      minutes_read: 0,
      streak_days: currentStreak,
    },
    currentStreak,
  });
}

// POST: 読書記録を追加・更新
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sentences_read = 0, minutes_read = 0 } = body;

  const today = getTodayDate();
  const yesterday = getYesterdayDate();

  // 今日のレコードを取得
  const { data: todayStats } = await supabase
    .from("daily_stats")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  // 昨日のレコードを取得（ストリーク計算用）
  const { data: yesterdayStats } = await supabase
    .from("daily_stats")
    .select("streak_days")
    .eq("user_id", userId)
    .eq("date", yesterday)
    .single();

  let newStreak = 1; // デフォルトは1日目

  if (todayStats) {
    // 今日既にレコードがある場合は更新
    newStreak = todayStats.streak_days; // ストリークは維持

    const { error } = await supabase
      .from("daily_stats")
      .update({
        sentences_read: todayStats.sentences_read + sentences_read,
        minutes_read: todayStats.minutes_read + minutes_read,
      })
      .eq("user_id", userId)
      .eq("date", today);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // 今日のレコードがない場合は新規作成
    if (yesterdayStats) {
      // 昨日のレコードがあればストリーク継続
      newStreak = yesterdayStats.streak_days + 1;
    }

    const { error } = await supabase.from("daily_stats").insert({
      user_id: userId,
      date: today,
      sentences_read,
      minutes_read,
      streak_days: newStreak,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    streak_days: newStreak,
    date: today,
  });
}
