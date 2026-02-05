"use client";

import { useState, useEffect } from "react";
import { Volume2, X, Check, Plus, Sparkles, RotateCcw } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { useTTS } from "@/hooks/use-tts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

      <div
        className="fixed left-4 right-4 z-40 max-w-md mx-auto bg-card rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/50 border border-border p-4 max-h-[60vh] overflow-y-auto animate-in slide-in-from-bottom-4 fade-in duration-200"
        style={{ bottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">{word}</h3>
            {isSupported && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => speak(word, "en")}
                disabled={speaking}
                className="size-8"
                aria-label="発音を再生"
              >
                <Volume2 className="size-4" />
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8"
          >
            <X className="size-4" />
          </Button>
        </div>
        {entry?.pronunciation && (
          <p className="text-xs text-muted-foreground -mt-1 mb-2">{entry.pronunciation}</p>
        )}

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-40" />
          </div>
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
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-primary font-medium mb-1 flex items-center gap-1">
              <Sparkles className="size-3" />
              AI辞書
            </p>
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {aiResponse}
            </div>
          </div>
        ) : aiLoading ? (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : aiError ? (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-sm text-destructive">AI辞書の取得に失敗しました</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAiLookup}
              className="mt-1 gap-1 text-primary"
            >
              <RotateCcw className="size-3" />
              再試行
            </Button>
          </div>
        ) : null}

        <div className="flex gap-2 mt-4">
          {!aiResponse && !aiLoading && (
            <Button
              variant="outline"
              onClick={handleAiLookup}
              className="flex-1 gap-1.5"
            >
              <Sparkles className="size-4" />
              詳しく（AI辞書）
            </Button>
          )}
          <Button
            variant={saved ? "secondary" : "outline"}
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
            className={`flex-1 gap-1.5 ${
              saved
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                : ""
            }`}
          >
            {saved ? (
              <>
                <Check className="size-4" />
                保存済み
              </>
            ) : (
              <>
                <Plus className="size-4" />
                保存
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
