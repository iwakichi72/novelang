export default function ReadLoading() {
  return (
    <div className="min-h-screen bg-reader-bg">
      <main className="max-w-2xl mx-auto px-6 pt-16 pb-32 space-y-2">
        <div className="h-12 animate-pulse rounded bg-sentence-en-bg" />
        <div className="h-12 animate-pulse rounded bg-sentence-ja-bg" />
        <div className="h-12 animate-pulse rounded bg-sentence-en-bg" />
        <div className="h-12 animate-pulse rounded bg-sentence-ja-bg" />
        <div className="h-12 animate-pulse rounded bg-sentence-en-bg" />
      </main>
    </div>
  );
}
