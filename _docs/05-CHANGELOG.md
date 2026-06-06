# 📝 Registro de Cambios (Changelog)

## 📖 Propósito de este Documento
Registro histórico de implementaciones finalizadas. Las tareas completadas se trasladan desde `04-TASK.md`.

---

## 🚧 Próxima versión

*(Sin versión en curso — ver Fase 9 en `04-TASK.md`.)*

---

## 📜 HISTORIAL DE CAMBIOS

### 📌 v0.9.0 — Fase 8: Grafo de conocimiento

**Descripción general:**  
Vista de grafo interactiva estilo Obsidian (canvas + D3 force): nodos por entidad, tamaño ∝ grado, hover con glow y fade de no vecinos, colores taxonómicos, filtros por categoría, clic → ficha. Índice `graph_edges` reconstruido bajo demanda desde `wiki_links` y relaciones en metadatos de fichas.

#### Entregable 8.1 — Backend

- **✨ Añadido:** `graph/indexer.rs`, `graph/query.rs`, `graph/scheduler.rs`, `db/graph_edges.rs`.
- **✨ IPC:** `get_graph_data_cmd`, `rebuild_graph_index_cmd`, `rebuild_graph_index_async_cmd`.
- **🧪 Tests:** indexador wiki-links (3 entidades, 2 aristas).

#### Entregable 8.2 — Frontend

- **✨ Añadido:** `GraphView`, `GraphFilterPanel`, `useGraphProject`, `useGraphSimulation`; entrada **Grafo** en `GlobalNav`.
- **✨ i18n:** namespace `graph` (es/en); toggle «Actualizar índice al abrir vista» en Configuración.

**Parámetros simulación (documentados):** `charge −140`, `linkDistance 90`, `alphaDecay 0.028`, radio `√degree`.

**Plan de prueba manual:** abrir Grafo → Actualizar índice → verificar enlaces entre fichas con `[[wiki-link]]` → hover fade → filtrar Personajes → clic abre ficha.

---

### 📌 v0.8.0 — Fase 7: Mapas interactivos

**Descripción general:**  
Visor de mapas con imagen estática y capas vectoriales (Leaflet `CRS.Simple`): pines, polígonos, gestor de capas, vínculo a entidades, mapas anidados con breadcrumb, capas históricas por marca temporal (`get_map_state_at`), mini-línea de tiempo con reproducción, y bocetos opcionales con Excalidraw (MIT) guardados aparte de las capas estructuradas.

**Alineación con requisitos (`01-REQUIREMENTS.md`):** mapas interactivos, drill-down espacial, evolución geográfica, capas taxonómicas, bocetos no vinculantes.

**Criterios de aceptación (Roadmap Fase 7):** cumplidos; ver `04-TASK.md` § criterios archivados.

#### Entregable 7.1 — Visor base — Tareas 7.1.1–7.1.4

- **✨ Añadido (backend):** `fs/maps_store.rs`, `.narralith/maps/`; IPC `list_project_maps`, `get_map_data_cmd`, `save_map_data_cmd`, `create_map_cmd`, `import_map_image_cmd`, `import_overlay_image_cmd`.
- **✨ Añadido (frontend):** `MapWorkspace`, `MapLeafletCanvas`, `MapDrawToolbar`, `MapLayerPanel`, `useMapProject`, `useMapStore`; entrada **Mapa** en `GlobalNav`.
- **Dependencias:** `leaflet`, `react-leaflet`.

#### Entregable 7.2 — Anidados y tiempo — Tareas 7.2.1–7.2.3

- **✨ Añadido:** `childMapId`, `MapBreadcrumb`, validación anti-ciclos; overlays en `manifest.json`; `get_map_state_at_cmd`; `MapTimelineScrubber`, `MapPeriodEvents`, `MapOverlayPanel`.

#### Entregable 7.3 — Bocetos Excalidraw — Tarea 7.3.1

- **✨ Añadido:** IPC `get_map_sketch_cmd`, `save_map_sketch_cmd`; `MapSketchPanel` (carga diferida); toggle en panel de capas; persistencia en `sketches/default.excalidraw.json`.
- **📄 Licencia:** `THIRD_PARTY_NOTICES.md` (Excalidraw MIT). Los bocetos no se indexan en SQLite ni alimentan el grafo (Fase 8).

