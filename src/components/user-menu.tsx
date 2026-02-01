"use client";

import { useAuth } from "./auth-provider";

export default function UserMenu() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />;
  }

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
      >
        ログイン
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 hidden sm:inline">
        {user.email}
      </span>
      <button
        onClick={signOut}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        ログアウト
      </button>
    </div>
  );
}
