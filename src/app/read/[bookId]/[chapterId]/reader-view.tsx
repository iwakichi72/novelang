"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type { Book, Chapter, Sentence } from "@/types/database";
import DictionaryPopup from "./dictionary-popup";
import { useReadingProgress } from "@/hooks/use-reading-progress";
import {
  advanceReaderOnboarding,
  READER_ONBOARDING_STORAGE_KEY,
  type ReaderOnboardingStep,
} from "./reader-onboarding";

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
  const [onboardingStep, setOnboardingStep] =
    useState<ReaderOnboardingStep | null>(null);

  // 読書進捗フック
  const { savedPosition, saveProgress } = useReadingProgress(book.id, chapter.id);
  const sentenceRefs = useRef<Map<string, HTMLElement>>(new Map());
  const hasRestoredPosition = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextSentenceTapRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hasCompletedOnboarding =
        window.localStorage.getItem(READER_ONBOARDING_STORAGE_KEY) === "done";
      setOnboardingStep(hasCompletedOnboarding ? null : "sentence");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const skipOnboarding = useCallback(() => {
    window.localStorage.setItem(READER_ONBOARDING_STORAGE_KEY, "done");
    setOnboardingStep(null);
  }, []);

  const resetOnboarding = useCallback(() => {
    window.localStorage.removeItem(READER_ONBOARDING_STORAGE_KEY);
    setShowHeader(true);
    setOnboardingStep("sentence");
  }, []);

  const advanceOnboarding = useCallback(
    (action: Parameters<typeof advanceReaderOnboarding>[1]) => {
      setOnboardingStep((currentStep) => {
        if (!currentStep) return currentStep;
        const nextStep = advanceReaderOnboarding(currentStep, action);
        if (nextStep === "done") {
          window.localStorage.setItem(READER_ONBOARDING_STORAGE_KEY, "done");
          return null;
        }
        return nextStep;
      });
    },
    []
  );

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
    if (suppressNextSentenceTapRef.current) {
      suppressNextSentenceTapRef.current = false;
      return;
    }

    setFlippedSentences((prev) => {
      const next = new Set(prev);
      if (next.has(sentenceId)) {
        next.delete(sentenceId);
      } else {
        next.add(sentenceId);
      }
      return next;
    });
    advanceOnboarding("sentence-toggled");
  };

  // 英語量変更時にフリップ状態をリセット
  const handleRatioChange = (ratio: EnglishRatio) => {
    setEnglishRatio(ratio);
    setFlippedSentences(new Set());
    advanceOnboarding("ratio-changed");
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const openDictionaryAt = (
    word: string,
    sentenceId: string,
    sentenceText: string,
    rect: { x: number; y: number }
  ) => {
    const cleaned = word.replace(/[^a-zA-Z'-]/g, "").toLowerCase();
    if (cleaned.length < 2) return;
    setSelectedWord({
      word: cleaned,
      sentenceId,
      sentenceText,
      rect,
    });
    advanceOnboarding("word-opened");
  };

  // 通常タップは文切替、長押しだけ単語辞書に使う。
  const handleWordPointerDown = (
    e: React.PointerEvent,
    word: string,
    sentenceId: string,
    sentenceText: string
  ) => {
    clearLongPressTimer();
    const rect = { x: e.clientX, y: e.clientY };
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      suppressNextSentenceTapRef.current = true;
      openDictionaryAt(word, sentenceId, sentenceText, rect);
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

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
        <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 z-20">
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
            <div className="flex items-center gap-3">
              <button
                onClick={resetOnboarding}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-sm text-gray-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                aria-label="読書ガイドを表示"
                title="読書ガイドを表示"
              >
                ?
              </button>
              <button
                onClick={() => setShowHeader(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                隠す
              </button>
            </div>
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
                          onPointerDown={(e) =>
                            handleWordPointerDown(
                              e,
                              part,
                              sentence.id,
                              sentence.text_en
                            )
                          }
                          onPointerUp={clearLongPressTimer}
                          onPointerLeave={clearLongPressTimer}
                          onPointerCancel={clearLongPressTimer}
                          onContextMenu={(e) => e.preventDefault()}
                          className="rounded cursor-pointer touch-manipulation hover:bg-yellow-100"
                          title="長押しで辞書"
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

      {onboardingStep && (
        <ReaderOnboardingBubble
          step={onboardingStep}
          onSkip={skipOnboarding}
        />
      )}

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
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 z-20">
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

function ReaderOnboardingBubble({
  step,
  onSkip,
}: {
  step: Exclude<ReaderOnboardingStep, "done">;
  onSkip: () => void;
}) {
  const content = {
    sentence: {
      label: "1 / 3",
      title: "まずは1文タップ",
      body: "英文をタップすると、その文だけ日本語に切り替わります。",
      className: "top-20 left-5 right-5 sm:left-1/2 sm:right-auto sm:w-80 sm:-translate-x-80",
    },
    word: {
      label: "2 / 3",
      title: "単語は長押しで辞書",
      body: "気になる単語を長押しすると、読書を止めずに意味を確認できます。",
      className: "top-32 left-5 right-5 sm:left-1/2 sm:right-auto sm:w-80 sm:-translate-x-80",
    },
    ratio: {
      label: "3 / 3",
      title: "英語量を合わせる",
      body: "下のボタンで英語の割合を変えられます。迷ったら50%からで大丈夫です。",
      className: "bottom-24 left-5 right-5 sm:left-1/2 sm:right-auto sm:w-80 sm:-translate-x-40",
    },
  }[step];

  return (
    <div
      className={`fixed z-30 rounded-xl border border-blue-100 bg-white p-4 shadow-xl shadow-blue-950/10 ${content.className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-blue-600">{content.label}</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {content.title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            {content.body}
          </p>
        </div>
        <button
          onClick={onSkip}
          className="rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          スキップ
        </button>
      </div>
    </div>
  );
}
