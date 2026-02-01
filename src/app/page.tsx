import Link from "next/link";
import { getBooks } from "@/lib/supabase";

const CEFR_COLORS: Record<string, string> = {
  A1: "bg-green-100 text-green-800",
  A2: "bg-green-200 text-green-900",
  B1: "bg-blue-100 text-blue-800",
  B2: "bg-blue-200 text-blue-900",
  C1: "bg-purple-100 text-purple-800",
  C2: "bg-purple-200 text-purple-900",
};

export default async function HomePage() {
  const books = await getBooks();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold">Novelang</h1>
          <p className="text-sm text-gray-500 mt-1">
            英語小説を、あなたのペースで
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-lg font-semibold mb-4">作品を選ぶ</h2>
        <div className="space-y-4">
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/library/${book.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex gap-4">
                <div className="w-16 h-22 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl">
                  📖
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <h3 className="font-semibold text-base leading-tight">
                      {book.title_en}
                    </h3>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                        CEFR_COLORS[book.cefr_level] ?? "bg-gray-100"
                      }`}
                    >
                      {book.cefr_level}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {book.title_ja}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {book.author_en}
                  </p>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {book.description_ja}
                  </p>
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
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
