import { describe, expect, it } from "vitest";

import { MAX_UI_PAYLOAD_BYTES } from "@/lib/render-audit/defaults";
import { createRenderAuditApi } from "@/lib/render-audit/createRenderAuditApi";
import { UI_EVENTS } from "@/lib/render-audit/events";
import { sanitizeUiPayload } from "@/lib/render-audit/sanitizeUiPayload";
import { createStubRenderAuditApi } from "@/lib/render-audit/stub";

describe("render-audit stub", () => {
  it("no registra cuando está desactivado", () => {
    const api = createStubRenderAuditApi();
    api.ui(UI_EVENTS.timeline.hover, { id: "x" });
    expect(api.getStandardSnapshot()).toEqual([]);
    expect(api.getVerboseSnapshot()).toEqual([]);
  });
});

describe("createRenderAuditApi", () => {
  it("separa buffers standard y verbose", () => {
    const api = createRenderAuditApi({
      renderLogEnabled: true,
      renderVerboseEnabled: true,
    });

    api.ui(UI_EVENTS.timeline.hover, { id: "a" }, { channel: "standard" });
    api.ui(UI_EVENTS.timeline.layout, { placed: [1, 2, 3] }, { channel: "verbose" });

    expect(api.getStandardSnapshot()).toHaveLength(1);
    expect(api.getStandardSnapshot()[0]?.event).toBe(UI_EVENTS.timeline.hover);
    expect(api.getVerboseSnapshot()).toHaveLength(1);
    expect(api.getVerboseSnapshot()[0]?.event).toBe(UI_EVENTS.timeline.layout);
  });

  it("verbose independiente de standard", () => {
    const api = createRenderAuditApi({ renderVerboseEnabled: true });
    api.ui(UI_EVENTS.timeline.layout, { ok: true }, { channel: "verbose" });
    expect(api.getStandardSnapshot()).toHaveLength(0);
    expect(api.getVerboseSnapshot()).toHaveLength(1);
  });
});

describe("sanitizeUiPayload", () => {
  it("trunca payloads grandes", () => {
    const huge = { items: Array.from({ length: 200 }, (_, i) => `item-${i}`) };
    const sanitized = sanitizeUiPayload(huge, MAX_UI_PAYLOAD_BYTES);
    expect(sanitized).toBeTruthy();
    expect(JSON.stringify(sanitized).length).toBeLessThanOrEqual(MAX_UI_PAYLOAD_BYTES + 64);
  });
});
