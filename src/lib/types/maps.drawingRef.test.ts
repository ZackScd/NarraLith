import { describe, expect, it } from "vitest";

import { drawingRefKey, parseDrawingRefKey } from "@/lib/types/maps";

describe("drawingRefKey nav", () => {
  it("encodes nav ref", () => {
    expect(drawingRefKey({ kind: "nav", id: "nav-abc12345" })).toBe("nav:nav-abc12345");
  });

  it("round-trips nav ref", () => {
    const ref = { kind: "nav" as const, id: "nav-deadbeef" };
    expect(parseDrawingRefKey(drawingRefKey(ref))).toEqual(ref);
  });
});
