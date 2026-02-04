import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("単一クラスをそのまま返す", () => {
    expect(cn("px-4")).toBe("px-4");
  });

  it("複数クラスを結合する", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("falsy値を除外する", () => {
    expect(cn("px-4", false && "py-2")).toBe("px-4");
    expect(cn("px-4", undefined, null, "py-2")).toBe("px-4 py-2");
  });

  it("Tailwindの競合するクラスは後者が優先される", () => {
    expect(cn("px-4", "px-8")).toBe("px-8");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});
