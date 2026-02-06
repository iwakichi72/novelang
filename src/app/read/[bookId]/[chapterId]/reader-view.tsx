"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Book, Chapter, Sentence } from "@/types/database";
import DictionaryPopup from "./dictionary-popup";
import ReaderHeader from "./reader-header";
import ReaderFooter from "./reader-footer";
import type { EnglishRatio } from "./reader-footer";
import { useReadingProgress } from "@/hooks/use-reading-progress";
import { useSentencePress } from "@/hooks/use-sentence-press";
import { useTTS } from "@/hooks/use-tts";
import { cn } from "@/lib/utils";

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
  } | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  // フック
  const { savedPosition, saveProgress } = useReadingProgress(book.id, chapter.id);
  const { speakSentence, stop, speakingSentenceId, isSupported } = useTTS();
  const sentenceRefs = useRef<Map<string, HTMLElement>>(new Map());
  const hasRestoredPosition = useRef(false);

  // 英語量に基づくデフォルト表示言語
  const getDefaultLang = useCallback(
    (sentence: Sentence): "en" | "ja" => {
      if (englishRatio === 100) return "en";
      if (englishRatio === 25) return sentence.difficulty_score < 0.3 ? "en" : "ja";
      if (englishRatio === 50) return sentence.difficulty_score < 0.5 ? "en" : "ja";
      return sentence.difficulty_score < 0.7 ? "en" : "ja";
    },
    [englishRatio]
  );

  // 文の現在の表示言語（フリップ状態を考慮）
  const getDisplayLang = (sentence: Sentence): "en" | "ja" => {
    const isFlipped = flippedSentences.has(sentence.id);
    const defaultLang = getDefaultLang(sentence);
    if (isFlipped) return defaultLang === "en" ? "ja" : "en";
    return defaultLang;
  };

  // 文タップで日英切替 + TTS読み上げ
  const handleSentenceTap = useCallback(
    (sentenceId: string) => {
      setFlippedSentences((prev) => {
        const next = new Set(prev);
        if (next.has(sentenceId)) {
          next.delete(sentenceId);
        } else {
          next.add(sentenceId);
        }
        return next;
      });

      // TTS ON なら英語で読み上げ
      if (ttsEnabled && isSupported) {
        const sentence = sentences.find((s) => s.id === sentenceId);
        if (sentence) {
          if (speakingSentenceId === sentenceId) {
            stop();
          } else {
            speakSentence(sentence.text_en, sentenceId, "en");
          }
        }
      }
    },
    [ttsEnabled, isSupported, sentences, speakingSentenceId, stop, speakSentence]
  );

  // 長押しジェスチャー
  const { handlePressStart, handlePressMove, handlePressEnd, longPressTriggered } =
    useSentencePress(handleSentenceTap);

  // 単語タップ → 辞書ポップアップ
  const handleWordTap = (word: string, sentenceId: string, sentenceText: string) => {
    if (longPressTriggered.current) return;
    const cleaned = word.replace(/[^a-zA-Z'-]/g, "").toLowerCase();
    if (cleaned.length < 2) return;
    setSelectedWord({ word: cleaned, sentenceId, sentenceText });
  };

  // 英語量変更時にフリップ状態をリセット
  const handleRatioChange = (ratio: EnglishRatio) => {
    setEnglishRatio(ratio);
    setFlippedSentences(new Set());
  };

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
        if (el.getBoundingClientRect().top < viewportMiddle) {
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

  // 進捗計算
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
      const scrollBottom = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (docHeight - scrollBottom < 50 && sentences.length > 0) {
        pos = sentences[sentences.length - 1].position;
      }
      setCurrentPosition(pos);
    };
    window.addEventListener("scroll", handleProgress, { passive: true });
    return () => window.removeEventListener("scroll", handleProgress);
  }, [sentences]);
  const progress = sentences.length > 0
    ? Math.round((currentPosition / sentences.length) * 100)
    : 0;

  // TTS OFF時やアンマウント時に読み上げ停止
  useEffect(() => {
    if (!ttsEnabled) stop();
  }, [ttsEnabled, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return (
    <div className="min-h-screen bg-reader-bg">
      <ReaderHeader
        book={book}
        chapter={chapter}
        showHeader={showHeader}
        onToggleHeader={setShowHeader}
      />

      <main
        className={`max-w-2xl mx-auto px-6 pb-32 font-serif ${
          showHeader ? "pt-16" : "pt-6"
        }`}
        style={{ lineHeight: "1.9", fontSize: "17px" }}
      >
        <div className="space-y-2">
          {sentences.map((sentence) => {
            const lang = getDisplayLang(sentence);
            const text = lang === "en" ? sentence.text_en : sentence.text_ja;
            const isJapanese = lang === "ja";
            const isSpeaking = speakingSentenceId === sentence.id;

            return (
              <div
                key={sentence.id}
                ref={(el) => {
                  if (el) sentenceRefs.current.set(sentence.id, el);
                }}
                className={cn(
                  "flex transition-colors duration-150 rounded-sm text-reader-text",
                  isJapanese ? "bg-sentence-ja-bg" : "bg-sentence-en-bg",
                  isSpeaking && "ring-2 ring-primary/40 bg-primary/5"
                )}
              >
                {/* パレット: タップで即座に日英切替 */}
                <button
                  type="button"
                  onClick={() => handleSentenceTap(sentence.id)}
                  aria-label="日英切替"
                  className={cn(
                    "flex-shrink-0 w-2 rounded-l-sm transition-colors cursor-pointer",
                    isJapanese
                      ? "bg-emerald-400/40 dark:bg-emerald-500/30 hover:bg-emerald-400/60 dark:hover:bg-emerald-500/50"
                      : "bg-amber-400/40 dark:bg-amber-500/30 hover:bg-amber-400/60 dark:hover:bg-amber-500/50"
                  )}
                />
                <span className="flex-1 px-2 py-1">
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
              </div>
            );
          })}
        </div>
      </main>

      {selectedWord && (
        <DictionaryPopup
          word={selectedWord.word}
          sentenceId={selectedWord.sentenceId}
          sentenceText={selectedWord.sentenceText}
          onClose={() => setSelectedWord(null)}
        />
      )}

      <ReaderFooter
        progress={progress}
        englishRatio={englishRatio}
        onRatioChange={handleRatioChange}
        ttsEnabled={ttsEnabled}
        onTtsToggle={() => setTtsEnabled((prev) => !prev)}
        ttsSupported={isSupported}
      />
    </div>
  );
}
