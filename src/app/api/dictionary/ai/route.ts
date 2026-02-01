import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = "gemini-2.0-flash";

// service_roleでキャッシュ読み書き（RLSバイパス）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { word, sentenceId, sentenceText } = await request.json();

    if (!word || !sentenceId) {
      return NextResponse.json(
        { error: "word and sentenceId are required" },
        { status: 400 }
      );
    }

    // 1. キャッシュ確認
    const { data: cached } = await supabase
      .from("ai_dictionary_cache")
      .select("response_ja")
      .eq("word", word)
      .eq("sentence_id", sentenceId)
      .single();

    if (cached) {
      return NextResponse.json({
        response_ja: (cached as { response_ja: string }).response_ja,
        cached: true,
      });
    }

    // 2. Gemini API に問い合わせ
    const prompt = `あなたは英語学習者向けの辞書アシスタントです。

以下の英文中の単語「${word}」について、この文脈に合った説明を日本語で簡潔に提供してください。

英文: "${sentenceText}"
単語: "${word}"

以下の形式で回答してください（各項目1〜2行）:
■ この文脈での意味:
■ ニュアンス:
■ 例文: （別の使用例を1つ）`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 500 },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const responseJa: string = data.candidates[0].content.parts[0].text;

    // 3. キャッシュに保存
    await supabase.from("ai_dictionary_cache").insert({
      word,
      sentence_id: sentenceId,
      response_ja: responseJa,
    });

    return NextResponse.json({ response_ja: responseJa, cached: false });
  } catch (error) {
    console.error("AI Dictionary error:", error);
    return NextResponse.json(
      { error: "AI辞書の取得に失敗しました" },
      { status: 500 }
    );
  }
}
