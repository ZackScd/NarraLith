/** Etiqueta Lexical para actualizaciones programáticas (hidratación); no marcan el documento como sucio. */
export const LEXICAL_HYDRATE_TAG = "narralith-hydrate";

let hydrating = false;

export function isEditorHydrating(): boolean {
  return hydrating;
}

/** Llamar al activar otra pestaña / documento, antes de que Lexical monte el lienzo vacío. */
export function beginEditorSession(): void {
  hydrating = true;
}

/** Ejecuta una hidratación sin que los listeners de cambio marquen `isDirty`. */
export function runEditorHydration(run: () => void): void {
  hydrating = true;
  try {
    run();
  } finally {
    queueMicrotask(() => {
      hydrating = false;
    });
  }
}
