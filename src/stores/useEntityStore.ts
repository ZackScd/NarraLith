/**
 * API de ficha activa (Fase 4.1.6).
 * El estado vive en `useEditorStore` (pestañas unificadas); este módulo expone selectores de entidad.
 */
import { useEditorStore } from "@/stores/useEditorStore";

export function useEntityStore() {
  const entity = useEditorStore((s) => s.entity);
  const isDirty = useEditorStore((s) => s.isDirty);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const patchEntityField = useEditorStore((s) => s.patchEntityField);
  const setEntityBody = useEditorStore((s) => s.setEntityBody);
  const saveEntity = useEditorStore((s) => s.saveEntity);

  return {
    entity,
    isDirty,
    saveStatus,
    patchEntityField,
    setEntityBody,
    saveEntity,
  };
}
