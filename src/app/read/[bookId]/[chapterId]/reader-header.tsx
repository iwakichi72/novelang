"use client";

import Link from "next/link";
import { ArrowLeft, EyeOff } from "lucide-react";
import type { Book, Chapter } from "@/types/database";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ReaderHeader({
  book,
  chapter,
  showHeader,
  onToggleHeader,
}: {
  book: Book;
  chapter: Chapter;
  showHeader: boolean;
  onToggleHeader: (show: boolean) => void;
}) {
  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 bg-card/95 backdrop-blur border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] z-20",
          "transition-transform duration-300",
          showHeader ? "translate-y-0" : "-translate-y-full"
        )}
      >
        <div className="max-w-2xl mx-auto grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/library/${book.id}`} className="gap-1.5">
              <ArrowLeft className="size-4" />
              戻る
            </Link>
          </Button>
          <span className="text-sm font-medium text-foreground text-center truncate">
            第{chapter.chapter_number}章
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleHeader(false)}
            className="gap-1 justify-self-end"
          >
            <EyeOff className="size-4" />
            隠す
          </Button>
        </div>
      </header>

      {!showHeader && (
        <button
          onClick={() => onToggleHeader(true)}
          className="fixed top-0 left-0 right-0 h-8 z-20"
          aria-label="ヘッダーを表示"
        />
      )}
    </>
  );
}
