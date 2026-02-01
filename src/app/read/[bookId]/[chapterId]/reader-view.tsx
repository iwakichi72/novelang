"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type { Book, Chapter, Sentence } from "@/types/database";
import DictionaryPopup from "./dictionary-popup";
import { useReadingProgress } from "@/hooks/use-reading-progress";

type EnglishRatio = 25 | 50 | 75 | 100;

const RATIO_LABELS: Record<EnglishRatio, string> = {
  25: "25%",
  50: "50%",
  75: "75%",
  100: "100%",
};

export default function ReaderView({
  book,
  chapter,
  sentences,
}: {
  book: Book;
  chapter: Chapter;
  sentences: Sentence[];
}) {
  const [englishRatio, setEnglishRatio] = useState<EnglishRatio>(50);
  const [flippedSentences, setFlippedSentences] = useState<Set<string>>(
    new Set()
  );
  const [showHeader, setShowHeader] = useState(true);
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    sentenceId: string;
    sentenceText: string;
    rect: { x: number; y: number };
  } | null>(null);

  // 読書進捗フック
  const { savedPosition, saveProgress } = useReadingProgress(book.id, chapter.id);
  const sentenceRefs = useRef<Map<string, HTMLElement>>(new Map());
  const hasRestoredPosition = useRef(false);

  // 保存済み位置にスクロール復元
  useEffect(() => {
    if (hasRestoredPosition.current || savedPosition === 0) return;
    const targetSentence = sentences.find((s) => s.position === savedPosition);
    if (targetSentence) {
      const el = sentenceRefs.current.get(targetSentence.id);
      if (el) {
        el.scrollIntoView({ block: "center" });
        hasRestoredPosition.current = true;
      }
    }
  }, [savedPosition, sentences]);

  // スクロールで読んだ位置を追跡・保存
  useEffect(() => {
    const handleScroll = () => {
      const viewportMiddle = window.innerHeight / 2;
      let lastVisiblePosition = 0;

      for (const sentence of sentences) {
        const el = sentenceRefs.current.get(sentence.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top < viewportMiddle) {
          lastVisiblePosition = sentence.position;
        }
      }

      if (lastVisiblePosition > 0) {
        saveProgress(lastVisiblePosition, lastVisiblePosition);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sentences, saveProgress]);

  // 英語量に基づいて、各文のデフォルト表示言語を決定
  const getDefaultLang = useCallback(
    (sentence: Sentence): "en" | "ja" => {
      if (englishRatio === 100) return "en";
      if (englishRatio === 25) {
        // 難易度スコアが低い文（簡単な文）だけ英語
        return sentence.difficulty_score < 0.3 ? "en" : "ja";
      }
      if (englishRatio === 50) {
        return sentence.difficulty_score < 0.5 ? "en" : "ja";
      }
      // 75%: 難しい文だけ日本語
      return sentence.difficulty_score < 0.7 ? "en" : "ja";
    },
    [englishRatio]
  );

  // 文の現在の表示言語
  const getDisplayLang = (sentence: Sentence): "en" | "ja" => {
    const isFlipped = flippedSentences.has(sentence.id);
    const defaultLang = getDefaultLang(sentence);
    if (isFlipped) return defaultLang === "en" ? "ja" : "en";
    return defaultLang;
  };

  // 文タップで日英切替
  const handleSentenceTap = (sentenceId: string) => {
    setFlippedSentences((prev) => {
      const next = new Set(prev);
      if (next.has(sentenceId)) {
        next.delete(sentenceId);
      } else {
        next.add(sentenceId);
      }
      return next;
    });
  };

  // 英語量変更時にフリップ状態をリセット
  const handleRatioChange = (ratio: EnglishRatio) => {
    setEnglishRatio(ratio);
    setFlippedSentences(new Set());
  };

  // 単語の長押し（実装はクリックで代用、モバイルでは長押し）
  const handleWordClick = (
    e: React.MouseEvent,
    word: string,
    sentenceId: string,
    sentenceText: string
  ) => {
    e.stopPropagation();
    const cleaned = word.replace(/[^a-zA-Z'-]/g, "").toLowerCase();
    if (cleaned.length < 2) return;
    setSelectedWord({
      word: cleaned,
      sentenceId,
      sentenceText,
      rect: { x: e.clientX, y: e.clientY },
    });
  };

  // 進捗計算（現在のスクロール位置ベース）
  const [currentPosition, setCurrentPosition] = useState(0);
  useEffect(() => {
    const handleProgress = () => {
      const viewportMiddle = window.innerHeight / 2;
      let pos = 0;
      for (const sentence of sentences) {
        const el = sentenceRefs.current.get(sentence.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top < viewportMiddle) pos = sentence.position;
      }
      setCurrentPosition(pos);
    };
    window.addEventListener("scroll", handleProgress, { passive: true });
    return () => window.removeEventListener("scroll", handleProgress);
  }, [sentences]);
  const progress = sentences.length > 0
    ? Math.round((currentPosition / sentences.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      {showHeader && (
        <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] z-20">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Link
              href={`/library/${book.id}`}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← 戻る
            </Link>
            <span className="text-sm font-medium text-gray-700">
              第{chapter.chapter_number}章
            </span>
            <button
              onClick={() => setShowHeader(false)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              隠す
            </button>
          </div>
        </header>
      )}

      {/* タップでヘッダー再表示 */}
      {!showHeader && (
        <button
          onClick={() => setShowHeader(true)}
          className="fixed top-0 left-0 right-0 h-8 z-20"
          aria-label="ヘッダーを表示"
        />
      )}

      {/* 本文 */}
      <main
        className={`max-w-2xl mx-auto px-6 pb-32 ${
          showHeader ? "pt-16" : "pt-6"
        }`}
        style={{ lineHeight: "1.9", fontSize: "17px" }}
      >
        <div className="space-y-1">
          {sentences.map((sentence) => {
            const lang = getDisplayLang(sentence);
            const text = lang === "en" ? sentence.text_en : sentence.text_ja;
            const isJapanese = lang === "ja";

            return (
              <span
                key={sentence.id}
                ref={(el) => {
                  if (el) sentenceRefs.current.set(sentence.id, el);
                }}
                onClick={() => handleSentenceTap(sentence.id)}
                className={`inline cursor-pointer transition-colors duration-150 rounded px-0.5 py-0.5 text-gray-900 border-b border-transparent hover:border-gray-200 ${
                  isJapanese
                    ? "bg-blue-50"
                    : "bg-gray-50/50 hover:bg-gray-100/50"
                }`}
              >
                {lang === "en"
                  ? text.split(/(\s+)/).map((part, i) => {
                      if (/^\s+$/.test(part)) return part;
                      return (
                        <span
                          key={i}
                          onClick={(e) =>
                            handleWordClick(e, part, sentence.id, sentence.text_en)
                          }
                          className="hover:bg-yellow-100 rounded cursor-pointer"
                        >
                          {part}
                        </span>
                      );
                    })
                  : text}{" "}
              </span>
            );
          })}
        </div>
      </main>

      {/* 辞書ポップアップ */}
      {selectedWord && (
        <DictionaryPopup
          word={selectedWord.word}
          sentenceId={selectedWord.sentenceId}
          sentenceText={selectedWord.sentenceText}
          onClose={() => setSelectedWord(null)}
        />
      )}

      {/* フッター: プログレス + 英語量スライダー */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-20">
        <div className="max-w-2xl mx-auto">
          {/* プログレスバー */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-10 text-right">
              {progress}%
            </span>
          </div>

          {/* 英語量スライダー */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-14">英語量:</span>
            <div className="flex gap-1 flex-1">
              {([25, 50, 75, 100] as EnglishRatio[]).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => handleRatioChange(ratio)}
                  className={`flex-1 py-1 text-xs rounded-md transition-colors ${
                    englishRatio === ratio
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {RATIO_LABELS[ratio]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
