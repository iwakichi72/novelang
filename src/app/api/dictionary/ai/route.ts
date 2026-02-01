import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const BEDROCK_MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0";
const BEDROCK_REGION = "us-east-1";

// service_roleでキャッシュ読み書き（RLSバイパス）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION });

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

    // 2. Bedrock Claude Haiku に問い合わせ
    const prompt = `あなたは英語学習者向けの辞書アシスタントです。

以下の英文中の単語「${word}」について、この文脈に合った説明を日本語で簡潔に提供してください。

英文: "${sentenceText}"
単語: "${word}"

以下の形式で回答してください（各項目1〜2行）:
■ この文脈での意味:
■ ニュアンス:
■ 例文: （別の使用例を1つ）`;

    const body = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const command = new InvokeModelCommand({
      modelId: BEDROCK_MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body,
    });

    const response = await bedrock.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    const responseJa: string = result.content[0].text;

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
