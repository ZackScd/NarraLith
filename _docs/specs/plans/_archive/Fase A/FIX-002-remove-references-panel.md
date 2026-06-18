# FIX-002 — Quitar panel «Referencias» del lateral del manuscrito

> Plan de implementación detallado. Spec origen: [`fix-backlog.md` §4](../fix-backlog.md).  
> **Estado:** ✅ Implementado · **Esfuerzo:** Bajo · **Riesgo:** Bajo (si se respeta el alcance)

---

## 1. Problema y objetivo

**Problema:** En el panel derecho del editor (`EditorSidePanel`), junto a **Evento y tiempo**, hay una segunda pestaña **«Referencias»** que muestra:

- *Enlaces hacia «…»* (backlinks entrantes desde SQLite)
- *Menciones sin enlazar* (texto plano que coincide con el stem del archivo activo)

El usuario no lo pidió, lo encuentra confuso y estorba.

**Objetivo:**

1. En manuscrito: el lateral muestra **solo** Evento + Tiempo (+ barra inferior «Agregar etiqueta al documento»), **sin** pestañas ni panel de referencias.
2. Sin regresiones en cabecera del panel (Etiquetas, Guardar todo, colapsar).
3. Al abrir ficha WB (`activeTabKind === "entity"`): lateral sin referencias (cuerpo vacío o solo cabecera — aceptado).

**No confundir con (permanece intacto):**

| Feature | Archivos clave | Acción FIX-002 |
|---------|----------------|----------------|
| Wiki-links `[[entidad]]` en editor | `WikiLinkNode`, plugins, Rust `wikilink/` | **No tocar** |
| Menú typeahead al escribir `[[` | `WikiLinkMenu`, `WikiLinkTypeaheadPlugin`, IPC `list_entities_for_search` | **No tocar** |
| Clic en enlace → abrir entidad | `WikiLinkClickPlugin`, `navigateToDocument` | **No tocar** |
| Indexación `wiki_links` / `backlinks` al guardar | Rust `document.rs`, `db/wiki_links.rs`, `db/backlinks.rs` | **No tocar** |
| Grafo de relaciones | `graph/indexer.rs` (lee `wiki_links`) | **No tocar** |
| Renombrado global `[[Nombre]]` | `refactor/rename_entity.rs` | **No tocar** |

Solo se retira el **consumidor UI** del panel lateral. La API Rust queda **dormida** para una futura ficha WB (véase [`module-replan.md`](../module-replan.md)).

---

## 2. Estado actual del código (inventario real)

### 2.1 Árbol de dependencias UI

```text
WorkspaceShell.tsx
  └── EditorSidePanel.tsx          ← único montaje del panel derecho en editor
        ├── [tab bar] tools | references
        ├── sideTab === "tools" → SideEventSection + SideTimeSection
        └── sideTab === "references" → SideReferencesSection
              └── BacklinksPanel.tsx
                    ├── useReferencesData.ts  → IPC get_backlinks, find_unlinked_mentions
                    ├── referenceErrors.ts
                    └── lib/types/references.ts
```

**Verificado:** `grep` en `src/` — **ningún otro archivo** importa `BacklinksPanel`, `SideReferencesSection`, `useReferencesData` ni `referenceErrors`.

### 2.2 Lógica de pestañas en `EditorSidePanel.tsx`

| Pieza | Líneas aprox. | Comportamiento hoy |
|-------|---------------|-------------------|
| `type SidePanelTab` | 33 | `"tools" \| "references"` |
| `sideTabOverride` + `selectSideTab` | 46–49, 95–100 | Recuerda pestaña por `activeFilePath` |
| `sideTab` derivado | 85–90 | Default `"references"` si `activeTabKind === "entity"` |
| Tab bar JSX | 336–359 | Botón «Evento y tiempo» solo si `showManuscriptTools`; botón «Referencias» **siempre** si hay `activeFilePath` |
| Cuerpo scroll | 361–369 | Condicional por `sideTab` |
| Barra commit etiquetas | 371–390 | Solo si `showManuscriptTools && sideTab === "tools"` |

`showManuscriptTools = activeTabKind === "manuscript" && Boolean(activeFilePath)`.

**Consecuencia hoy en ficha WB:** solo aparece la pestaña «Referencias» (sin «Evento y tiempo») y el cuerpo es el panel de backlinks — molesto y vacío de utilidad para editar la ficha en `EntityWorkspace`.

### 2.3 Archivos a eliminar (solo consumidores del panel)

