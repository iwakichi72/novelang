import Link from "next/link";
import { getBooks } from "@/lib/supabase";
import UserMenu from "@/components/user-menu";
import ContinueReading from "@/components/continue-reading";
import StreakDisplay from "@/components/streak-display";

const CEFR_COLORS: Record<string, string> = {
  A1: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300",
  A2: "bg-green-200 dark:bg-green-800/40 text-green-900 dark:text-green-200",
  B1: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
  B2: "bg-blue-200 dark:bg-blue-800/40 text-blue-900 dark:text-blue-200",
  C1: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300",
  C2: "bg-purple-200 dark:bg-purple-800/40 text-purple-900 dark:text-purple-200",
};

export default async function HomePage() {
  const books = await getBooks();

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-card-bg border-b border-card-border px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Novelang</h1>
            <p className="text-sm text-muted-foreground mt-1">
              英語小説を、あなたのペースで
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/stats"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              統計
            </Link>
            <Link
              href="/vocab"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              単語帳
            </Link>
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
            <Link
              key={book.id}
              href={`/library/${book.id}`}
              className="block bg-card-bg rounded-xl border border-card-border p-4 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 transition-shadow"
            >
              <div className="flex gap-4">
                <div className="w-16 h-22 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center text-2xl">
                  📖
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <h3 className="font-semibold text-base leading-tight text-foreground">
                      {book.title_en}
                    </h3>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                        CEFR_COLORS[book.cefr_level] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {book.cefr_level}
                    </span>
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
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