#### Entregable 7.4 — Cierre — Tareas 7.4.1–7.4.3

- **✨ Añadido:** namespace i18n `maps` (es/en).
- **🔄 Modificado:** `06-ARCHITECTURE.md` § Fase 7; `04-TASK.md` archivado.

**Coordenadas:** cada punto de feature es `[y, x]` en espacio de imagen; bounds del mapa `[0,0]`–`[height,width]`.

**Plan de prueba manual (cierre 7.4.3):**

1. Abrir proyecto → icono **Mapa** → **Nuevo mapa** con imagen PNG.
2. Modo **Pin** y **Polígono** (doble clic cierra) → recargar proyecto → geometría persiste.
3. Seleccionar elemento → vincular entidad → **Abrir ficha**.
4. Asignar **mapa detallado** a un polígono → doble clic → breadcrumb vuelve al padre.
5. **Capas históricas** → importar overlay con `desde`/`hasta` (timestamp decimal) → scrubber actualiza vista.
6. **Mostrar bocetos** → dibujar en Excalidraw → cerrar y reabrir mapa → boceto intacto.
7. Ocultar bocetos → capas de entidades siguen visibles.

**Tests:** `cargo test` (70) OK; `npm run build` + `npm run lint` OK.

#### Índice de tareas archivadas (7.1.1–7.4.3)

| Tarea | Entregable |
|-------|------------|
| 7.1.1 | Esquema maps + IPC |
| 7.1.2 | MapLeafletCanvas |
| 7.1.3 | Dibujo pin/polígono |
| 7.1.4 | MapLayerPanel + entidades |
| 7.2.1 | Mapas anidados |
| 7.2.2 | Overlays + `get_map_state_at` |
| 7.2.3 | Mini-timeline + playback |
| 7.3.1 | Excalidraw bocetos |
| 7.4.1 | i18n maps |
| 7.4.2 | Arquitectura |
| 7.4.3 | Cierre v0.8.0 |

---

### 📌 v0.7.0 — Fase 6: Motor temporal y línea de tiempo

**Descripción general:**  
Calendario ficticio configurable por proyecto (`.narralith/calendar.json`) con motor TypeScript + `BigInt`; resolución de `metadata.time` → `time_markers.timestamp` al guardar; línea de tiempo global con D3 (`TimelineView`); mini-vista previa en el inspector; plothole checker en segundo plano (personaje en dos ubicaciones al mismo instante) con panel no intrusivo y descarte de alertas intencionales.

**Alineación con requisitos (`01-REQUIREMENTS.md`):** marcas de tiempo, escenas paralelas, mini-timeline, consistencia narrativa sin bloquear escritura.

**Criterios de aceptación (Roadmap Fase 6):** cumplidos; ver `04-TASK.md` § criterios consolidados.

#### Entregable 6.1 — Motor de calendario — Tareas 6.1.1–6.1.4

- **✨ Añadido (backend):** `fs/calendar_config.rs`, default `resources/defaults/calendar.json`; IPC `get_calendar_config` / `set_calendar_config`.
- **✨ Añadido (frontend):** `src/lib/calendar/` (motor BigInt, Vitest), `useCalendarStore`, `CalendarSettingsSection` en ajustes.
- **🔄 Modificado:** `save_document` / `update_block_metadata` envían `timeTimestamp`; `time_markers.timestamp` persistido; `get_entity_timeline` ordena por timestamp numérico.

#### Entregable 6.2 — Línea de tiempo — Tareas 6.2.1–6.2.4

- **✨ Añadido (backend):** `timeline/project.rs`, IPC `get_timeline_events` (filtros, `isParallel`).
- **✨ Añadido (frontend):** `TimelineView` (D3), `useProjectTimeline`, `MiniTimelinePreview`, entrada reloj en `GlobalNav`.

#### Entregable 6.3 — Plothole checker — Tareas 6.3.1–6.3.3

- **✨ Añadido (backend):** `checker/plothole.rs`, `checker/scheduler.rs` (debounce 3 s), `dismissed_issues.json`; IPC `get_consistency_issues`, `dismiss_consistency_issue`; evento `consistency-updated`.
- **✨ Añadido (frontend):** `ConsistencyPanel`, badge en `GlobalNav`, `useConsistencyIssues`.

#### Entregable 6.4 — Cierre — Tareas 6.4.1–6.4.3

