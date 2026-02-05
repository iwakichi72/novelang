import Link from "next/link";
import { BarChart3, BookMarked, BookText } from "lucide-react";
import { getBooks } from "@/lib/supabase";
import UserMenu from "@/components/user-menu";
import ContinueReading from "@/components/continue-reading";
import StreakDisplay from "@/components/streak-display";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CEFR_VARIANTS } from "@/lib/cefr-utils";

export default async function HomePage() {
  const books = await getBooks();

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-card border-b border-border px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Novelang</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              英語小説を、あなたのペースで
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/stats" className="gap-1.5">
                <BarChart3 className="size-4" />
                <span className="hidden sm:inline">統計</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/vocab" className="gap-1.5">
                <BookMarked className="size-4" />
                <span className="hidden sm:inline">単語帳</span>
              </Link>
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <StreakDisplay />
        <ContinueReading />

        <h2 className="text-lg font-semibold mb-4 text-foreground">作品を選ぶ</h2>
        <div className="space-y-3">
          {books.map((book) => (
            <Link key={book.id} href={`/library/${book.id}`}>
              <Card className="hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer">
                <CardContent className="flex gap-4 p-4">
                  <div className="size-16 bg-amber-50 dark:bg-amber-950/30 rounded-lg flex-shrink-0 flex items-center justify-center">
                    <BookText className="size-7 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* タイトル群: 近接 + 整列 */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-base leading-tight text-foreground font-serif">
                        {book.title_en}
                      </h3>
                      <Badge
                        variant="secondary"
                        className={CEFR_VARIANTS[book.cefr_level] ?? ""}
                      >
                        {book.cefr_level}
                      </Badge>
                    </div>
                    {/* メタ群: 近接 */}
                    <p className="text-sm text-muted-foreground">
                      {book.title_ja}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {book.author_en}
                    </p>
                    {/* 説明: コントラスト（階層を分離） */}
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                      {book.description_ja}
                    </p>
                    {/* 統計群 */}
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground/70">
                      <span>{book.total_chapters}章</span>
                      <span>約{Math.round(book.total_words / 1000)}K語</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
