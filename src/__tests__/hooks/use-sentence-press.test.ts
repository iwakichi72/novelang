import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSentencePress } from "@/hooks/use-sentence-press";

describe("useSentencePress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("triggers onFlip after long press duration", () => {
    const onFlip = vi.fn();
    const { result } = renderHook(() => useSentencePress(onFlip));

    act(() => {
      result.current.handlePressStart("s1", 0, 0);
    });
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(onFlip).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onFlip).toHaveBeenCalledTimes(1);
    expect(onFlip).toHaveBeenCalledWith("s1");
    expect(result.current.longPressTriggered.current).toBe(true);
  });

  it("does not trigger when released early", () => {
    const onFlip = vi.fn();
    const { result } = renderHook(() => useSentencePress(onFlip));

    act(() => {
      result.current.handlePressStart("s1", 0, 0);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
      result.current.handlePressEnd();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onFlip).not.toHaveBeenCalled();
    expect(result.current.longPressTriggered.current).toBe(false);
  });

  it("cancels when pointer moves beyond threshold", () => {
    const onFlip = vi.fn();
    const { result } = renderHook(() => useSentencePress(onFlip));

    act(() => {
      result.current.handlePressStart("s1", 0, 0);
      result.current.handlePressMove(20, 0);
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onFlip).not.toHaveBeenCalled();
  });

  it("keeps timer active for small movement", () => {
    const onFlip = vi.fn();
    const { result } = renderHook(() => useSentencePress(onFlip));

    act(() => {
      result.current.handlePressStart("s1", 0, 0);
      result.current.handlePressMove(5, 5);
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onFlip).toHaveBeenCalledTimes(1);
  });
});
