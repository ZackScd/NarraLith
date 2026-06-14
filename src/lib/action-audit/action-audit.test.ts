import { describe, expect, it } from "vitest";

import { MAX_ACTION_PAYLOAD_BYTES } from "@/lib/action-audit/defaults";
import { createActionAuditApi } from "@/lib/action-audit/createActionAuditApi";
import { sanitizeActionPayload } from "@/lib/action-audit/sanitizeActionPayload";
import { createStubActionAuditApi } from "@/lib/action-audit/stub";

describe("action-audit stub", () => {
  it("no registra cuando está desactivado", () => {
    const api = createStubActionAuditApi();
    api.track("workspace", "viewChange", { from: "editor", to: "calendar" });
    expect(api.getSessionSnapshot()).toEqual([]);
    expect(api.getVerboseSnapshot()).toEqual([]);
  });
});

describe("createActionAuditApi", () => {
  it("separa buffers session y verbose", () => {
    const api = createActionAuditApi({
      actionLogEnabled: true,
      actionVerboseEnabled: true,
    });

    api.track("workspace", "viewChange", { from: "editor", to: "timeline" }, { channel: "session" });
    api.track("explorer", "select", { path: "a.md" }, { channel: "verbose" });

    expect(api.getSessionSnapshot()).toHaveLength(1);
    expect(api.getSessionSnapshot()[0]?.event).toBe("obs.action.workspace.viewChange");
    expect(api.getVerboseSnapshot()).toHaveLength(1);
    expect(api.getVerboseSnapshot()[0]?.event).toBe("obs.action.explorer.select");
  });

  it("verbose independiente de session", () => {
    const api = createActionAuditApi({ actionVerboseEnabled: true });
    api.track("editor", "save", { ok: true }, { channel: "verbose" });
    expect(api.getSessionSnapshot()).toHaveLength(0);
    expect(api.getVerboseSnapshot()).toHaveLength(1);
  });
});

describe("sanitizeActionPayload", () => {
  it("trunca payloads grandes", () => {
    const huge = { items: Array.from({ length: 200 }, (_, i) => `item-${i}`) };
    const sanitized = sanitizeActionPayload(huge, MAX_ACTION_PAYLOAD_BYTES);
    expect(sanitized).toBeTruthy();
    expect(JSON.stringify(sanitized).length).toBeLessThanOrEqual(MAX_ACTION_PAYLOAD_BYTES + 64);
  });
});
