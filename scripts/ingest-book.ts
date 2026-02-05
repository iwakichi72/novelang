/**
 * 作品データ投入パイプライン
 *
 * 使い方:
 *   npx tsx scripts/ingest-book.ts                  # スタブ翻訳（AWS不要）
 *   npx tsx scripts/ingest-book.ts --translate       # Bedrock翻訳（AWS認証必要）
 *
 * 処理フロー:
 *   1. Project Gutenbergから英語原文テキストを取得
 *   2. テキストをクリーンアップ（ヘッダー/フッター除去）
 *   3. 章に分割 → 文に分割
 *   4. 日本語訳を生成（--translate: Bedrock Haiku / デフォルト: スタブ）
 *   5. Supabaseに books / chapters / sentences を格納
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

// ---------- 設定 ----------

const USE_LLM_TRANSLATION = process.argv.includes("--translate");

const GUTENBERG_BOOKS = [
  {
    url: "https://www.gutenberg.org/cache/epub/902/pg902.txt",
    title_en: "The Happy Prince",
    title_ja: "幸福な王子",
    author_en: "Oscar Wilde",
    author_ja: "オスカー・ワイルド",
    description_ja:
      "街を見下ろす幸福な王子の像と、南へ渡るツバメの物語。王子は自らの宝石や金箔を貧しい人々に届けてほしいとツバメに頼む。自己犠牲と愛の美しい寓話。",
    cefr_level: "B1",
    story_title: "The Happy Prince",
    next_story_title: "The Nightingale and the Rose",
  },
];

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const BATCH_SIZE = 50; // DeepLは一括送信可能なのでバッチサイズを大きく

// ---------- Supabase ----------

// service_roleキーでRLSバイパス（スクリプト専用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ---------- テキスト取得・クリーンアップ ----------

async function fetchGutenbergText(url: string): Promise<string> {
  console.log(`📥 Gutenbergからテキスト取得: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.text();
}

function extractStory(
  fullText: string,
  storyTitle: string,
  nextStoryTitle?: string
): string {
  const startMarker = `*** START OF THE PROJECT GUTENBERG EBOOK`;
  const endMarker = `*** END OF THE PROJECT GUTENBERG EBOOK`;
  let text = fullText;

  const startIdx = text.indexOf(startMarker);
  if (startIdx !== -1) {
    text = text.slice(text.indexOf("\n", startIdx) + 1);
  }
  const endIdx = text.indexOf(endMarker);
  if (endIdx !== -1) {
    text = text.slice(0, endIdx);
  }

  // タイトル行を探す（"The Happy Prince." のようにピリオド付きの場合も）
  const titleRegex = new RegExp(`^\\s*${storyTitle}\\.?\\s*$`, "mi");
  const titleMatch = text.match(titleRegex);
  if (titleMatch && titleMatch.index !== undefined) {
    // タイトル行の次の行から開始
    const afterTitle = text.indexOf("\n", titleMatch.index);
    text = text.slice(afterTitle + 1);

    // 次の話のタイトルで切る
    if (nextStoryTitle) {
      const nextRegex = new RegExp(`^\\s*${nextStoryTitle}\\.?\\s*$`, "mi");
      const nextMatch = text.match(nextRegex);
      if (nextMatch && nextMatch.index !== undefined) {
        text = text.slice(0, nextMatch.index);
      }
    }
  }

  return text.trim();
}

// ---------- 文分割 ----------

function splitIntoSentences(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 10);

  const sentences: string[] = [];
  for (const para of paragraphs) {
    const parts = para.match(/[^.!?]*[.!?]+["'\u201D\u2019]?\s*/g) || [para];
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.length > 3) {
        sentences.push(trimmed);
      }
    }
  }
  return sentences;
}

// ---------- 翻訳 ----------

/**
 * スタブ翻訳: AWS不要。プレースホルダーの日本語を返す。
 * 後で --translate フラグ付きで再実行すればLLM翻訳に差し替え可能。
 */
