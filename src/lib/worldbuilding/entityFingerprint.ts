export function entityFingerprint(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  return JSON.stringify({ frontmatter, body });
}
