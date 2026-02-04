import { describe, it, expect, vi, beforeEach } from "vitest";

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

// --- fetch モック ---
const originalFetch = global.fetch;

// --- テスト対象のインポート ---
import { POST } from "@/app/api/dictionary/ai/route";

// --- ヘルパー ---
function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/dictionary/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("/api/dictionary/ai POST", () => {
  beforeEach(() => {
    resetMocks();
    global.fetch = originalFetch;
  });

  it("word または sentenceId がない場合は 400 を返す", async () => {
    // word のみ（sentenceId なし）
    const req1 = createRequest({ word: "test" });
    const res1 = await POST(req1);
    expect(res1.status).toBe(400);

    // sentenceId のみ（word なし）
    const req2 = createRequest({ sentenceId: "s-1" });
    const res2 = await POST(req2);
    expect(res2.status).toBe(400);

    // 両方なし
    const req3 = createRequest({});
    const res3 = await POST(req3);
    expect(res3.status).toBe(400);
  });

  it("キャッシュヒット時は cached=true で返す", async () => {
    const cachedData = {
      response_ja:
        "■ この文脈での意味:\n幸福な\n\n■ ニュアンス:\nポジティブな感情\n\n■ 例文:\nShe is happy.",
    };
    mockChain.single.mockResolvedValueOnce({
      data: cachedData,
      error: null,
    });

    const req = createRequest({
      word: "happy",
      sentenceId: "s-1",
      sentenceText: "The Happy Prince stood on a tall column.",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.cached).toBe(true);
    expect(json.response_ja).toContain("この文脈での意味");
  });

  it("キャッシュミス時は Gemini で生成して cached=false で返す", async () => {
    // キャッシュなし
    mockChain.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116" },
    });

    // Gemini API レスポンス
    const geminiResponse =
      "■ この文脈での意味:\n高い\n\n■ ニュアンス:\n物理的な高さ\n\n■ 例文:\nThe tall building.";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [{ text: geminiResponse }],
              },
            },
          ],
        }),
    }) as any;

    const req = createRequest({
      word: "tall",
      sentenceId: "s-2",
      sentenceText: "The Happy Prince stood on a tall column.",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.cached).toBe(false);
    expect(json.response_ja).toContain("高い");

    // キャッシュに保存されたことを確認
    expect(mockChain.insert).toHaveBeenCalledWith({
      word: "tall",
      sentence_id: "s-2",
      response_ja: geminiResponse,
    });
  });

  it("Gemini API 失敗時は 500 を返す", async () => {
    mockChain.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116" },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    }) as any;

    const req = createRequest({
      word: "error",
      sentenceId: "s-3",
      sentenceText: "An error occurred.",
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("AI辞書の取得に失敗しました");
  });
});
