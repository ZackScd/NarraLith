import { describe, expect, it } from "vitest";

import { normalizeLocationKey } from "@/lib/maps/mapLocationKeys";

describe("normalizeLocationKey", () => {
  it("trim y casefold", () => {
    expect(normalizeLocationKey("  Castillo  ")).toBe("castillo");
  });

  it("colapsa espacios", () => {
    expect(normalizeLocationKey("Ciudad   Interior")).toBe("ciudad interior");
  });
});
