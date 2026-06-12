# FIX-012 — Guardar no debe cambiar pestaña ni cerrar tabs abiertas

> Plan de investigación y arreglo. **Estado:** 📋 Planificado (sin implementar) · **Esfuerzo:** Medio · **Riesgo:** Medio  
> **Lista maestra:** [`implementation-plan.md`](../implementation-plan.md) Fase B · **Sin archivos extra** — solo este plan + la fila en la lista maestra.

---

## 1. Problema y objetivo

**Problema:** Tras guardar, el editor **cambia de documento**, **cierra pestañas** que el usuario tenía abiertas y editando, o deja el explorador desincronizado — sin acción explícita del usuario. El contenido en disco puede haberse guardado bien; el fallo es de **sesión de pestañas** y, en el peor caso, de **índice SQLite** (`status = ghost`).

**Objetivo FIX-012:**

1. **Ctrl+S** guarda el documento **activo** sin cambiar de pestaña ni cerrar otras tabs.
2. **«Guardar todo»** persiste todas las pestañas sucias **sin** cerrarlas ni dejar al usuario en un documento arbitrario.
3. Un guardado propio (`save_manuscript` + sync eventos WB) **no** debe disparar `closeTabsRemovedFromDisk` ni `mark_ghost` espurio sobre manuscritos que siguen en disco.
4. Tras guardar, **explorador ↔ pestañas ↔ editor** coherentes (sin resaltados «fantasma» de archivos ya cerrados en la barra de tabs).
5. QA manual confirma round-trip en manuscritos con marcos de evento (`eventoTest`, etc.).

**Fuera de alcance:**

| Tema | Motivo |
|------|--------|
| Scroll al inicio tras recarga externa | Checklist §7 `manuscript-design.md` — otro fix |
| FIX-007 borrador sucio al cerrar app | Persistencia de sesión |
| Renombrado explícito en explorador | Flujo CRUD ya documentado |
| Épica FIX-011 evento WB huérfano | Detector de huérfanos reales; aquí evitamos **falsos** ghost por watcher |

### 1.1 Reproducción confirmada (QA usuario, 2026-06-11)

**Precondición:**

- Varias pestañas abiertas: `shushah`, `sas`, `skanlnsklnals`, `meow`, `eventoTest` (orden observado).
- Solo **`meow`** y **`eventoTest`** editados (sucios).
- Activo al guardar: **`eventoTest`**.

**Acción:** guardar (Ctrl+S o «Guardar todo» — por confirmar en Fase 0).

**Resultado observado:**

| Aspecto | Antes | Después |
|---------|-------|---------|
| Pestañas abiertas | 5 manuscritos | **3** (`shushah`, `sas`, `skanlnsklnals`) |
| `meow`, `eventoTest` | Abiertas, sucias | **Cerradas** en la barra (contenido aparentemente guardado en disco) |
| Documento activo | `eventoTest` | **`skanlnsklnals`** |
| Explorador | — | Resaltado anómalo: **`skanlnsklnals` y `eventoTest`** a la vez (desincronización UI) |

**Interpretación (encaja con H2):**

```text
tabOrder = [shushah, sas, skanlnsklnals, meow, eventoTest]

Si fs-changed kind=remove incluye meow y eventoTest (watcher / OneDrive):
  closeTabsRemovedFromDisk(eventoTest) → activo pasa a meow
  closeTabsRemovedFromDisk(meow)       → activo pasa a skanlnsklnals  ← resultado final
```

H1 (`saveAllOpenTabs` + switchTab) explicaría **saltos temporales**, pero **no** el cierre de **dos** pestañas de la barra. Eso apunta a **`remove` espurio** en el watcher, no solo a restauración fallida.

**Primer reporte (sesión anterior):** salto `eventoTest` → `meow` sin cierre explícito — compatible con H1 o con un solo `remove`. Este segundo reporte **eleva H2** a causa principal.

---

