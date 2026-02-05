import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getBook, getChapters } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CEFR_VARIANTS } from "@/lib/cefr-utils";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const book = await getBook(bookId);
  const chapters = book ? await getChapters(bookId) : [];

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">作品が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" className="gap-1.5">
              <ArrowLeft className="size-4" />
              戻る
            </Link>
          </Button>
          <h1 className="text-base font-semibold truncate text-foreground">{book.title_en}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-6">
            {/* タイトル群: 整列（justify-between） */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-xl font-bold text-foreground font-serif">{book.title_en}</h2>
              <Badge
                variant="secondary"
                className={CEFR_VARIANTS[book.cefr_level] ?? ""}
              >
                {book.cefr_level}
              </Badge>
            </div>
            {/* メタ群: 近接 */}
            <p className="text-base text-muted-foreground">{book.title_ja}</p>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
              {book.author_en} / {book.author_ja}
            </p>
            {/* 説明: コントラスト */}
            <p className="text-sm text-foreground leading-relaxed mb-4">{book.description_ja}</p>
            {/* 統計群 */}
            <div className="flex gap-6 text-sm text-muted-foreground/70">
              <span>{book.total_chapters}章</span>
              <span>{book.total_sentences}文</span>
              <span>約{Math.round(book.total_words / 1000)}K語</span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button size="lg" className="w-full text-base" asChild>
            <Link href={`/read/${bookId}/${chapters[0]?.id ?? ""}`}>
              読み始める
            </Link>
          </Button>
        </div>

        {chapters.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground">章一覧</h3>
            <div className="space-y-2">
              {chapters.map((ch) => (
                <Link key={ch.id} href={`/read/${bookId}/${ch.id}`}>
                  <Card className="hover:shadow-sm transition-all duration-200 cursor-pointer">
                    <CardContent className="flex justify-between items-center px-4 py-3">
                      <div>
                        <span className="text-sm font-medium text-foreground">
                          第{ch.chapter_number}章
                        </span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {ch.title_en}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 min-w-[80px] justify-end">
                        <span className="text-xs text-muted-foreground/70">
                          {ch.sentence_count}文
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
