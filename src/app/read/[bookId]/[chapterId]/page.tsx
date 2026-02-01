import { MOCK_BOOKS, MOCK_CHAPTERS, MOCK_SENTENCES } from "@/lib/mock-data";
import ReaderView from "./reader-view";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ bookId: string; chapterId: string }>;
}) {
  const { bookId, chapterId } = await params;
  const book = MOCK_BOOKS.find((b) => b.id === bookId);
  const chapter = MOCK_CHAPTERS.find((c) => c.id === chapterId);
  const sentences = MOCK_SENTENCES.filter((s) => s.chapter_id === chapterId).sort(
    (a, b) => a.position - b.position
  );

  if (!book || !chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>コンテンツが見つかりません</p>
      </div>
    );
  }

  return (
    <ReaderView
      book={book}
      chapter={chapter}
      sentences={sentences}
    />
  );
}
