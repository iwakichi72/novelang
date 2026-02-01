import { getBook, getChapter, getSentences } from "@/lib/supabase";
import ReaderView from "./reader-view";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ bookId: string; chapterId: string }>;
}) {
  const { bookId, chapterId } = await params;
  const book = await getBook(bookId);
  const chapter = await getChapter(chapterId);
  const sentences = chapter ? await getSentences(chapterId) : [];

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