- **✨ Añadido:** namespaces i18n `calendar`, `timeline`, `consistency` (es/en).
- **🔄 Modificado:** `06-ARCHITECTURE.md` § Fase 6, `04-TASK.md` archivado.

**Formato de fecha MVP:** `día.mes.año` (ej. `14.3.1024`); etiquetas `mythic` / `unknown` para orden al final.

**Plan de prueba manual (cierre 6.4.3):**

1. Abrir proyecto → **Ajustes** → editar meses del calendario → guardar.
2. En un bloque, `time: 1.1.0` y `location` + `characters` → guardar.
3. Crear segundo bloque mismo `time` y personaje, **ubicación distinta** → tras ~3 s, badge en icono de consistencia.
4. Abrir **Consistencia** → ver alerta → **Marcar como intencional** → desaparece.
5. Icono **reloj** → línea de tiempo global; filtrar por categoría / año; abrir escena desde lista.
6. Editar `time` en inspector → mini-vista previa de vecinos cronológicos.

**Tests:** `cargo test` (65) OK; `npm run test` (5) OK; `npm run build` + `npm run lint` OK.

**Tareas de referencia (histórico):** ver índice inferior.

#### Índice de tareas archivadas (6.1.1–6.4.3)

| Tarea | Entregable |
|-------|------------|
| 6.1.1 | Esquema `calendar.json` + IPC |
| 6.1.2 | Motor calendario TypeScript (`BigInt`) |
| 6.1.3 | `useCalendarStore` + UI ajustes |
| 6.1.4 | Resolver `time` → `timestamp` |
| 6.2.1 | `get_timeline_events` |
| 6.2.2 | `TimelineView` (D3) |
| 6.2.3 | Filtros y drill-down |
| 6.2.4 | Mini-timeline en inspector |
| 6.3.1 | Queries `plothole.rs` |
| 6.3.2 | Checker en background |
| 6.3.3 | `ConsistencyPanel` |
| 6.4.1 | i18n `calendar` / `timeline` / `consistency` |
| 6.4.2 | Arquitectura y diagramas |
| 6.4.3 | Cierre v0.7.0 |

---

### 📌 v0.6.0 — Fase 5: Control de versiones (Git invisible)

**Descripción general:**  
Snapshots manuales con nombre, historial y restauración del proyecto completo; copias automáticas cada 5 minutos (configurable) con retención; snapshot preventivo antes de borrados masivos (≥500 caracteres); diff por palabras entre una versión y el archivo actual; copiar texto eliminado sin restaurar todo el proyecto. Toda la lógica en Rust (`git2`); la UI usa solo «versión», «historial» y «restaurar».

**Alineación con requisitos (`01-REQUIREMENTS.md`):** control de versiones invisible, puntos de control con nombre, autoguardado, comparación visual, recuperación de fragmentos.

**Criterios de aceptación (Roadmap Fase 5):** cumplidos; ver diferidos abajo.

#### Entregable 5.1 — Snapshots manuales — Tareas 5.1.1–5.1.4

- **✨ Añadido (backend):** `git/snapshot.rs` — `create_snapshot`, `list_snapshots`, `restore_snapshot`, `ensure_initial_commit`; mensajes `narralith:init` (oculto) y manual sin prefijo reservado.
- **✨ Añadido (IPC):** `commands/versioning.rs` — `create_snapshot`, `list_snapshots`, `restore_snapshot`.
- **✨ Añadido (frontend):** `VersionHistoryPanel`, `SaveSnapshotDialog`, icono historial en `WorkspaceShell`; `reloadAllTabsAfterRestore` + `fs-changed` `kind: restore`.

#### Entregable 5.2 — Autoguardado inteligente — Tareas 5.2.1–5.2.3

- **✨ Añadido:** `auto_snapshot`, `prune_auto_snapshots` (replay lineal de árboles), `.narralith/versioning.json` (`autoRetention`, `autoIntervalMinutes`).
- **✨ Añadido:** `git/auto_scheduler.rs` en `ProjectState::open_session`; evento `auto-snapshot`; `useAutoSnapshotIndicator`.
- **✨ Añadido:** `auto_snapshot_if_risky_delete` en `save_document` y `save_entity` (`editor/risk.rs`, umbral 500).

#### Entregable 5.3 — Diff View — Tareas 5.3.1–5.3.3

