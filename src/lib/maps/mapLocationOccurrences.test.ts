import { describe, expect, it } from "vitest";

import { extractLocationOccurrencesFromSegmentInput } from "@/lib/maps/mapLocationOccurrences";

describe("extractLocationOccurrencesFromSegmentInput §4bis.1", () => {
  it("A y B @ X; C @ Y", () => {
    const filePath = "Manuscrito/A.md";
    const occurrences = extractLocationOccurrencesFromSegmentInput({
      filePath,
      segmentIndex: 0,
      barTags: [
        { type: "time", value: "10.1.2020" },
        { type: "location", value: "A" },
        { type: "location", value: "B" },
        { type: "time", value: "15.7.2025" },
        { type: "location", value: "C" },
      ],
      body: "",
    });

    expect(occurrences).toHaveLength(3);
    expect(occurrences[0]?.label).toBe("A");
    expect(occurrences[0]?.effectiveTimeRaw).toBe("10.1.2020");
    expect(occurrences[1]?.label).toBe("B");
    expect(occurrences[1]?.effectiveTimeRaw).toBe("10.1.2020");
    expect(occurrences[2]?.label).toBe("C");
    expect(occurrences[2]?.effectiveTimeRaw).toBe("15.7.2025");
  });

  it("location sin time previo no emite", () => {
    const occurrences = extractLocationOccurrencesFromSegmentInput({
      filePath: "Manuscrito/B.md",
      segmentIndex: 1,
      barTags: [{ type: "location", value: "Orphan" }],
      body: "",
    });
    expect(occurrences).toHaveLength(0);
  });

  it("inline location tras time bar", () => {
    const occurrences = extractLocationOccurrencesFromSegmentInput({
      filePath: "Manuscrito/C.md",
      segmentIndex: 2,
      barTags: [{ type: "time", value: "15.7.2025" }],
      body: "text {{location:Castillo}} end",
    });
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]?.locationKey).toBe("castillo");
  });
});