## 2. Auditoría del código (cadena completa)

### 2.1 Entradas de guardado

| Origen | Handler | Comportamiento actual |
|--------|---------|----------------------|
| **Ctrl+S** en manuscrito | [`EditorCanvas.tsx`](../../../src/modules/editor/EditorCanvas.tsx) L19–27 | Llama `saveAllOpenTabs()` |
| **Ctrl+S** en entidad WB | [`EntityWorkspace.tsx`](../../../src/modules/worldbuilding/EntityWorkspace.tsx) L18–26 | Igual: `saveAllOpenTabs()` |
| Botón 💾 panel lateral | [`EditorSidePanel.tsx`](../../../src/modules/editor/EditorSidePanel.tsx) L213, L293, L304 | `saveAllOpenTabs()` |
| Autoguardado (opcional) | [`useEditorAutoSave.ts`](../../../src/hooks/useEditorAutoSave.ts) | `saveDocument()` **solo pestaña activa** ✅ |

**Conclusión inmediata:** el atajo más usado (Ctrl+S) **no** equivale a «guardar este archivo»; equivale a «guardar todo lo sucio», con cambios de pestaña intermedios.

### 2.2 `saveAllOpenTabs` — mecanismo de salto

[`useEditorStore.ts`](../../../src/stores/useEditorStore.ts) L1174–1223:

```text
initialActivePath = activeFilePath
dirtyPaths = tabOrder.filter(path => tabs[path].isDirty)

for (path of dirtyPaths):
  if activeFilePath !== path → await switchTab(path)   ← salto visible
  await saveDocument() | saveEntity()

if initialActivePath && active !== initial && tabs[initialActivePath]:
  await switchTab(initialActivePath)                   ← restauración
```

**Efectos colaterales de cada `switchTab`:**

- `flushActiveTabToCache` → extrae Lexical del tab que se abandona.
- `extractManuscriptFn = null` + `beginEditorSession()` → remonta sesión del tab destino.
- UI: pestaña superior, canvas y explorador (`activeFilePath` en `FileTreeItem`) cambian.

**Restauración frágil:** si al final `tabs[initialActivePath]` es `undefined`, **no hay `switchTab` de vuelta** y el usuario se queda en la **última pestaña guardada** del bucle.

Orden en captura del bug: `shushah`, `sas`, `skanlnsklnals`, **`meow`**, **`eventoTest`**.  
Si `meow` también está sucio y se guarda **después** de `eventoTest`, el bucle termina en `meow` hasta que la restauración funcione.

### 2.3 `saveDocument` — guardado del activo

[`useEditorStore.ts`](../../../src/stores/useEditorStore.ts) L849–905:

- Requiere `extractManuscriptFn` del editor montado (pestaña activa).
- `markSelfSave(activeFilePath)` antes del IPC.
- Tras éxito: actualiza `manuscript`, `tabs[path]`, `isDirty: false` **sin** cambiar `activeFilePath`.

Por sí solo **no** cambia de pestaña.

### 2.4 Pipeline Rust al guardar manuscrito con eventos

[`save_manuscript`](../../../src-tauri/src/commands/editor.rs) → [`write_manuscript_and_persist`](../../../src-tauri/src/parser/document.rs) L593–609:

1. `sync_manuscript_event_entities` — escribe/renombra fichas `Worldbuilding/Eventos/*.md` ([`sync_event.rs`](../../../src-tauri/src/entity/sync_event.rs), `write_atomic` temp + rename).
2. `fs::write` del `.md` del manuscrito.
3. Re-parse + persistencia SQLite.

**No** emite `fs-changed` desde el comando; el **watcher** (`notify` + debounce 250 ms) reconcilia y emite un único evento con rutas tocadas ([`reconcile.rs`](../../../src-tauri/src/fs/reconcile.rs) `apply_changes`).

### 2.5 Reacción frontend a `fs-changed`

