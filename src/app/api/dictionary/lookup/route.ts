import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = "gemini-2.0-flash";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { word, sentenceText } = await request.json();

    if (!word) {
      return NextResponse.json(
        { error: "word is required" },
        { status: 400 }
      );
    }

    const normalizedWord = word.toLowerCase().replace(/[^a-z'-]/g, "");

    // 1. word_entries を検索
    const { data: existing } = await supabase
      .from("word_entries")
      .select("id, word, meaning_ja, pos, pronunciation")
      .eq("word", normalizedWord)
      .single();

    if (existing) {
      const entry = existing as {
        id: string;
        word: string;
        meaning_ja: string;
        pos: string;
        pronunciation: string | null;
      };
      return NextResponse.json({ entry, generated: false });
    }

    // 2. word_entries にない → Gemini で生成
    const prompt = `英単語「${normalizedWord}」の辞書情報を返してください。
${sentenceText ? `この単語は次の英文で使われています: "${sentenceText}"` : ""}

必ず以下のJSON形式のみを出力してください。コードブロックや説明文は不要です。
{"meaning_ja":"日本語の意味（簡潔に）","pos":"名詞/動詞/形容詞/副詞/前置詞/接続詞/その他のいずれか","pronunciation":"発音記号（IPA）"}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 200,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const rawText: string = data.candidates[0].content.parts[0].text;

    // JSON部分を抽出
    let jsonStr = rawText.trim();
    // コードブロックで囲まれている場合を除去
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }
    // それでもJSONでなければ { } を探す
    if (!jsonStr.startsWith("{")) {
      const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!braceMatch) {
        throw new Error(`Gemini response is not valid JSON: ${rawText.slice(0, 100)}`);
      }
      jsonStr = braceMatch[0];
    }

    const parsed = JSON.parse(jsonStr) as {
      meaning_ja: string;
      pos: string;
      pronunciation: string;
    };

    // 3. word_entries に登録
    const { data: inserted, error } = await supabase
      .from("word_entries")
      .insert({
        word: normalizedWord,
        meaning_ja: parsed.meaning_ja,
        pos: parsed.pos,
        pronunciation: parsed.pronunciation,
      })
      .select("id, word, meaning_ja, pos, pronunciation")
      .single();

    if (error) {
      // 競合（他のリクエストが先に登録した場合）→ 再取得
      const { data: retry } = await supabase
        .from("word_entries")
        .select("id, word, meaning_ja, pos, pronunciation")
        .eq("word", normalizedWord)
        .single();

      if (retry) {
        return NextResponse.json({ entry: retry, generated: false });
      }
      throw new Error(`word_entries insert failed: ${error.message}`);
    }

    return NextResponse.json({ entry: inserted, generated: true });
  } catch (error) {
    console.error("Dictionary lookup error:", error);
    return NextResponse.json(
      { error: "辞書の取得に失敗しました" },
      { status: 500 }
    );
  }
}
