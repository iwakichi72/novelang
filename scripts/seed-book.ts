/**
 * 作品データ投入スクリプト
 *
 * Project Gutenberg のテキストを取得し、章・文に分割して
 * Supabase に投入する。
 *
 * 使い方:
 *   npx tsx scripts/seed-book.ts
 *
 * 前提: .env.local に NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY を設定済み
 *       Supabase の SQL Editor で 001_initial_schema.sql を実行済み
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- MVP用サンプル作品定義 ---

type BookDef = {
  title_en: string;
  title_ja: string;
  author_en: string;
  author_ja: string;
  cefr_level: string;
  genre_tags: string[];
  gutenberg_url: string;
  description_ja: string;
};

const BOOKS: BookDef[] = [
  {
    title_en: "The Happy Prince",
    title_ja: "幸福の王子",
    author_en: "Oscar Wilde",
    author_ja: "オスカー・ワイルド",
    cefr_level: "A2",
    genre_tags: ["fairy_tale", "classic"],
    gutenberg_url:
      "https://www.gutenberg.org/cache/epub/902/pg902.txt",
    description_ja:
      "金箔に覆われた王子の像とツバメの心温まる物語。自己犠牲と愛について描いた短編。",
  },
  {
    title_en: "The Gift of the Magi",
    title_ja: "賢者の贈り物",
    author_en: "O. Henry",
    author_ja: "オー・ヘンリー",
    cefr_level: "B1",
    genre_tags: ["short_story", "classic"],
    gutenberg_url:
      "https://www.gutenberg.org/files/7256/7256-0.txt",
    description_ja:
      "貧しい若い夫婦が互いへのクリスマスプレゼントのために大切なものを手放す、愛の物語。",
  },
];

// --- テキスト処理 ---

/** Gutenbergテキストから本文を抽出（ヘッダー/フッターを除去） */
function extractBody(raw: string): string {
  const startMarkers = [
    "*** START OF THE PROJECT GUTENBERG EBOOK",
    "*** START OF THIS PROJECT GUTENBERG EBOOK",
    "*END*THE SMALL PRINT",
  ];
  const endMarkers = [
    "*** END OF THE PROJECT GUTENBERG EBOOK",
    "*** END OF THIS PROJECT GUTENBERG EBOOK",
    "End of the Project Gutenberg EBook",
    "End of Project Gutenberg",
  ];

  let text = raw;

  for (const marker of startMarkers) {
    const idx = text.indexOf(marker);
    if (idx !== -1) {
      const lineEnd = text.indexOf("\n", idx);
      text = text.slice(lineEnd + 1);
      break;
    }
  }

  for (const marker of endMarkers) {
    const idx = text.indexOf(marker);
    if (idx !== -1) {
      text = text.slice(0, idx);
      break;
    }
  }

  return text.trim();
}

/** テキストを章に分割。簡易的にCHAPTERやローマ数字の見出しで分割 */
function splitChapters(
  text: string
): { title: string; body: string }[] {
  // 章区切りパターン: "CHAPTER I", "I.", "THE HAPPY PRINCE" 等
  // 短編の場合は章分割がないので、全体を1章として扱う
  const chapterPattern =
    /^(CHAPTER\s+[IVXLCDM\d]+\.?.*|[IVXLCDM]+\.\s*.*)$/gim;
  const matches = [...text.matchAll(chapterPattern)];

  if (matches.length === 0) {
    // 章分割なし → 全体を1章
    return [{ title: "Chapter 1", body: text.trim() }];
  }

  const chapters: { title: string; body: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const body = text.slice(start, end).trim();
    if (body.length > 100) {
      chapters.push({
        title: matches[i][0].trim(),
        body,
      });
    }
  }

  // 章が見つからなかった場合のフォールバック
  if (chapters.length === 0) {
    return [{ title: "Chapter 1", body: text.trim() }];
  }

  return chapters;
}

/** テキストを文に分割 */
function splitSentences(text: string): string[] {
  // 段落内の改行を除去してから文分割
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n\n") // 段落区切りは保持
    .replace(/(?<!\n)\n(?!\n)/g, " ") // 段落内改行をスペースに
    .replace(/\s+/g, " ");

  // 文分割: ピリオド、疑問符、感嘆符の後にスペース+大文字
  const sentences = normalized
    .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences;
}

/** 簡易的な難易度スコア（0.0〜1.0） */
function calcDifficulty(sentence: string): number {
  const words = sentence.split(/\s+/);
  const wordCount = words.length;
  const avgWordLength =
    words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, "").length, 0) /
    wordCount;

  // 文長スコア (0-1): 20語以上で1.0
  const lengthScore = Math.min(wordCount / 20, 1.0);
  // 単語の平均長スコア (0-1): 8文字以上で1.0
  const wordLengthScore = Math.min(avgWordLength / 8, 1.0);

  // 加重平均
  const score = lengthScore * 0.6 + wordLengthScore * 0.4;
  return Math.round(score * 100) / 100;
}