function stubTranslate(sentences: string[]): string[] {
  return sentences.map((s) => `【未翻訳】${s}`);
}

/**
 * DeepL API で翻訳（--translate フラグ時のみ使用）
 * DEEPL_API_KEY が .env.local に必要。
 */
async function translateBatchWithDeepL(sentences: string[]): Promise<string[]> {
  if (!DEEPL_API_KEY) {
    throw new Error("DEEPL_API_KEY が .env.local に設定されていません");
  }

  // DeepL Free API: https://api-free.deepl.com
  // DeepL Pro API: https://api.deepl.com
  const baseUrl = DEEPL_API_KEY.endsWith(":fx")
    ? "https://api-free.deepl.com"
    : "https://api.deepl.com";

  const res = await fetch(`${baseUrl}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: sentences,
      source_lang: "EN",
      target_lang: "JA",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepL API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return (data.translations as { text: string }[]).map((t) => t.text);
}

// ---------- DB格納 ----------

async function insertBook(
  bookConfig: (typeof GUTENBERG_BOOKS)[0],
  sentenceCount: number,
  wordCount: number
) {
  const { data, error } = await supabase
    .from("books")
    .insert({
      title_en: bookConfig.title_en,
      title_ja: bookConfig.title_ja,
      author_en: bookConfig.author_en,
      author_ja: bookConfig.author_ja,
      description_ja: bookConfig.description_ja,
      cefr_level: bookConfig.cefr_level,
      genre_tags: ["fairy tale", "classic"],
      total_chapters: 1,
      total_sentences: sentenceCount,
      total_words: wordCount,
      license_type: "PUBLIC_DOMAIN",
      source_url: bookConfig.url,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Book insert failed: ${error.message}`);
  return (data as { id: string }).id;
}

