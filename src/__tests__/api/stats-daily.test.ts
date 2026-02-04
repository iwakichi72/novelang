import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Supabase モック（vi.hoisted で vi.mock のホイスティングに対応）---
const { mockSupabase, mockChain, resetMocks } = vi.hoisted(() => {
  const chain: Record<string, any> = {
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
  for (const key of Object.keys(chain)) {
    if (key === "single") {
      chain[key].mockResolvedValue({ data: null, error: null });
    } else {
      chain[key].mockReturnValue(chain);
    }
  }
  const supabase = { from: vi.fn(() => chain) };

  function resetMocks() {
    for (const [key, fn] of Object.entries(chain)) {
      (fn as any).mockClear();
      if (key === "single") {
        (fn as any).mockResolvedValue({ data: null, error: null });
      } else {
        (fn as any).mockReturnValue(chain);
      }
    }
  }

  return { mockSupabase: supabase, mockChain: chain, resetMocks };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// --- テスト対象のインポート（モック適用後に行う）---
import { GET, POST } from "@/app/api/stats/daily/route";

// --- ヘルパー ---
function createRequest(
  method: string,
  options: { userId?: string; body?: Record<string, unknown> } = {}
) {
  const headers = new Headers();
  if (options.userId) headers.set("x-user-id", options.userId);
  headers.set("Content-Type", "application/json");

  const init: RequestInit = { method, headers };
  if (options.body) {
    init.body = JSON.stringify(options.body);
  }

  return new Request("http://localhost:3000/api/stats/daily", init) as any;
}

describe("/api/stats/daily", () => {
  beforeEach(() => {
    resetMocks();
    vi.useFakeTimers();
    // 2025-06-15T12:00:00Z に固定
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ========================================
  // GET
  // ========================================
  describe("GET", () => {
    it("x-user-id ヘッダがない場合は 401 を返す", async () => {
      const req = createRequest("GET");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("今日のレコードがない場合はデフォルト値を返す", async () => {
      // 両方の single() がデータなしを返す
      mockChain.single
        .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }) // today
        .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }); // latest

      const req = createRequest("GET", { userId: "user-1" });
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.today.sentences_read).toBe(0);
      expect(json.currentStreak).toBe(0);
    });

    it("今日のレコードがある場合はその統計を返す", async () => {
      const todayData = {
        sentences_read: 42,
        minutes_read: 15,
        streak_days: 5,
        date: "2025-06-15",
      };
      mockChain.single
        .mockResolvedValueOnce({ data: todayData, error: null }) // today
        .mockResolvedValueOnce({ data: todayData, error: null }); // latest (same as today)

      const req = createRequest("GET", { userId: "user-1" });
      const res = await GET(req);
      const json = await res.json();

      expect(json.today.sentences_read).toBe(42);
      expect(json.currentStreak).toBe(5);
    });

    it("最新レコードが昨日の場合はストリークを継続する", async () => {
      const yesterdayData = {
        streak_days: 3,
        date: "2025-06-14",
      };
      mockChain.single
        .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }) // today: なし
        .mockResolvedValueOnce({ data: yesterdayData, error: null }); // latest: 昨日

      const req = createRequest("GET", { userId: "user-1" });
      const res = await GET(req);
      const json = await res.json();

      expect(json.currentStreak).toBe(3);
    });

    it("最新レコードが2日以上前の場合はストリークをリセットする", async () => {
      const oldData = {
        streak_days: 10,
        date: "2025-06-10", // 5日前
      };
      mockChain.single
        .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }) // today: なし
        .mockResolvedValueOnce({ data: oldData, error: null }); // latest: 5日前

      const req = createRequest("GET", { userId: "user-1" });
      const res = await GET(req);
      const json = await res.json();

      expect(json.currentStreak).toBe(0);
    });
  });

  // ========================================
  // POST
  // ========================================
  describe("POST", () => {
    it("x-user-id ヘッダがない場合は 401 を返す", async () => {
      const req = createRequest("POST", {
        body: { sentences_read: 5 },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("初回POST（昨日のレコードなし）→ streak_days=1 で新規作成", async () => {
      mockChain.single
        .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }) // today: なし
        .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }); // yesterday: なし

      // insert のチェーン終端は特殊処理不要（デフォルトで error: null）

      const req = createRequest("POST", {
        userId: "user-1",
        body: { sentences_read: 10, minutes_read: 5 },
      });
      const res = await POST(req);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.streak_days).toBe(1);
      expect(json.date).toBe("2025-06-15");
    });

    it("初回POST（昨日のレコードあり）→ ストリーク継続", async () => {
      mockChain.single
        .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }) // today: なし
        .mockResolvedValueOnce({
          data: { streak_days: 3 },
          error: null,
        }); // yesterday: streak=3

      const req = createRequest("POST", {
        userId: "user-1",
        body: { sentences_read: 10, minutes_read: 5 },
      });
      const res = await POST(req);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.streak_days).toBe(4); // 3 + 1
    });

    it("今日2回目のPOST → 累積加算", async () => {
      const todayData = {
        sentences_read: 10,
        minutes_read: 5,
        streak_days: 2,
        date: "2025-06-15",
      };
      mockChain.single
        .mockResolvedValueOnce({ data: todayData, error: null }) // today: あり
        .mockResolvedValueOnce({ data: null, error: null }); // yesterday: 不問

      const req = createRequest("POST", {
        userId: "user-1",
        body: { sentences_read: 5, minutes_read: 3 },
      });
      const res = await POST(req);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.streak_days).toBe(2); // 既存のストリーク維持

      // update が呼ばれていることを確認
      expect(mockChain.update).toHaveBeenCalledWith({
        sentences_read: 15, // 10 + 5
        minutes_read: 8, // 5 + 3
      });
    });

    it("DB操作失敗時は 500 を返す", async () => {
      // today レコードなし → insert で失敗
      mockChain.single
        .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } })
        .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } });

      // insert の戻り値にエラーを設定
      // insert はチェーンの途中なので、insert 自体が返す mockChain に
      // 最終的に返される値を設定する必要がある
      // ここでは insert が直接 { error } を返すケースをシミュレート
      mockChain.insert.mockReturnValueOnce({
        error: { message: "DB insert error" },
      });

      const req = createRequest("POST", {
        userId: "user-1",
        body: { sentences_read: 5 },
      });
      const res = await POST(req);

      expect(res.status).toBe(500);
    });
  });
});
