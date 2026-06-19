import { describe, expect, it } from "vitest";

import {
  hostDrawingRefKey,
  isSameHostDrawingRef,
  parseHostDrawingRefKey,
  PRINCIPAL_HOST_DRAWING_REF,
} from "@/lib/maps/mapHostDrawingRef";

describe("hostDrawingRefKey", () => {
  it("principal", () => {
    expect(hostDrawingRefKey({ kind: "principal" })).toBe("principal");
  });

  it("nav", () => {
    expect(hostDrawingRefKey({ kind: "nav", id: "nav-abc" })).toBe("nav:nav-abc");
  });
});

describe("parseHostDrawingRefKey", () => {
  it("round-trip principal", () => {
    expect(parseHostDrawingRefKey("principal")).toEqual(PRINCIPAL_HOST_DRAWING_REF);
  });

  it("round-trip nav", () => {
    const ref = { kind: "nav" as const, id: "nav-deadbeef" };
    expect(parseHostDrawingRefKey(hostDrawingRefKey(ref))).toEqual(ref);
  });

  it("rejects invalid keys", () => {
    expect(parseHostDrawingRefKey("")).toBeNull();
    expect(parseHostDrawingRefKey("nav:")).toBeNull();
    expect(parseHostDrawingRefKey("secondary:sec-1")).toBeNull();
  });
});

describe("isSameHostDrawingRef", () => {
  it("matches principal", () => {
    expect(isSameHostDrawingRef({ kind: "principal" }, { kind: "principal" })).toBe(true);
  });

  it("distinguishes nav ids", () => {
    expect(
      isSameHostDrawingRef({ kind: "nav", id: "a" }, { kind: "nav", id: "b" }),
    ).toBe(false);
  });
});
