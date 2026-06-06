/** Normaliza claves IPC al namespace `references` para `useTranslation('references')`. */
export function normalizeReferencesErrorKey(key: string): string {
  if (key.startsWith("error.references.")) {
    return `error.${key.slice("error.references.".length)}`;
  }
  if (key.startsWith("error.refactor.")) {
    return `error.refactor.${key.slice("error.refactor.".length)}`;
  }
  if (key.startsWith("error.wikilink.")) {
    return `error.wikilink.${key.slice("error.wikilink.".length)}`;
  }
  if (key.startsWith("error.")) {
    return key;
  }
  return `error.${key}`;
}
