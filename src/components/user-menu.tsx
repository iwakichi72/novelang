"use client";

import { useAuth } from "./auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserMenu() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return <Skeleton className="size-8 rounded-full" />;
  }

  if (!user) {
    return (
      <Button onClick={signInWithGoogle} size="sm">
        ログイン
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {user.email}
      </span>
      <Button variant="ghost" size="sm" onClick={signOut} className="text-xs text-muted-foreground">
        ログアウト
      </Button>
    </div>
  );
}