[`useEditorFsSync.ts`](../../../src/hooks/useEditorFsSync.ts):

| `kind` | Acción |
|--------|--------|
| `remove` | `closeTabsRemovedFromDisk(paths)` — **puede cambiar pestaña activa** |
| `modify` / `create` | Recarga pestañas abiertas cuyo path está en `paths` |
| `rename` | `remapTabPath` |

Guard para guardado propio: [`markSelfSave`](../../../src/lib/editor/fsSync.ts) — ventana **2,5 s**, **solo** la ruta pasada a `saveDocument` (el manuscrito activo). **No** cubre fichas WB escritas en el mismo guardado.

Recarga de pestaña activa sucia → `requestExternalReload()` (diálogo), no cambio de tab.

### 2.6 `closeTabsRemovedFromDisk` — cierra pestañas y elige activo

[`useEditorStore.ts`](../../../src/stores/useEditorStore.ts) L1012–1050:

```text
nextActive = nextOrder[nextOrder.length - 1]
activateTabView(nextTab)
```

Invocado desde [`useEditorFsSync.ts`](../../../src/hooks/useEditorFsSync.ts) cuando `kind === "remove"`.

**Efecto encadenado (repro §1.1):** cerrar `eventoTest` → activo `meow`; cerrar `meow` → activo **`skanlnsklnals`**. Las pestañas **desaparecen** de la barra; el `.md` puede seguir en disco → sensación de «archivos fantasma» (existen pero ya no están abiertos).

**SQLite (Rust):** en el mismo `remove`, [`reconcile.rs`](../../../src-tauri/src/fs/reconcile.rs) ejecuta `mark_ghost` sobre la ruta. Un `remove` **falso** (OneDrive, ventana entre `rename` temp y `write`) deja entradas **`ghost`** en `entities` aunque el archivo siga existiendo — hay que **suprimir** ghost/reconcile para rutas bajo guardado propio (Fase 3).

### 2.7 Explorador vs editor

- Resaltado manuscrito en árbol: `activeFilePath` ([`FileTreeItem.tsx`](../../../src/modules/explorer/FileTreeItem.tsx) L66–72).
- Tras cierre erróneo de tab, puede quedar **`selectedPath`** en un archivo ya sin pestaña → doble resaltado o fila «fantasma» en el árbol (repro: `eventoTest` + `skanlnsklnals`). **Fix:** al `closeTab` / `closeTabsRemovedFromDisk`, limpiar o realinear `selectedPath` con `activeFilePath` si la selección ya no tiene tab abierta.
- `loadTree()` tras `fs-changed` **no** cambia pestaña activa por sí solo.

---

## 3. Hipótesis priorizadas

> Tras repro §1.1, **H2 es la causa principal** (cierre de tabs). **H1 sigue siendo un agravante** (Ctrl+S guarda todo y multiplica ventanas de carrera con el watcher).

### H2 — **Principal:** `fs-changed` `remove` cierra pestañas guardadas

**Mecanismo:** El watcher interpreta «archivo eliminado» (`normalize_debounced`: path no existe → `Remove`). `useEditorFsSync` llama `closeTabsRemovedFromDisk` **sin** consultar `markSelfSave` (solo aplica a recarga `modify`, no a `remove`).

**Por qué encaja con §1.1:**

- Dos manuscritos sucios guardados → dos escrituras → uno o dos eventos `remove` espurios → **dos tabs cerradas**.
- Orden final `skanlnsklnals` = dos cierres secuenciales en `tabOrder` `[…, meow, eventoTest]`.
- Contenido guardado OK + tabs cerradas = disco bien, sesión rota.

**Factores agravantes:**

- Proyecto bajo **OneDrive** (`OneDrive/Documentos/…` en ruta del workspace).
- Escritura atómica WB (`.narralith-write-*` + `rename`) y `fs::write` manuscrito en el mismo debounce (250 ms).
- **`markSelfSave` no protege la rama `remove`** en el frontend ni `mark_ghost` en Rust.

