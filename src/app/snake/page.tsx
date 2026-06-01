import Link from "next/link";
import SnakeGame from "@/components/snake-game";

export default function SnakePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Snake</h1>
            <p className="text-sm text-gray-500 mt-1">
              クラシックなスネークゲーム
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ホームへ
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <SnakeGame />
      </main>
    </div>
  );
}
