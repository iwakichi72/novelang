"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OnlineStatus() {
  const isOnline = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // オフライン→オンライン復帰時にイベントで「復帰」表示
    const handleOnline = () => {
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-colors ${
        isOnline
          ? "bg-green-600 text-white"
          : "bg-yellow-500 text-yellow-950"
      }`}
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      {isOnline ? (
        <span className="inline-flex items-center gap-1.5">
          <Wifi className="size-4" />
          オンラインに戻りました
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          <WifiOff className="size-4" />
          オフラインモード — キャッシュ済みコンテンツのみ利用可能
        </span>
      )}
    </div>
  );
}
