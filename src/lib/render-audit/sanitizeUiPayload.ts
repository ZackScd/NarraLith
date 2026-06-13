function truncateString(value: string, maxLen: number): string {
  if (value.length <= maxLen) {
    return value;
  }
  return `${value.slice(0, maxLen)}…`;
}

export function sanitizeUiPayload(
  payload: Record<string, unknown> | undefined,
  maxBytes: number,
): Record<string, unknown> | undefined {
  if (!payload) {
    return undefined;
  }

  try {
    const json = JSON.stringify(payload);
    if (json.length <= maxBytes) {
      return payload;
    }
  } catch {
    return { _error: "payload_not_serializable" };
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      out[key] = truncateString(value, 256);
    } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value.slice(0, 40);
      if (value.length > 40) {
        out.truncated = true;
        out.total = value.length;
      }
    } else if (typeof value === "object") {
      out[key] = "[object]";
    } else {
      out[key] = String(value);
    }
  }

  const trimmed = JSON.stringify(out);
  if (trimmed.length <= maxBytes) {
    return out;
  }

  return { _truncated: true, keys: Object.keys(payload).slice(0, 32) };
}