async function insertChapter(
  bookId: string,
  chapterNumber: number,
  titleEn: string,
  titleJa: string,
  sentenceCount: number,
  wordCount: number
) {
  const { data, error } = await supabase
    .from("chapters")
    .insert({
      book_id: bookId,
      chapter_number: chapterNumber,
      title_en: titleEn,
      title_ja: titleJa,
      sentence_count: sentenceCount,
      word_count: wordCount,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Chapter insert failed: ${error.message}`);
  return (data as { id: string }).id;
}

async function insertSentences(
  chapterId: string,
  sentences: {
    text_en: string;
    text_ja: string;
    position: number;
    word_count: number;
  }[]
) {
  const rows = sentences.map((s) => ({
    chapter_id: chapterId,
    position: s.position,
    text_en: s.text_en,
    text_ja: s.text_ja,
    difficulty_score: estimateDifficulty(s.text_en),
    word_count: s.word_count,
    cefr_estimate: estimateCefr(s.text_en),
  }));

  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from("sentences").insert(batch);
    if (error)
      throw new Error(`Sentence insert failed at batch ${i}: ${error.message}`);
  }
}

// ---------- 簡易難易度推定 ----------

function estimateDifficulty(text: string): number {
  const words = text.split(/\s+/);
  const avgWordLen =
    words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, "").length, 0) /
    words.length;
  const sentenceLen = words.length;
  const lenScore = Math.min(sentenceLen / 30, 1.0);
  const wordScore = Math.min((avgWordLen - 3) / 5, 1.0);
  return Math.round((lenScore * 0.6 + wordScore * 0.4) * 100) / 100;
}

function estimateCefr(text: string): string {
  const score = estimateDifficulty(text);
  if (score < 0.2) return "A1";
  if (score < 0.35) return "A2";
  if (score < 0.5) return "B1";
  if (score < 0.7) return "B2";
  if (score < 0.85) return "C1";
  return "C2";
}

// ---------- メイン ----------

async function main() {
  const bookConfig = GUTENBERG_BOOKS[0];
  console.log(`\n📚 パイプライン開始: ${bookConfig.title_en}`);
  console.log(
    `   翻訳モード: ${USE_LLM_TRANSLATION ? "🌐 DeepL API" : "📝 スタブ（【未翻訳】プレフィックス付き）"}\n`
  );

  // 0. 既存データ削除（同じタイトルの作品があれば削除）
  const { data: existingBooks } = await supabase
    .from("books")
    .select("id")
    .eq("title_en", bookConfig.title_en);

  if (existingBooks && existingBooks.length > 0) {
    for (const eb of existingBooks) {
      const bookId = (eb as { id: string }).id;
      // sentences → chapters → reading_progress → book の順で削除
      const { data: chapters } = await supabase
        .from("chapters")
        .select("id")
        .eq("book_id", bookId);
      if (chapters) {
        const chapterIds = chapters.map((c) => (c as { id: string }).id);
        await supabase.from("sentences").delete().in("chapter_id", chapterIds);
      }
      await supabase.from("chapters").delete().eq("book_id", bookId);
      await supabase.from("reading_progress").delete().eq("book_id", bookId);
      await supabase.from("books").delete().eq("id", bookId);
      console.log(`🗑️ 既存データ削除: ${bookId}`);
    }
  }

  // 1. テキスト取得
  const fullText = await fetchGutenbergText(bookConfig.url);
  console.log(`   テキスト取得完了: ${fullText.length}文字`);

  // 2. ストーリー抽出
  const storyText = extractStory(fullText, bookConfig.story_title, bookConfig.next_story_title);
  console.log(`   ストーリー抽出完了: ${storyText.length}文字`);

  // 3. 文分割
  const englishSentences = splitIntoSentences(storyText);
  const totalWords = englishSentences.reduce(
    (sum, s) => sum + s.split(/\s+/).length,
    0
  );
  console.log(`   文分割完了: ${englishSentences.length}文, ${totalWords}語\n`);

  // 4. 翻訳
  const japaneseSentences: string[] = [];

  if (USE_LLM_TRANSLATION) {
    console.log(
      `🔄 DeepL翻訳開始（${Math.ceil(englishSentences.length / BATCH_SIZE)}バッチ）`
    );
    for (let i = 0; i < englishSentences.length; i += BATCH_SIZE) {
      const batch = englishSentences.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(englishSentences.length / BATCH_SIZE);
      process.stdout.write(`   バッチ ${batchNum}/${totalBatches}...`);

      const translations = await translateBatchWithDeepL(batch);
      japaneseSentences.push(...translations);
      console.log(` ✅ (${translations.length}文)`);

      if (i + BATCH_SIZE < englishSentences.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  } else {
    console.log(`📝 スタブ翻訳を使用`);
    japaneseSentences.push(...stubTranslate(englishSentences));
  }

  console.log(`\n✅ 翻訳完了: ${japaneseSentences.length}文\n`);

  // 5. DB格納
  console.log(`💾 DB格納開始`);

  const bookId = await insertBook(
    bookConfig,
    englishSentences.length,
    totalWords
  );
  console.log(`   Book作成: ${bookId}`);

  const chapterId = await insertChapter(
    bookId,
    1,
    bookConfig.title_en,
    bookConfig.title_ja,
    englishSentences.length,
    totalWords
  );
  console.log(`   Chapter作成: ${chapterId}`);

  const sentenceData = englishSentences.map((text_en, i) => ({
    text_en,
    text_ja: japaneseSentences[i],
    position: i + 1,
    word_count: text_en.split(/\s+/).length,
  }));

  await insertSentences(chapterId, sentenceData);
  console.log(`   Sentences作成: ${sentenceData.length}件`);

  console.log(`\n🎉 完了！ ${bookConfig.title_en} を投入しました`);
  console.log(`   Book ID: ${bookId}`);
  console.log(`   文数: ${englishSentences.length}`);
  console.log(`   語数: ${totalWords}`);
  console.log(
    `\n💡 ${USE_LLM_TRANSLATION ? "" : "翻訳を更新するには: npx tsx scripts/ingest-book.ts --translate"}`
  );
}

main().catch((err) => {
  console.error("❌ エラー:", err);
  process.exit(1);
});
