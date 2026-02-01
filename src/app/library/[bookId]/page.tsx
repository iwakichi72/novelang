import Link from "next/link";
import { getBook, getChapters } from "@/lib/supabase";

const CEFR_COLORS: Record<string, string> = {
  A1: "bg-green-100 text-green-800",
  A2: "bg-green-200 text-green-900",
  B1: "bg-blue-100 text-blue-800",
  B2: "bg-blue-200 text-blue-900",
  C1: "bg-purple-100 text-purple-800",
  C2: "bg-purple-200 text-purple-900",
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
      <div className="min-h-screen flex items-center justify-center">
        <p>作品が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            ← 戻る
          </Link>
          <h1 className="text-base font-semibold truncate">{book.title_en}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-2 mb-2">
            <h2 className="text-xl font-bold">{book.title_en}</h2>
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                CEFR_COLORS[book.cefr_level] ?? "bg-gray-100"
              }`}
            >
              {book.cefr_level}
            </span>
          </div>
          <p className="text-base text-gray-600 mb-1">{book.title_ja}</p>
          <p className="text-sm text-gray-400 mb-4">
            {book.author_en} / {book.author_ja}
          </p>
          <p className="text-sm text-gray-700 mb-4">{book.description_ja}</p>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>{book.total_chapters}章</span>
            <span>{book.total_sentences}文</span>
            <span>約{Math.round(book.total_words / 1000)}K語</span>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href={`/read/${bookId}/${chapters[0]?.id ?? ""}`}
            className="block w-full bg-blue-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            読み始める
          </Link>
        </div>

        {chapters.length > 0 && (
          <div className="mt-6">
            <h3 className="text-base font-semibold mb-3">章一覧</h3>
            <div className="space-y-2">
              {chapters.map((ch) => (
                <Link
                  key={ch.id}
                  href={`/read/${bookId}/${ch.id}`}
                  className="block bg-white rounded-lg border border-gray-200 px-4 py-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium">
                        第{ch.chapter_number}章
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        {ch.title_en}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
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
