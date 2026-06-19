import { describe, expect, it } from "vitest";

import { resolveMapPreviewT } from "@/lib/maps/mapPreviewT";

describe("resolveMapPreviewT", () => {
  it("prefiere previewTimeTRaw sobre desde", () => {
    expect(resolveMapPreviewT("15.7.2028", "15.7.2025")).toBe("15.7.2028");
  });

  it("usa desde si preview es null", () => {
    expect(resolveMapPreviewT(null, "15.7.2025")).toBe("15.7.2025");
  });

  it("devuelve null si ambos vacíos", () => {
    expect(resolveMapPreviewT(null, null)).toBeNull();
    expect(resolveMapPreviewT("  ", null)).toBeNull();
  });
});
