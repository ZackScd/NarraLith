import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

function panelDragKey(dragId: string) {
  return `map-panel-drag-${dragId}`;
}

interface MapLayerListDnDProviderProps {
  children: ReactNode;
  onReorder: (fromDragId: string, toDragId: string) => void;
}

export function MapLayerListDnDProvider({
  children,
  onReorder,
}: MapLayerListDnDProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const from = event.active.data.current?.dragId as string | undefined;
    const to = event.over?.data.current?.dragId as string | undefined;
    if (!from || !to || from === to) {
      return;
    }
    onReorder(from, to);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
  );
}

export function MapLayerDragHandle({
  dragId,
  className,
}: {
  dragId: string;
  className?: string;
}) {
  const { t } = useTranslation("maps");
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: panelDragKey(dragId),
    data: { dragId },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(
        "flex h-9 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted/50 active:cursor-grabbing",
        isDragging && "opacity-40",
        className,
      )}
      aria-label={t("studio.layers.dragLayer")}
      title={t("studio.layers.dragLayer")}
      onClick={(event) => event.stopPropagation()}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="size-3.5" strokeWidth={2.5} />
    </button>
  );
}

export function MapLayerDropRow({
  dragId,
  children,
  className,
  dropKind = "layer",
}: {
  dragId: string;
  children: ReactNode;
  className?: string;
  dropKind?: "layer" | "group";
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: panelDragKey(dragId),
    data: { dragId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && dropKind === "group" && "rounded-md ring-2 ring-amber-500/50 ring-inset",
        isOver && dropKind !== "group" && "ring-1 ring-primary/40 ring-inset",
      )}
    >
      {children}
    </div>
  );
}
