import { Loader2, Map as MapIcon } from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useMapAutosave } from "@/hooks/useMapAutosave";
import { useMapProject } from "@/hooks/useMapProject";
import { useProjectLocations } from "@/hooks/useProjectLocations";
import { useProjectTimeline } from "@/hooks/useProjectTimeline";
import { useMapNav } from "@/hooks/useMapNav";
import { useMapDrawingSession } from "@/hooks/useMapDrawingSession";
import { useMapSaveShortcut } from "@/hooks/useMapSaveShortcut";
import { useMapDrawingGuardRegistration, guardMapDrawingNavigation } from "@/hooks/useMapDrawingGuardRegistration";
import { usePersistMapDrawingDraft } from "@/hooks/usePersistMapDrawingDraft";
import { trackAction } from "@/lib/action-audit/trackAction";
import { resolveInteractiveHotspotHit } from "@/lib/maps/mapInteractiveNavClick";
import { createHotspotId } from "@/lib/maps/mapHotspotIds";
import { createLocationPinId } from "@/lib/maps/mapLocationPinIds";
import {
  filterOccurrencesAtT,
  mergeOccurrencesWithPins,
} from "@/lib/maps/mapLocationAtT";
import { PRINCIPAL_HOST_DRAWING_REF } from "@/lib/maps/mapHostDrawingRef";
import { resolveMapPreviewT, type MapPreviewTSource } from "@/lib/maps/mapPreviewT";
import { filterVisibleSecondaries } from "@/lib/maps/mapSecondaryVisibility";
import type { ProjectLocationOccurrenceV1 } from "@/lib/types/mapLocations";
import type { MapCreateDraft, MapDrawingRef, MapHotspotBoundsV1, MapNavSummaryV1, OpenPreference } from "@/lib/types/maps";
import { DEFAULT_MAP_DRAWING_REF, drawingRefKey, parseDrawingRefKey } from "@/lib/types/maps";
import { CreateMapDialog } from "@/modules/maps/CreateMapDialog";
import {
  MapCanvasSizeDialog,
  type MapCanvasSizeMode,
} from "@/modules/maps/MapCanvasSizeDialog";
import { useMapStudioShortcuts } from "@/hooks/useMapStudioShortcuts";
import { MapDesdeField } from "@/modules/maps/MapDesdeField";
import { MapEditSidePanel } from "@/modules/maps/MapEditSidePanel";
import { MapEditStudio } from "@/modules/maps/MapEditStudio";
import { MapLayersPanel } from "@/modules/maps/MapLayersPanel";
import { MapCanvasSection } from "@/modules/maps/MapCanvasSection";
import { MapMapsSection } from "@/modules/maps/MapMapsSection";
import { MapModuleSettingsSection } from "@/modules/maps/MapModuleSettingsSection";
import { MapNavBreadcrumb } from "@/modules/maps/MapNavBreadcrumb";
import { MapNavDrawingsPanel } from "@/modules/maps/MapNavDrawingsPanel";
import { HotspotTargetDialog, MapHotspotsPanel } from "@/modules/maps/MapHotspotsPanel";
import { MapLocationsPanel } from "@/modules/maps/MapLocationsPanel";
import { MapSecondariesPanel } from "@/modules/maps/MapSecondariesPanel";
import { MapTimelineBar } from "@/modules/maps/MapTimelineBar";
import { MapViewport } from "@/modules/maps/MapViewport";
import { useMapStore } from "@/stores/useMapStore";
import { useMapEditPanelStore } from "@/stores/useMapEditPanelStore";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export function MapWorkspace() {
  const { t } = useTranslation("maps");
  const activeMapId = useMapStore((s) => s.activeMapId);
  const viewMode = useMapStore((s) => s.viewMode);
  const setViewMode = useMapStore((s) => s.setViewMode);
  const activeDrawingRef = useMapStore((s) => s.activeDrawingRef);
  const setActiveDrawingRef = useMapStore((s) => s.setActiveDrawingRef);
  const previewTimeTRaw = useMapStore((s) => s.previewTimeTRaw);
  const setPreviewTimeTRaw = useMapStore((s) => s.setPreviewTimeTRaw);
  const pendingEditorLocationPin = useMapStore((s) => s.pendingEditorLocationPin);
  const setPendingEditorLocationPin = useMapStore((s) => s.setPendingEditorLocationPin);
  const setActiveMapTitle = useMapStore((s) => s.setActiveMapTitle);
  const rootPath = useProjectStore((s) => s.activeProject?.rootPath ?? "");
  const activeDrawingRefKey = drawingRefKey(activeDrawingRef);
  const sessionDrawingRefKeyRef = useRef(activeDrawingRefKey);
  sessionDrawingRefKeyRef.current = activeDrawingRefKey;
  const sessionKey = `${rootPath}:${activeMapId ?? ""}:${activeDrawingRefKey}`;
  const {
    maps,
    openPreference,
    document,
    drawing,
    secondaries,
    secondaryFiles,
    navDrawings,
    navFiles,
    hotspots,
    locationPins,
    loading,
    creating,
    canvasBusy,
    errorKey,
    selectMap,
    setOpenPreference,
    setDefaultOnOpen,
    createMap,
    createSecondary,
    expandCanvas,
    cropCanvas,
    saveActiveDrawing,
    loadSecondaryFile,
    loadNavFile,
    updateSecondaryMeta,
    deleteSecondary,
    createNav,
    deleteNav,
    saveHotspots,
    saveLocationPins,
    updateMapDesde,
    applyDefaultDesde,
    ensureTimelineAndCalendar,
  } = useMapProject();

  const { events: timelineEvents } = useProjectTimeline();
  const { occurrences: projectLocations } = useProjectLocations();
  const calendar = useCalendarStore((s) => s.config);
  const baselineConfig = useCalendarStore((s) => s.baselineConfig);
  const loadCalendar = useCalendarStore((s) => s.loadCalendar);

  const [createOpen, setCreateOpen] = useState(false);
  const [canvasDialogOpen, setCanvasDialogOpen] = useState(false);
  const [canvasMode, setCanvasMode] = useState<MapCanvasSizeMode>("expand");
  const [secondaryBusy, setSecondaryBusy] = useState(false);
  const [navBusy, setNavBusy] = useState(false);
  const [hotspotBusy, setHotspotBusy] = useState(false);
  const [hotspotDrawMode, setHotspotDrawMode] = useState(false);
  const [pendingHotspotBounds, setPendingHotspotBounds] = useState<MapHotspotBoundsV1 | null>(
    null,
  );
  const [hotspotTargetOpen, setHotspotTargetOpen] = useState(false);
  const [locationPinBusy, setLocationPinBusy] = useState(false);
  const [locationPlacementTarget, setLocationPlacementTarget] =
    useState<ProjectLocationOccurrenceV1 | null>(null);
  const [locationMovePinId, setLocationMovePinId] = useState<string | null>(null);

  const activeSummary = maps.find((map) => map.id === activeMapId);
  const isPinned = activeSummary?.defaultOnOpen === true;
  const showEmpty = !loading && maps.length === 0;
  const isEditMode = viewMode === "edit";
  const mapAutosaveEnabled = useSettingsStore((s) => s.mapAutosaveEnabled);

  const { navStack, navDepth, activeNavId, activeNavFrame, pushFromHotspot, popNav } =
    useMapNav({
      mapId: activeMapId,
      navDrawings,
      loadNavFile,
    });

  const isNavView = navDepth > 0;
  const activeNavFile = activeNavId ? navFiles[activeNavId] : null;

  useEffect(() => {
    if (!activeNavFrame || !activeMapId) return;
    void loadNavFile(activeNavFrame.navId);
  }, [activeMapId, activeNavFrame, loadNavFile]);

  const hostHotspotCount = useMemo(
    () =>
      hotspots.filter((item) => item.hostDrawingRef.kind === "principal").length,
    [hotspots],
  );

  const navStackIds = useMemo(() => navStack.map((frame) => frame.navId), [navStack]);

  const principalHotspots = useMemo(
    () => hotspots.filter((item) => item.hostDrawingRef.kind === "principal"),
    [hotspots],
  );

  const diskSourceDrawing =
    activeDrawingRef.kind === "principal"
      ? drawing
      : activeDrawingRef.kind === "nav"
        ? navFiles[activeDrawingRef.id]?.drawing ?? null
        : secondaryFiles[activeDrawingRef.id]?.drawing ?? null;

  const drawingSession = useMapDrawingSession({
    sessionKey,
    sourceDrawing: diskSourceDrawing,
    mapId: activeMapId,
    projectRoot: rootPath,
    drawingRefKey: activeDrawingRefKey,
  });

  useEffect(() => {
    if (!document || !activeMapId) return;
    if (useMapStore.getState().previewTimeTRaw !== null) return;
    if (!document.desde) return;
    setPreviewTimeTRaw(document.desde, activeMapId);
    trackAction("map", "previewTSet", {
      mapId: activeMapId,
      previewT: document.desde,
      previousT: null,
      source: "mapLoad",
    });
  }, [activeMapId, document?.desde, document?.id, setPreviewTimeTRaw]);

  const previewT = resolveMapPreviewT(previewTimeTRaw, document?.desde ?? null);

  const handlePreviewTChange = useCallback(
    (raw: string, source: MapPreviewTSource) => {
      if (!activeMapId) return;
      const previousT = previewT;
      setPreviewTimeTRaw(raw, activeMapId);
      trackAction("map", "previewTSet", {
        mapId: activeMapId,
        previewT: raw,
        previousT,
        source,
      });
    },
    [activeMapId, previewT, setPreviewTimeTRaw],
  );

  const visibleSecondaries = useMemo(() => {
    if (!calendar || !previewT) return [];
    return filterVisibleSecondaries(
      secondaries,
      document?.desde ?? null,
      previewT,
      calendar,
    );
  }, [calendar, document?.desde, previewT, secondaries]);

  useEffect(() => {
    if (!pendingEditorLocationPin || !activeMapId || !document) return;
    if (pendingEditorLocationPin.previewTRaw) {
      handlePreviewTChange(pendingEditorLocationPin.previewTRaw, "editorHandoff");
    }
    setHotspotDrawMode(false);
    setLocationMovePinId(null);
    setLocationPlacementTarget({
      id: `editor-${pendingEditorLocationPin.locationKey}`,
      locationKey: pendingEditorLocationPin.locationKey,
      label: pendingEditorLocationPin.label,
      effectiveTimeRaw: pendingEditorLocationPin.previewTRaw ?? previewT ?? "",
      effectiveTimestamp: null,
      sourcePath: "",
      segmentId: null,
      tagKind: "inline",
    });
    setPendingEditorLocationPin(null);
  }, [
    activeMapId,
    document,
    handlePreviewTChange,
    pendingEditorLocationPin,
    previewT,
    setPendingEditorLocationPin,
  ]);

  const occurrencesAtT = useMemo(() => {
    if (!calendar || !previewT) return [];
    return filterOccurrencesAtT(projectLocations, previewT, calendar);
  }, [calendar, previewT, projectLocations]);

  const { markers: locationMarkers, unpinnedKeys: unpinnedLocationKeysAtT } = useMemo(
    () => mergeOccurrencesWithPins(occurrencesAtT, locationPins),
    [locationPins, occurrencesAtT],
  );

  const unpinnedOccurrencesAtT = useMemo(
    () =>
      occurrencesAtT.filter((item) => unpinnedLocationKeysAtT.includes(item.locationKey)),
    [occurrencesAtT, unpinnedLocationKeysAtT],
  );

  const activeSecondaryIds = useMemo(
    () => visibleSecondaries.map((item) => item.id),
    [visibleSecondaries],
  );

  useEffect(() => {
    if (!activeMapId) return;
    for (const item of visibleSecondaries) {
      if (!secondaryFiles[item.id]) {
        void loadSecondaryFile(item.id);
      }
    }
  }, [activeMapId, loadSecondaryFile, secondaryFiles, visibleSecondaries]);

  useEffect(() => {
    if (activeDrawingRef.kind !== "secondary") return;
    void loadSecondaryFile(activeDrawingRef.id);
  }, [activeDrawingRef, loadSecondaryFile]);

  useEffect(() => {
    if (activeDrawingRef.kind !== "nav") return;
    void loadNavFile(activeDrawingRef.id);
  }, [activeDrawingRef, loadNavFile]);

  const overlayDrawings = useMemo(
    () => {
      if (isNavView) return [];
      return visibleSecondaries
        .map((item) => {
          const file = secondaryFiles[item.id];
          if (!file) return null;
          const isActiveEditing =
            isEditMode &&
            activeDrawingRef.kind === "secondary" &&
            activeDrawingRef.id === item.id &&
            drawingSession.drawing;
          return {
            drawingRefKey: `secondary:${item.id}`,
            drawing: isActiveEditing ? drawingSession.drawing! : file.drawing,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    },
    [activeDrawingRef, drawingSession.drawing, isEditMode, isNavView, secondaryFiles, visibleSecondaries],
  );

  const syncMapEditPanel = useMapEditPanelStore((s) => s.syncForMap);

  useEffect(() => {
    if (activeMapId) {
      syncMapEditPanel(activeMapId);
    }
  }, [activeMapId, syncMapEditPanel]);

  useEffect(() => {
    setActiveMapTitle(document?.name ?? null);
    return () => setActiveMapTitle(null);
  }, [document?.name, setActiveMapTitle]);

  usePersistMapDrawingDraft({
    enabled: isEditMode && Boolean(rootPath) && Boolean(activeMapId),
    projectRoot: rootPath,
    mapId: activeMapId,
    drawingRefKey: activeDrawingRefKey,
    isDirty: drawingSession.isDirty,
    drawing: drawingSession.drawing,
    undoDepth: drawingSession.undoDepth,
    redoDepth: drawingSession.redoDepth,
    exportDraft: drawingSession.exportDraftSnapshot,
  });

  useMapStudioShortcuts({
    viewMode,
    canUndo: drawingSession.canUndo,
    canRedo: drawingSession.canRedo,
    onUndo: drawingSession.undo,
    onRedo: drawingSession.redo,
  });

  const resolveSessionDrawingRef = useCallback((): MapDrawingRef => {
    return parseDrawingRefKey(sessionDrawingRefKeyRef.current) ?? DEFAULT_MAP_DRAWING_REF;
  }, []);

  const { flushAutosave } = useMapAutosave({
    enabled: isEditMode && mapAutosaveEnabled,
    mapId: activeMapId,
    drawing: drawingSession.drawing,
    activeLayerId: drawingSession.activeLayerId,
    isDirty: drawingSession.isDirty,
    setSaveStatus: drawingSession.setSaveStatus,
    markSaved: drawingSession.markSaved,
    getDrawingRef: resolveSessionDrawingRef,
    saveDrawing: (mapId, drawingToSave) =>
      saveActiveDrawing(mapId, drawingToSave, resolveSessionDrawingRef()),
  });

  useMapSaveShortcut({
    viewMode,
    isDirty: drawingSession.isDirty,
    onSave: () => flushAutosave("manual"),
  });

  const viewportPrincipalDrawing =
    isEditMode && activeDrawingRef.kind === "principal" && drawingSession.drawing
      ? drawingSession.drawing
      : drawing!;

  const composeNavDrawing =
    isNavView && activeNavFile
      ? isEditMode &&
        activeDrawingRef.kind === "nav" &&
        activeDrawingRef.id === activeNavId &&
        drawingSession.drawing
        ? drawingSession.drawing
        : activeNavFile.drawing
      : null;

  const composeNavDrawingRefKey = activeNavId ? `nav:${activeNavId}` : undefined;

  const handleInteractiveClick = useCallback(
    (worldX: number, worldY: number) => {
      const hit = resolveInteractiveHotspotHit(
        viewMode,
        isNavView,
        worldX,
        worldY,
        hotspots,
      );
      if (!hit) return false;
      void pushFromHotspot(hit);
      return true;
    },
    [hotspots, isNavView, pushFromHotspot, viewMode],
  );

  const handleHotspotRectComplete = useCallback((bounds: MapHotspotBoundsV1) => {
    setHotspotDrawMode(false);
    setPendingHotspotBounds(bounds);
    setHotspotTargetOpen(true);
  }, []);

  const handleCreateNavDrawing = useCallback(
    async (name: string): Promise<MapNavSummaryV1 | null> => {
      setNavBusy(true);
      try {
        const file = await createNav(name);
        trackAction("map", "navSelect", {
          mapId: activeMapId,
          drawingRef: `nav:${file.id}`,
          previousRef: drawingRefKey(activeDrawingRef),
        });
        setActiveDrawingRef({ kind: "nav", id: file.id });
        return { id: file.id, name: file.name, updatedAt: file.updatedAt };
      } finally {
        setNavBusy(false);
      }
    },
    [activeDrawingRef, activeMapId, createNav, setActiveDrawingRef],
  );

  const handleConfirmHotspot = useCallback(
    async (draft: { bounds: MapHotspotBoundsV1; targetNavId: string; label?: string }) => {
      if (!activeMapId) return;
      setHotspotBusy(true);
      try {
        const hotspotId = createHotspotId();
        const next = [
          ...hotspots,
          {
            id: hotspotId,
            label: draft.label,
            hostDrawingRef: PRINCIPAL_HOST_DRAWING_REF,
            bounds: draft.bounds,
            targetNavId: draft.targetNavId,
          },
        ];
        await saveHotspots(next);
        trackAction("map", "hotspotCreate", {
          mapId: activeMapId,
          hotspotId,
          targetNavId: draft.targetNavId,
          bounds: draft.bounds,
        });
        setPendingHotspotBounds(null);
      } finally {
        setHotspotBusy(false);
      }
    },
    [activeMapId, hotspots, saveHotspots],
  );

  const handleDeleteHotspot = useCallback(
    async (hotspotId: string) => {
      if (!activeMapId) return;
      setHotspotBusy(true);
      try {
        await saveHotspots(hotspots.filter((item) => item.id !== hotspotId));
        trackAction("map", "hotspotDelete", { mapId: activeMapId, hotspotId });
      } finally {
        setHotspotBusy(false);
      }
    },
    [activeMapId, hotspots, saveHotspots],
  );

  const handleLocationPinPlace = useCallback(
    async (x: number, y: number) => {
      if (!activeMapId || !locationPlacementTarget) return;
      setLocationPinBusy(true);
      try {
        const pinId = createLocationPinId();
        const next = [
          ...locationPins,
          {
            id: pinId,
            locationKey: locationPlacementTarget.locationKey,
            label: locationPlacementTarget.label,
            x,
            y,
            updatedAt: new Date().toISOString(),
          },
        ];
        await saveLocationPins(next);
        trackAction("map", "locationPinCreate", {
          mapId: activeMapId,
          pinId,
          locationKey: locationPlacementTarget.locationKey,
          x,
          y,
        });
        setLocationPlacementTarget(null);
      } finally {
        setLocationPinBusy(false);
      }
    },
    [activeMapId, locationPins, locationPlacementTarget, saveLocationPins],
  );

  const handleLocationPinMove = useCallback(
    async (x: number, y: number) => {
      if (!activeMapId || !locationMovePinId) return;
      const target = locationPins.find((item) => item.id === locationMovePinId);
      if (!target) return;
      setLocationPinBusy(true);
      try {
        const next = locationPins.map((item) =>
          item.id === locationMovePinId
            ? { ...item, x, y, updatedAt: new Date().toISOString() }
            : item,
        );
        await saveLocationPins(next);
        trackAction("map", "locationPinMove", {
          mapId: activeMapId,
          pinId: locationMovePinId,
          x,
          y,
        });
        setLocationMovePinId(null);
      } finally {
        setLocationPinBusy(false);
      }
    },
    [activeMapId, locationMovePinId, locationPins, saveLocationPins],
  );

  const handleDeleteLocationPin = useCallback(
    async (pinId: string) => {
      if (!activeMapId) return;
      const target = locationPins.find((item) => item.id === pinId);
      setLocationPinBusy(true);
      try {
        await saveLocationPins(locationPins.filter((item) => item.id !== pinId));
        trackAction("map", "locationPinDelete", {
          mapId: activeMapId,
          pinId,
          locationKey: target?.locationKey ?? "",
        });
        if (locationMovePinId === pinId) {
          setLocationMovePinId(null);
        }
      } finally {
        setLocationPinBusy(false);
      }
    },
    [activeMapId, locationMovePinId, locationPins, saveLocationPins],
  );

  const previewStroke = isEditMode ? drawingSession.currentStroke : null;

  const handleCreate = async (draft: MapCreateDraft) => {
    await createMap(draft);
  };

  const handleSelectDrawing = useCallback(
    (ref: MapDrawingRef) => {
      if (
        ref.kind === activeDrawingRef.kind &&
        (ref.kind === "principal" ||
          (ref.kind === "secondary" &&
            activeDrawingRef.kind === "secondary" &&
            ref.id === activeDrawingRef.id) ||
          (ref.kind === "nav" &&
            activeDrawingRef.kind === "nav" &&
            ref.id === activeDrawingRef.id))
      ) {
        return;
      }
      const sourceRef =
        parseDrawingRefKey(sessionDrawingRefKeyRef.current) ?? DEFAULT_MAP_DRAWING_REF;
      void guardMapDrawingNavigation(async () => {
        const previousRef = drawingRefKey(sourceRef);
        if (ref.kind === "secondary") {
          await loadSecondaryFile(ref.id);
        }
        if (ref.kind === "nav") {
          await loadNavFile(ref.id);
        }
        setActiveDrawingRef(ref);
        if (ref.kind === "secondary") {
          trackAction("map", "secondarySelect", {
            mapId: activeMapId,
            drawingRef: drawingRefKey(ref),
            previousRef,
          });
        } else if (ref.kind === "nav") {
          trackAction("map", "navSelect", {
            mapId: activeMapId,
            drawingRef: drawingRefKey(ref),
            previousRef,
          });
        }
      }, "mapSwitch");
    },
    [activeDrawingRef, activeMapId, loadNavFile, loadSecondaryFile, setActiveDrawingRef],
  );

  const handleCreateSecondary = useCallback(
    async (draft: {
      name: string;
      tiempoInicio: string;
      tiempoFin?: string | null;
    }) => {
      setSecondaryBusy(true);
      try {
        const file = await createSecondary(draft);
        setActiveDrawingRef({ kind: "secondary", id: file.id });
        trackAction("map", "secondarySelect", {
          mapId: activeMapId,
          drawingRef: drawingRefKey({ kind: "secondary", id: file.id }),
          previousRef: drawingRefKey(activeDrawingRef),
        });
      } finally {
        setSecondaryBusy(false);
      }
    },
    [activeDrawingRef, activeMapId, createSecondary, setActiveDrawingRef],
  );

  useMapDrawingGuardRegistration({
    enabled: isEditMode && Boolean(rootPath) && Boolean(activeMapId),
    projectRoot: rootPath,
    mapId: activeMapId,
    drawingRefKey: activeDrawingRefKey,
    diskDrawing: diskSourceDrawing,
    isDirty: drawingSession.isDirty,
    flushAutosave,
    resetFromSource: drawingSession.resetFromSource,
  });

  useEffect(() => {
    if (!rootPath || calendar) return;
    void loadCalendar();
  }, [calendar, loadCalendar, rootPath]);

  const handleDesdeUpdate = async (desde: string | null) => {
    if (!activeMapId) return;
    await updateMapDesde(activeMapId, desde);
  };

  const handleDesdeSuggest = async () => {
    if (!activeMapId) return;
    const { events, config, baselineConfig: baseline } = await ensureTimelineAndCalendar();
    if (!config) return;
    await applyDefaultDesde(activeMapId, {
      events,
      config,
      baselineConfig: baseline,
      trackAs: "suggest",
    });
  };

  const openCanvasDialog = (mode: MapCanvasSizeMode) => {
    setCanvasMode(mode);
    setCanvasDialogOpen(true);
  };

  const handleMapChange = (mapId: string) => {
    if (!mapId || mapId === activeMapId) return;
    void guardMapDrawingNavigation(async () => {
      await selectMap(mapId);
    }, "mapSwitch");
  };

  const handlePreferenceChange = (value: OpenPreference) => {
    void setOpenPreference(value);
  };

  const handlePinToggle = () => {
    if (!activeMapId) return;
    void setDefaultOnOpen(activeMapId, !isPinned);
  };

  const handleEnterEdit = () => {
    if (!activeMapId) return;
    const fromMode = viewMode;
    setViewMode("edit");
    trackAction("map", "setViewMode", { mapId: activeMapId, mode: "edit", fromMode });
  };

  const handleExitEdit = () => {
    if (!activeMapId) return;
    void guardMapDrawingNavigation(async () => {
      const fromMode = viewMode;
      setViewMode("interactive");
      trackAction("map", "setViewMode", {
        mapId: activeMapId,
        mode: "interactive",
        fromMode,
      });
    }, "exitEdit");
  };

  const handleToggleEditMode = () => {
    if (isEditMode) {
      handleExitEdit();
    } else {
      handleEnterEdit();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {activeMapId && document && isNavView ? (
        <MapNavBreadcrumb
          mapName={document.name}
          navStack={navStack}
          onPop={() => popNav()}
          onPopToDepth={(depth) => popNav(depth)}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        {loading && maps.length === 0 ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("loadingMaps")}
          </div>
        ) : null}

        {errorKey ? (
          <p className="shrink-0 px-4 pt-4 text-sm text-destructive">{t(errorKey)}</p>
        ) : null}

        {showEmpty ? (
          <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
            <MapIcon className="size-10 text-muted-foreground/60" />
            <h2 className="text-lg font-medium">{t("emptyTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
            <Button onClick={() => setCreateOpen(true)}>{t("createMap")}</Button>
          </div>
        ) : null}

        {activeMapId && document && drawing ? (
          <>
            <div className="flex min-h-0 flex-1">
              <MapViewport
                mapId={activeMapId}
                document={document}
                principalDrawing={viewportPrincipalDrawing}
                overlayDrawings={overlayDrawings}
                activeDrawingRefKey={activeDrawingRefKey}
                previewTimeTRaw={previewT}
                activeSecondaryIds={isNavView ? [] : activeSecondaryIds}
                secondaryCount={secondaries.length}
                navDepth={navDepth}
                activeNavId={activeNavId}
                navStackIds={navStackIds}
                hostHotspotCount={hostHotspotCount}
                composeNavDrawing={composeNavDrawing}
                composeNavDrawingRefKey={composeNavDrawingRefKey}
                hotspotOverlays={!isNavView ? principalHotspots : []}
                hotspotOverlayStyle={isEditMode ? "edit" : "interactive"}
                hotspotDrawMode={hotspotDrawMode && !isNavView}
                locationMarkers={locationMarkers}
                locationPinPlacementActive={Boolean(locationPlacementTarget) && !isNavView}
                locationPinMoveActive={Boolean(locationMovePinId) && !isNavView}
                locationCountAtT={locationMarkers.length}
                unpinnedKeysAtT={unpinnedLocationKeysAtT.length}
                pinnedKeysTotal={locationPins.length}
                onLocationPinPlace={handleLocationPinPlace}
                onLocationPinMove={handleLocationPinMove}
                viewMode={viewMode}
                activeLayerId={isEditMode ? drawingSession.activeLayerId : null}
                previewStroke={previewStroke}
                onPreviewStroke={drawingSession.setPreviewStroke}
                onCommitStroke={drawingSession.commitStroke}
                onInteractiveClick={handleInteractiveClick}
                onHotspotRectComplete={handleHotspotRectComplete}
              />
              <MapEditSidePanel
                isEditMode={isEditMode}
                isNavView={isNavView}
                onToggleEditMode={handleToggleEditMode}
                mapsSection={
                  <MapMapsSection
                    maps={maps}
                    activeMapId={activeMapId}
                    isPinned={isPinned}
                    creating={creating}
                    onMapChange={handleMapChange}
                    onPinToggle={handlePinToggle}
                    onCreateMap={() => setCreateOpen(true)}
                  />
                }
                settingsSection={
                  <MapModuleSettingsSection
                    openPreference={openPreference}
                    onPreferenceChange={handlePreferenceChange}
                  />
                }
                layersSection={
                  isEditMode && drawingSession.drawing ? (
                    <MapLayersPanel
                      embedded
                      mapId={activeMapId}
                      drawing={drawingSession.drawing}
                      activeLayerId={drawingSession.activeLayerId}
                      onSelectLayer={drawingSession.selectActiveLayer}
                      onCreateLayer={() => {
                        drawingSession.createLayer(
                          t("studio.layers.defaultName", {
                            index: drawingSession.drawing!.layers.length + 1,
                          }),
                        );
                      }}
                      onCreateGroup={() =>
                        drawingSession.createGroup(
                          t("studio.layers.defaultGroupName", {
                            index: (drawingSession.drawing!.groups?.length ?? 0) + 1,
                          }),
                        )
                      }
                      onDeleteLayer={drawingSession.deleteLayer}
                      onDeleteGroup={drawingSession.deleteGroup}
                      onPatchLayer={drawingSession.patchLayer}
                      onPatchGroup={drawingSession.patchGroup}
                      onReorderPanelRow={drawingSession.reorderPanelRow}
                    />
                  ) : null
                }
                patchesSection={
                  isEditMode ? (
                    <MapSecondariesPanel
                      embedded
                      mapId={activeMapId}
                      mapDesde={document.desde}
                      defaultTiempoInicio={previewT}
                      previewT={previewT}
                      calendar={calendar}
                      secondaries={secondaries}
                      activeDrawingRef={activeDrawingRef}
                      busy={secondaryBusy}
                      onSelectDrawing={handleSelectDrawing}
                      onCreate={handleCreateSecondary}
                      onUpdateMeta={async (secondaryId, patch) => {
                        setSecondaryBusy(true);
                        try {
                          await updateSecondaryMeta(secondaryId, patch);
                        } finally {
                          setSecondaryBusy(false);
                        }
                      }}
                      onDelete={async (secondaryId) => {
                        setSecondaryBusy(true);
                        try {
                          await deleteSecondary(secondaryId);
                          if (
                            activeDrawingRef.kind === "secondary" &&
                            activeDrawingRef.id === secondaryId
                          ) {
                            setActiveDrawingRef({ kind: "principal" });
                          }
                        } finally {
                          setSecondaryBusy(false);
                        }
                      }}
                    />
                  ) : null
                }
                navSection={
                  isEditMode && !isNavView ? (
                    <MapNavDrawingsPanel
                        embedded
                        mapId={activeMapId}
                        navDrawings={navDrawings}
                        activeDrawingRef={activeDrawingRef}
                        busy={navBusy}
                        onSelectDrawing={handleSelectDrawing}
                        onCreate={async (name) => {
                          await handleCreateNavDrawing(name);
                        }}
                        onDelete={async (navId) => {
                          setNavBusy(true);
                          try {
                            await deleteNav(navId);
                            if (activeDrawingRef.kind === "nav" && activeDrawingRef.id === navId) {
                              setActiveDrawingRef({ kind: "principal" });
                            }
                          } finally {
                            setNavBusy(false);
                          }
                        }}
                      />
                    ) : null
                }
                hotspotsSection={
                  isEditMode && !isNavView ? (
                    <MapHotspotsPanel
                        embedded
                        mapId={activeMapId}
                        hotspots={principalHotspots}
                        navDrawings={navDrawings}
                        drawMode={hotspotDrawMode}
                        busy={hotspotBusy}
                        onToggleDrawMode={(active) => {
                          setHotspotDrawMode(active);
                          if (active) {
                            setLocationPlacementTarget(null);
                            setLocationMovePinId(null);
                          }
                        }}
                        onDeleteHotspot={handleDeleteHotspot}
                      />
                    ) : null
                }
                locationsSection={
                  isEditMode && !isNavView ? (
                    <MapLocationsPanel
                        embedded
                        mapId={activeMapId}
                        previewT={previewT}
                        occurrencesAtT={occurrencesAtT}
                        unpinnedAtT={unpinnedOccurrencesAtT}
                        pins={locationPins}
                        placementTarget={locationPlacementTarget}
                        movePinId={locationMovePinId}
                        busy={locationPinBusy}
                        onStartPlacement={(occurrence) => {
                          setHotspotDrawMode(false);
                          setLocationMovePinId(null);
                          setLocationPlacementTarget(occurrence);
                        }}
                        onCancelPlacement={() => setLocationPlacementTarget(null)}
                        onStartMove={(pinId) => {
                          setHotspotDrawMode(false);
                          setLocationPlacementTarget(null);
                          setLocationMovePinId(pinId);
                        }}
                        onCancelMove={() => setLocationMovePinId(null)}
                        onDeletePin={handleDeleteLocationPin}
                      />
                    ) : null
                }
                studioSection={
                  isEditMode ? (
                    <MapEditStudio
                      embedded
                      mapId={activeMapId}
                      canvasBusy={canvasBusy}
                      isDirty={drawingSession.isDirty}
                      saveStatus={drawingSession.saveStatus}
                      canUndo={drawingSession.canUndo}
                      canRedo={drawingSession.canRedo}
                      onUndo={drawingSession.undo}
                      onRedo={drawingSession.redo}
                    />
                  ) : null
                }
                canvasSection={
                  isEditMode ? (
                    <MapCanvasSection
                      width={document.width}
                      height={document.height}
                      busy={canvasBusy}
                      onExpand={() => openCanvasDialog("expand")}
                      onCrop={() => openCanvasDialog("crop")}
                    />
                  ) : null
                }
              />
            </div>
            {calendar ? (
              <MapTimelineBar
                mapId={activeMapId}
                desde={document.desde}
                previewT={previewT}
                secondaries={secondaries}
                calendar={calendar}
                interactive
                onPreviewTChange={handlePreviewTChange}
                desdeField={
                  <MapDesdeField
                    mapId={activeMapId}
                    desde={document.desde}
                    calendar={calendar}
                    baselineConfig={baselineConfig}
                    events={timelineEvents}
                    onUpdate={handleDesdeUpdate}
                    onSuggest={handleDesdeSuggest}
                  />
                }
              />
            ) : null}
          </>
        ) : null}

        {loading && maps.length > 0 && (!document || !drawing) ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("loadingMaps")}
          </div>
        ) : null}
      </div>

      <CreateMapDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        creating={creating}
        onCreate={handleCreate}
      />

      <HotspotTargetDialog
        open={hotspotTargetOpen}
        bounds={pendingHotspotBounds}
        navDrawings={navDrawings}
        busy={hotspotBusy}
        onOpenChange={(open) => {
          setHotspotTargetOpen(open);
          if (!open) setPendingHotspotBounds(null);
        }}
        onConfirm={handleConfirmHotspot}
        onCreateNav={handleCreateNavDrawing}
      />

      {document ? (
        <MapCanvasSizeDialog
          open={canvasDialogOpen}
          onOpenChange={setCanvasDialogOpen}
          mode={canvasMode}
          currentWidth={document.width}
          currentHeight={document.height}
          busy={canvasBusy}
          onExpand={async (addRight, addBottom) => {
            const ok = await guardMapDrawingNavigation(async () => {
              await expandCanvas(addRight, addBottom);
            }, "canvasOp");
            if (!ok) {
              throw new Error("guard");
            }
          }}
          onCrop={async (newWidth, newHeight) => {
            const ok = await guardMapDrawingNavigation(async () => {
              await cropCanvas(newWidth, newHeight);
            }, "canvasOp");
            if (!ok) {
              throw new Error("guard");
            }
          }}
        />
      ) : null}
    </div>
  );
}
