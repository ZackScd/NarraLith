/** Traduce claves de error IPC del checker de consistencia. */
export function consistencyErrorKey(key: string | null | undefined): string {
  if (!key) {
    return "errors.error.unknown";
  }
  const known = ["error.consistency.invalid_dismissed"] as const;
  if ((known as readonly string[]).includes(key)) {
    const suffix = key.replace("error.consistency.", "");
    return `errors.${suffix}`;
  }
  return "errors.error.unknown";
}