| Archivo | Líneas | Rol |
|---------|--------|-----|
| [`src/modules/editor/sidePanel/SideReferencesSection.tsx`](../../src/modules/editor/sidePanel/SideReferencesSection.tsx) | 18 | Wrapper `<section>` → `BacklinksPanel` |
| [`src/modules/references/BacklinksPanel.tsx`](../../src/modules/references/BacklinksPanel.tsx) | 169 | UI backlinks + conversión menciones |
| [`src/hooks/useReferencesData.ts`](../../src/hooks/useReferencesData.ts) | 94 | Hook IPC + estado loading |
| [`src/lib/references/referenceErrors.ts`](../../src/lib/references/referenceErrors.ts) | 17 | Normaliza claves `error.references.*` |
| [`src/lib/types/references.ts`](../../src/lib/types/references.ts) | 17 | Tipos `BacklinkRow`, `UnlinkedMentionRow` |

Tras borrar `BacklinksPanel.tsx`, la carpeta `src/modules/references/` queda vacía → **eliminar la carpeta**.

### 2.4 Archivos que permanecen (wikilinks vivos)

| Archivo | Uso de namespace `references` |
|---------|------------------------------|
| [`WikiLinkMenu.tsx`](../../src/modules/editor/WikiLinkMenu.tsx) | `typeahead.*` (menú `[[`) — **mantener** |
| [`src/i18n/config.ts`](../../src/i18n/config.ts) | Registra namespace `references` — **mantener** |
| [`src/i18n/es/references.json`](../../src/i18n/es/references.json) | Recortar `panel.*`; conservar `typeahead`, `wikilink`, `error` |
| [`src/i18n/en/references.json`](../../src/i18n/en/references.json) | Idem |

**Nota:** `SideReferencesSection` usa `t("panel.ariaLabel")` pero esa clave **no existe** en los JSON (bug menor; desaparece al borrar el archivo).

Las claves `wikilink.unresolvedTitle` / `aliasTitle` están en JSON pero **no** se usan en TS hoy (`WikiLinkNode` pone `title` en DOM con template literal). Conservar por si se i18n-iza el nodo más adelante.

### 2.5 Backend Rust — no borrar

| Pieza | Rol | Consumidor tras FIX-002 |
|-------|-----|-------------------------|
| `src-tauri/src/commands/references.rs` | IPC: `list_entities_for_search`, `get_backlinks`, `find_unlinked_mentions`, `convert_unlinked_mention` | Solo `list_entities_for_search` (vía `useEntitySearchStore`) |
| `src-tauri/src/references/` | `find_unlinked_mentions`, `convert_unlinked_mention` | Ninguno en frontend |
| `src-tauri/src/db/backlinks.rs` | Tabla + consultas | Ninguno en frontend |
| `src-tauri/src/db/wiki_links.rs` | Sync al guardar | Guardado manuscrito, grafo |
| Registro en `lib.rs` L56–59 | Cuatro comandos | Mantener los cuatro |

**Acción recomendada:** comentario breve en `commands/references.rs`:

```rust
//! … `get_backlinks` / `find_unlinked_mentions` / `convert_unlinked_mention`:
//! API dormida tras FIX-002 (panel lateral retirado); reservada para ficha WB.
```

No eliminar comandos ni tests Rust (`references/convert.rs`, `db/backlinks.rs` tienen tests propios).

### 2.6 Tests automatizados

| Ámbito | Estado |
|--------|--------|
| Frontend Vitest | **Cero** tests que importen `BacklinksPanel` / `useReferencesData` |
| Rust `cargo test` | Tests en `references/`, `backlinks` — **no tocar**; deben seguir verdes |

---

## 3. Estrategia (dos capas)

| Capa | Qué | Riesgo |
|------|-----|--------|
| **A** | Simplificar `EditorSidePanel.tsx` (quitar tabs + render directo) | Bajo |
| **B** | Eliminar 5 archivos UI huérfanos + limpiar i18n `panel.*` | Bajo |
| **C** *(opcional, solo si QA pide)* | Auto-colapsar panel derecho en pestaña `entity` | Bajo — **fuera de alcance** salvo petición |

**Orden:** A y B en el **mismo PR** (A sin B deja imports rotos; B sin A deja código muerto).

---

## 4. Cambios por archivo

### 4.1 Capa A — `EditorSidePanel.tsx` (obligatorio)

Archivo: [`src/modules/editor/EditorSidePanel.tsx`](../../src/modules/editor/EditorSidePanel.tsx)

#### Eliminar

```tsx
import { SideReferencesSection } from "./sidePanel/SideReferencesSection";

type SidePanelTab = "tools" | "references";

const { t: tRef } = useTranslation("references");

const [sideTabOverride, setSideTabOverride] = useState<{ path: string; tab: SidePanelTab } | null>(null);

const sideTab: SidePanelTab = …;

const selectSideTab = (tab: SidePanelTab) => { … };

// Bloque completo tab bar (líneas ~336–359)
// Condicional sideTab === "references" → SideReferencesSection
```

