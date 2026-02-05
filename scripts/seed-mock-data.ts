/**
 * モックデータをSupabaseに投入するスクリプト
 * 実行: npx tsx scripts/seed-mock-data.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ .env.local にSupabase接続情報がありません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("🌱 シードデータ投入開始...");

  // 1. Books
  const books = [
    {
      title_en: "The Happy Prince",
      title_ja: "幸福の王子",
      author_en: "Oscar Wilde",
      author_ja: "オスカー・ワイルド",
      description_ja: "金箔に覆われた王子の像とツバメの心温まる物語。自己犠牲と愛について描いた短編。",
      cefr_level: "A2",
      genre_tags: ["fairy_tale", "classic"],
      total_chapters: 1,
      total_sentences: 120,
      total_words: 3200,
      license_type: "PUBLIC_DOMAIN",
    },
    {
      title_en: "The Gift of the Magi",
      title_ja: "賢者の贈り物",
      author_en: "O. Henry",
      author_ja: "オー・ヘンリー",
      description_ja: "貧しい若い夫婦が互いへのクリスマスプレゼントのために大切なものを手放す、愛の物語。",
      cefr_level: "B1",
      genre_tags: ["short_story", "classic"],
      total_chapters: 1,
      total_sentences: 95,
      total_words: 2100,
      license_type: "PUBLIC_DOMAIN",
    },
    {
      title_en: "Alice's Adventures in Wonderland",
      title_ja: "不思議の国のアリス",
      author_en: "Lewis Carroll",
      author_ja: "ルイス・キャロル",
      description_ja: "少女アリスがウサギの穴に落ちて不思議な世界を冒険する、世界中で愛される物語。",
      cefr_level: "B1",
      genre_tags: ["fantasy", "classic"],
      total_chapters: 12,
      total_sentences: 1500,
      total_words: 26000,
      license_type: "PUBLIC_DOMAIN",
    },
  ];

  const { data: insertedBooks, error: bookErr } = await supabase
    .from("books")
    .insert(books)
    .select();

  if (bookErr) {
    console.error("❌ Books挿入エラー:", bookErr.message);
    return;
  }
  console.log(`✅ ${insertedBooks.length}冊の本を挿入`);

  const bookMap: Record<string, string> = {};
  insertedBooks.forEach((b) => {
    bookMap[b.title_en] = b.id;
  });

  // 2. Chapters
  const chapters = [
    {
      book_id: bookMap["The Happy Prince"],
      chapter_number: 1,
      title_en: "The Happy Prince",
      title_ja: "幸福の王子",
      sentence_count: 120,
      word_count: 3200,
    },
    {
      book_id: bookMap["The Gift of the Magi"],
      chapter_number: 1,
      title_en: "The Gift of the Magi",
      title_ja: "賢者の贈り物",
      sentence_count: 95,
      word_count: 2100,
    },
  ];

  const { data: insertedChapters, error: chErr } = await supabase
    .from("chapters")
    .insert(chapters)
    .select();

  if (chErr) {
    console.error("❌ Chapters挿入エラー:", chErr.message);
    return;
  }
  console.log(`✅ ${insertedChapters.length}章を挿入`);

  // Happy Princeの章IDを取得
  const happyPrinceChapterId = insertedChapters.find(
    (c) => c.book_id === bookMap["The Happy Prince"]
  )!.id;

  // 3. Sentences (The Happy Prince 冒頭10文)
  const sentences = [
    { position: 1, text_en: "High above the city, on a tall column, stood the statue of the Happy Prince.", text_ja: "街の上の高いところに、高い柱の上に、幸福の王子の像が立っていました。", difficulty_score: 0.35, word_count: 14, cefr_estimate: "A2" },
    { position: 2, text_en: "He was gilded all over with thin leaves of fine gold, for eyes he had two bright sapphires, and a great red ruby glowed on his sword-hilt.", text_ja: "彼は金の薄い葉で全身を覆われ、目には二つの輝くサファイアがあり、剣の柄には大きな赤いルビーが輝いていました。", difficulty_score: 0.62, word_count: 26, cefr_estimate: "B2" },
    { position: 3, text_en: "He was very much admired indeed.", text_ja: "彼は本当にとても崇拝されていました。", difficulty_score: 0.20, word_count: 6, cefr_estimate: "A1" },
    { position: 4, text_en: '"He is as beautiful as a weathercock," remarked one of the Town Councillors who wished to gain a reputation for having artistic tastes.', text_ja: "「あの方は風見鶏のように美しい」と、芸術的な趣味があるという評判を得たいと思っている町議会議員の一人が言いました。", difficulty_score: 0.58, word_count: 22, cefr_estimate: "B1" },
    { position: 5, text_en: '"Only not quite so useful," he added, fearing lest people should think him unpractical, which he really was not.', text_ja: "「ただ、あまり役に立たないがね」と彼は付け加えました。人々に非実用的だと思われるのを恐れたのです。実際にはそうではなかったのですが。", difficulty_score: 0.55, word_count: 18, cefr_estimate: "B1" },
    { position: 6, text_en: '"Why can\'t you be like the Happy Prince?" asked a sensible mother of her little boy who was crying for the moon.', text_ja: "「なぜ幸福の王子のようにできないの？」と、月を欲しがって泣いている小さな男の子に、分別のある母親が尋ねました。", difficulty_score: 0.42, word_count: 19, cefr_estimate: "B1" },
    { position: 7, text_en: '"The Happy Prince never dreams of crying for anything."', text_ja: "「幸福の王子は何かを泣いて欲しがることなんか決してないのよ。」", difficulty_score: 0.18, word_count: 9, cefr_estimate: "A1" },
    { position: 8, text_en: '"I am glad there is some one in the world who is quite happy," muttered a disappointed man as he gazed at the wonderful statue.', text_ja: "「世界には完全に幸せな者がいるのだな」と、がっかりした男がその素晴らしい像を見つめながらつぶやきました。", difficulty_score: 0.48, word_count: 22, cefr_estimate: "B1" },
    { position: 9, text_en: '"He looks just like an angel," said the Charity Children as they came out of the cathedral in their bright scarlet cloaks and their clean white pinafores.', text_ja: "「天使みたい」と、慈善院の子供たちが真っ赤な外套と清潔な白いエプロンを着て大聖堂から出てきた時に言いました。", difficulty_score: 0.52, word_count: 24, cefr_estimate: "B1" },
    { position: 10, text_en: '"How do you know?" said the Mathematical Master, "you have never seen one."', text_ja: "「どうして分かるの？」と数学の先生が言いました。「君たちは天使を見たことがないじゃないか。」", difficulty_score: 0.22, word_count: 13, cefr_estimate: "A2" },
  ].map((s) => ({ ...s, chapter_id: happyPrinceChapterId }));

  const { error: sentErr } = await supabase.from("sentences").insert(sentences);

  if (sentErr) {
    console.error("❌ Sentences挿入エラー:", sentErr.message);
    return;
  }
  console.log(`✅ ${sentences.length}文を挿入`);

  // 4. 辞書データ（word_entries）
  const words = [
    { word: "gilded", pos: "形容詞/動詞", meaning_ja: "金メッキした、金箔を貼った", pronunciation: "/ˈɡɪl.dɪd/" },
    { word: "sapphires", pos: "名詞", meaning_ja: "サファイア（青い宝石）", pronunciation: "/ˈsæf.aɪərz/" },
    { word: "ruby", pos: "名詞", meaning_ja: "ルビー（赤い宝石）", pronunciation: "/ˈruː.bi/" },
    { word: "admired", pos: "動詞", meaning_ja: "称賛された、感心された", pronunciation: "/ədˈmaɪərd/" },
    { word: "weathercock", pos: "名詞", meaning_ja: "風見鶏", pronunciation: "/ˈweð.ər.kɒk/" },
    { word: "councillors", pos: "名詞", meaning_ja: "議員、評議員", pronunciation: "/ˈkaʊn.sə.lərz/" },
    { word: "reputation", pos: "名詞", meaning_ja: "評判、名声", pronunciation: "/ˌrep.jəˈteɪ.ʃən/" },
    { word: "cathedral", pos: "名詞", meaning_ja: "大聖堂", pronunciation: "/kəˈθiː.drəl/" },
    { word: "scarlet", pos: "形容詞", meaning_ja: "緋色の、深紅の", pronunciation: "/ˈskɑːr.lɪt/" },
    { word: "pinafores", pos: "名詞", meaning_ja: "エプロンドレス", pronunciation: "/ˈpɪn.ə.fɔːrz/" },
    { word: "statue", pos: "名詞", meaning_ja: "像、彫像", pronunciation: "/ˈstætʃ.uː/" },
    { word: "column", pos: "名詞", meaning_ja: "柱、円柱", pronunciation: "/ˈkɒl.əm/" },
    { word: "muttered", pos: "動詞", meaning_ja: "つぶやいた", pronunciation: "/ˈmʌt.ərd/" },
    { word: "disappointed", pos: "形容詞", meaning_ja: "がっかりした", pronunciation: "/ˌdɪs.əˈpɔɪn.tɪd/" },
    { word: "sensible", pos: "形容詞", meaning_ja: "分別のある、賢明な", pronunciation: "/ˈsen.sə.bəl/" },
    { word: "gazed", pos: "動詞", meaning_ja: "じっと見つめた", pronunciation: "/ɡeɪzd/" },
    { word: "beautiful", pos: "形容詞", meaning_ja: "美しい", pronunciation: "/ˈbjuː.tɪ.fəl/" },
    { word: "angel", pos: "名詞", meaning_ja: "天使", pronunciation: "/ˈeɪn.dʒəl/" },
    { word: "prince", pos: "名詞", meaning_ja: "王子", pronunciation: "/prɪns/" },
    { word: "happy", pos: "形容詞", meaning_ja: "幸福な、幸せな", pronunciation: "/ˈhæp.i/" },
  ];

  const { error: wordErr } = await supabase.from("word_entries").insert(words);

  if (wordErr) {
    console.error("❌ Words挿入エラー:", wordErr.message);
    return;
  }
  console.log(`✅ ${words.length}語の辞書データを挿入`);

  console.log("\n🎉 シードデータ投入完了！");

  // 挿入されたIDを表示（アプリ側で使う参照用）
  console.log("\n📋 挿入されたID:");
  console.log("Books:", JSON.stringify(bookMap, null, 2));
  console.log("Happy Prince Chapter ID:", happyPrinceChapterId);
}

seed().catch(console.error);
