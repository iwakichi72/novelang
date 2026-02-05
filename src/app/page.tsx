import Link from "next/link";
import { BarChart3, BookMarked, BookText } from "lucide-react";
import { getBooks } from "@/lib/supabase";
import UserMenu from "@/components/user-menu";
import ContinueReading from "@/components/continue-reading";
import StreakDisplay from "@/components/streak-display";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CEFR_VARIANTS: Record<string, string> = {
  A1: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-transparent",
  A2: "bg-green-200 dark:bg-green-800/40 text-green-900 dark:text-green-200 border-transparent",
  B1: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-transparent",
  B2: "bg-blue-200 dark:bg-blue-800/40 text-blue-900 dark:text-blue-200 border-transparent",
  C1: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-transparent",
  C2: "bg-purple-200 dark:bg-purple-800/40 text-purple-900 dark:text-purple-200 border-transparent",
};

export default async function HomePage() {
  const books = await getBooks();

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-card border-b border-border px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Novelang</h1>
            <p className="text-sm text-muted-foreground mt-1">
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
        <div className="space-y-4">
          {books.map((book) => (
            <Link key={book.id} href={`/library/${book.id}`}>
              <Card className="hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer">
                <CardContent className="flex gap-4 p-4">
                  <div className="size-16 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center">
                    <BookText className="size-7 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <h3 className="font-semibold text-base leading-tight text-foreground">
                        {book.title_en}
                      </h3>
                      <Badge
                        variant="secondary"
                        className={CEFR_VARIANTS[book.cefr_level] ?? ""}
                      >
                        {book.cefr_level}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {book.title_ja}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {book.author_en}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {book.description_ja}
                    </p>
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
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
