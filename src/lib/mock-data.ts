import type { Book, Chapter, Sentence } from "@/types/database";

export const MOCK_BOOKS: Book[] = [
  {
    id: "book-1",
    title_en: "The Happy Prince",
    title_ja: "幸福の王子",
    author_en: "Oscar Wilde",
    author_ja: "オスカー・ワイルド",
    cover_image_url: null,
    description_ja:
      "金箔に覆われた王子の像とツバメの心温まる物語。自己犠牲と愛について描いた短編。",
    cefr_level: "A2",
    genre_tags: ["fairy_tale", "classic"],
    total_chapters: 1,
    total_sentences: 120,
    total_words: 3200,
    license_type: "PUBLIC_DOMAIN",
    source_url: null,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "book-2",
    title_en: "The Gift of the Magi",
    title_ja: "賢者の贈り物",
    author_en: "O. Henry",
    author_ja: "オー・ヘンリー",
    cover_image_url: null,
    description_ja:
      "貧しい若い夫婦が互いへのクリスマスプレゼントのために大切なものを手放す、愛の物語。",
    cefr_level: "B1",
    genre_tags: ["short_story", "classic"],
    total_chapters: 1,
    total_sentences: 95,
    total_words: 2100,
    license_type: "PUBLIC_DOMAIN",
    source_url: null,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "book-3",
    title_en: "Alice's Adventures in Wonderland",
    title_ja: "不思議の国のアリス",
    author_en: "Lewis Carroll",
    author_ja: "ルイス・キャロル",
    cover_image_url: null,
    description_ja:
      "少女アリスがウサギの穴に落ちて不思議な世界を冒険する、世界中で愛される物語。",
    cefr_level: "B1",
    genre_tags: ["fantasy", "classic"],
    total_chapters: 12,
    total_sentences: 1500,
    total_words: 26000,
    license_type: "PUBLIC_DOMAIN",
    source_url: null,
    created_at: "2025-01-01T00:00:00Z",
  },
];

export const MOCK_CHAPTERS: Chapter[] = [
  {
    id: "ch-1-1",
    book_id: "book-1",
    chapter_number: 1,
    title_en: "The Happy Prince",
    title_ja: "幸福の王子",
    sentence_count: 120,
    word_count: 3200,
  },
  {
    id: "ch-2-1",
    book_id: "book-2",
    chapter_number: 1,
    title_en: "The Gift of the Magi",
    title_ja: "賢者の贈り物",
    sentence_count: 95,
    word_count: 2100,
  },
];

export const MOCK_SENTENCES: Sentence[] = [
  {
    id: "s-1",
    chapter_id: "ch-1-1",
    position: 1,
    text_en:
      "High above the city, on a tall column, stood the statue of the Happy Prince.",
    text_ja: "街の上の高いところに、高い柱の上に、幸福の王子の像が立っていました。",
    difficulty_score: 0.35,
    word_count: 14,
    cefr_estimate: "A2",
  },
  {
    id: "s-2",
    chapter_id: "ch-1-1",
    position: 2,
    text_en:
      "He was gilded all over with thin leaves of fine gold, for eyes he had two bright sapphires, and a great red ruby glowed on his sword-hilt.",
    text_ja:
      "彼は金の薄い葉で全身を覆われ、目には二つの輝くサファイアがあり、剣の柄には大きな赤いルビーが輝いていました。",
    difficulty_score: 0.62,
    word_count: 26,
    cefr_estimate: "B2",
  },
  {
    id: "s-3",
    chapter_id: "ch-1-1",
    position: 3,
    text_en: "He was very much admired indeed.",
    text_ja: "彼は本当にとても崇拝されていました。",
    difficulty_score: 0.2,
    word_count: 6,
    cefr_estimate: "A1",
  },
  {
    id: "s-4",
    chapter_id: "ch-1-1",
    position: 4,
    text_en:
      '"He is as beautiful as a weathercock," remarked one of the Town Councillors who wished to gain a reputation for having artistic tastes.',
    text_ja:
      "「あの方は風見鶏のように美しい」と、芸術的な趣味があるという評判を得たいと思っている町議会議員の一人が言いました。",
    difficulty_score: 0.58,
    word_count: 22,
    cefr_estimate: "B1",
  },
  {
    id: "s-5",
    chapter_id: "ch-1-1",
    position: 5,
    text_en:
      '"Only not quite so useful," he added, fearing lest people should think him unpractical, which he really was not.',
    text_ja:
      "「ただ、あまり役に立たないがね」と彼は付け加えました。人々に非実用的だと思われるのを恐れたのです。実際にはそうではなかったのですが。",
    difficulty_score: 0.55,
    word_count: 18,
    cefr_estimate: "B1",
  },
  {
    id: "s-6",
    chapter_id: "ch-1-1",
    position: 6,
    text_en:
      '"Why can\'t you be like the Happy Prince?" asked a sensible mother of her little boy who was crying for the moon.',
    text_ja:
      "「なぜ幸福の王子のようにできないの？」と、月を欲しがって泣いている小さな男の子に、分別のある母親が尋ねました。",
    difficulty_score: 0.42,
    word_count: 19,
    cefr_estimate: "B1",
  },
  {
    id: "s-7",
    chapter_id: "ch-1-1",
    position: 7,
    text_en: '"The Happy Prince never dreams of crying for anything."',
    text_ja: "「幸福の王子は何かを泣いて欲しがることなんか決してないのよ。」",
    difficulty_score: 0.18,
    word_count: 9,
    cefr_estimate: "A1",
  },
  {
    id: "s-8",
    chapter_id: "ch-1-1",
    position: 8,
    text_en:
      '"I am glad there is some one in the world who is quite happy," muttered a disappointed man as he gazed at the wonderful statue.',
    text_ja:
      "「世界には完全に幸せな者がいるのだな」と、がっかりした男がその素晴らしい像を見つめながらつぶやきました。",
    difficulty_score: 0.48,
    word_count: 22,
    cefr_estimate: "B1",
  },
  {
    id: "s-9",
    chapter_id: "ch-1-1",
    position: 9,
    text_en: '"He looks just like an angel," said the Charity Children as they came out of the cathedral in their bright scarlet cloaks and their clean white pinafores.',
    text_ja:
      "「天使みたい」と、慈善院の子供たちが真っ赤な外套と清潔な白いエプロンを着て大聖堂から出てきた時に言いました。",
    difficulty_score: 0.52,
    word_count: 24,
    cefr_estimate: "B1",
  },
  {
    id: "s-10",
    chapter_id: "ch-1-1",
    position: 10,
    text_en:
      '"How do you know?" said the Mathematical Master, "you have never seen one."',
    text_ja:
      "「どうして分かるの？」と数学の先生が言いました。「君たちは天使を見たことがないじゃないか。」",
    difficulty_score: 0.22,
    word_count: 13,
    cefr_estimate: "A2",
  },
];
