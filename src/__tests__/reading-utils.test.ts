import { describe, it, expect } from "vitest";
import { getDefaultLang } from "@/lib/reading-utils";

describe("getDefaultLang", () => {
  // 100%: 常に英語
  it("englishRatio=100 のとき、難易度に関わらず常に 'en' を返す", () => {
    expect(getDefaultLang(0.0, 100)).toBe("en");
    expect(getDefaultLang(0.5, 100)).toBe("en");
    expect(getDefaultLang(0.9, 100)).toBe("en");
    expect(getDefaultLang(1.0, 100)).toBe("en");
  });

  // 25%: 簡単な文だけ英語（閾値 0.3）
  describe("englishRatio=25", () => {
    it("difficulty < 0.3 → 'en'（簡単な文は英語表示）", () => {
      expect(getDefaultLang(0.0, 25)).toBe("en");
      expect(getDefaultLang(0.1, 25)).toBe("en");
      expect(getDefaultLang(0.29, 25)).toBe("en");
    });

    it("difficulty = 0.3 → 'ja'（境界値は日本語）", () => {
      expect(getDefaultLang(0.3, 25)).toBe("ja");
    });

    it("difficulty > 0.3 → 'ja'（難しい文は日本語表示）", () => {
      expect(getDefaultLang(0.5, 25)).toBe("ja");
      expect(getDefaultLang(0.8, 25)).toBe("ja");
    });
  });

  // 50%: 中程度以下は英語（閾値 0.5）
  describe("englishRatio=50", () => {
    it("difficulty < 0.5 → 'en'", () => {
      expect(getDefaultLang(0.0, 50)).toBe("en");
      expect(getDefaultLang(0.4, 50)).toBe("en");
      expect(getDefaultLang(0.49, 50)).toBe("en");
    });

    it("difficulty = 0.5 → 'ja'（境界値は日本語）", () => {
      expect(getDefaultLang(0.5, 50)).toBe("ja");
    });

    it("difficulty > 0.5 → 'ja'", () => {
      expect(getDefaultLang(0.6, 50)).toBe("ja");
      expect(getDefaultLang(0.9, 50)).toBe("ja");
    });
  });

  // 75%: ほとんど英語、難しい文だけ日本語（閾値 0.7）
  describe("englishRatio=75", () => {
    it("difficulty < 0.7 → 'en'", () => {
      expect(getDefaultLang(0.0, 75)).toBe("en");
      expect(getDefaultLang(0.5, 75)).toBe("en");
      expect(getDefaultLang(0.69, 75)).toBe("en");
    });

    it("difficulty = 0.7 → 'ja'（境界値は日本語）", () => {
      expect(getDefaultLang(0.7, 75)).toBe("ja");
    });

    it("difficulty > 0.7 → 'ja'", () => {
      expect(getDefaultLang(0.8, 75)).toBe("ja");
      expect(getDefaultLang(1.0, 75)).toBe("ja");
    });
  });
});
