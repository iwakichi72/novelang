import { vi } from "vitest";

/**
 * Supabase のチェーン可能なクエリビルダーをモックする。
 *
 * 使い方:
 *   const { mockSupabase, mockChain } = createMockSupabase();
 *   vi.mocked(createClient).mockReturnValue(mockSupabase as any);
 *
 *   // single() の返却値を設定
 *   mockChain.single.mockResolvedValueOnce({ data: { id: "1", ... }, error: null });
 */
export function createMockSupabase() {
  const mockChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    in: vi.fn(),
  };

  // 各メソッドがデフォルトで this（mockChain）を返すようにする
  for (const key of Object.keys(mockChain)) {
    if (key === "single") {
      // single はチェーン終端なので Promise を返す
      mockChain[key].mockResolvedValue({ data: null, error: null });
    } else {
      mockChain[key].mockReturnValue(mockChain);
    }
  }

  const mockSupabase = {
    from: vi.fn(() => mockChain),
  };

  return { mockSupabase, mockChain };
}

/**
 * モックチェーンの呼び出し履歴をすべてリセットする。
 */
export function resetMockChain(mockChain: Record<string, ReturnType<typeof vi.fn>>) {
  for (const fn of Object.values(mockChain)) {
    fn.mockClear();
  }
  // デフォルト動作を再設定
  for (const [key, fn] of Object.entries(mockChain)) {
    if (key === "single") {
      fn.mockResolvedValue({ data: null, error: null });
    } else {
      fn.mockReturnValue(mockChain);
    }
  }
}
