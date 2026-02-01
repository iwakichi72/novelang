"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";

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

      <div className="fixed left-4 right-4 z-40 max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-4 max-h-[60vh] overflow-y-auto" style={{ bottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-bold">{word}</h3>
            {entry?.pronunciation && (
              <p className="text-xs text-gray-400">{entry.pronunciation}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : entry ? (
          <div>
            <p className="text-xs text-gray-400 mb-1">{entry.pos}</p>
            <p className="text-sm text-gray-800">{entry.meaning_ja}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">辞書データがありません</p>
        )}

        {/* AI辞書セクション */}
        {aiResponse ? (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-blue-600 font-medium mb-1">AI辞書</p>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {aiResponse}
            </div>
          </div>
        ) : aiLoading ? (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-400 animate-pulse">
              AI辞書を読み込み中...
            </p>
          </div>
        ) : aiError ? (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-red-500">AI辞書の取得に失敗しました</p>
            <button
              onClick={handleAiLookup}
              className="text-xs text-blue-600 hover:underline mt-1"
            >
              再試行
            </button>
          </div>
        ) : null}

        <div className="flex gap-2 mt-4">
          {!aiResponse && !aiLoading && (
            <button
              onClick={handleAiLookup}
              className="flex-1 py-2 text-sm rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
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
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {saved ? "✓ 保存済み" : "＋ 保存"}
          </button>
        </div>
      </div>
    </>
  );
}
