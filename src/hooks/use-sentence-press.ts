"use client";

import { useRef, useCallback } from "react";

/**
 * 文の長押しジェスチャーを管理するフック
 * 2秒長押しで日英切替、10px以上のスライドでキャンセル
 */
export function useSentencePress(onFlip: (sentenceId: string) => void) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const pressStartPos = useRef<{ x: number; y: number } | null>(null);

  const handlePressStart = useCallback(
    (sentenceId: string, x: number, y: number) => {
      longPressTriggered.current = false;
      pressStartPos.current = { x, y };
      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        onFlip(sentenceId);
      }, 2000);
    },
    [onFlip]
  );

  const handlePressMove = useCallback((x: number, y: number) => {
    if (!pressStartPos.current || !longPressTimer.current) return;
    const dx = x - pressStartPos.current.x;
    const dy = y - pressStartPos.current.y;
    if (dx * dx + dy * dy > 100) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pressStartPos.current = null;
  }, []);

  return { handlePressStart, handlePressMove, handlePressEnd, longPressTriggered };
}
