"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WifiOff, BookOpen, ArrowRight, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const [cachedPages, setCachedPages] = useState<string[]>([]);

  useEffect(() => {
    if (!("caches" in window)) return;

    caches.open("reader-pages").then((cache) => {
      cache.keys().then((requests) => {
        const paths = requests
          .map((req) => new URL(req.url).pathname)
          .filter((path) => path.startsWith("/read/"));
        setCachedPages(paths);
      });
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm w-full">
        <div className="size-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="size-10 text-muted-foreground" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          オフラインです
        </h1>
        <p className="text-muted-foreground mb-8">
          インターネットに接続されていません。
          <br />
          キャッシュ済みのページは引き続き読めます。
        </p>

        {cachedPages.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              読めるページ
            </h2>
            <div className="space-y-2">
              {cachedPages.map((path) => (
                <Link key={path} href={path}>
                  <Card className="hover:bg-accent/50 transition-colors">
                    <CardContent className="flex items-center gap-3 p-3">
                      <BookOpen className="size-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-foreground flex-1 text-left truncate">
                        {path}
                      </span>
                      <ArrowRight className="size-4 text-muted-foreground flex-shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link href="/">
          <Button variant="outline" className="w-full">
            <Home className="size-4 mr-2" />
            ホームに戻る
          </Button>
        </Link>
      </div>
    </div>
  );
}