- **✨ Añadido:** `git/diff.rs` + crate `similar` — `get_file_diff` (máx. 10 000 palabras).
- **✨ Añadido:** `DiffViewer` — chunks equal/add/remove, copiar texto eliminado, enlace a restaurar proyecto completo.
- **✨ Añadido:** Botón «Comparar» en historial (archivo activo en editor).

#### Entregable 5.4 — Cierre — Tareas 5.4.1–5.4.3

- **✨ Añadido:** namespace `versions` (es/en) completo; `versionErrorKey` para errores IPC.
- **🔄 Modificado:** `06-ARCHITECTURE.md` (IPC, diagramas mermaid, nota `.git` oculto), `03-ROADMAP.md`, `04-TASK.md`.

**Plan de prueba manual (cierre 5.4.3):**

1. Abrir proyecto → editar un `.md` → **Guardar versión** con nombre → ver entrada en historial.
2. Seguir editando → **Comparar** con archivo abierto → ver diff por palabras → **Copiar texto eliminado**.
3. **Restaurar** versión anterior → confirmar → explorador y pestañas coherentes con disco.
4. Opcional: `autoIntervalMinutes: 1` en `.narralith/versioning.json` → esperar copia automática en barra.
5. Borrar >500 caracteres y guardar → comprobar que existe copia auto previa (`includeAuto` en historial).

**⏸️ Diferido (no bloqueante v0.6.0):**

- Restaurar un solo archivo desde diff (checkout path; MVP solo proyecto completo).
- Ajustes de retención/intervalo desde UI de configuración (solo JSON en `.narralith/`).
- Diff entre dos snapshots arbitrarios (dos OIDs); MVP compara versión vs disco actual.

**Tests:** `cargo test` (68) OK; smoke diff 10k palabras &lt;5 s; `npm run build` + `npm run lint` OK.

**Tareas de referencia (histórico):** 5.1.1–5.4.3 (checklists archivados desde `04-TASK.md`).

---

### 📌 v0.5.0 — Fase 4: Fichas de entidad y worldbuilding

**Descripción general:**  
Motor genérico de fichas (plantillas YAML → `EntityFormRenderer`), persistencia documento simple (frontmatter + cuerpo, sin `+++`), integración con diccionario y backlinks (Fase 3), vistas relacionales por ficha, plantillas para todas las categorías del scaffold, y vista de tarjetas en el explorador Worldbuilding con metadatos ocultos `.folder.md`.

**Alineación con requisitos (`01-REQUIREMENTS.md`):** fichas modulares bajo `Worldbuilding/`, relaciones como wiki-links, línea de tiempo personal, habitantes de ubicación, metadatos de carpeta, imágenes como rutas locales.

**Criterios de aceptación (Roadmap Fase 4):** cumplidos en lo esencial; ver diferidos abajo.

#### Entregable 4.1 — Motor de fichas genérico — Tareas 4.1.1–4.1.8

- **✨ Añadido (backend):** `src-tauri/src/entity/` (`template`, `registry`, `document`, `metadata_index`, `path_rules`, `timeline`, `inhabitants`); plantillas en `resources/entity_templates/`; `template_map.json`; migración DB v3 (`entities.metadata`).
- **✨ Añadido (IPC):** `list_entity_templates`, `get_entity_template`, `resolve_template_for_path`, `read_entity`, `save_entity`, `create_entity`, `get_entity_timeline`, `get_location_inhabitants`.
- **✨ Añadido (frontend):** `EntityFormRenderer`, `EntityWorkspace`, `CreateEntityDialog`, campos en `modules/worldbuilding/fields/`; pestañas `kind: manuscript | entity` en `useEditorStore`; `isEntityPath()`.

#### Entregable 4.2 — Fichas prioritarias — Tareas 4.2.1–4.2.6

- **✨ Añadido:** Plantillas ampliadas `character`, `location`, `lore` (`features: timeline` / `inhabitants`).
- **✨ Añadido:** `EntityTimelinePanel`, `LocationInhabitantsPanel`, hooks con refresco vía `documentSyncKey`.
- **✨ Añadido:** `useTemplatePrefsStore` + `EntityFormCustomizer` (ocultar campos / añadir custom).

#### Entregable 4.3 — Fichas secundarias — Tareas 4.3.1–4.3.4

