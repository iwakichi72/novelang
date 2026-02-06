"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Book, Chapter, Sentence } from "@/types/database";
import DictionaryPopup from "./dictionary-popup";
import ReaderHeader from "./reader-header";
import ReaderFooter from "./reader-footer";
import type { EnglishRatio } from "./reader-footer";
import { useReadingProgress } from "@/hooks/use-reading-progress";
import { useSentencePress } from "@/hooks/use-sentence-press";
import { useTTS } from "@/hooks/use-tts";
import { cn } from "@/lib/utils";

type SentenceRowProps = {
  sentence: Sentence;
  lang: "en" | "ja";
  isSpeaking: boolean;
  onFlip: (sentenceId: string) => void;
  onWordTap: (word: string, sentenceId: string, sentenceText: string) => void;
  onPressStart: (sentenceId: string, x: number, y: number) => void;
  onPressMove: (x: number, y: number) => void;
  onPressEnd: () => void;
  setSentenceRef: (sentenceId: string, el: HTMLElement | null) => void;
};

const SentenceRow = memo(function SentenceRow({
  sentence,
  lang,
  isSpeaking,
  onFlip,
  onWordTap,
  onPressStart,
  onPressMove,
  onPressEnd,
  setSentenceRef,
}: SentenceRowProps) {
  const text = lang === "en" ? sentence.text_en : sentence.text_ja;
  const isJapanese = lang === "ja";

  return (
    <div
      ref={(el) => setSentenceRef(sentence.id, el)}
      className={cn(
        "flex transition-colors duration-150 rounded-sm text-reader-text",
        isJapanese ? "bg-sentence-ja-bg" : "bg-sentence-en-bg",
        isSpeaking && "ring-2 ring-primary/40 bg-primary/5"
      )}
    >
      <button
        type="button"
        onClick={() => onFlip(sentence.id)}
        aria-label="譌･闍ｱ蛻・崛"
        className={cn(
          "flex-shrink-0 w-2 rounded-l-sm transition-colors cursor-pointer",
          isJapanese
            ? "bg-emerald-400/40 dark:bg-emerald-500/30 hover:bg-emerald-400/60 dark:hover:bg-emerald-500/50"
            : "bg-amber-400/40 dark:bg-amber-500/30 hover:bg-amber-400/60 dark:hover:bg-amber-500/50"
        )}
      />
      <span
        className="flex-1 px-2 py-1"
        onTouchStart={(e) =>
          onPressStart(sentence.id, e.touches[0].clientX, e.touches[0].clientY)
        }
        onTouchMove={(e) =>
          onPressMove(e.touches[0].clientX, e.touches[0].clientY)
        }
        onTouchEnd={onPressEnd}
        onTouchCancel={onPressEnd}
        onMouseDown={(e) => onPressStart(sentence.id, e.clientX, e.clientY)}
        onMouseMove={(e) => onPressMove(e.clientX, e.clientY)}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
      >
        {lang === "en" ? (
          text.split(/(\s+)/).map((part, i) => {
            if (/^\s+$/.test(part)) return part;
            return (
              <span
                key={i}
                onClick={() => onWordTap(part, sentence.id, sentence.text_en)}
                className="hover:bg-word-hover rounded cursor-pointer select-none"
              >
                {part}
              </span>
            );
          })
        ) : (
          <span className="cursor-pointer select-none">{text}</span>
        )}
      </span>
    </div>
  );
});

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
  const [currentPosition, setCurrentPosition] = useState(0);

  const { savedPosition, saveProgress } = useReadingProgress(book.id, chapter.id);
  const { speakSentence, stop, speakingSentenceId, isSupported } = useTTS();
  const sentenceRefs = useRef<Map<string, HTMLElement>>(new Map());
  const hasRestoredPosition = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);
  const lastReportedPositionRef = useRef(0);

  const sentenceById = useMemo(() => {
    const map = new Map<string, Sentence>();
    for (const sentence of sentences) {
      map.set(sentence.id, sentence);
    }
    return map;
  }, [sentences]);

  const setSentenceRef = useCallback((sentenceId: string, el: HTMLElement | null) => {
    if (el) {
      sentenceRefs.current.set(sentenceId, el);
      return;
    }
    sentenceRefs.current.delete(sentenceId);
  }, []);

  const getDefaultLang = useCallback(
    (sentence: Sentence): "en" | "ja" => {
      if (englishRatio === 100) return "en";
      if (englishRatio === 25) return sentence.difficulty_score < 0.3 ? "en" : "ja";
      if (englishRatio === 50) return sentence.difficulty_score < 0.5 ? "en" : "ja";
      return sentence.difficulty_score < 0.7 ? "en" : "ja";
    },
    [englishRatio]
  );

  const getDisplayLang = useCallback(
    (sentence: Sentence): "en" | "ja" => {
      const isFlipped = flippedSentences.has(sentence.id);
      const defaultLang = getDefaultLang(sentence);
      if (isFlipped) return defaultLang === "en" ? "ja" : "en";
      return defaultLang;
    },
    [flippedSentences, getDefaultLang]
  );

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

      if (ttsEnabled && isSupported) {
        const sentence = sentenceById.get(sentenceId);
        if (sentence) {
          if (speakingSentenceId === sentenceId) {
            stop();
          } else {
            speakSentence(sentence.text_en, sentenceId, "en");
          }
        }
      }
    },
    [ttsEnabled, isSupported, sentenceById, speakingSentenceId, stop, speakSentence]
  );

  const { handlePressStart, handlePressMove, handlePressEnd, longPressTriggered } =
    useSentencePress(handleSentenceTap);

  const handleWordTap = useCallback(
    (word: string, sentenceId: string, sentenceText: string) => {
      if (longPressTriggered.current) return;
      const cleaned = word.replace(/[^a-zA-Z'-]/g, "").toLowerCase();
      if (cleaned.length < 2) return;
      setSelectedWord({ word: cleaned, sentenceId, sentenceText });
    },
    [longPressTriggered]
  );

  const handleRatioChange = useCallback((ratio: EnglishRatio) => {
    setEnglishRatio(ratio);
    setFlippedSentences(new Set());
  }, []);

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

  useEffect(() => {
    lastReportedPositionRef.current = 0;

    const updateProgress = () => {
      scrollFrameRef.current = null;

      const viewportMiddle = window.innerHeight / 2;
      let nextPosition = 0;

      for (const sentence of sentences) {
        const el = sentenceRefs.current.get(sentence.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top < viewportMiddle) {
          nextPosition = sentence.position;
        }
      }

      const scrollBottom = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (docHeight - scrollBottom < 50 && sentences.length > 0) {
        nextPosition = sentences[sentences.length - 1].position;
      }

      if (nextPosition <= 0) return;

      setCurrentPosition((prev) => (prev === nextPosition ? prev : nextPosition));

      if (lastReportedPositionRef.current !== nextPosition) {
        lastReportedPositionRef.current = nextPosition;
        saveProgress(nextPosition, nextPosition);
      }
    };

    const handleScroll = () => {
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current = window.requestAnimationFrame(updateProgress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    updateProgress();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, [sentences, saveProgress]);

  const progress =
    sentences.length > 0 ? Math.round((currentPosition / sentences.length) * 100) : 0;

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
          {sentences.map((sentence) => (
            <SentenceRow
              key={sentence.id}
              sentence={sentence}
              lang={getDisplayLang(sentence)}
              isSpeaking={speakingSentenceId === sentence.id}
              onFlip={handleSentenceTap}
              onWordTap={handleWordTap}
              onPressStart={handlePressStart}
              onPressMove={handlePressMove}
              onPressEnd={handlePressEnd}
              setSentenceRef={setSentenceRef}
            />
          ))}
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
