"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleClick = () => {
    // ライト → ダーク → システム → ライト のサイクル
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="size-8"
      aria-label={`テーマ切替（現在: ${theme === "system" ? "システム" : theme === "dark" ? "ダーク" : "ライト"}）`}
      title={`テーマ: ${theme === "system" ? "システム" : theme === "dark" ? "ダーク" : "ライト"}`}
    >
      {theme === "system" ? (
        <Monitor className="size-4" />
      ) : resolvedTheme === "dark" ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </Button>
  );
}
