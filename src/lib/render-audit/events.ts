/** Catálogo OBS-002 — eventos `obs.ui.*` (ver plan §3). */
export const UI_EVENTS = {
  workspace: {
    bootstrap: "obs.ui.workspace.bootstrap",
    viewChange: "obs.ui.workspace.viewChange",
    layout: "obs.ui.workspace.layout",
    theme: "obs.ui.workspace.theme",
  },
  explorer: {
    selection: "obs.ui.explorer.selection",
    viewMode: "obs.ui.explorer.viewMode",
    expanded: "obs.ui.explorer.expanded",
    visibleTree: "obs.ui.explorer.visibleTree",
    dnd: "obs.ui.explorer.dnd",
    inlineEdit: "obs.ui.explorer.inlineEdit",
  },
  editor: {
    activeDocument: "obs.ui.editor.activeDocument",
    viewport: "obs.ui.editor.viewport",
    eventFrames: "obs.ui.editor.eventFrames",
    gutter: "obs.ui.editor.gutter",
    dirtyDiff: "obs.ui.editor.dirtyDiff",
    focus: "obs.ui.editor.focus",
  },
  timeline: {
    layout: "obs.ui.timeline.layout",
    linksEvent: "obs.ui.timeline.links.event",
    linksWritingOrder: "obs.ui.timeline.links.writingOrder",
    hover: "obs.ui.timeline.hover",
    filters: "obs.ui.timeline.filters",
    writingOrderIndex: "obs.ui.timeline.writingOrderIndex",
    writingOrderNeighbors: "obs.ui.timeline.writingOrderNeighbors",
  },
  calendarPanel: {
    week: "obs.ui.calendarPanel.week",
    miniTimeline: "obs.ui.calendarPanel.miniTimeline",
  },
  sidePanel: {
    tab: "obs.ui.sidePanel.tab",
    dimensions: "obs.ui.sidePanel.dimensions",
  },
  filters: {
    global: "obs.ui.filters.global",
  },
  entity: {
    workspace: "obs.ui.entity.workspace",
    cardGrid: "obs.ui.entity.cardGrid",
  },
  maps: {
    viewport: "obs.ui.maps.viewport",
    compositor: "obs.ui.maps.compositor",
  },
  render: {
    bootstrap: "obs.ui.render.bootstrap",
    degraded: "obs.ui.render.degraded",
  },
} as const;
