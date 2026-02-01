"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function DictionaryPopup({
  word,
  sentenceId,
  onClose,
}: {
  word: string;
  sentenceId: string;
  onClose: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [entry, setEntry] = useState<{
    meaning_ja: string;
    pos: string;
    pronunciation: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("word_entries")
      .select("meaning_ja, pos, pronunciation")
      .eq("word", word)
      .single()
      .then(({ data }) => {
        setEntry(data);
        setLoading(false);
      });
  }, [word]);

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />

      <div className="fixed bottom-24 left-4 right-4 z-40 max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-4">
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
          <p className="text-sm text-gray-500">
            辞書データがありません
          </p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setSaved(true)}
            disabled={saved}
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
              saved
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {saved ? "✓ 保存済み" : "＋ 単語帳に保存"}
          </button>
        </div>
      </div>
    </>
  );
}
