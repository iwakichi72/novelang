"use client";

import { useAuth } from "./auth-provider";

export default function UserMenu() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
  }

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="text-sm bg-accent text-accent-foreground px-3 py-1.5 rounded-lg hover:bg-accent-hover transition-colors"
      >
        ログイン
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {user.email}
      </span>
      <button
        onClick={signOut}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ログアウト
      </button>
    </div>
  );
}