**Cómo confirmar (Fase 0):**

- Log `[FIX-012] fs-changed kind=remove paths=…` coincidiendo con cierre de tabs.
- Tras bug, comprobar en SQLite si `meow` / `eventoTest` tienen `status = 'ghost'` indebidamente.
- Guardar manuscrito **sin** eventos: si el bug desaparece → batch WB + watcher.

**Probabilidad:** **Muy alta** con la repro dual-close.

---

### H1 — Secundaria: `saveAllOpenTabs` + varias pestañas sucias

**Mecanismo:** Ctrl+S itera pestañas sucias en `tabOrder`, hace `switchTab` antes de cada guardado, restaura al final.

**Limitación:** sola **no** explica cierre de **dos** tabs; sí explica parpadeos y que, si H2 cierra la tab activa, **`tabs[initialActivePath]` ya no existe** y la restauración de `saveAllOpenTabs` **no corre**.

**Probabilidad:** Alta como **multiplicador** de H2; media como causa única.

---

### H3 — Media: carrera `saveAllOpenTabs` ↔ `useEditorFsSync`

**Mecanismo:** Durante el bucle, `activeFilePath` cambia. Un `fs-changed` llega cuando la pestaña activa **ya** es `meow`; `markSelfSave` solo protegió `eventoTest` al guardarlo, no impide lógica que dependa del activo en ese momento.

**Efecto típico:** recarga o diálogo en tab equivocado, no necesariamente salto permanente — salvo interacción con H2.

---

### H4 — Baja: remapeo de rutas / normalización

