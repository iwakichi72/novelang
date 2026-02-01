"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";

type VocabWithDetails = {
  id: string;
  word: string;
  meaning_ja: string;
  pos: string;
  sentence_text_en: string;
  created_at: string;
};

export default function VocabPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<VocabWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const fetchVocab = async () => {
      // vocab_items を取得
      const { data: vocabItems } = await supabase
        .from("vocab_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!vocabItems || vocabItems.length === 0) {
        setLoading(false);
        return;
      }

      // word_ids と sentence_ids を収集
      const wordIds = vocabItems.map((v) => (v as { word_id: string }).word_id);
      const sentenceIds = vocabItems.map((v) => (v as { sentence_id: string }).sentence_id);

      // word_entries を一括取得
      const { data: words } = await supabase
        .from("word_entries")
        .select("id, word, meaning_ja, pos")
        .in("id", wordIds);

      // sentences を一括取得
      const { data: sentences } = await supabase
        .from("sentences")
        .select("id, text_en")
        .in("id", sentenceIds);

      const wordMap = new Map(
        (words ?? []).map((w) => {
          const wd = w as { id: string; word: string; meaning_ja: string; pos: string };
          return [wd.id, wd];
        })
      );
      const sentenceMap = new Map(
        (sentences ?? []).map((s) => {
          const sd = s as { id: string; text_en: string };
          return [sd.id, sd];
        })
      );

      const result: VocabWithDetails[] = vocabItems.map((v) => {
        const vi = v as { id: string; word_id: string; sentence_id: string; created_at: string };
        const w = wordMap.get(vi.word_id);
        const s = sentenceMap.get(vi.sentence_id);
        return {
          id: vi.id,
          word: w?.word ?? "?",
          meaning_ja: w?.meaning_ja ?? "",
          pos: w?.pos ?? "",
          sentence_text_en: s?.text_en ?? "",
          created_at: vi.created_at,
        };
      });

      setItems(result);
      setLoading(false);
    };

    fetchVocab();
  }, [user, authLoading]);

  const handleDelete = async (vocabId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("vocab_items")
      .delete()
      .eq("id", vocabId);
    if (!error) {
      setItems((prev) => prev.filter((item) => item.id !== vocabId));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
              ← 戻る
            </Link>
            <h1 className="text-lg font-bold">単語帳</h1>
          </div>
          <span className="text-sm text-gray-400">{items.length}語</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {!user ? (
          <p className="text-center text-gray-500 py-12">
            ログインすると単語帳が使えます
          </p>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            保存した単語はまだありません。<br />
            読書中に単語をタップして「＋ 保存」を押してみましょう。
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-bold text-base">{item.word}</h3>
                      <span className="text-xs text-gray-400">{item.pos}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{item.meaning_ja}</p>
                    {item.sentence_text_en && (
                      <p className="text-xs text-gray-400 mt-2 italic line-clamp-2">
                        &ldquo;{item.sentence_text_en}&rdquo;
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-gray-300 hover:text-red-500 text-sm ml-3 flex-shrink-0"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
