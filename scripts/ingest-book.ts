/**
 * 作品データ投入パイプライン
 *
 * 使い方:
 *   npx tsx scripts/ingest-book.ts                  # スタブ翻訳（API不要）
 *   npx tsx scripts/ingest-book.ts --translate       # DeepL翻訳（DEEPL_API_KEY必要）
 *
 * 処理フロー:
 *   1. Project Gutenbergから英語原文テキストを取得
 *   2. テキストをクリーンアップ（ヘッダー/フッター/装飾除去）
 *   3. 各ストーリーを抽出 → 文に分割
 *   4. 日本語訳を生成（--translate: DeepL / デフォルト: スタブ）
 *   5. Supabaseに books / chapters / sentences を格納
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

// ---------- 型定義 ----------

type StoryConfig = { title_en: string; title_ja: string };

type BookConfig = {
  url: string;
  title_en: string;
  title_ja: string;
  author_en: string;
  author_ja: string;
  description_ja: string;
  cefr_level: string;
  stories: StoryConfig[];
  skip_first_title_occurrence?: boolean;
};

// ---------- 設定 ----------

const USE_LLM_TRANSLATION = process.argv.includes("--translate");

const GUTENBERG_BOOKS: BookConfig[] = [
  {
    url: "https://www.gutenberg.org/ebooks/11.txt.utf-8",
    title_en: "Alice's Adventures in Wonderland",
    title_ja: "不思議の国のアリス",
    author_en: "Lewis Carroll",
    author_ja: "ルイス・キャロル",
    description_ja:
      "白ウサギを追って不思議の国に迷い込んだ少女アリスが、奇妙な住人たちと出会うナンセンスで幻想的な冒険譚。",
    cefr_level: "A2",
    skip_first_title_occurrence: true,
    stories: [
      { title_en: "CHAPTER I. Down the Rabbit-Hole", title_ja: "第1章 うさぎ穴へ" },
      { title_en: "CHAPTER II. The Pool of Tears", title_ja: "第2章 涙の池" },
      {
        title_en: "CHAPTER III. A Caucus-Race and a Long Tale",
        title_ja: "第3章 コーカス競走と長い話",
      },
      {
        title_en: "CHAPTER IV. The Rabbit Sends in a Little Bill",
        title_ja: "第4章 ウサギが小さなビルを送り込む",
      },
      {
        title_en: "CHAPTER V. Advice from a Caterpillar",
        title_ja: "第5章 イモムシの忠告",
      },
      { title_en: "CHAPTER VI. Pig and Pepper", title_ja: "第6章 子豚と胡椒" },
      {
        title_en: "CHAPTER VII. A Mad Tea-Party",
        title_ja: "第7章 狂ったお茶会",
      },
      {
        title_en: "CHAPTER VIII. The Queen’s Croquet-Ground",
        title_ja: "第8章 女王のクロッケー場",
      },
      {
        title_en: "CHAPTER IX. The Mock Turtle’s Story",
        title_ja: "第9章 にせウミガメの話",
      },
      {
        title_en: "CHAPTER X. The Lobster Quadrille",
        title_ja: "第10章 ロブスターのカドリーユ",
      },
      {
        title_en: "CHAPTER XI. Who Stole the Tarts?",
        title_ja: "第11章 タルトを盗んだのは誰？",
      },
      {
        title_en: "CHAPTER XII. Alice’s Evidence",
        title_ja: "第12章 アリスの証言",
      },
    ],
  },
  {
    url: "https://www.gutenberg.org/ebooks/7256.txt.utf-8",
    title_en: "The Gift of the Magi",
    title_ja: "賢者の贈り物",
    author_en: "O. Henry",
    author_ja: "オー・ヘンリー",
    description_ja:
      "貧しい若い夫婦が互いに秘密の贈り物を用意しようとする中で起こる、愛と犠牲のアイロニーを描いた短編。",
    cefr_level: "B1",
    stories: [{ title_en: "The Gift of the Magi", title_ja: "賢者の贈り物" }],
  },
  {
    url: "https://www.gutenberg.org/cache/epub/902/pg902.txt",
    title_en: "The Happy Prince and Other Tales",
    title_ja: "幸福な王子と他のお話",
    author_en: "Oscar Wilde",
    author_ja: "オスカー・ワイルド",
    description_ja:
      "オスカー・ワイルドの珠玉の童話集。自己犠牲と愛を描く「幸福な王子」、真の愛の代償を問う「ナイチンゲールとバラ」など、美しくも切ない5つの物語。",
    cefr_level: "B1",
    skip_first_title_occurrence: true,
    stories: [
      { title_en: "The Happy Prince", title_ja: "幸福な王子" },
      {
        title_en: "The Nightingale and the Rose",
        title_ja: "ナイチンゲールとバラ",
      },
      { title_en: "The Selfish Giant", title_ja: "わがままな大男" },
      { title_en: "The Devoted Friend", title_ja: "忠実な友" },
      { title_en: "The Remarkable Rocket", title_ja: "すばらしいロケット花火" },
    ],
  },
];

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const BATCH_SIZE = 50;

// ---------- Supabase ----------

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ---------- テキスト取得・クリーンアップ ----------

async function fetchGutenbergText(url: string): Promise<string> {
  console.log(`📥 Gutenbergからテキスト取得: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.text();
}

/** 正規表現の特殊文字をエスケープ */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTitleRegex(title: string, global = false): RegExp {
  const escaped = escapeRegex(title).replace(/\s+/g, "\\s+");
  return new RegExp(`${escaped}\\.?`, global ? "gmi" : "mi");
}

