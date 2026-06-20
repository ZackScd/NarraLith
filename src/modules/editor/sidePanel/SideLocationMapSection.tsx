import { MapPin, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackAction } from "@/lib/action-audit/trackAction";
import { legacyBlockIndexFromContext } from "@/lib/editor/documentSync";
import { timeTagFromEventSegment } from "@/lib/editor/manuscriptBlocks";
import { normalizeLocationKey } from "@/lib/maps/mapLocationKeys";
import type { EventSegment } from "@/lib/types/manuscript";
import { useEditorStore } from "@/stores/useEditorStore";
import { useMapStore } from "@/stores/useMapStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function SideLocationMapSection() {
  const { t } = useTranslation("editor");

  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const activeTabKind = useEditorStore((s) => s.activeTabKind);
  const activeEventContext = useEditorStore((s) => s.activeEventContext);
  const manuscript = useEditorStore((s) => s.manuscript);
  const insertInlineTagAtCursor = useEditorStore((s) => s.insertInlineTagAtCursor);

  const activeMapId = useMapStore((s) => s.activeMapId);
  const setViewMode = useMapStore((s) => s.setViewMode);
  const setPendingEditorLocationPin = useMapStore((s) => s.setPendingEditorLocationPin);
  const setMainView = useWorkspaceStore((s) => s.setMainView);

  const [locationName, setLocationName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const isManuscriptTab = activeTabKind === "manuscript";
  const canEdit = isManuscriptTab && Boolean(activeFilePath);

  const activeEventSegment = useMemo(() => {
    if (!manuscript || !activeEventContext.inEvent || activeEventContext.segmentIndex === null) {
      return null;
    }
    const segment = manuscript.segments[activeEventContext.segmentIndex];
    return segment?.kind === "event" ? segment : null;
  }, [activeEventContext.inEvent, activeEventContext.segmentIndex, manuscript]);

  const blockTimeRaw = useMemo(
    () => (activeEventSegment ? timeTagFromEventSegment(activeEventSegment as EventSegment) : null),
    [activeEventSegment],
  );

  const trimmedName = locationName.trim();
  const canPlaceOnMap = canEdit && trimmedName.length > 0 && Boolean(blockTimeRaw);

  const handleInsertOnly = () => {
    if (!canEdit || !trimmedName) return;
    const ok = insertInlineTagAtCursor("location", trimmedName);
    if (!ok) {
      setNotice(t("panel.locationInsertFailed"));
      return;
    }
    setNotice(null);
    trackAction("editor", "insertTimeTag", {
      kind: "location",
      filePath: activeFilePath,
      blockIndex: legacyBlockIndexFromContext(activeEventContext),
    });
  };

  const handleInsertAndPinOnMap = () => {
    if (!canPlaceOnMap || !blockTimeRaw || !activeFilePath) return;
    if (!activeMapId) {
      setNotice(t("panel.locationNoActiveMap"));
      return;
    }

    const ok = insertInlineTagAtCursor("location", trimmedName);
    if (!ok) {
      setNotice(t("panel.locationInsertFailed"));
      return;
    }

    const label = trimmedName;
    const locationKey = normalizeLocationKey(label);
    setPendingEditorLocationPin({
      label,
      locationKey,
      previewTRaw: blockTimeRaw,
    });
    setViewMode("edit");
    setMainView("map");
    setNotice(null);
    setLocationName("");
    trackAction("workspace", "viewChange", {
      from: "editor",
      to: "map",
      reason: "locationPinShortcut",
      locationKey,
    });
  };

  if (!canEdit) {
    return null;
  }

  return (
    <section className="flex shrink-0 flex-col gap-2 border-b border-border/60 px-3 py-3">
      <div>
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("panel.locationMapTitle")}
        </p>
        <p className="text-[11px] text-muted-foreground">{t("panel.locationMapHint")}</p>
      </div>

      <Input
        value={locationName}
        onChange={(event) => {
          setLocationName(event.target.value);
          if (notice) setNotice(null);
        }}
        placeholder={t("metadata.locationPlaceholder")}
        className="h-8 text-xs"
        aria-label={t("metadata.location")}
      />

      <div className="flex flex-col gap-1.5">
        <Button
          type="button"
          variant="outline"
          className="h-8 w-full justify-start gap-2 px-2 text-xs"
          disabled={!trimmedName}
          onClick={handleInsertOnly}
        >
          <Plus className="size-3.5 shrink-0" />
          {t("panel.locationInsertOnly")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-8 w-full justify-start gap-2 px-2 text-xs"
          disabled={!canPlaceOnMap}
          title={
            !blockTimeRaw ? t("panel.locationNeedsTime") : t("panel.locationPinOnMapTooltip")
          }
          onClick={handleInsertAndPinOnMap}
        >
          <MapPin className="size-3.5 shrink-0" />
          {t("panel.locationInsertAndPin")}
        </Button>
      </div>

      {!blockTimeRaw ? (
        <p className="text-[10px] text-amber-700 dark:text-amber-400">
          {t("panel.locationNeedsTime")}
        </p>
      ) : null}

      {notice ? (
        <p className="text-[10px] text-destructive" role="alert">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
