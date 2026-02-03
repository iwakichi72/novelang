import Link from "next/link";
import { getBook, getChapters } from "@/lib/supabase";

const CEFR_COLORS: Record<string, string> = {
  A1: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300",
  A2: "bg-green-200 dark:bg-green-800/40 text-green-900 dark:text-green-200",
  B1: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
  B2: "bg-blue-200 dark:bg-blue-800/40 text-blue-900 dark:text-blue-200",
  C1: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300",
  C2: "bg-purple-200 dark:bg-purple-800/40 text-purple-900 dark:text-purple-200",
};

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
      <header className="bg-card-bg border-b border-card-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            ← 戻る
          </Link>
          <h1 className="text-base font-semibold truncate text-foreground">{book.title_en}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-card-bg rounded-xl border border-card-border p-6">
          <div className="flex items-start gap-2 mb-2">
            <h2 className="text-xl font-bold text-foreground">{book.title_en}</h2>
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                CEFR_COLORS[book.cefr_level] ?? "bg-muted text-muted-foreground"
              }`}
            >
              {book.cefr_level}
            </span>
          </div>
          <p className="text-base text-muted-foreground mb-1">{book.title_ja}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {book.author_en} / {book.author_ja}
          </p>
          <p className="text-sm text-foreground mb-4">{book.description_ja}</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{book.total_chapters}章</span>
            <span>{book.total_sentences}文</span>
            <span>約{Math.round(book.total_words / 1000)}K語</span>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href={`/read/${bookId}/${chapters[0]?.id ?? ""}`}
            className="block w-full bg-accent text-accent-foreground text-center py-3 rounded-xl font-semibold hover:bg-accent-hover transition-colors"
          >
            読み始める
          </Link>
        </div>

        {chapters.length > 0 && (
          <div className="mt-6">
            <h3 className="text-base font-semibold mb-3 text-foreground">章一覧</h3>
            <div className="space-y-2">
              {chapters.map((ch) => (
                <Link
                  key={ch.id}
                  href={`/read/${bookId}/${ch.id}`}
                  className="block bg-card-bg rounded-lg border border-card-border px-4 py-3 hover:shadow-sm dark:hover:shadow-black/10 transition-shadow"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        第{ch.chapter_number}章
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {ch.title_en}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {ch.sentence_count}文
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