/**
 * Gutenbergテキストから全ストーリーを抽出する。
 * 各ストーリーはタイトル行（ピリオド付き）で区切られる。
 */
function extractAllStories(
  fullText: string,
  stories: StoryConfig[],
  options?: { skipFirstTitleOccurrence?: boolean }
): { title_en: string; title_ja: string; text: string }[] {
  const startMarker = `*** START OF THE PROJECT GUTENBERG EBOOK`;
  const endMarker = `*** END OF THE PROJECT GUTENBERG EBOOK`;
  let text = fullText;

  // Gutenbergヘッダー/フッター除去
  const startIdx = text.indexOf(startMarker);
  if (startIdx !== -1) {
    text = text.slice(text.indexOf("\n", startIdx) + 1);
  }
  const endIdx = text.indexOf(endMarker);
  if (endIdx !== -1) {
    text = text.slice(0, endIdx);
  }

  // [Picture: ...] / [Illustration] 装飾行を除去（先頭にスペースがある場合も対応）
  text = text.replace(/\[(?:Picture|Illustration)[^\]]*\]/g, "");

  if (options?.skipFirstTitleOccurrence && stories.length > 0) {
    const firstTitleRegex = buildTitleRegex(stories[0].title_en, true);
    const firstMatch = firstTitleRegex.exec(text);
    if (firstMatch) {
      const secondMatch = firstTitleRegex.exec(text);
      if (secondMatch && secondMatch.index !== undefined) {
        text = text.slice(secondMatch.index);
      }
    }
  }

  const results: { title_en: string; title_ja: string; text: string }[] = [];

  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    const nextStory = stories[i + 1];

    const titleRegex = buildTitleRegex(story.title_en);
    const titleMatch = text.match(titleRegex);
    if (!titleMatch || titleMatch.index === undefined) {
      console.warn(
        `  ⚠️ ストーリー「${story.title_en}」がテキスト内に見つかりません`
      );
      continue;
    }

    const startIndex = titleMatch.index + titleMatch[0].length;
    let storyText = text.slice(startIndex).replace(/^\s+/, "");

    // 次のストーリーのタイトルで切る
    if (nextStory) {
      const nextRegex = buildTitleRegex(nextStory.title_en);
      const nextMatch = storyText.match(nextRegex);
      if (nextMatch && nextMatch.index !== undefined) {
        storyText = storyText.slice(0, nextMatch.index);
      }
    }

    // 最後のストーリーのみ: 末尾の印刷所情報や区切り線を除去
    if (!nextStory) {
      storyText = storyText.replace(/\*\s*\*\s*\*\s*\*\s*\*[\s\S]*$/, "");
    }

    results.push({
      title_en: story.title_en,
      title_ja: story.title_ja,
      text: storyText.trim(),
    });
  }

  return results;
}

/**
 * 後方互換: 単一ストーリー抽出（旧インターフェース）
 */
