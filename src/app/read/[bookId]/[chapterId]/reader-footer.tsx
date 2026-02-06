"use client";

import { Volume2, VolumeOff } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type EnglishRatio = 25 | 50 | 75 | 100;

export const RATIO_LABELS: Record<EnglishRatio, string> = {
  25: "25%",
  50: "50%",
  75: "75%",
  100: "100%",
};

export default function ReaderFooter({
  progress,
  englishRatio,
  onRatioChange,
  ttsEnabled,
  onTtsToggle,
  ttsSupported,
}: {
  progress: number;
  englishRatio: EnglishRatio;
  onRatioChange: (ratio: EnglishRatio) => void;
  ttsEnabled: boolean;
  onTtsToggle: () => void;
  ttsSupported: boolean;
}) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-20">
      <div className="max-w-2xl mx-auto">
        {/* プログレスバー */}
        <div className="flex items-center gap-2 mb-3">
          <Progress value={progress} className="flex-1 h-1.5" />
          <span className="text-xs text-muted-foreground w-10 text-right">
            {progress}%
          </span>
        </div>

        {/* 英語量スライダー + TTS + テーマ切替 */}
        <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
          <span className="text-xs text-muted-foreground">英語量:</span>
          <div className="flex gap-1">
            {([25, 50, 75, 100] as EnglishRatio[]).map((ratio) => (
              <button
                key={ratio}
                onClick={() => onRatioChange(ratio)}
                className={cn(
                  "flex-1 py-1.5 text-xs rounded-md transition-all",
                  englishRatio === ratio
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "bg-secondary/50 text-secondary-foreground hover:bg-secondary"
                )}
              >
                {RATIO_LABELS[ratio]}
              </button>
            ))}
          </div>
          {ttsSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onTtsToggle}
              className={cn(
                "size-8 transition-colors",
                ttsEnabled
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground"
              )}
              aria-label={ttsEnabled ? "読み上げOFF" : "読み上げON"}
            >
              {ttsEnabled ? (
                <Volume2 className="size-4" />
              ) : (
                <VolumeOff className="size-4" />
              )}
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
