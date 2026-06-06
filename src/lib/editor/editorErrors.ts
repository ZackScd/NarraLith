/** Normaliza claves IPC `error.editor.*` al namespace `editor`. */
export function normalizeEditorErrorKey(key: string): string {
  if (key.startsWith("error.editor.")) {
    return `error.${key.slice("error.editor.".length)}`;
  }
  if (key.startsWith("error.parser.")) {
    return `error.${key.slice("error.parser.".length)}`;
  }
  if (key.startsWith("error.")) {
    return key;
  }
  return `error.${key}`;
}
