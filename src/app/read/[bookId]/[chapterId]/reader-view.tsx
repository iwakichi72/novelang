"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, EyeOff } from "lucide-react";
import type { Book, Chapter, Sentence } from "@/types/database";
import DictionaryPopup from "./dictionary-popup";
import { useReadingProgress } from "@/hooks/use-reading-progress";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getDefaultLang as getDefaultLangUtil } from "@/lib/reading-utils";

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
      return getDefaultLangUtil(sentence.difficulty_score, englishRatio);
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

  // 長押し管理用ref
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const pressStartPos = useRef<{ x: number; y: number } | null>(null);

  // 単語タップ → 辞書ポップアップ
  const handleWordTap = (
    word: string,
    sentenceId: string,
    sentenceText: string
  ) => {
    if (longPressTriggered.current) return;
    const cleaned = word.replace(/[^a-zA-Z'-]/g, "").toLowerCase();
    if (cleaned.length < 2) return;
    setSelectedWord({
      word: cleaned,
      sentenceId,
      sentenceText,
      rect: { x: 0, y: 0 },
    });
  };

  // 長押し開始（2秒で日英切替）
  const handlePressStart = (sentenceId: string, x: number, y: number) => {
    longPressTriggered.current = false;
    pressStartPos.current = { x, y };
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      handleSentenceTap(sentenceId);
    }, 2000);
  };

  // スライドで長押しキャンセル（10px以上移動）
  const handlePressMove = (x: number, y: number) => {
    if (!pressStartPos.current || !longPressTimer.current) return;
    const dx = x - pressStartPos.current.x;
    const dy = y - pressStartPos.current.y;
    if (dx * dx + dy * dy > 100) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // 長押しキャンセル
  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pressStartPos.current = null;
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
    <div className="min-h-screen bg-reader-bg">
      {/* ヘッダー */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 bg-card/95 backdrop-blur border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] z-20",
          "transition-transform duration-300",
          showHeader ? "translate-y-0" : "-translate-y-full"
        )}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/library/${book.id}`} className="gap-1.5">
              <ArrowLeft className="size-4" />
              戻る
            </Link>
          </Button>
          <span className="text-sm font-medium text-foreground">
            第{chapter.chapter_number}章
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHeader(false)}
            className="gap-1"
          >
            <EyeOff className="size-4" />
            隠す
          </Button>
        </div>
      </header>

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
                className={`inline transition-colors duration-150 rounded px-0.5 py-0.5 text-reader-text border-b border-transparent ${
                  isJapanese
                    ? "bg-sentence-ja-bg"
                    : "bg-sentence-en-bg"
                }`}
              >
                {lang === "en"
                  ? text.split(/(\s+)/).map((part, i) => {
                      if (/^\s+$/.test(part)) return part;
                      return (
                        <span
                          key={i}
                          onClick={() =>
                            handleWordTap(part, sentence.id, sentence.text_en)
                          }
                          onTouchStart={(e) => handlePressStart(sentence.id, e.touches[0].clientX, e.touches[0].clientY)}
                          onTouchMove={(e) => handlePressMove(e.touches[0].clientX, e.touches[0].clientY)}
                          onTouchEnd={handlePressEnd}
                          onTouchCancel={handlePressEnd}
                          onMouseDown={(e) => handlePressStart(sentence.id, e.clientX, e.clientY)}
                          onMouseMove={(e) => handlePressMove(e.clientX, e.clientY)}
                          onMouseUp={handlePressEnd}
                          onMouseLeave={handlePressEnd}
                          className="hover:bg-word-hover rounded cursor-pointer select-none"
                        >
                          {part}
                        </span>
                      );
                    })
                  : (
                    <span
                      onTouchStart={(e) => handlePressStart(sentence.id, e.touches[0].clientX, e.touches[0].clientY)}
                      onTouchMove={(e) => handlePressMove(e.touches[0].clientX, e.touches[0].clientY)}
                      onTouchEnd={handlePressEnd}
                      onTouchCancel={handlePressEnd}
                      onMouseDown={(e) => handlePressStart(sentence.id, e.clientX, e.clientY)}
                      onMouseMove={(e) => handlePressMove(e.clientX, e.clientY)}
                      onMouseUp={handlePressEnd}
                      onMouseLeave={handlePressEnd}
                      className="cursor-pointer select-none"
                    >
                      {text}
                    </span>
                  )}{" "}
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
      <footer className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-20">
        <div className="max-w-2xl mx-auto">
          {/* プログレスバー */}
          <div className="flex items-center gap-2 mb-2">
            <Progress value={progress} className="flex-1 h-1.5" />
            <span className="text-xs text-muted-foreground w-10 text-right">
              {progress}%
            </span>
          </div>

          {/* 英語量スライダー + テーマ切替 */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-14">英語量:</span>
            <div className="flex gap-1 flex-1">
              {([25, 50, 75, 100] as EnglishRatio[]).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => handleRatioChange(ratio)}
                  className={cn(
                    "flex-1 py-1 text-xs rounded-md transition-colors",
                    englishRatio === ratio
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:opacity-80"
                  )}
                >
                  {RATIO_LABELS[ratio]}
                </button>
              ))}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