function extractStory(
  fullText: string,
  storyTitle: string,
  nextStoryTitle?: string
): string {
  const stories: StoryConfig[] = [{ title_en: storyTitle, title_ja: "" }];
  if (nextStoryTitle) {
    stories.push({ title_en: nextStoryTitle, title_ja: "" });
  }
  const results = extractAllStories(fullText, stories);
  return results.length > 0 ? results[0].text : "";
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

function stubTranslate(sentences: string[]): string[] {
  return sentences.map((s) => `【未翻訳】${s}`);
}

async function translateBatchWithDeepL(
  sentences: string[]
): Promise<string[]> {
  if (!DEEPL_API_KEY) {
    throw new Error("DEEPL_API_KEY が .env.local に設定されていません");
  }

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

async function insertBook(bookConfig: BookConfig, sentenceCount: number, wordCount: number) {
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
      total_chapters: bookConfig.stories.length,
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

  // 0. 既存データ削除（CASCADE DELETEで関連データも自動削除）
  // 新タイトル + 旧タイトル（各ストーリー名）を両方検索して削除
  const titlesToDelete = [
    bookConfig.title_en,
    ...bookConfig.stories.map((s) => s.title_en),
  ];
  for (const title of titlesToDelete) {
    const { data: existingBooks } = await supabase
      .from("books")
      .select("id")
      .eq("title_en", title);
    if (existingBooks && existingBooks.length > 0) {
      for (const eb of existingBooks) {
        const bookId = (eb as { id: string }).id;
        await supabase.from("books").delete().eq("id", bookId);
        console.log(`🗑️ 既存データ削除: ${bookId} (${title})`);
      }
    }
  }

  // 1. テキスト取得
  const fullText = await fetchGutenbergText(bookConfig.url);
  console.log(`   テキスト取得完了: ${fullText.length}文字`);

  // 2. 全ストーリー抽出
  const stories = extractAllStories(fullText, bookConfig.stories, {
    skipFirstTitleOccurrence: bookConfig.skip_first_title_occurrence,
  });
  console.log(`   ストーリー抽出完了: ${stories.length}話\n`);

  // 3. 各ストーリーの文分割
  const chaptersData = stories.map((story, idx) => {
    const sentences = splitIntoSentences(story.text);
    const wordCount = sentences.reduce(
      (sum, s) => sum + s.split(/\s+/).length,
      0
    );
    console.log(
      `   第${idx + 1}話「${story.title_en}」: ${sentences.length}文, ${wordCount}語`
    );
    return { ...story, sentences, wordCount, chapterNumber: idx + 1 };
  });

  const totalSentences = chaptersData.reduce(
    (sum, ch) => sum + ch.sentences.length,
    0
  );
  const totalWords = chaptersData.reduce(
    (sum, ch) => sum + ch.wordCount,
    0
  );
  console.log(`\n   合計: ${totalSentences}文, ${totalWords}語\n`);

  // 4. 翻訳（全ストーリーの文を連結して一括翻訳）
  const allEnglishSentences = chaptersData.flatMap((ch) => ch.sentences);
  let allJapaneseSentences: string[];

  if (USE_LLM_TRANSLATION) {
    console.log(
      `🔄 DeepL翻訳開始（${Math.ceil(allEnglishSentences.length / BATCH_SIZE)}バッチ）`
    );
    allJapaneseSentences = [];
    for (let i = 0; i < allEnglishSentences.length; i += BATCH_SIZE) {
      const batch = allEnglishSentences.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allEnglishSentences.length / BATCH_SIZE);
      process.stdout.write(`   バッチ ${batchNum}/${totalBatches}...`);
      const translations = await translateBatchWithDeepL(batch);
      allJapaneseSentences.push(...translations);
      console.log(` ✅ (${translations.length}文)`);
      if (i + BATCH_SIZE < allEnglishSentences.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  } else {
    console.log(`📝 スタブ翻訳を使用`);
    allJapaneseSentences = stubTranslate(allEnglishSentences);
  }

  console.log(`\n✅ 翻訳完了: ${allJapaneseSentences.length}文\n`);

  // 5. DB格納
  console.log(`💾 DB格納開始`);

  const bookId = await insertBook(bookConfig, totalSentences, totalWords);
  console.log(`   Book作成: ${bookId}`);

  // 翻訳結果を各チャプターに振り分けながら格納
  let translationOffset = 0;
  for (const chData of chaptersData) {
    const chapterJa = allJapaneseSentences.slice(
      translationOffset,
      translationOffset + chData.sentences.length
    );
    translationOffset += chData.sentences.length;

    const chapterId = await insertChapter(
      bookId,
      chData.chapterNumber,
      chData.title_en,
      chData.title_ja,
      chData.sentences.length,
      chData.wordCount
    );
    console.log(
      `   Chapter ${chData.chapterNumber}作成: ${chapterId} (${chData.title_en})`
    );

    const sentenceData = chData.sentences.map((text_en, i) => ({
      text_en,
      text_ja: chapterJa[i],
      position: i + 1,
      word_count: text_en.split(/\s+/).length,
    }));

    await insertSentences(chapterId, sentenceData);
    console.log(`     Sentences: ${sentenceData.length}件`);
  }

  console.log(`\n🎉 完了！ ${bookConfig.title_en} を投入しました`);
  console.log(`   Book ID: ${bookId}`);
  console.log(`   章数: ${chaptersData.length}`);
  console.log(`   文数: ${totalSentences}`);
  console.log(`   語数: ${totalWords}`);
  console.log(
    `\n💡 ${USE_LLM_TRANSLATION ? "" : "翻訳を更新するには: npx tsx scripts/ingest-book.ts --translate"}`
  );
}

main().catch((err) => {
  console.error("❌ エラー:", err);
  process.exit(1);
});

// テスト用エクスポート
export {
  splitIntoSentences,
  estimateDifficulty,
  estimateCefr,
  extractAllStories,
  extractStory,
  escapeRegex,
};