- **✨ Añadido:** 17+ plantillas YAML (naturaleza, objetos, sociedad); registro bundled; reglas granulares en `template_map.json`.
- **✨ Añadido:** UI `select`, `keyValue`, `nested`, relaciones `multiple` en formulario.

#### Entregable 4.4 — Vista tarjetas — Tareas 4.4.1–4.4.5

- **✨ Añadido:** `fs/folder_meta.rs` — `get_folder_meta`, `set_folder_description`, `count_entities_in_tree`.
- **✨ Añadido:** `CardView`, `FolderCard`, toggle árbol/tarjetas (`explorerLayout` en `localStorage`), `FolderDescriptionDialog`.

#### Entregable 4.5 — i18n y documentación — Tareas 4.5.1–4.5.3

- **✨ Añadido:** namespace `worldbuilding` (es/en); `normalizeEntityErrorKey` ampliado (`error.folder.*`).
- **🔄 Modificado:** `06-ARCHITECTURE.md` (fichas, matriz plantillas, tarjetas, diagrama guardado), `03-ROADMAP.md`, `04-TASK.md`.

**⏸️ Diferido (no bloqueante v0.5.0):**

- `ImageField` con explorador nativo bajo `Imagenes/` por categoría.
- Validación inline de campos `required` antes de guardar.
- Recarga/conflicto de ficha activa en `fs-changed` (patrón Fase 2).
- Icono distinto en pestaña ficha vs manuscrito.
- Test de metadata JSON con relación (4.1.4 paso 4).

**Tests:** `cargo test` (59) OK; `npm run build` + `npm run lint` OK.

**Tareas de referencia (histórico):** 4.1.1–4.5.3 (checklists archivados desde `04-TASK.md`).

---

### 📌 v0.4.1 — Pulido editor wiki-links (cierre Fase 3)

**Descripción general:**  
Correcciones de UX en Lexical tras el cierre funcional de v0.4.0: cursor, espacios y navegación sin diálogos espurios.

- **🐛 Corregido:** Tras insertar un wiki-link, seguir escribiendo ya no rompe el nodo ni desincroniza offsets (`getTextContent` visible vs `getMarkdownText` al guardar; modo token; `canInsertTextAfter: false`).
- **🐛 Corregido:** Al confirmar autocompletado, el foco vuelve al editor con nodo texto cola (`insertNodes([link, tail])`).
- **🐛 Corregido:** Clic en enlace o backlink usa `navigateToDocument` (cambia pestaña sin forzar guardar; conserva `isDirty` en la pestaña anterior).
- **🐛 Corregido:** Espacio tras un enlace ya no salta al final de la palabra siguiente — `$normalizeTextAfterWikiLink` solo elimina `\u200B` (ZWSP), no espacios del usuario; no reposiciona el cursor si la selección no está en el nodo afectado.
- **✨ Añadido:** `wikiLinkPlaceholder.ts`, `WikiLinkNormalizeTailPlugin`, `wikiLinkHydrate.ts` (`stripWikiLinkPlaceholders` al serializar).

**Tests:** `npm run build` OK; regresión manual editor wiki-links aceptada.

---

### 📌 v0.4.0 — Fase 3: Referencias Cruzadas y Diccionario

**Descripción general:**  
Diccionario de entidades en memoria (MiniSearch sobre SQLite), wiki-links WYSIWYM con autocompletado `[[` y `@`, persistencia de `wiki_links` / `backlinks`, renombrado global de referencias al cambiar el stem de una ficha, y panel de backlinks con menciones no vinculadas y conversión a enlace. Parseo, escaneo y refactor solo en Rust.

**Alineación con requisitos (`01-REQUIREMENTS.md`):** referencias `[[…]]`, alias `[[Real|Alias]]`, mención rápida `@`, auto-refactorización al renombrar, menciones no vinculadas.

**Criterios de aceptación (Roadmap Fase 3):** cumplidos (verificación manual de flujo editor y panel referencias en cierre de ciclo).

#### Entregable 3.1 — Diccionario (MiniSearch) — Tareas 3.1.1–3.1.4

