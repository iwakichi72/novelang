"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createInitialState,
  setNextDirection,
  stepGame,
  type Direction,
  type GameState,
} from "@/lib/snake";

const GRID_COLS = 20;
const GRID_ROWS = 20;
const TICK_MS = 140;
const MAX_CANVAS_SIZE = 420;

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  W: "up",
  a: "left",
  A: "left",
  s: "down",
  S: "down",
  d: "right",
  D: "right",
};

export default function SnakeGame() {
  const [state, setState] = useState<GameState>(() =>
    createInitialState(GRID_COLS, GRID_ROWS)
  );
  const stateRef = useRef(state);
  const rngRef = useRef<() => number>(() => Math.random());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const manualOverrideRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const resetGame = useCallback(() => {
    manualOverrideRef.current = false;
    const next = createInitialState(GRID_COLS, GRID_ROWS, rngRef.current);
    next.mode = "running";
    stateRef.current = next;
    setState(next);
  }, []);

  const startGame = useCallback(() => {
    manualOverrideRef.current = false;
    setState((prev) => {
      if (prev.mode === "ready") {
        const next = { ...prev, mode: "running" };
        stateRef.current = next;
        return next;
      }
      if (prev.mode === "gameover") {
        const next = createInitialState(GRID_COLS, GRID_ROWS, rngRef.current);
        next.mode = "running";
        stateRef.current = next;
        return next;
      }
      return prev;
    });
  }, []);

  const togglePause = useCallback(() => {
    setState((prev) => {
      if (prev.mode === "running") {
        const next = { ...prev, mode: "paused" };
        stateRef.current = next;
        return next;
      }
      if (prev.mode === "paused") {
        const next = { ...prev, mode: "running" };
        stateRef.current = next;
        return next;
      }
      return prev;
    });
  }, []);

  const stepOnce = useCallback(() => {
    setState((prev) => {
      const next = stepGame(prev, rngRef.current);
      stateRef.current = next;
      return next;
    });
  }, []);

  const startLoop = useCallback(() => {
    if (intervalRef.current || manualOverrideRef.current) {
      return;
    }
    intervalRef.current = setInterval(stepOnce, TICK_MS);
  }, [stepOnce]);

  const stopLoop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const renderGame = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const size = Math.min(container.clientWidth, MAX_CANVAS_SIZE);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const current = stateRef.current;
    const cellSize = size / current.grid.cols;

    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    for (let i = 0; i <= current.grid.cols; i += 1) {
      const x = i * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let i = 0; i <= current.grid.rows; i += 1) {
      const y = i * cellSize;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    const [head, ...body] = current.snake;
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(
      head.x * cellSize + 1,
      head.y * cellSize + 1,
      cellSize - 2,
      cellSize - 2
    );

    ctx.fillStyle = "#16a34a";
    body.forEach((segment) => {
      ctx.fillRect(
        segment.x * cellSize + 1,
        segment.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );
    });

    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(
      (current.food.x + 0.5) * cellSize,
      (current.food.y + 0.5) * cellSize,
      cellSize * 0.35,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }, []);

  useEffect(() => {
    renderGame();
  }, [state, renderGame]);

  useEffect(() => {
    const onResize = () => renderGame();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [renderGame]);

  useEffect(() => {
    if (state.mode === "running") {
      startLoop();
    } else {
      stopLoop();
    }
    return () => stopLoop();
  }, [state.mode, startLoop, stopLoop]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key in KEY_TO_DIRECTION) {
        event.preventDefault();
        const direction = KEY_TO_DIRECTION[event.key];
        setState((prev) => {
          const next = setNextDirection(prev, direction);
          stateRef.current = next;
          return next;
        });
        return;
      }

      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        togglePause();
      }

      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        const container = containerRef.current;
        if (!document.fullscreenElement && container) {
          void container.requestFullscreen();
        } else if (document.fullscreenElement) {
          void document.exitFullscreen();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePause]);

  useEffect(() => {
    const handleFullscreenChange = () => renderGame();
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [renderGame]);

  useEffect(() => {
    window.render_game_to_text = () => {
      const current = stateRef.current;
      return JSON.stringify({
        mode: current.mode,
        score: current.score,
        grid: current.grid,
        direction: current.direction,
        snake: current.snake,
        food: current.food,
        coordinate_system: "origin top-left, x right, y down",
      });
    };

    window.advanceTime = (ms: number) => {
      manualOverrideRef.current = true;
      stopLoop();
      const steps = Math.max(1, Math.round(ms / TICK_MS));
      let next = stateRef.current;
      for (let i = 0; i < steps; i += 1) {
        next = stepGame(next, rngRef.current);
      }
      stateRef.current = next;
      setState(next);
      renderGame();
    };

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [renderGame, stopLoop]);

  const statusLabel = useMemo(() => {
    if (state.mode === "ready") return "準備中";
    if (state.mode === "paused") return "一時停止";
    if (state.mode === "gameover") return "ゲームオーバー";
    return "プレイ中";
  }, [state.mode]);

  const ControlButton = ({
    label,
    direction,
  }: {
    label: string;
    direction: Direction;
  }) => (
    <button
      type="button"
      onClick={() =>
        setState((prev) => {
          const next = setNextDirection(prev, direction);
          stateRef.current = next;
          return next;
        })
      }
      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm active:scale-95"
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">スコア</p>
            <p className="text-2xl font-semibold text-gray-900">{state.score}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">ステータス</p>
            <p className="text-sm font-medium text-gray-700">{statusLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {state.mode !== "running" && (
              <button
                type="button"
                onClick={startGame}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
              >
                {state.mode === "gameover" ? "再開" : "スタート"}
              </button>
            )}
            <button
              type="button"
              onClick={togglePause}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              {state.mode === "paused" ? "再開" : "一時停止"}
            </button>
            <button
              type="button"
              onClick={resetGame}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              リスタート
            </button>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center gap-4"
      >
        <canvas ref={canvasRef} className="rounded-xl" />
        <div className="text-xs text-gray-500 text-center leading-relaxed">
          矢印キー / WASD で移動。スペースで一時停止。f で全画面。
        </div>
      </div>

      <div className="sm:hidden">
        <div className="grid grid-cols-3 gap-2 w-40 mx-auto">
          <div />
          <ControlButton label="↑" direction="up" />
          <div />
          <ControlButton label="←" direction="left" />
          <ControlButton label="↓" direction="down" />
          <ControlButton label="→" direction="right" />
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}