**Mecanismo:** `initialActivePath !== activeFilePath` usa comparación estricta `!==`, no `projectPathsEqual`. Si algún paso normaliza `\` vs `/`, la restauración podría no ejecutarse.

**Nota:** `tabOrder` y keys de `tabs` usan rutas del backend; baja probabilidad salvo bug previo de rename.

---

### Descartado o poco probable

| Hipótesis | Motivo |
|-----------|--------|
| `loadTree` cambia documento activo | Solo refresca árbol |
| `ensure_manuscript_title_on_disk` renombra archivo | Solo escribe metadata title en bloque 0 |
| Autoguardado | Usa `saveDocument()` sin switch |
| Clic accidental en explorador | No ocurre «siempre al guardar» |

---

## 4. Matriz de reproducción QA (Fase 0 — antes de codear)

Ejecutar y anotar **pestaña activa final**, **pestañas sucias antes**, **atajo usado**:

| # | Precondición | Acción | Resultado esperado tras fix |
|---|--------------|--------|----------------------------|
| R1 | Solo `eventoTest` sucio | Ctrl+S | Sigue en `eventoTest` |
| R2 | `meow` + `eventoTest` sucios; activo `eventoTest` | Ctrl+S | Sigue en `eventoTest`; ambos limpios |
| R3 | Igual R2 | Botón «Guardar todo» 💾 | Igual |
| R4 | Solo `eventoTest` sucio, con 2 eventos WB | Ctrl+S | Sigue en `eventoTest`; fichas WB sync |
| R5 | R4 con proyecto en OneDrive | Ctrl+S × 5 | Sin cierre de pestaña ni salto |
| R6 | Autoguardado ON, un solo sucio | Esperar debounce | Sin salto (regresión) |
| R7 | Guardar falla (simular error IPC) en tab intermedio | Ctrl+S multi-sucio | Vuelve a tab inicial o se queda en inicial sin bucle roto |
| **R8** | **Repro §1.1:** 5 tabs, solo `meow`+`eventoTest` sucios, activo `eventoTest` | Guardar | **5 tabs siguen abiertas**; activo `eventoTest`; sin ghost SQLite |
| R9 | Tras R8 | Explorador | Un solo resaltado coherente con tab activa |

**Instrumentación (Fase 0):** usar **OBS-001** ([`OBS-001-system-audit-log.md`](OBS-001-system-audit-log.md) §6) — export NDJSON y correlación `save-batch`; no logs ad hoc `[FIX-012]`.

---

## 5. Diseño del arreglo (fases de implementación)

### Fase 1 — Semántica de guardado (UX, cambio pequeño, alto impacto)

| Cambio | Detalle |
|--------|---------|
| **Ctrl+S** | [`EditorCanvas.tsx`](../../../src/modules/editor/EditorCanvas.tsx) → `saveDocument()` (o wrapper `saveActiveTab()`) |
| **Ctrl+Shift+S** (nuevo) | `saveAllOpenTabs()` — patrón VS Code / IDE |
| **Botón 💾 panel** | Etiqueta/tooltip «Guardar todo» — mantener `saveAllOpenTabs` |
| **EntityWorkspace Ctrl+S** | Alinear: guardar entidad activa, no todas |

**i18n:** claves `header.save` vs `header.saveAll` en `editor.json`.

**Riesgo:** bajo. Usuarios que dependían de Ctrl+S para guardar todo deben usar Ctrl+Shift+S o el botón.

---

### Fase 2 — `saveAllOpenTabs` sin salto visible (robustez)

Objetivo: guardar pestañas inactivas **desde caché de tab** cuando sea posible, evitando `switchTab` en el bucle.

**Enfoque recomendado:**

1. `flushActiveTabToCache(state)` una vez al inicio (captura editor activo).
2. Para cada `path` sucio:
   - Si `path === activeFilePath`: `saveDocument()` (extract en vivo).
   - Si no: **`saveManuscriptFromTabCache(path)`** nuevo — IPC con `tabs[path].manuscript` ya volcado en último flush, sin activar pestaña.
3. Restauración final: usar `projectPathsEqual` y **assert** dev/log si falla.

**Requisito:** validar que `tabs[path].manuscript` en caché está al día para tabs sucias (tras FIX-005 el fingerprint/dirty ya fuerza flush en switch; tab sucia implica último estado en memoria del store o extract pendiente del activo).

**Alternativa mínima (si cache-save es complejo):**

- Guardar **primero** la pestaña activa.
- Luego el resto.
- Restauración obligatoria con `try/finally` y comparación `projectPathsEqual`.
- Mutex `saveBatchInProgress` para ignorar `closeTabsRemovedFromDisk` del manuscrito recién guardado.

---

### Fase 3 — Guard FS durante guardado propio (anti-fantasma)

| Cambio | Archivo |
|--------|---------|
| **`saveBatchGuard`** | Contador en store; mientras > 0: **no** `closeTabsRemovedFromDisk` para paths del batch; **no** recarga agresiva |
| Ampliar `markSelfSave` | `string[]` — manuscrito + rutas WB tocadas; usar también en rama **`remove`** del listener (ignorar remove si path recién guardado) |
| **Rust: no `mark_ghost` en guardado propio** | Ideal: IPC devuelve `touchedPaths`; watcher coalesce remove+modify del mismo path en <500 ms como **`modify`** ([`watcher.rs`](../../../src-tauri/src/fs/watcher.rs) / `reconcile.rs`) |
| **Explorador** | Tras cierre legítimo de tab, limpiar `selectedPath` si apunta a path sin pestaña |

**IPC opcional:** `save_manuscript` → `{ manuscript, touchedPaths: string[] }`.

---

### Fase 4 — Endurecer `closeTabsRemovedFromDisk`

- No elegir `nextOrder[length-1]` ciegamente: preferir pestaña **adyacente** a la cerrada o la más reciente en historial (futuro); mínimo FIX-012: si cierre ocurre durante `saveBatchGuard`, **reabrir** tab desde disco en lugar de saltar.
- Log `console.warn` cuando un `remove` cierra la pestaña activa <3 s después de `markSelfSave(path)`.

---

### Fase 5 — Tests automatizados

| Test | Ubicación sugerida |
|------|-------------------|
| `saveAllOpenTabs` restaura activo tras 2 tabs sucias | Vitest store mock + fake `switchTab`/`saveDocument` |
| `saveAllOpenTabs` no restaura si tab eliminado — documentar comportamiento deseado post Fase 3 | Idem |
| `tabPathsToReloadOnFsChange` + `shouldIgnoreFsReload` tras multi-path mark | [`fsSync.test.ts`](../../../src/lib/editor/fsSync.test.ts) |
| `closeTabsRemovedFromDisk` con orden de captura → nextActive | Store unit test |

---

### Fase 6 — Documentación

- [`manuscript-design.md`](../manuscript-design.md): § guardado — Ctrl+S vs Guardar todo.
- Cerrar con QA manual R1–R9.

---

## 6. Orden de ejecución recomendado

```text
Fase 0  Repro + export OBS-001 (§6) → confirmar H2 vs H1
Fase 3  saveBatchGuard + ignore remove espurio   ← prioridad alta tras repro §1.1
Fase 1  Ctrl+S → saveDocument                  (reduce superficie de carrera)
Fase 2  saveAll sin switch / restore
Fase 4  closeTabs defensivo + selectedPath
Fase 5  Tests
Fase 6  Docs
```

**Entrega mínima aceptable (anti-fantasma):** Fase 0 + **Fase 3** + Fase 1.  
**Entrega completa:** Fases 0–6.

---

## 7. Criterios de aceptación

1. Con **una** pestaña sucia, Ctrl+S nunca cambia `activeFilePath` ni cierra otras tabs.
2. Con **N** pestañas sucias, Ctrl+S guarda solo el activo; «Guardar todo» deja al usuario en la pestaña que tenía al pulsar y **no cierra** ninguna tab.
3. Repro §1.1 (R8): tras guardar, **`meow` y `eventoTest` siguen en la barra**; activo sigue siendo `eventoTest`.
4. Guardar manuscrito con eventos no marca manuscritos como **`ghost`** en SQLite ni cierra pestañas (R4–R5).
5. Explorador: un solo resaltado coherente con la tab activa (R9).
6. Sin regresión en autoguardado (R6).
7. Tests Fase 5 en verde; `npm run build` OK.

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Tab inactiva sucia guardada desde caché desactualizada | Solo permitir cache-save si `isDirty`; activo siempre extract en vivo; flush al inicio del batch |
| Usuarios acostumbrados a Ctrl+S = guardar todo | Changelog + Ctrl+Shift+S; tooltip en botón |
| OneDrive sigue emitiendo remove espurios | Fase 3 batch guard + coalesce watcher; ignorar `remove` en paths recién guardados |
| Entidades `ghost` en SQLite tras guardar | No ejecutar `mark_ghost` si path sigue existiendo en disco tras ventana de guardado |
| Duplicar handlers Ctrl+S (Canvas + Entity) | Extraer `useSaveShortcut()` compartido |

---

## 9. Referencias de código (índice rápido)

| Pieza | Ruta |
|-------|------|
| Atajo Ctrl+S manuscrito | `src/modules/editor/EditorCanvas.tsx` |
| saveAllOpenTabs | `src/stores/useEditorStore.ts` L1174–1223 |
| saveDocument + markSelfSave | `src/stores/useEditorStore.ts` L849–905 |
| closeTabsRemovedFromDisk | `src/stores/useEditorStore.ts` L1012–1050 |
| fs-changed listener editor | `src/hooks/useEditorFsSync.ts` |
| Guard self-save | `src/lib/editor/fsSync.ts` |
| Sync eventos al guardar | `src-tauri/src/entity/sync_event.rs` |
| mark_ghost en remove | `src-tauri/src/fs/reconcile.rs` |
| selectedPath explorador | `src/stores/useFileTreeStore.ts`, `FileTreeItem.tsx` |