- **✨ Añadido:** `list_entities_for_search` (IPC), `lib/search/entityIndex.ts`, `lib/types/entitySearch.ts`, `useEntitySearchStore`, `useEntitySearch`, `useEntityIndexBootstrap`.
- **✨ Añadido:** Rebuild desde SQLite al `open_project`; vaciado al `close_project`; patch incremental vía `fs-changed`.
- **✨ Añadido:** Fuzzy MiniSearch (tolerancia 1–2 typos); aliases desde frontmatter (`entity_aliases.rs`) indexados y resolubles en búsqueda.

#### Entregable 3.2 — Wiki-links — Tareas 3.2.1–3.2.6

- **✨ Añadido:** `WikiLinkNode`, `WikiLinkTypeaheadPlugin`, `WikiLinkMenu`, trigger `[[` y `@`, sintaxis `[[Real|Alias]]`.
- **✨ Añadido:** `wikilink/scanner.rs`, `db/wiki_links.rs`, `commands/references.rs` (`register_document_links` en guardado/reparseo).
- **✨ Añadido:** Estilos resuelto / `wikilink-unresolved`; tooltips i18n; hidratación `wikiLinkHydrate` / `wikiLinkSyntax`.
- **✨ Añadido:** `WikiLinkClickPlugin` — navegación a documento destino si resuelto.

#### Entregable 3.3 — Rename global — Tareas 3.3.1–3.3.2

- **✨ Añadido:** `refactor/rename_entity.rs` (rayon, escritura atómica, rollback); reemplazo `[[Old]]` / `[[Old|alias]]` en todo el proyecto.
- **✨ Añadido:** Integración en `rename_path`; `emit_fs_changed`; `remapTabPath` + `useEditorFsSync` para pestañas abiertas.

#### Entregable 3.4 — Backlinks y menciones — Tareas 3.4.1–3.4.4

- **✨ Añadido:** `get_backlinks`, `find_unlinked_mentions`, `convert_unlinked_mention`; tipos `lib/types/references.ts`.
- **✨ Añadido:** `BacklinksPanel` — pestañas Metadatos | Referencias en `EditorSidePanel`; snippets clicables; conversión de menciones no vinculadas.
- **✨ Añadido:** Navegación a `source_path` + `block_index` (resaltado de snippet diferido).

#### Entregable 3.5 — i18n y documentación — Tareas 3.5.1–3.5.2

- **✨ Añadido:** namespace `references` (es/en), `normalizeReferencesErrorKey`; claves `error.wikilink.*` / `error.refactor.*`.
- **🔄 Modificado:** `06-ARCHITECTURE.md` (comandos Fase 3, diagrama flujo), `03-ROADMAP.md`, `04-TASK.md`.

**⏸️ Diferido (no bloqueante):**

- Resaltado temporal de snippet al navegar desde backlink (3.4.4).
- Refresh en vivo de links no resueltos al crear entidad con ese nombre (3.2.6).
- Benchmark formal: índice MiniSearch <100 ms y rename ~500 archivos <2 s (metas roadmap; validación cualitativa en dev).

**Tests:** 45× `cargo test`; `npm run build` OK.

**Tareas de referencia (histórico):** 3.1.1–3.5.2 (checklists archivados desde `04-TASK.md` en este changelog).

---

### 📌 v0.3.0 — Fase 2: Parser de Texto y Motor del Editor

**Descripción general:**  
Parser Rust de bloques `+++` y frontmatter YAML por bloque, persistencia en `blocks` / `time_markers`, editor Lexical WYSIWYM (sin `+++` ni YAML en el lienzo), guardado round-trip en disco, inspector de metadatos del bloque activo, pestañas multi-archivo y preferencias de autoguardado. Todo parseo/serialización/I/O en Rust; React solo IPC y UI.

**Alineación con requisitos (`01-REQUIREMENTS.md`):** parser dos fases (regex + YAML), WYSIWYM con sintaxis técnica invisible, panel derecho para metadatos, FS como fuente de verdad, offline-first.

**Alineación con stack (`02-TECH_STACK.md`):** Lexical en frontend; `serde_yaml` + `regex` en backend; prohibido parseo masivo en JS para abrir/guardar documentos.

**Criterios de aceptación (Roadmap Fase 2):** cumplidos, salvo prueba manual de rendimiento con documentos >10 000 palabras (diferida).

#### Entregable 2.1 — Parser de bloques (Rust)

