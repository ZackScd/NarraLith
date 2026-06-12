import { describe, expect, it } from "vitest";

import { createAuditApi } from "@/lib/audit/createAuditApi";
import { buildAuditIpcPayload } from "@/lib/audit/auditInvoke";
import { AuditRingBuffer } from "@/lib/audit/ringBuffer";
import { sanitizeAuditPayload } from "@/lib/audit/sanitizePayload";
import { createStubAuditApi } from "@/lib/audit/stub";

describe("audit ring buffer", () => {
  it("evicts oldest entries when over capacity", () => {
    const buffer = new AuditRingBuffer(2);
    buffer.push({
      id: "1",
      ts: 1,
      level: "info",
      domain: "system",
      event: "a",
      source: "frontend",
    });
    buffer.push({
      id: "2",
      ts: 2,
      level: "info",
      domain: "system",
      event: "b",
      source: "frontend",
    });
    buffer.push({
      id: "3",
      ts: 3,
      level: "info",
      domain: "system",
      event: "c",
      source: "frontend",
    });
    expect(buffer.toArray().map((e) => e.id)).toEqual(["2", "3"]);
  });
});

describe("sanitizeAuditPayload", () => {
  it("truncates when total json exceeds limit", () => {
    const payload = { note: "x".repeat(3_000) };
    const out = sanitizeAuditPayload(payload);
    expect(JSON.stringify(out).length).toBeLessThanOrEqual(2_048);
  });
});

describe("createAuditApi", () => {
  it("is no-op when disabled", () => {
    const api = createAuditApi({ enabled: false });
    api.info("editor", "obs.editor.save.start", { path: "Manuscrito/a.md" });
    expect(api.getEntries()).toEqual([]);
  });

  it("calls persist handler when enabled", () => {
    const persisted: string[] = [];
    const api = createAuditApi({ enabled: true });
    api.setPersistHandler((entry) => {
      persisted.push(entry.event);
    });
    api.info("system", "obs.test");
    expect(persisted).toEqual(["obs.test"]);
  });

  it("records entries when enabled", () => {
    const api = createAuditApi({ enabled: true, level: "info" });
    api.info("editor", "obs.editor.save.start", { path: "Manuscrito/a.md" });
    expect(api.getEntries()).toHaveLength(1);
    expect(api.getEntries()[0]?.event).toBe("obs.editor.save.start");
  });

  it("respects minimum log level", () => {
    const api = createAuditApi({ enabled: true, level: "warn" });
    api.info("editor", "obs.editor.save.start");
    api.warn("editor", "obs.editor.tab.close");
    expect(api.getEntries()).toHaveLength(1);
    expect(api.getEntries()[0]?.level).toBe("warn");
  });

  it("propagates correlation id", () => {
    const api = createAuditApi({ enabled: true });
    api.withCorrelation("save-batch-1", () => {
      api.info("editor", "obs.editor.save.start");
    });
    expect(api.getEntries()[0]?.correlationId).toBe("save-batch-1");
  });

  it("supports nested begin/end correlation", () => {
    const api = createAuditApi({ enabled: true });
    const outer = api.beginCorrelation("save-all-1");
    api.beginCorrelation("save-1");
    api.info("editor", "obs.editor.save.start");
    api.endCorrelation();
    api.endCorrelation();
    expect(outer).toBe("save-all-1");
    expect(api.getEntries()[0]?.correlationId).toBe("save-1");
  });
});

describe("buildAuditIpcPayload", () => {
  it("includes cmd and path without logging arg values by default", () => {
    const payload = buildAuditIpcPayload("save_manuscript", {
      filePath: "Manuscrito/a.md",
      manuscript: { segments: [{}, {}] },
    });
    expect(payload.cmd).toBe("save_manuscript");
    expect(payload.path).toBe("Manuscrito/a.md");
    expect(payload.argKeys).toEqual(["filePath", "manuscript"]);
    expect(payload).not.toHaveProperty("segmentCount");
  });
});

describe("audit subscribe", () => {
  it("notifies listeners on push and clear", () => {
    const api = createAuditApi({ enabled: true });
    let calls = 0;
    const unsubscribe = api.subscribe(() => {
      calls += 1;
    });
    api.info("system", "obs.test");
    expect(calls).toBe(1);
    api.clearBuffer();
    expect(calls).toBe(2);
    unsubscribe();
    api.info("system", "obs.test");
    expect(calls).toBe(2);
  });

  it("getSnapshot keeps stable reference until buffer changes", () => {
    const api = createAuditApi({ enabled: true });
    const first = api.getSnapshot();
    const second = api.getSnapshot();
    expect(first).toBe(second);
    api.info("system", "obs.test");
    const third = api.getSnapshot();
    expect(third).not.toBe(first);
  });
});

describe("reportDegraded", () => {
  it("buffers without throwing when persist fails", () => {
    const api = createAuditApi({ enabled: true });
    api.reportDegraded("append_failed");
    expect(api.getEntries()).toHaveLength(1);
    expect(api.getEntries()[0]?.event).toBe("obs.system.audit.degraded");
  });
});

describe("createStubAuditApi", () => {
  it("never records entries", () => {
    const api = createStubAuditApi();
    api.info("system", "obs.test");
    expect(api.getEntries()).toEqual([]);
    expect(api.isEnabled()).toBe(false);
  });
});
