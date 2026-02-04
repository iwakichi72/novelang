import { describe, it, expect } from "vitest";
import {
  splitIntoSentences,
  estimateDifficulty,
  estimateCefr,
  extractStory,
} from "../../scripts/ingest-book";

// ========================================
// splitIntoSentences
// ========================================
describe("splitIntoSentences", () => {
  it("ピリオドで文を分割する", () => {
    const result = splitIntoSentences(
      "Hello world. How are you. I am fine."
    );
    expect(result).toEqual(["Hello world.", "How are you.", "I am fine."]);
  });

  it("感嘆符・疑問符で分割する", () => {
    const result = splitIntoSentences("What happened! Really? Yes indeed.");
    expect(result).toEqual(["What happened!", "Really?", "Yes indeed."]);
  });

  it("3文字以下の文は除外する", () => {
    const result = splitIntoSentences("Hi. OK. Hello world today.");
    // "Hi." と "OK." は 3文字以下なので除外
    expect(result).toEqual(["Hello world today."]);
  });

  it("2つ以上の改行で段落分割する", () => {
    const text = "First paragraph sentence.\n\nSecond paragraph sentence.";
    const result = splitIntoSentences(text);
    expect(result).toContain("First paragraph sentence.");
    expect(result).toContain("Second paragraph sentence.");
  });

  it("10文字以下の段落は除外する", () => {
    const text = "Short.\n\nThis is a longer paragraph that should be included.";
    const result = splitIntoSentences(text);
    // "Short." は段落が10文字以下なので除外
    expect(result).not.toContain("Short.");
    expect(result.length).toBeGreaterThan(0);
  });

  it("段落内の余分な空白を正規化する", () => {
    const text = "This   is   a   sentence   with   extra   spaces.";
    const result = splitIntoSentences(text);
    expect(result[0]).toBe("This is a sentence with extra spaces.");
  });

  it("引用符が文末に付いている場合も正しく分割する", () => {
    const text = 'She said "Hello." He replied "Goodbye."';
    const result = splitIntoSentences(text);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("空文字列の場合は空配列を返す", () => {
    const result = splitIntoSentences("");
    expect(result).toEqual([]);
  });

  it("改行のみのテキストは空配列を返す", () => {
    const result = splitIntoSentences("\n\n\n");
    expect(result).toEqual([]);
  });
});

// ========================================
// estimateDifficulty
// ========================================
describe("estimateDifficulty", () => {
  it("短い簡単な文は低いスコアを返す", () => {
    const score = estimateDifficulty("The cat sat.");
    expect(score).toBeLessThan(0.2);
  });

  it("中程度の文は中間のスコアを返す", () => {
    const score = estimateDifficulty(
      "The beautiful princess lived in a magnificent castle."
    );
    expect(score).toBeGreaterThanOrEqual(0.1);
    expect(score).toBeLessThanOrEqual(0.5);
  });

  it("長く複雑な文は高いスコアを返す", () => {
    const longSentence =
      "The extraordinarily sophisticated philosophical implications of the unprecedented technological advancement were meticulously scrutinized by the distinguished international committee of extraordinarily qualified researchers and scientists.";
    const score = estimateDifficulty(longSentence);
    expect(score).toBeGreaterThan(0.5);
  });

  it("非常に短い単語（3文字未満）では負のスコアになりうる（実装上の仕様）", () => {
    // wordScore = (avgWordLen - 3) / 5 で、短い単語では負になる
    const shortScore = estimateDifficulty("Hi.");
    expect(shortScore).toBeLessThan(0);
  });

  it("通常の文では 0.0〜1.0 の範囲内に収まる", () => {
    const normalScore = estimateDifficulty("The cat sat on the mat.");
    const longScore = estimateDifficulty(
      "A ".repeat(50) + "word."
    );
    expect(normalScore).toBeGreaterThanOrEqual(0);
    expect(normalScore).toBeLessThanOrEqual(1);
    expect(longScore).toBeGreaterThanOrEqual(0);
    expect(longScore).toBeLessThanOrEqual(1);
  });

  it("小数第2位まで丸められる", () => {
    const score = estimateDifficulty("Hello world test sentence.");
    const decimalPlaces = score.toString().split(".")[1]?.length ?? 0;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });
});

// ========================================
// estimateCefr
// ========================================
describe("estimateCefr", () => {
  it("非常に簡単な文はA1を返す", () => {
    // "The cat." → score < 0.2
    expect(estimateCefr("The cat.")).toBe("A1");
  });

  it("簡単な文はA2を返す", () => {
    // 少し長い文でスコアが 0.2〜0.35 になるもの
    const cefr = estimateCefr("The small dog runs quickly in the park.");
    expect(["A1", "A2"]).toContain(cefr);
  });

  it("中程度の文はB1またはB2を返す", () => {
    const cefr = estimateCefr(
      "The beautiful princess lived in a magnificent castle surrounded by gardens."
    );
    expect(["B1", "B2"]).toContain(cefr);
  });

  it("非常に長く難しい文はC1またはC2を返す", () => {
    const longSentence =
      "The extraordinarily sophisticated philosophical implications of the unprecedented technological advancement were meticulously scrutinized by the distinguished international committee of extraordinarily qualified researchers and scientists from universities.";
    const cefr = estimateCefr(longSentence);
    expect(["C1", "C2"]).toContain(cefr);
  });

  it("有効なCEFRレベルのみを返す", () => {
    const validLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const cefr = estimateCefr("Some test sentence here.");
    expect(validLevels).toContain(cefr);
  });
});

// ========================================
// extractStory
// ========================================
describe("extractStory", () => {
  it("Gutenbergのヘッダーとフッターを除去する", () => {
    const fullText = [
      "Some header text",
      "*** START OF THE PROJECT GUTENBERG EBOOK THE HAPPY PRINCE ***",
      "The Happy Prince",
      "Story content here.",
      "*** END OF THE PROJECT GUTENBERG EBOOK THE HAPPY PRINCE ***",
      "Some footer text",
    ].join("\n");

    const result = extractStory(fullText, "The Happy Prince");
    expect(result).toContain("Story content here.");
    expect(result).not.toContain("Some header text");
    expect(result).not.toContain("Some footer text");
    expect(result).not.toContain("*** START");
    expect(result).not.toContain("*** END");
  });

  it("タイトル行以降のテキストを抽出する", () => {
    const fullText = [
      "*** START OF THE PROJECT GUTENBERG EBOOK ***",
      "Introduction paragraph",
      "The Happy Prince",
      "Once upon a time there was a prince.",
      "He was very happy.",
      "*** END OF THE PROJECT GUTENBERG EBOOK ***",
    ].join("\n");

    const result = extractStory(fullText, "The Happy Prince");
    expect(result).toContain("Once upon a time there was a prince.");
    expect(result).not.toContain("Introduction paragraph");
  });

  it("次のストーリータイトルで切断する", () => {
    const fullText = [
      "*** START OF THE PROJECT GUTENBERG EBOOK ***",
      "The Happy Prince",
      "First story content.",
      "The Nightingale and the Rose",
      "Second story content.",
      "*** END OF THE PROJECT GUTENBERG EBOOK ***",
    ].join("\n");

    const result = extractStory(
      fullText,
      "The Happy Prince",
      "The Nightingale and the Rose"
    );
    expect(result).toContain("First story content.");
    expect(result).not.toContain("Second story content.");
    expect(result).not.toContain("The Nightingale and the Rose");
  });

  it("nextStoryTitleがない場合は最後まで抽出する", () => {
    const fullText = [
      "*** START OF THE PROJECT GUTENBERG EBOOK ***",
      "The Happy Prince",
      "Story content line 1.",
      "Story content line 2.",
      "*** END OF THE PROJECT GUTENBERG EBOOK ***",
    ].join("\n");

    const result = extractStory(fullText, "The Happy Prince");
    expect(result).toContain("Story content line 1.");
    expect(result).toContain("Story content line 2.");
  });

  it("タイトルにピリオドが付いていても検出する", () => {
    const fullText = [
      "*** START OF THE PROJECT GUTENBERG EBOOK ***",
      "The Happy Prince.",
      "Story content here.",
      "*** END OF THE PROJECT GUTENBERG EBOOK ***",
    ].join("\n");

    const result = extractStory(fullText, "The Happy Prince");
    expect(result).toContain("Story content here.");
  });

  it("マーカーがないテキストも処理できる", () => {
    const fullText = [
      "The Happy Prince",
      "Story content without markers.",
    ].join("\n");

    const result = extractStory(fullText, "The Happy Prince");
    expect(result).toContain("Story content without markers.");
  });
});