- **✨ Añadido (backend):**
  - `src-tauri/src/parser/` — `block_splitter`, `frontmatter`, `serializer`, `document`, `metadata_util`, `types`.
  - `db/blocks.rs` — upsert/replace por archivo, `time_markers`, hash SHA256 del cuerpo.
  - Integración en `fs/reconcile.rs` (reparseo en `.md` modificados).
  - Comandos IPC: `read_document`, `parse_document`, `save_document`, `update_block_metadata` (`commands/editor.rs`).
  - Deps: `serde_yaml`, `regex`, `sha2`.
  - Tests: 32 tests `cargo test` (splitter, YAML inválido por bloque, round-trip, metadata aislada por bloque).

- **✨ Añadido (frontend):**
  - `src/lib/types/editor.ts` — `ParsedDocument`, `ParsedBlock`.

#### Entregable 2.2 — Editor Lexical (WYSIWYM)

- **✨ Añadido (frontend):**
  - `lexical`, `@lexical/react`, `@lexical/rich-text`, `@lexical/history`, etc.
  - `src/modules/editor/` — `EditorCanvas`, `EditorShell`, `EditorTabBar`, `EditorSidePanel`, `BlockSeparatorNode`.
  - Plugins: `HydrateDocumentPlugin`, `ActiveBlockPlugin`, `DirtyStatePlugin`, `ExtractBlocksPlugin`.
  - `useEditorStore` — pestañas, guardado, baseline de contenido (sin falsos “sin guardar” al hacer clic).
  - `useEditorAutoSave` — opcional vía `useSettingsStore` (desactivado por defecto).
  - `useEditorFsSync`, `ExternalReloadDialog`, `UnsavedChangesDialog`.
  - `src/lib/editor/documentSync.ts`, `blockMetadata.ts`, `editorSyncGuard.ts`.
  - Namespace i18n `editor` + `settings` (es/en).

- **✨ Añadido (backend):**
  - `src-tauri/src/editor/risk.rs` — stub detección borrado masivo (Fase 5).

#### Entregable 2.3 — Inspector de metadatos

- **✨ Añadido:**
  - `MetadataInspector` — campos `time`, `location`, `event`, `characters`, `tags`; debounce 300 ms; claves vacías omitidas en YAML (`sanitize_metadata`).
  - `update_block_metadata` — solo frontmatter del bloque indicado; test `update_metadata_only_touches_target_block`.

- **🔄 Modificado:**
  - `06-ARCHITECTURE.md` — comandos editor, inspector, i18n `settings`.
  - `03-ROADMAP.md` — Fase 2 marcada completada.

- **⏸️ Diferido (no bloqueante):**
  - Evento `document-parsed` (opcional 2.1.6).
  - Benchmark manual documento ~10 000 palabras.

**Tareas de referencia (histórico):** 2.1.1–2.1.8, 2.2.1–2.2.6, 2.3.1–2.3.5 (detalle en historial de git de `04-TASK.md`).

---

### 📌 v0.2.0 — Fase 1: Motor de Filesystem y Gestión de Proyectos

**Descripción general:**  
Ciclo de vida completo del proyecto (crear, abrir, cerrar, recientes), SQLite aislado por obra, watcher con reconciliación FS → SQLite, y explorador de archivos con CRUD, menú contextual, drag & drop y filtros de vista. Toda la I/O de archivos y base de datos ocurre en Rust; el frontend solo invoca IPC.

**Decisiones de producto (explorador):**
- Vista **Manuscrito** → solo `Manuscrito/`
- Vista **Worldbuilding** → solo `Worldbuilding/` (sin `Imagenes/`)
- Vista **Todo** → raíz del proyecto (incluye `Manuscrito/`, `Worldbuilding/`, `Imagenes/`, etc.)

**Criterios de aceptación (Roadmap Fase 1):** cumplidos.

#### Entregable 1.1 — Gestor de proyectos

- **✨ Añadido (backend):**
  - Plantillas `standard` y `blank` (`resources/templates/`, `fs/templates.rs`).
  - `ProjectDb` con `rusqlite` por proyecto (`db/connection.rs`, migración `002_entity_status.sql`).
  - Scaffold FS + `.narralith/taxonomy.json` (`fs/scaffold.rs`).
  - `git init` oculto + `.gitignore` (`git/init.rs`).
  - Comandos IPC: `create_project`, `open_project`, `close_project`, `get_active_project` (`commands/project.rs`, `state/project.rs`).
  - Proyectos recientes en AppData (`fs/recents.rs`, `list_recent_projects`, `remove_recent_project`).
  - Adopción de carpetas sin `.narralith` (`fs/adopt.rs`).
  - Indexación ligera `.md` → `entities` (`fs/indexer.rs`).

