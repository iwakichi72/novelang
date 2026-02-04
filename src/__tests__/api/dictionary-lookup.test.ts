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

// --- fetch モック（Gemini API 用）---
const originalFetch = global.fetch;

// --- テスト対象のインポート ---
import { POST } from "@/app/api/dictionary/lookup/route";

// --- ヘルパー ---
function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/dictionary/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

function mockGeminiFetch(responseJson: Record<string, unknown>) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(responseJson) }],
            },
          },
        ],
      }),
  }) as any;
}

describe("/api/dictionary/lookup POST", () => {
  beforeEach(() => {
    resetMocks();
    global.fetch = originalFetch;
  });

  it("word がない場合は 400 を返す", async () => {
    const req = createRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("word is required");
  });

  it("キャッシュヒット時は既存エントリを generated=false で返す", async () => {
    const existingEntry = {
      id: "entry-1",
      word: "hello",
      meaning_ja: "こんにちは",
      pos: "名詞",
      pronunciation: "/həˈloʊ/",
    };
    mockChain.single.mockResolvedValueOnce({
      data: existingEntry,
      error: null,
    });

    const req = createRequest({ word: "Hello" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.generated).toBe(false);
    expect(json.entry.word).toBe("hello");
    expect(json.entry.meaning_ja).toBe("こんにちは");
  });

  it("キャッシュミス時は Gemini 生成して generated=true で返す", async () => {
    // DB: エントリなし
    mockChain.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116" },
    });

    // Gemini API レスポンス
    mockGeminiFetch({
      meaning_ja: "幸福",
      pos: "名詞",
      pronunciation: "/ˈhæpɪnəs/",
    });

    // insert → select → single の結果
    const insertedEntry = {
      id: "entry-new",
      word: "happiness",
      meaning_ja: "幸福",
      pos: "名詞",
      pronunciation: "/ˈhæpɪnəs/",
    };
    mockChain.single.mockResolvedValueOnce({
      data: insertedEntry,
      error: null,
    });

    const req = createRequest({ word: "happiness" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.generated).toBe(true);
    expect(json.entry.meaning_ja).toBe("幸福");
  });

  it("単語を小文字に正規化する", async () => {
    const entry = {
      id: "e1",
      word: "hello",
      meaning_ja: "こんにちは",
      pos: "名詞",
      pronunciation: null,
    };
    mockChain.single.mockResolvedValueOnce({ data: entry, error: null });

    const req = createRequest({ word: "HELLO" });
    await POST(req);

    // eq が "hello"（小文字）で呼ばれていることを確認
    expect(mockChain.eq).toHaveBeenCalledWith("word", "hello");
  });

  it("記号を除去するが ' と - は残す", async () => {
    const entry = {
      id: "e1",
      word: "don't",
      meaning_ja: "〜しない",
      pos: "その他",
      pronunciation: null,
    };
    mockChain.single.mockResolvedValueOnce({ data: entry, error: null });

    const req = createRequest({ word: "Don't!" });
    await POST(req);

    // "don't" で検索されること（! は除去、' は残る）
    expect(mockChain.eq).toHaveBeenCalledWith("word", "don't");
  });

  it("Gemini 応答がコードブロックで囲まれていてもパースできる", async () => {
    mockChain.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116" },
    });

    // コードブロック付きのレスポンス
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '```json\n{"meaning_ja":"テスト","pos":"名詞","pronunciation":"/tɛst/"}\n```',
                  },
                ],
              },
            },
          ],
        }),
    }) as any;

    const insertedEntry = {
      id: "e2",
      word: "test",
      meaning_ja: "テスト",
      pos: "名詞",
      pronunciation: "/tɛst/",
    };
    mockChain.single.mockResolvedValueOnce({
      data: insertedEntry,
      error: null,
    });

    const req = createRequest({ word: "test" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.entry.meaning_ja).toBe("テスト");
  });

  it("Gemini 応答にテキストが混在していても JSON を抽出できる", async () => {
    mockChain.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116" },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Here is the result: {"meaning_ja":"結果","pos":"名詞","pronunciation":"/rɪˈzʌlt/"} hope this helps!',
                  },
                ],
              },
            },
          ],
        }),
    }) as any;

    const insertedEntry = {
      id: "e3",
      word: "result",
      meaning_ja: "結果",
      pos: "名詞",
      pronunciation: "/rɪˈzʌlt/",
    };
    mockChain.single.mockResolvedValueOnce({
      data: insertedEntry,
      error: null,
    });

    const req = createRequest({ word: "result" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.entry.meaning_ja).toBe("結果");
  });

  it("insert 競合時は再取得して返す", async () => {
    // 1回目: キャッシュミス
    mockChain.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116" },
    });

    // Gemini API 成功
    mockGeminiFetch({
      meaning_ja: "世界",
      pos: "名詞",
      pronunciation: "/wɜːrld/",
    });

    // insert 失敗（競合）
    mockChain.single.mockResolvedValueOnce({
      data: null,
      error: { code: "23505", message: "duplicate key" },
    });

    // 再取得成功
    const retryEntry = {
      id: "e4",
      word: "world",
      meaning_ja: "世界",
      pos: "名詞",
      pronunciation: "/wɜːrld/",
    };
    mockChain.single.mockResolvedValueOnce({
      data: retryEntry,
      error: null,
    });

    const req = createRequest({ word: "world" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.generated).toBe(false); // 再取得なので false
    expect(json.entry.word).toBe("world");
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

    const req = createRequest({ word: "failure" });
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
