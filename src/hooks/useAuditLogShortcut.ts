import { useEffect } from "react";

import { useAuditStore } from "@/stores/useAuditStore";

/** Atajo dev: Ctrl+Shift+L abre/cierra el visor de auditoría. */
export function useAuditLogShortcut() {
  const toggleViewer = useAuditStore((s) => s.toggleViewer);

  useEffect(() => {
    if (!__AUDIT_ENABLED__) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (!event.ctrlKey || !event.shiftKey || event.key.toLowerCase() !== "l") {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      event.preventDefault();
      toggleViewer();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleViewer]);
}
