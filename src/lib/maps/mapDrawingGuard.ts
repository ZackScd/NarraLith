import { trackAction } from "@/lib/action-audit/trackAction";
import type { MapAutosaveFlushReason } from "@/lib/maps/mapAutosave";
import type { MapSaveDrawingObsReason } from "@/lib/maps/mapSaveObs";
import { useMapUnsavedStore } from "@/stores/useMapUnsavedStore";

export type MapUnsavedContext =
  | "leave"
  | "mapSwitch"
  | "exitEdit"
  | "canvasOp"
  | "projectSwitch";

export type MapUnsavedDialogTrigger =
  | "exitEdit"
  | "selectMap"
  | "viewChange"
  | "canvasOp"
  | "project";

export function unsavedContextToTrigger(context: MapUnsavedContext): MapUnsavedDialogTrigger {
  switch (context) {
    case "exitEdit":
      return "exitEdit";
    case "mapSwitch":
      return "selectMap";
    case "leave":
      return "viewChange";
    case "canvasOp":
      return "canvasOp";
    case "projectSwitch":
      return "project";
  }
}

export interface MapDrawingGuardHandlers {
  shouldGuard: () => boolean;
  mapId: () => string | null;
  save: (
    context: MapUnsavedContext,
    options?: { obsReason?: MapSaveDrawingObsReason },
  ) => Promise<boolean>;
  discard: () => void;
  mapAutosaveEnabled: () => boolean;
}

let activeHandlers: MapDrawingGuardHandlers | null = null;
let pendingAction: (() => void | Promise<void>) | null = null;
let pendingResolve: ((ok: boolean) => void) | null = null;

export function registerMapDrawingGuard(
  handlers: MapDrawingGuardHandlers | null,
): () => void {
  activeHandlers = handlers;
  return () => {
    if (activeHandlers === handlers) {
      activeHandlers = null;
    }
  };
}

export function unsavedContextToFlushReason(
  context: MapUnsavedContext,
): MapAutosaveFlushReason {
  switch (context) {
    case "mapSwitch":
      return "mapSwitch";
    case "exitEdit":
      return "exitEdit";
    case "canvasOp":
      return "canvasOp";
    case "projectSwitch":
      return "projectSwitch";
    case "leave":
      return "exitEdit";
  }
}

function finishNavigation(ok: boolean): void {
  pendingAction = null;
  const resolve = pendingResolve;
  pendingResolve = null;
  resolve?.(ok);
}

/** Guarda navegación destructiva con dibujo sucio en edición (MAP-005b D21). */
export async function guardMapDrawingNavigation(
  action: () => void | Promise<void>,
  context: MapUnsavedContext = "leave",
): Promise<boolean> {
  const handlers = activeHandlers;
  if (!handlers?.shouldGuard()) {
    await action();
    return true;
  }

  if (handlers.mapAutosaveEnabled()) {
    const ok = await handlers.save(context);
    if (ok) {
      await action();
    }
    return ok;
  }

  return new Promise((resolve) => {
    pendingAction = action;
    pendingResolve = resolve;
    useMapUnsavedStore.getState().openDialog(context, {
      mapId: handlers.mapId(),
      trigger: unsavedContextToTrigger(context),
    });
  });
}

export async function confirmMapUnsavedSave(): Promise<void> {
  const handlers = activeHandlers;
  const action = pendingAction;
  const context = useMapUnsavedStore.getState().context;
  const mapId = useMapUnsavedStore.getState().mapId;
  if (!handlers || !action) {
    finishNavigation(false);
    useMapUnsavedStore.getState().closeDialog();
    return;
  }

  useMapUnsavedStore.getState().setSaving(true);
  const ok = await handlers.save(context, { obsReason: "dialog" });
  useMapUnsavedStore.getState().setSaving(false);

  if (!ok) {
    return;
  }

  trackAction("map", "unsavedChoice", { mapId, choice: "save" });
  useMapUnsavedStore.getState().closeDialog();
  try {
    await action();
    finishNavigation(true);
  } catch {
    finishNavigation(false);
  }
}

export function confirmMapUnsavedDiscard(): void {
  const handlers = activeHandlers;
  const action = pendingAction;
  const mapId = useMapUnsavedStore.getState().mapId;
  if (!handlers || !action) {
    useMapUnsavedStore.getState().closeDialog();
    finishNavigation(false);
    return;
  }

  handlers.discard();
  trackAction("map", "unsavedChoice", { mapId, choice: "discard" });
  useMapUnsavedStore.getState().closeDialog();
  void (async () => {
    try {
      await action();
      finishNavigation(true);
    } catch {
      finishNavigation(false);
    }
  })();
}

export function cancelMapUnsavedNavigation(): void {
  const mapId = useMapUnsavedStore.getState().mapId;
  trackAction("map", "unsavedChoice", { mapId, choice: "cancel" });
  useMapUnsavedStore.getState().closeDialog();
  finishNavigation(false);
}

export function __testResetMapDrawingGuard(): void {
  activeHandlers = null;
  pendingAction = null;
  pendingResolve = null;
  useMapUnsavedStore.getState().closeDialog();
}
