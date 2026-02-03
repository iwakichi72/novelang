"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { useTTS } from "@/hooks/use-tts";

export default function DictionaryPopup({
  word,
  sentenceId,
  sentenceText,
  onClose,
}: {
  word: string;
  sentenceId: string;
  sentenceText: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const authSupabase = createClient();
  const { speak, speaking, isSupported } = useTTS();
  const [saved, setSaved] = useState(false);
  const [wordId, setWordId] = useState<string | null>(null);
  const [entry, setEntry] = useState<{
    meaning_ja: string;
    pos: string;
    pronunciation: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // AI辞書の状態
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    fetch("/api/dictionary/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, sentenceText }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.entry) {
          setWordId(data.entry.id);
          setEntry({
            meaning_ja: data.entry.meaning_ja,
            pos: data.entry.pos,
            pronunciation: data.entry.pronunciation,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [word, sentenceText]);

  const handleAiLookup = async () => {
    setAiLoading(true);
    setAiError(false);
    try {
      const res = await fetch("/api/dictionary/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, sentenceId, sentenceText }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setAiResponse(data.response_ja);
    } catch {
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />

      <div className="fixed left-4 right-4 z-40 max-w-md mx-auto bg-card-bg rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/50 border border-card-border p-4 max-h-[60vh] overflow-y-auto" style={{ bottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">{word}</h3>
            {isSupported && (
              <button
                onClick={() => speak(word, "en")}
                disabled={speaking}
                className="p-1 rounded-full text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
                aria-label="発音を再生"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg"
          >
            ✕
          </button>
        </div>
        {entry?.pronunciation && (
          <p className="text-xs text-muted-foreground -mt-1 mb-2">{entry.pronunciation}</p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : entry ? (
          <div>
            <p className="text-xs text-muted-foreground mb-1">{entry.pos}</p>
            <p className="text-sm text-foreground">{entry.meaning_ja}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">辞書データがありません</p>
        )}

        {/* AI辞書セクション */}
        {aiResponse ? (
          <div className="mt-3 pt-3 border-t border-card-border">
            <p className="text-xs text-accent font-medium mb-1">AI辞書</p>
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {aiResponse}
            </div>
          </div>
        ) : aiLoading ? (
          <div className="mt-3 pt-3 border-t border-card-border">
            <p className="text-sm text-muted-foreground animate-pulse">
              AI辞書を読み込み中...
            </p>
          </div>
        ) : aiError ? (
          <div className="mt-3 pt-3 border-t border-card-border">
            <p className="text-sm text-red-500 dark:text-red-400">AI辞書の取得に失敗しました</p>
            <button
              onClick={handleAiLookup}
              className="text-xs text-accent hover:underline mt-1"
            >
              再試行
            </button>
          </div>
        ) : null}

        <div className="flex gap-2 mt-4">
          {!aiResponse && !aiLoading && (
            <button
              onClick={handleAiLookup}
              className="flex-1 py-2 text-sm rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            >
              詳しく（AI辞書）
            </button>
          )}
          <button
            onClick={async () => {
              if (!user || !wordId) return;
              const { error } = await authSupabase.from("vocab_items").insert({
                user_id: user.id,
                word_id: wordId,
                sentence_id: sentenceId,
              } as never);
              if (!error) setSaved(true);
            }}
            disabled={saved || !user || !wordId}
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
              saved
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-button-inactive-bg text-button-inactive-text hover:opacity-80"
            }`}
          >
            {saved ? "✓ 保存済み" : "＋ 保存"}
          </button>
        </div>
      </div>
    </>
  );
}