#### Sustituir cuerpo scroll (aprox. L361–369)

**Antes:**

```tsx
<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
  {sideTab === "tools" && showManuscriptTools ? (
    <>
      <SideEventSection />
      <SideTimeSection />
    </>
  ) : null}
  {sideTab === "references" && activeFilePath ? <SideReferencesSection /> : null}
</div>
```

**Después:**

```tsx
<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
  {showManuscriptTools ? (
    <>
      <SideEventSection />
      <SideTimeSection />
    </>
  ) : null}
</div>
```

#### Simplificar barra inferior de commit (aprox. L371)

**Antes:** `{showManuscriptTools && sideTab === "tools" ? ( … ) : null}`

**Después:** `{showManuscriptTools ? ( … ) : null}`

#### Sin cambios en esta tarea

- Cabecera (colapsar, Etiquetas, Guardar todo) — líneas ~260–334
- Vista colapsada (`rightPanelCollapsed`) — líneas ~198–252
- `TimeTagDialog`, `commitPending`, `openAddTimeDialog`
- `useTranslation("editor")` único namespace

**Resultado UX:**

| `activeTabKind` | Panel expandido |
|-----------------|-----------------|
| `manuscript` + archivo | Evento + Tiempo + barra commit |
| `entity` | Solo cabecera (Etiquetas / Guardar aplican a pestañas globales) |
| Sin archivo | Solo cabecera, scroll vacío |

---

### 4.2 Capa B — Eliminar archivos (obligatorio)

Ejecutar en este orden (evita imports rotos intermedios):

1. Editar `EditorSidePanel.tsx` (capa A) — quitar import de `SideReferencesSection`
2. Borrar:
   - `src/modules/editor/sidePanel/SideReferencesSection.tsx`
   - `src/modules/references/BacklinksPanel.tsx`
   - `src/hooks/useReferencesData.ts`
   - `src/lib/references/referenceErrors.ts`
   - `src/lib/types/references.ts`
3. Borrar carpeta vacía `src/modules/references/` si aplica
4. Borrar carpeta vacía `src/lib/references/` si aplica

---

### 4.3 Capa B — i18n (obligatorio)

Archivos: [`src/i18n/es/references.json`](../../src/i18n/es/references.json), [`src/i18n/en/references.json`](../../src/i18n/en/references.json)

**Eliminar** el objeto completo `"panel": { … }` (12 claves):

- `tabReferences`, `noEntity`, `loading`, `backlinksTitle`, `backlinksEmpty`, `unlinkedTitle`, `unlinkedEmpty`, `blockShort`, `convertToLink`, `converting`

**Conservar:**

- `typeahead` — usado por `WikiLinkMenu`
- `wikilink` — reservado
- `error` — claves IPC dormidas (`error.references.*` en Rust); sin consumidor UI hasta reintroducción

**No tocar** `editor.json` — `panel.tabTools` sigue siendo válido como etiqueta conceptual (aunque ya no haya pestaña visible).

---

### 4.4 Rust — solo documentación (recomendado)

Archivo: [`src-tauri/src/commands/references.rs`](../../src-tauri/src/commands/references.rs)

Añadir 2–3 líneas en el doc del módulo indicando API dormida para backlinks UI (FIX-002). **Sin** quitar `#[tauri::command]` ni entradas en `lib.rs`.

---

### 4.5 Documentación specs (mínima, mismo PR)

| Archivo | Cambio |
|---------|--------|
| [`implementation-plan.md`](../implementation-plan.md) | Enlace a este plan; estado al cerrar |
| [`fix-backlog.md`](../fix-backlog.md) §4 | Marcar ✅ al cerrar |
| [`06-ARCHITECTURE.md`](../../archive/retired-cadence/06-ARCHITECTURE.md) L142 | Una línea: panel lateral sin `SideReferencesSection` |
| [`01-REQUIREMENTS.md`](../../01-REQUIREMENTS.md) L104 | Opcional: actualizar «pestaña Referencias» → retirada (evitar contradicción) |

**No** reescribir roadmap ni changelog completo (eso es ERAII-003).

---

## 5. Qué NO hacer (evitar roturas)

| Acción prohibida | Por qué |
|------------------|---------|
| Borrar `src-tauri/src/references/` o comandos IPC | Rompe contrato Tauri; tests Rust; futura ficha WB |
| Borrar tablas `backlinks` / `wiki_links` o migraciones | Corrompe grafo e indexación al guardar |
| Quitar `WikiLinkTypeaheadPlugin` / `WikiLinkMenu` | Rompe autocompletado `[[` |
| Quitar namespace `references` de `i18n/config.ts` | Rompe `WikiLinkMenu` |
| Mover cadenas `typeahead` a `editor.json` en este fix | Scope innecesario |
| Auto-ocultar `ResizableRightPanel` en entity sin spec | Cambio UX no pedido (capa C) |

