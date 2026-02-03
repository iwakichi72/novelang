"use client";

import { useState, useCallback } from "react";

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((text: string, lang: "en" | "ja" = "en") => {
    // ブラウザがWeb Speech APIをサポートしているか確認
    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("Web Speech API is not supported");
      return;
    }

    // 既存の読み上げをキャンセル
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "en" ? "en-US" : "ja-JP";
    utterance.rate = 0.9; // 少しゆっくり
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);

  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  return { speak, stop, speaking, isSupported };
}
