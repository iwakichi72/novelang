"use client";

import { useState, useCallback } from "react";

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [speakingSentenceId, setSpeakingSentenceId] = useState<string | null>(null);

  // 単語読み上げ（辞書ポップアップ用、後方互換）
  const speak = useCallback((text: string, lang: "en" | "ja" = "en") => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("Web Speech API is not supported");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "en" ? "en-US" : "ja-JP";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      setSpeakingSentenceId(null);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setSpeakingSentenceId(null);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // 文読み上げ（文ID追跡付き）
  const speakSentence = useCallback((text: string, sentenceId: string, lang: "en" | "ja" = "en") => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "en" ? "en-US" : "ja-JP";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setSpeaking(true);
      setSpeakingSentenceId(sentenceId);
    };
    utterance.onend = () => {
      setSpeaking(false);
      setSpeakingSentenceId(null);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setSpeakingSentenceId(null);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setSpeakingSentenceId(null);
    }
  }, []);

  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  return { speak, speakSentence, stop, speaking, speakingSentenceId, isSupported };
}
