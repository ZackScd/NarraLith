import { useEffect, useRef } from "react";

import { useEditorStore } from "@/stores/useEditorStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

/**
 * Autoguardado opcional (configuración): tras pausa de escritura y/o intervalo periódico.
 * Desactivado por defecto; el usuario guarda manualmente o activa autoguardado en ajustes.
 * Respeta `autosaveSuppressUntil` tras commit de etiqueta en panel (§1.3.1).
 */
export function useEditorAutoSave() {
  const autosaveEnabled = useSettingsStore((s) => s.autosaveEnabled);
  const debounceSec = useSettingsStore((s) => s.autosaveDebounceSec);
  const intervalSec = useSettingsStore((s) => s.autosaveIntervalSec);

  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const isDirty = useEditorStore((s) => s.isDirty);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const autosaveSuppressUntil = useEditorStore((s) => s.autosaveSuppressUntil);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (
      !autosaveEnabled ||
      !activeFilePath ||
      !isDirty ||
      saveStatus === "saving" ||
      autosaveSuppressUntil > Date.now()
    ) {
      return;
    }

    if (debounceSec <= 0) {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void useEditorStore.getState().saveDocument();
    }, debounceSec * 1000);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
    autosaveEnabled,
    activeFilePath,
    isDirty,
    saveStatus,
    debounceSec,
    autosaveSuppressUntil,
  ]);

  useEffect(() => {
    if (!autosaveEnabled || !activeFilePath || intervalSec <= 0) {
      return;
    }

    const interval = setInterval(() => {
      const state = useEditorStore.getState();
      if (
        state.isDirty &&
        state.saveStatus !== "saving" &&
        state.autosaveSuppressUntil <= Date.now()
      ) {
        void state.saveDocument();
      }
    }, intervalSec * 1000);

    return () => clearInterval(interval);
  }, [autosaveEnabled, activeFilePath, intervalSec]);
}
