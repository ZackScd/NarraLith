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

function monthDragId(index: number) {
  return `month-drag-${index}`;
}

function monthDropId(index: number) {
  return `month-drop-${index}`;
}

interface MonthListDnDProviderProps {
  children: ReactNode;
  onReorder: (from: number, to: number) => void;
}

export function MonthListDnDProvider({
  children,
  onReorder,
}: MonthListDnDProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const from = event.active.data.current?.index;
    const to = event.over?.data.current?.index;
    if (typeof from !== "number" || typeof to !== "number" || from === to) {
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

export function MonthDragHandle({
  index,
  className,
}: {
  index: number;
  className?: string;
}) {
  const { t } = useTranslation("calendarView");
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: monthDragId(index),
    data: { index },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(
        "flex h-8 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-border/50 bg-muted/25 text-muted-foreground hover:bg-muted/40 active:cursor-grabbing",
        isDragging && "opacity-40",
        className,
      )}
      aria-label={t("edit.dragMonth")}
      title={t("edit.dragMonth")}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="size-3" strokeWidth={2.5} />
    </button>
  );
}

export function MonthDropRow({
  index,
  children,
  className,
}: {
  index: number;
  children: ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: monthDropId(index),
    data: { index },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && "rounded-md ring-1 ring-primary/40 ring-inset",
      )}
    >
      {children}
    </div>
  );
}