- **✨ Añadido (frontend):**
  - Namespace i18n `project` (es/en).
  - `useProjectStore`, `ProjectLauncher`, `CreateProjectDialog`.
  - `WorkspaceShell`, `GlobalNav` (esqueleto 3 paneles).
  - `tauri-plugin-dialog` para elegir carpetas.

#### Entregable 1.2 — Watcher y reconciliación

- **✨ Añadido:**
  - `fs/watcher.rs` — `notify` + debounce 250 ms; ignora `.git/` y `.narralith/`.
  - `fs/reconcile.rs` — create/rename/delete → SQLite (`entities.status` ghost, `wiki_links` en rename).
  - Evento Tauri `fs-changed` → `useFsWatcher` → `useFileTreeStore.loadTree()`.
  - Barrido inicial FS vs SQLite al abrir proyecto.

#### Entregable 1.3 — Explorador

- **✨ Añadido (backend):**
  - `fs/tree.rs` — `list_dir_tree` con `filterMode` (`all` | `manuscript` | `worldbuilding`).
  - `fs/taxonomy.rs` — colores desde `.narralith/taxonomy.json`.
  - `fs/paths.rs`, `fs/crud.rs` — validación bajo `project_root`, CRUD.
  - Comandos IPC: `list_dir_tree`, `get_taxonomy_colors`, `create_folder`, `create_file`, `rename_path`, `move_path`, `delete_path` (`commands/fs_ops.rs`).

- **✨ Añadido (frontend):**
  - Namespace i18n `explorer` (es/en).
  - `useFileTreeStore` — árbol, selección, expansión, CRUD IPC.
  - `FileExplorer`, `FileTreeItem`, `ExplorerContextMenu`, `ExplorerDialogs`.
  - Drag & drop con `@dnd-kit/core` → `move_path`.

- **🔄 Modificado:**
  - `06-ARCHITECTURE.md` — mapa de módulos, diagrama de flujo, tablas IPC.
  - Eliminado comando demo `greet` (Fase 0).

- **🗑️ Eliminado:**
  - `commands/greet.rs`.

**Tareas de referencia (histórico):** 1.1.1–1.1.9, 1.2.1–1.2.3, 1.3.1–1.3.7 (detalle paso a paso archivado en el historial de git de `04-TASK.md`).

---

### 📌 v0.1.0 — Fase 0: Cimientos del Proyecto

**Descripción General:**  
Se inicializó el monorepo Tauri 2 + React/Vite con estructura modular, sistema de diseño (Tailwind + Shadcn), i18n día cero, contratos de datos TS/Rust, esquema SQLite base y herramientas de calidad (ESLint, Prettier, Husky).

**Detalle de Cambios:**

- **✨ Añadido:**
  - Proyecto Tauri 2 + React TypeScript (`package.json`, `vite.config.ts`, `src-tauri/`).
  - Estructura frontend: `components/`, `stores/`, `hooks/`, `modules/`, `i18n/`, `lib/types/`.
  - Estructura backend: `commands/`, `models/`, `db/`, `fs/`, `git/`, `error.rs`.
  - `src/i18n/config.ts` + diccionarios `en/global.json` y `es/global.json`.
  - `src/lib/types/models.ts` — contratos `ProjectMeta`, `Entity`, `Block`, `WikiLink`, `TimeMarker`, `GraphNode`, `GraphEdge`, `Backlink`.
  - `src-tauri/src/db/schema.sql` — tablas v1 con índices.
  - `tauri-plugin-sql` con migración inicial.
  - ESLint flat config, Prettier, Husky + lint-staged.
  - `src-tauri/.taurignore` — excluye `_docs/` del build.
  - Shadcn/UI (`components/ui/button.tsx`, tema oscuro en `globals.css`).
  - `useAppStore` (Zustand).

- **🔄 Modificado:**
  - `_docs/06-ARCHITECTURE.md` — mapa de directorios y esquema SQLite documentados.
  - `README.md` del template sustituido por shell NarraLith con i18n.

- **🗑️ Eliminado:**
  - `src/App.css` — estilos migrados a Tailwind/globals.
