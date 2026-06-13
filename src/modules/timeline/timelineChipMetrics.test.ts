import { describe, expect, it } from "vitest";

import {
  CHIP_MAX_WIDTH,
  CHIP_MIN_WIDTH,
  CHIP_TRUNC_EVENT,
  CHIP_TRUNC_FILE,
  CHIP_TRUNC_SIMPLE,
  estimateChipWidth,
  measureLineWidth,
  truncateForChip,
} from "@/modules/timeline/timelineChipMetrics";

describe("truncateForChip", () => {
  it("deja texto corto intacto", () => {
    expect(truncateForChip("meow", 18)).toBe("meow");
  });

  it("trunca con elipsis cuando supera maxLen", () => {
    const long = "abcdefghijklmnopqrstuvwxyz";
    expect(truncateForChip(long, 18)).toBe(`${long.slice(0, 17)}…`);
    expect(truncateForChip(long, 18).length).toBe(18);
  });
});

describe("measureLineWidth", () => {
  it("ajusta nombres cortos sin piso artificial de 72px", () => {
    const width = measureLineWidth("meow", CHIP_TRUNC_SIMPLE, 6.5);
    expect(width).toBeGreaterThanOrEqual(CHIP_MIN_WIDTH);
    expect(width).toBeLessThan(72);
    expect(width).toBe(34);
  });

  it("respeta el ancho máximo cuando el texto visible lo supera", () => {
    const longVisible = "x".repeat(30);
    expect(measureLineWidth(longVisible, 30, 6.5)).toBe(CHIP_MAX_WIDTH);
  });

  it("usa texto truncado para la medida", () => {
    const long = "abcdefghijklmnopqrstuvwxyz";
    const visible = truncateForChip(long, CHIP_TRUNC_SIMPLE);
    const expected = Math.min(
      CHIP_MAX_WIDTH,
      Math.max(CHIP_MIN_WIDTH, Math.ceil(visible.length * 6.5) + 8),
    );
    expect(measureLineWidth(long, CHIP_TRUNC_SIMPLE, 6.5)).toBe(expected);
  });
});

describe("estimateChipWidth", () => {
  it("mide chip simple por label", () => {
    expect(estimateChipWidth({ label: "meow", fileLabel: "meow", eventLabel: null })).toBe(
      measureLineWidth("meow", CHIP_TRUNC_SIMPLE, 6.5),
    );
  });

  it("dual usa el max de archivo y evento", () => {
    const width = estimateChipWidth({
      label: "eventoTest (meow)",
      fileLabel: "meow",
      eventLabel: "eventoTest",
    });
    expect(width).toBe(
      Math.max(
        measureLineWidth("meow", CHIP_TRUNC_FILE, 6),
        measureLineWidth("eventoTest", CHIP_TRUNC_EVENT, 6.5),
      ),
    );
  });

  it("dual con evento largo trunca antes de medir", () => {
    const width = estimateChipWidth({
      label: "x (y)",
      fileLabel: "y",
      eventLabel: "x".repeat(40),
    });
    expect(width).toBe(
      measureLineWidth("x".repeat(40), CHIP_TRUNC_EVENT, 6.5),
    );
    expect(width).toBeLessThan(CHIP_MAX_WIDTH);
  });
});
