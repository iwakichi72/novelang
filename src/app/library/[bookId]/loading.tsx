export default function LibraryBookLoading() {
  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto h-8 animate-pulse rounded bg-muted" />
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-44 animate-pulse rounded-xl bg-card" />
        <div className="h-12 animate-pulse rounded-lg bg-card" />
        <div className="space-y-2">
          <div className="h-16 animate-pulse rounded-lg bg-card" />
          <div className="h-16 animate-pulse rounded-lg bg-card" />
          <div className="h-16 animate-pulse rounded-lg bg-card" />
        </div>
      </main>
    </div>
  );
}
