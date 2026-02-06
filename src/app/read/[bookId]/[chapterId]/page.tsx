import { getBook, getChapter, getSentences } from "@/lib/supabase";
import ReaderView from "./reader-view";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ReadPage({
  params,
}: {
  params: Promise<{ bookId: string; chapterId: string }>;
}) {
  const { bookId, chapterId } = await params;
  if (!UUID_PATTERN.test(bookId) || !UUID_PATTERN.test(chapterId)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Content not found</p>
      </div>
    );
  }

  const [book, chapter, sentences] = await Promise.all([
    getBook(bookId),
    getChapter(chapterId),
    getSentences(chapterId),
  ]);

  if (!book || !chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Content not found</p>
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
