/** Genera id pin v1 (`pin-{hex8}`), patrón Rust. */
export function createLocationPinId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `pin-${hex}`;
}
