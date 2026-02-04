/**
 * 英語量（englishRatio）と文の難易度スコアから、デフォルト表示言語を決定する。
 *
 * @param difficultyScore - 文の難易度 (0.0〜1.0)
 * @param englishRatio - 英語表示割合 (25 | 50 | 75 | 100)
 * @returns "en" | "ja"
 */
export function getDefaultLang(
  difficultyScore: number,
  englishRatio: number
): "en" | "ja" {
  if (englishRatio === 100) return "en";
  if (englishRatio === 25) {
    return difficultyScore < 0.3 ? "en" : "ja";
  }
  if (englishRatio === 50) {
    return difficultyScore < 0.5 ? "en" : "ja";
  }
  // 75%: 難しい文だけ日本語
  return difficultyScore < 0.7 ? "en" : "ja";
}