---

## 6. Pasos de implementación (checklist)

```
[x] 1. Editar EditorSidePanel.tsx (capa A)
[x] 2. Borrar 5 archivos UI + carpetas vacías (capa B)
[x] 3. Recortar panel.* en es/en references.json
[x] 4. Comentario API dormida en commands/references.rs
[x] 5. npm run build (sin errores TS / imports rotos)
[x] 6. cargo test (sin regresiones Rust)
[ ] 7. QA manual §7 — pendiente usuario
[x] 8. Actualizar implementation-plan.md + fix-backlog.md
```

**Sin tests Vitest nuevos** — eliminación pura de UI; QA manual es el criterio principal.

---

## 7. Verificación manual (obligatoria)

Ejecutar en **`npm run tauri dev`**.

### 7.1 Panel lateral — manuscrito

| # | Acción | Resultado esperado |
|---|--------|-------------------|
| 1 | Abrir `.md` en `Manuscrito/` | **No** aparece tab bar «Evento y tiempo \| Referencias» |
| 2 | Mismo archivo | Se ven `SideEventSection` + `SideTimeSection` directamente |
| 3 | Borrador evento/tiempo pendiente | Barra inferior «Agregar etiqueta al documento» visible y funcional |
| 4 | Botón Etiquetas (cabecera) | Toggle ON/OFF de chips inline — sin cambios |
| 5 | Guardar todo | Sin cambios |
| 6 | Colapsar panel (icono) | Rail estrecho con iconos — sin cambios |
| 7 | Redimensionar panel derecho | Sin layout roto |

### 7.2 Ficha worldbuilding

| # | Acción | Resultado esperado |
|---|--------|-------------------|
| 8 | Abrir entidad WB desde explorador | `EntityWorkspace` en canvas central |
| 9 | Panel derecho expandido | **Sin** pestaña Referencias; cuerpo vacío bajo cabecera (aceptado) |
| 10 | Guardar ficha WB | Sin errores |

### 7.3 Wiki-links (regresión crítica)

| # | Acción | Resultado esperado |
|---|--------|-------------------|
| 11 | En manuscrito, escribir `[[` | Menú typeahead de entidades aparece |
| 12 | Seleccionar entidad | Se inserta enlace resuelto |
| 13 | Clic en `[[enlace]]` en texto | Navega a la ficha / archivo destino |
| 14 | Guardar manuscrito con wikilinks | Sin error IPC; reabrir conserva enlaces |

### 7.4 Otras vistas

| # | Acción | Resultado esperado |
|---|--------|-------------------|
| 15 | Vista Timeline | `TimelineSidePanel` — **sin** cambios (componente distinto) |
| 16 | Vista Grafo | Sin cambios |
| 17 | Consola devtools | **Sin** llamadas IPC `get_backlinks` / `find_unlinked_mentions` al cambiar de pestaña |

---

## 8. Criterio de salida

- Pestaña y contenido «Referencias» **ausentes** del panel lateral del editor.
- Manuscrito: una sola columna de herramientas (Evento + Tiempo).
- Wiki-links y typeahead `[[` operativos.
- `npm run build` y `cargo test` verdes.
- FIX-002 marcado ✅ en [`implementation-plan.md`](../implementation-plan.md).

---

## 9. Riesgos y mitigación

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Import olvidado a archivo borrado | Baja | `npm run build` |
| Usuario echa de menos backlinks en lateral | Esperado | Reubicación futura en ficha WB (`module-replan.md`) |
| Panel vacío en ficha WB se siente raro | Media | Capa C opcional: colapsar panel si `activeTabKind === "entity"` |
| IPC dormida confunde mantenedores | Baja | Comentario en `commands/references.rs` |
| Épica «eliminar no rompe» (§6) | N/A | Índice SQLite y wikilinks siguen actualizándose al guardar |

---

## 10. Diff estimado

| Tipo | Cantidad |
|------|----------|
| Archivos editados | 3–5 (`EditorSidePanel`, 2× i18n, opcional `references.rs`, docs) |
| Archivos eliminados | 5 |
| Líneas netas | ~−350 UI, ~+15 simplificación panel |
| Rust lógica | 0 cambios funcionales |

---

## 11. Trabajo futuro (fuera de FIX-002)

- Backlinks en **ficha de entidad WB** (panel o sección dedicada).
- i18n de `title` en `WikiLinkNode` usando `wikilink.*`.
- Capa C: ocultar/colapsar panel derecho automáticamente en pestañas `entity`.
- Eliminar comandos IPC dormidos solo cuando exista alternativa o se decida purga Era IV.

---

**Última actualización:** 2026-06-06
