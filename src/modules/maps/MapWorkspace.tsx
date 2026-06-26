import { Loader2, Map as MapIcon } from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useMapAutosave } from "@/hooks/useMapAutosave";
import { useMapProject } from "@/hooks/useMapProject";
import { useProjectLocations } from "@/hooks/useProjectLocations";
import { useProjectTimeline } from "@/hooks/useProjectTimeline";
import { useMapNavWindowsStore } from "@/stores/useMapNavWindowsStore";
import { useMapDrawingSession } from "@/hooks/useMapDrawingSession";
import { useMapSaveShortcut } from "@/hooks/useMapSaveShortcut";
import { useMapDrawingGuardRegistration, guardMapDrawingNavigation } from "@/hooks/useMapDrawingGuardRegistration";
import { usePersistMapDrawingDraft } from "@/hooks/usePersistMapDrawingDraft";
import { trackAction } from "@/lib/action-audit/trackAction";
import { resolveInteractiveHotspotHit } from "@/lib/maps/mapInteractiveNavClick";
import { openNavWindowFromHotspot } from "@/lib/maps/mapNavWindowFromHotspot";
import { createHotspotId } from "@/lib/maps/mapHotspotIds";
import { createLocationPinId } from "@/lib/maps/mapLocationPinIds";
import {
  filterOccurrencesAtT,
  mergeOccurrencesWithPins,
} from "@/lib/maps/mapLocationAtT";
import { PRINCIPAL_HOST_DRAWING_REF } from "@/lib/maps/mapHostDrawingRef";
import {
  drawToolForShapeKind,
  type PendingNavChildZone,
  shapeFromPendingNavChildZone,
} from "@/lib/maps/mapNavChildZone";
import type { MapHotspotCircleDraft } from "@/lib/maps/mapHotspotCircle";
import { useMapHotspotDrawStore } from "@/stores/useMapHotspotDrawStore";
import { resolveMapPreviewT, type MapPreviewTSource } from "@/lib/maps/mapPreviewT";
import { filterVisibleSecondaries } from "@/lib/maps/mapSecondaryVisibility";
import type { ProjectLocationOccurrenceV1 } from "@/lib/types/mapLocations";
import type { MapCreateDraft, MapDrawingRef, MapHotspotBoundsV1, MapHotspotPointV2, OpenPreference } from "@/lib/types/maps";
import { DEFAULT_MAP_DRAWING_REF, drawingRefKey, parseDrawingRefKey } from "@/lib/types/maps";
import { formatMapDesdeDisplay } from "@/lib/maps/mapDesde";
import { MAP_SIDE_PANEL_RAIL_MOUNT_ID } from "@/modules/layout/mapSidePanelMount";
import { MapFloatingToolsPanel } from "@/modules/maps/MapFloatingToolsPanel";
import { MapCombinedLayersPanel } from "@/modules/maps/MapCombinedLayersPanel";
import { MapLayersFloatingWindow } from "@/modules/maps/MapLayersFloatingWindow";
import { MapNavHotspotsUnifiedPanel } from "@/modules/maps/MapNavHotspotsUnifiedPanel";
import {
  MapCanvasSizeDialog,
  type MapCanvasSizeMode,
} from "@/modules/maps/MapCanvasSizeDialog";
import { CreateNavChildDialog } from "@/modules/maps/CreateNavChildDialog";
import { CreateMapDialog } from "@/modules/maps/CreateMapDialog";
import { MapEditStudio } from "@/modules/maps/MapEditStudio";
import { MapLayersPanel } from "@/modules/maps/MapLayersPanel";
import { MapCanvasSection } from "@/modules/maps/MapCanvasSection";
import { useMapStudioShortcuts } from "@/hooks/useMapStudioShortcuts";
import { MapModuleSettingsSection } from "@/modules/maps/MapModuleSettingsSection";
import { MapNavChildWindow } from "@/modules/maps/MapNavChildWindow";
import { MapLocationsPanel } from "@/modules/maps/MapLocationsPanel";
import { MapSecondariesPanel } from "@/modules/maps/MapSecondariesPanel";
import { MapTimelineBar } from "@/modules/maps/MapTimelineBar";
import { MapViewport } from "@/modules/maps/MapViewport";
import { useMapStore } from "@/stores/useMapStore";
import { useMapFloatingToolsStore } from "@/stores/useMapFloatingToolsStore";
import { useMapLayersWindowStore } from "@/stores/useMapLayersWindowStore";
import { useMapToolbarStore } from "@/stores/useMapToolbarStore";
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
  const [editingHotspotId, setEditingHotspotId] = useState<string | null>(null);
  const [pendingNavChildZone, setPendingNavChildZone] = useState<PendingNavChildZone | null>(null);
  const [navChildDialogOpen, setNavChildDialogOpen] = useState(false);
  const [locationPinBusy, setLocationPinBusy] = useState(false);
  const [locationPlacementTarget, setLocationPlacementTarget] =
    useState<ProjectLocationOccurrenceV1 | null>(null);
  const [locationMovePinId, setLocationMovePinId] = useState<string | null>(null);
  const [railMount, setRailMount] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setRailMount(globalThis.document?.getElementById(MAP_SIDE_PANEL_RAIL_MOUNT_ID) ?? null);
  }, [activeMapId, document?.id, drawing]);

  const activeSummary = maps.find((map) => map.id === activeMapId);
  const isPinned = activeSummary?.defaultOnOpen === true;
  const showEmpty = !loading && maps.length === 0;
  const isEditMode = viewMode === "edit";
  const mapAutosaveEnabled = useSettingsStore((s) => s.mapAutosaveEnabled);

  const openNavWindows = useMapNavWindowsStore((s) => s.openWindows);
  const openNavWindow = useMapNavWindowsStore((s) => s.openWindow);
  const closeNavWindow = useMapNavWindowsStore((s) => s.closeWindow);
  const setNavWindowPosition = useMapNavWindowsStore((s) => s.setWindowPosition);
  const focusNavWindow = useMapNavWindowsStore((s) => s.focusWindow);
  const syncNavWindowsForMap = useMapNavWindowsStore((s) => s.syncForMap);
  const closeNavWindowsByMode = useMapNavWindowsStore((s) => s.closeByMode);

  const hostHotspotCount = useMemo(
    () =>
      hotspots.filter((item) => item.hostDrawingRef.kind === "principal").length,
    [hotspots],
  );

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
    () =>
      visibleSecondaries
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
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [activeDrawingRef, drawingSession.drawing, isEditMode, secondaryFiles, visibleSecondaries],
  );

  const syncMapFloatingTools = useMapFloatingToolsStore((s) => s.syncForMap);
  const syncMapLayersWindow = useMapLayersWindowStore((s) => s.syncForMap);
  const isLayersWindowOpen = useMapFloatingToolsStore(
    (s) => s.isOpen && s.activeSection === "layers",
  );

  useEffect(() => {
    useMapFloatingToolsStore.getState().close();
  }, []);

  useEffect(() => {
    if (activeMapId) {
      syncMapFloatingTools(activeMapId);
      syncMapLayersWindow(activeMapId);
      syncNavWindowsForMap(activeMapId);
    }
  }, [activeMapId, syncMapFloatingTools, syncMapLayersWindow, syncNavWindowsForMap]);

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

  const handleInteractiveClick = useCallback(
    (worldX: number, worldY: number) => {
      const hit = resolveInteractiveHotspotHit(
        viewMode,
        worldX,
        worldY,
        hotspots,
      );
      if (!hit || !activeMapId) return false;
      void openNavWindowFromHotspot({
        mapId: activeMapId,
        hotspot: hit,
        navDrawings,
        loadNavFile,
      });
      return true;
    },
    [activeMapId, hotspots, loadNavFile, navDrawings, viewMode],
  );

  const openEditNavIds = useMemo(
    () => openNavWindows.filter((item) => item.mode === "edit").map((item) => item.navId),
    [openNavWindows],
  );

  const handleUpdateHotspotZone = useCallback(
    async (hotspotId: string, zone: PendingNavChildZone) => {
      if (!activeMapId) return;
      setHotspotBusy(true);
      try {
        const shape = shapeFromPendingNavChildZone(zone);
        const next = hotspots.map((item) =>
          item.id === hotspotId ? { ...item, shape } : item,
        );
        await saveHotspots(next);
        trackAction("map", "hotspotUpdate", {
          mapId: activeMapId,
          hotspotId,
          shapeKind: zone.kind,
          ...(zone.kind === "polygon"
            ? { vertexCount: zone.points.length }
            : zone.kind === "rect"
              ? { bounds: zone.bounds }
              : { radius: zone.circle.radius }),
        });
      } finally {
        setHotspotBusy(false);
      }
    },
    [activeMapId, hotspots, saveHotspots],
  );

  const handleZoneGestureComplete = useCallback(
    (zone: PendingNavChildZone) => {
      setHotspotDrawMode(false);
      if (editingHotspotId) {
        void handleUpdateHotspotZone(editingHotspotId, zone);
        setEditingHotspotId(null);
        return;
      }
      setPendingNavChildZone(zone);
      setNavChildDialogOpen(true);
    },
    [editingHotspotId, handleUpdateHotspotZone],
  );

  const handleHotspotRectComplete = useCallback(
    (bounds: MapHotspotBoundsV1) => {
      handleZoneGestureComplete({ kind: "rect", bounds });
    },
    [handleZoneGestureComplete],
  );

  const handleHotspotPolygonComplete = useCallback(
    (points: MapHotspotPointV2[]) => {
      handleZoneGestureComplete({ kind: "polygon", points });
    },
    [handleZoneGestureComplete],
  );

  const handleHotspotCircleComplete = useCallback(
    (circle: MapHotspotCircleDraft) => {
      handleZoneGestureComplete({ kind: "circle", circle });
    },
    [handleZoneGestureComplete],
  );

  const handleOpenEditWindow = useCallback(
    async (navId: string) => {
      await loadNavFile(navId);
      openNavWindow(navId, "edit", { mapId: activeMapId ?? undefined });
      focusNavWindow(navId);
      trackAction("map", "navSelect", {
        mapId: activeMapId,
        drawingRef: `nav:${navId}`,
        previousRef: drawingRefKey(activeDrawingRef),
      });
    },
    [activeDrawingRef, activeMapId, focusNavWindow, loadNavFile, openNavWindow],
  );

  const handleStartEditZone = useCallback(
    (hotspotId: string) => {
      const hotspot = hotspots.find((item) => item.id === hotspotId);
      if (!hotspot) return;
      setLocationPlacementTarget(null);
      setLocationMovePinId(null);
      setEditingHotspotId(hotspotId);
      useMapHotspotDrawStore.getState().setTool(drawToolForShapeKind(hotspot.shape.kind));
      setHotspotDrawMode(true);
      trackAction("map", "hotspotZoneEditStart", {
        mapId: activeMapId,
        hotspotId,
        shapeKind: hotspot.shape.kind,
      });
    },
    [activeMapId, hotspots],
  );

  const handleCreateNavChildWithZone = useCallback(
    async (name: string) => {
      if (!activeMapId || !pendingNavChildZone) return;
      setNavBusy(true);
      setHotspotBusy(true);
      try {
        const file = await createNav(name);
        const hotspotId = createHotspotId();
        const shape = shapeFromPendingNavChildZone(pendingNavChildZone);
        const next = [
          ...hotspots,
          {
            id: hotspotId,
            label: name,
            hostDrawingRef: PRINCIPAL_HOST_DRAWING_REF,
            shape,
            targetNavId: file.id,
          },
        ];
        await saveHotspots(next);
        trackAction("map", "hotspotCreate", {
          mapId: activeMapId,
          hotspotId,
          targetNavId: file.id,
          shapeKind: pendingNavChildZone.kind,
          ...(pendingNavChildZone.kind === "polygon"
            ? { vertexCount: pendingNavChildZone.points.length }
            : pendingNavChildZone.kind === "rect"
              ? { bounds: pendingNavChildZone.bounds }
              : { radius: pendingNavChildZone.circle.radius }),
        });
        trackAction("map", "navSelect", {
          mapId: activeMapId,
          drawingRef: `nav:${file.id}`,
          previousRef: drawingRefKey(activeDrawingRef),
        });
        setPendingNavChildZone(null);
      } finally {
        setNavBusy(false);
        setHotspotBusy(false);
      }
    },
    [
      activeDrawingRef,
      activeMapId,
      createNav,
      hotspots,
      pendingNavChildZone,
      saveHotspots,
    ],
  );

  const handleDeleteNavWithHotspot = useCallback(
    async (navId: string) => {
      if (!activeMapId) return;
      setNavBusy(true);
      setHotspotBusy(true);
      try {
        const linkedHotspots = hotspots.filter((item) => item.targetNavId === navId);
        if (linkedHotspots.length > 0) {
          await saveHotspots(hotspots.filter((item) => item.targetNavId !== navId));
        }
        await deleteNav(navId);
        if (activeDrawingRef.kind === "nav" && activeDrawingRef.id === navId) {
          setActiveDrawingRef({ kind: "principal" });
        }
      } finally {
        setNavBusy(false);
        setHotspotBusy(false);
      }
    },
    [activeDrawingRef, activeMapId, deleteNav, hotspots, saveHotspots, setActiveDrawingRef],
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

  useEffect(() => {
    for (const entry of openNavWindows) {
      if (!navFiles[entry.navId]) {
        void loadNavFile(entry.navId);
      }
    }
  }, [loadNavFile, navFiles, openNavWindows]);

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
          await handleOpenEditWindow(ref.id);
          return;
        }
        setActiveDrawingRef(ref);
        if (ref.kind === "secondary") {
          trackAction("map", "secondarySelect", {
            mapId: activeMapId,
            drawingRef: drawingRefKey(ref),
            previousRef,
          });
        }
      }, "mapSwitch");
    },
    [activeDrawingRef, activeMapId, handleOpenEditWindow, loadSecondaryFile, setActiveDrawingRef],
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

  const handleDesdeUpdate = useCallback(
    async (desde: string | null) => {
      if (!activeMapId) return;
      await updateMapDesde(activeMapId, desde);
    },
    [activeMapId, updateMapDesde],
  );

  const handleDesdeSuggest = useCallback(async () => {
    if (!activeMapId) return;
    const { events, config, baselineConfig: baseline } = await ensureTimelineAndCalendar();
    if (!config) return;
    await applyDefaultDesde(activeMapId, {
      events,
      config,
      baselineConfig: baseline,
      trackAs: "suggest",
    });
  }, [activeMapId, applyDefaultDesde, ensureTimelineAndCalendar]);

  const openCanvasDialog = (mode: MapCanvasSizeMode) => {
    setCanvasMode(mode);
    setCanvasDialogOpen(true);
  };

  const handleMapChange = useCallback(
    (mapId: string) => {
      if (!mapId || mapId === activeMapId) return;
      void guardMapDrawingNavigation(async () => {
        await selectMap(mapId);
      }, "mapSwitch");
    },
    [activeMapId, selectMap],
  );

  const handlePreferenceChange = (value: OpenPreference) => {
    void setOpenPreference(value);
  };

  const handlePinToggle = useCallback(() => {
    if (!activeMapId) return;
    void setDefaultOnOpen(activeMapId, !isPinned);
  }, [activeMapId, isPinned, setDefaultOnOpen]);

  const handleOpenCreateMap = useCallback(() => {
    setCreateOpen(true);
  }, []);

  useEffect(() => {
    useMapToolbarStore.getState().register({
      active: true,
      mapTitle: document?.name ?? activeSummary?.name ?? null,
      maps,
      activeMapId,
      isPinned,
      creating,
      calendarReady: Boolean(calendar),
      desde: document?.desde ?? null,
      desdeDisplay: formatMapDesdeDisplay(document?.desde ?? null, calendar),
      mapId: activeMapId,
      baselineConfig,
      events: timelineEvents,
      onSelectMap: handleMapChange,
      onPinToggle: handlePinToggle,
      onCreateMap: handleOpenCreateMap,
      onDesdeUpdate: handleDesdeUpdate,
      onDesdeSuggest: handleDesdeSuggest,
    });
    return () => useMapToolbarStore.getState().reset();
  }, [
    activeMapId,
    activeSummary?.name,
    baselineConfig,
    calendar,
    creating,
    document?.desde,
    document?.name,
    handleDesdeSuggest,
    handleDesdeUpdate,
    handleMapChange,
    handleOpenCreateMap,
    handlePinToggle,
    isPinned,
    maps,
    timelineEvents,
  ]);

  const handleEnterEdit = () => {
    if (!activeMapId) return;
    const fromMode = viewMode;
    closeNavWindowsByMode("interactive");
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
                activeSecondaryIds={activeSecondaryIds}
                secondaryCount={secondaries.length}
                openNavWindowCount={openNavWindows.length}
                hostHotspotCount={hostHotspotCount}
                hotspotOverlays={principalHotspots}
                hotspotOverlayStyle={isEditMode ? "edit" : "interactive"}
                hotspotDrawMode={hotspotDrawMode}
                hotspotZoneEditActive={Boolean(editingHotspotId)}
                hotspotHighlightId={editingHotspotId}
                locationMarkers={locationMarkers}
                locationPinPlacementActive={Boolean(locationPlacementTarget)}
                locationPinMoveActive={Boolean(locationMovePinId)}
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
                onHotspotCircleComplete={handleHotspotCircleComplete}
                onHotspotPolygonComplete={handleHotspotPolygonComplete}
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

      {railMount && activeMapId && document && drawing ? (
        <MapFloatingToolsPanel
          isEditMode={isEditMode}
          onToggleEditMode={handleToggleEditMode}
          railMount={railMount}
          settingsSection={
            <MapModuleSettingsSection
              openPreference={openPreference}
              onPreferenceChange={handlePreferenceChange}
            />
          }
          layersWindow={
            isLayersWindowOpen && isEditMode ? (
              <MapLayersFloatingWindow
                ariaLabel={t("editPanel.title")}
                layersTab={
                  drawingSession.drawing ? (
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
                      onPatchBackground={drawingSession.patchBackgroundColor}
                      onImportImageLayer={drawingSession.importImageLayer}
                    />
                  ) : null
                }
                patchesTab={
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
                }
                navTab={
                  <MapNavHotspotsUnifiedPanel
                      embedded
                      mapId={activeMapId}
                      navDrawings={navDrawings}
                      hotspots={principalHotspots}
                      openEditNavIds={openEditNavIds}
                      editingHotspotId={editingHotspotId}
                      drawMode={hotspotDrawMode}
                      busy={navBusy || hotspotBusy}
                      onOpenEditWindow={handleOpenEditWindow}
                      onStartEditZone={handleStartEditZone}
                      onDeleteNav={handleDeleteNavWithHotspot}
                      onToggleDrawMode={(active) => {
                        setHotspotDrawMode(active);
                        if (!active) setEditingHotspotId(null);
                        if (active) {
                          setLocationPlacementTarget(null);
                          setLocationMovePinId(null);
                        }
                      }}
                      onDeleteHotspot={handleDeleteHotspot}
                    />
                }
                combinedView={
                  drawing ? (
                    <MapCombinedLayersPanel
                      mapDesde={document.desde}
                      previewT={previewT}
                      calendar={calendar}
                      secondaries={secondaries}
                      secondaryFiles={secondaryFiles}
                      principalDrawing={
                        activeDrawingRef.kind === "principal" && drawingSession.drawing
                          ? drawingSession.drawing
                          : drawing
                      }
                      activeDrawingRef={activeDrawingRef}
                      activeLayerId={drawingSession.activeLayerId}
                      busy={secondaryBusy}
                      defaultTiempoInicio={previewT}
                      onSelectDrawing={handleSelectDrawing}
                      onSelectLayer={drawingSession.selectActiveLayer}
                      onCreate={handleCreateSecondary}
                      onLoadSecondary={(secondaryId) => {
                        void loadSecondaryFile(secondaryId);
                      }}
                    />
                  ) : null
                }
              />
            ) : null
          }
          locationsSection={
            isEditMode ? (
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
      ) : null}

      <CreateMapDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        creating={creating}
        onCreate={handleCreate}
      />

      <CreateNavChildDialog
        open={navChildDialogOpen}
        zone={pendingNavChildZone}
        busy={navBusy || hotspotBusy}
        onOpenChange={(open) => {
          setNavChildDialogOpen(open);
          if (!open) setPendingNavChildZone(null);
        }}
        onCreate={handleCreateNavChildWithZone}
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

      {activeMapId && document
        ? openNavWindows.map((entry) => {
            const navFile = navFiles[entry.navId];
            const summary = navDrawings.find((item) => item.id === entry.navId);
            if (!navFile) return null;
            return (
              <MapNavChildWindow
                key={entry.navId}
                mapId={activeMapId}
                document={document}
                entry={entry}
                navName={summary?.name ?? entry.navId}
                navDrawing={navFile.drawing}
                hotspots={hotspots}
                navDrawings={navDrawings}
                loadNavFile={loadNavFile}
                calendar={calendar}
                previewT={previewT}
                secondaries={secondaries}
                rootPath={rootPath}
                mapAutosaveEnabled={mapAutosaveEnabled}
                onPreviewTChange={handlePreviewTChange}
                onClose={() => closeNavWindow(entry.navId)}
                onPositionChange={(position) => setNavWindowPosition(entry.navId, position)}
                onFocus={() => focusNavWindow(entry.navId)}
                saveActiveDrawing={saveActiveDrawing}
              />
            );
          })
        : null}
    </div>
  );
}