function estimateCefr(difficulty: number): string {
  if (difficulty < 0.25) return "A1";
  if (difficulty < 0.4) return "A2";
  if (difficulty < 0.55) return "B1";
  if (difficulty < 0.7) return "B2";
  if (difficulty < 0.85) return "C1";
  return "C2";
}

// --- 仮の日本語訳（MVP: プレースホルダー。本番ではLLMバッチ翻訳） ---

function placeholderTranslation(en: string): string {
  // MVPでは "[JA] 原文..." という形式で仮置き
  // 本番では別途 LLM で翻訳バッチを走らせる
  return `[翻訳] ${en.slice(0, 50)}...`;
}

// --- メイン ---

async function seedBook(bookDef: BookDef) {
  console.log(`\n📖 Processing: ${bookDef.title_en}`);

  // 1. テキスト取得
  console.log("  Fetching text from Gutenberg...");
  const res = await fetch(bookDef.gutenberg_url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const raw = await res.text();
  const body = extractBody(raw);
  console.log(`  Body length: ${body.length} chars`);

  // 2. 章分割
  const chapters = splitChapters(body);
  console.log(`  Chapters: ${chapters.length}`);

  // 3. 各章を文に分割
  let totalSentences = 0;
  let totalWords = 0;
  const chapterData: {
    title: string;
    sentences: { text_en: string; text_ja: string; difficulty: number; cefr: string; wordCount: number }[];
  }[] = [];

  for (const ch of chapters) {
    const sentences = splitSentences(ch.body);
    const sentenceData = sentences.map((s) => {
      const difficulty = calcDifficulty(s);
      const wordCount = s.split(/\s+/).length;
      totalWords += wordCount;
      return {
        text_en: s,
        text_ja: placeholderTranslation(s),
        difficulty,
        cefr: estimateCefr(difficulty),
        wordCount,
      };
    });
    totalSentences += sentenceData.length;
    chapterData.push({ title: ch.title, sentences: sentenceData });
  }

  console.log(`  Total sentences: ${totalSentences}, words: ${totalWords}`);

  // 4. DB投入
  // 4a. Book
  const { data: book, error: bookErr } = await supabase
    .from("books")
    .insert({
      title_en: bookDef.title_en,
      title_ja: bookDef.title_ja,
      author_en: bookDef.author_en,
      author_ja: bookDef.author_ja,
      description_ja: bookDef.description_ja,
      cefr_level: bookDef.cefr_level,
      genre_tags: bookDef.genre_tags,
      total_chapters: chapterData.length,
      total_sentences: totalSentences,
      total_words: totalWords,
      license_type: "PUBLIC_DOMAIN",
      source_url: bookDef.gutenberg_url,
    })
    .select()
    .single();

  if (bookErr) throw new Error(`Book insert error: ${bookErr.message}`);
  console.log(`  Book inserted: ${book.id}`);

  // 4b. Chapters + Sentences
  for (let i = 0; i < chapterData.length; i++) {
    const ch = chapterData[i];
    const { data: chapter, error: chErr } = await supabase
      .from("chapters")
      .insert({
        book_id: book.id,
        chapter_number: i + 1,
        title_en: ch.title,
        title_ja: "", // 後で翻訳
        sentence_count: ch.sentences.length,
        word_count: ch.sentences.reduce((sum, s) => sum + s.wordCount, 0),
      })
      .select()
      .single();

    if (chErr) throw new Error(`Chapter insert error: ${chErr.message}`);

    // Sentences（バッチ挿入）
    const sentenceRows = ch.sentences.map((s, j) => ({
      chapter_id: chapter.id,
      position: j + 1,
      text_en: s.text_en,
      text_ja: s.text_ja,
      difficulty_score: s.difficulty,
      word_count: s.wordCount,
      cefr_estimate: s.cefr,
    }));

    // Supabaseは1回のinsertで最大1000行
    const BATCH_SIZE = 500;
    for (let b = 0; b < sentenceRows.length; b += BATCH_SIZE) {
      const batch = sentenceRows.slice(b, b + BATCH_SIZE);
      const { error: sErr } = await supabase.from("sentences").insert(batch);
      if (sErr) throw new Error(`Sentence insert error: ${sErr.message}`);
    }

    console.log(`  Chapter ${i + 1}: ${ch.sentences.length} sentences`);
  }

  console.log(`✅ Done: ${bookDef.title_en}`);
}

async function main() {
  console.log("=== Novelang Book Seeder ===");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("❌ .env.local にSupabaseの環境変数を設定してください");
    console.error("   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  for (const bookDef of BOOKS) {
    try {
      await seedBook(bookDef);
    } catch (err) {
      console.error(`❌ Error processing ${bookDef.title_en}:`, err);
    }
  }

  console.log("\n=== Complete ===");
}

main();
