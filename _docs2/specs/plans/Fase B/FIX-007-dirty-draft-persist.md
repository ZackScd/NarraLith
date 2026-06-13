# FIX-007 — Borrador sucio persistente al cerrar la app

> Plan e implementación. **Estado:** ✅ Cerrado (jun 2026, QA NDJSON confirmado) · **Esfuerzo:** Medio · **Riesgo:** Medio  
> **Lista maestra:** [`implementation-plan.md`](../implementation-plan.md) Fase B · Spec: [`manuscript-design.md`](../manuscript-design.md) §1 · [`module-replan.md`](../module-replan.md)

---

## 0. Convención de trabajo

**Regla del proyecto:** redactar este plan **completo** (investigación + diseño + QA) **antes** de tocar código — igual que FIX-008, FIX-012, etc.

**Nota FIX-007:** la implementación se adelantó al plan detallado; este documento se completó **después** del código y se cerró con evidencia NDJSON del usuario (§8). Para tareas futuras: **plan primero, implementación después**.

---

## 1. Problema y objetivo

### 1.1 Problema

Al cerrar NarraLith con **varias pestañas manuscrito abiertas** y **cambios sin guardar**, al reabrir el proyecto:

- Las **pestañas** (orden + activa) sí se restauraban (`usePersistManuscriptTabs` + `lastManuscriptFile.ts`).
- El **contenido editado** se perdía: `useRestoreLastManuscriptFile` llamaba `openDocument` → `read_manuscript` desde **disco**, ignorando el borrador en RAM.

Comportamiento observado en QA (NDJSON `session-1781307428183-23356.ndjson`):

- 7 pestañas restauradas al inicio.
- Usuario editó **tres** archivos, guardó **solo** `escena.md` (L16–18), cerró la app.
- Sin persistencia de borrador → al reiniciar, los otros dos edits desaparecen.

### 1.2 Objetivo FIX-007

| # | Criterio |
|---|----------|
| O1 | Pestañas sucias (manuscrito bajo `Manuscrito/**`, no entidades WB) conservan **`ParsedManuscript` en localStorage** al cerrar |
| O2 | Al reabrir proyecto, borrador **sobrescribe** lectura inicial de disco; `isDirty: true` y baseline (`savedBodyFingerprint`) coherente |
| O3 | Tras **guardar** (Ctrl+S / Guardar todo), el borrador de esa pestaña **deja de persistirse** |
| O4 | Pestaña **activa** al cerrar incluida (flush Lexical → caché antes del snapshot) |
| O5 | `pagehide` / `beforeunload` + debounce en edición → no depender solo de cambio de pestaña |

### 1.3 Fuera de alcance

| Tema | Motivo |
|------|--------|
| Entidades WB (`Worldbuilding/**`) | Sesión ya filtra `isPersistableManuscriptPath` |
| Autoguardado a disco | Sigue siendo opt-in por settings |
| Diálogo «¿Guardar al cerrar app?» | No pedido; solo persistencia silenciosa |
| IPC / Rust | Solo frontend + `localStorage` |
| FIX-008 explorador inline | Independiente |

---

## 2. Evidencia NDJSON — pre-fix (bug original)

**Archivo:** `_debug/logs/session-1781307428183-23356.ndjson` (sesión **sin** FIX-007)

| Línea | Evento | Nota |
|-------|--------|------|
| L11 | `session.restore` | 7 tabs; **sin** `draftCount` / `draftPaths` (hook antiguo) |
| L13–15 | `tab.switch` | Edición en `escena`, `archivo pe` |
| L16–18 | `save.start/end` | **Solo** `escena.md` guardado |
| — | Al reiniciar | Edits no guardados **perdidos** (contenido solo en RAM) |

---

## 3. Diseño implementado

### 3.1 Modelo de sesión (`lastManuscriptFile.ts`)

```typescript
type ManuscriptTabDraft = {
  manuscript: ParsedManuscript;
  savedBodyFingerprint: string; // baseline disco — isDirty
};

type ManuscriptTabsSession = {
  tabOrder: string[];
  activeFilePath: string | null;
  drafts?: Record<string, ManuscriptTabDraft>; // solo rutas sucias
};
```

- Clave: `narralith:last-manuscript-file` (mapa por `projectRoot`).
- `normalizeSession` filtra drafts a rutas en `tabOrder` + `isPersistableManuscriptPath`.
- Legacy string / sesión sin `drafts` → compatible.

### 3.2 Snapshot (`useEditorStore.getManuscriptSessionSnapshot`)

1. `flushActiveTabToCache` — incluye extract Lexical del activo.
2. `tabOrder` filtrado a manuscrito persistible.
3. Por cada pestaña: si `isDirty && manuscript` → entrada en `drafts`.

### 3.3 Restauración (`useRestoreLastManuscriptFile`)

1. Abrir todas las rutas desde disco (`openDocument`).
2. **`applyPersistedTabDraft`** por cada entrada en `session.drafts`.
3. `switchTab(activePath)` + explorador.

### 3.4 Persistencia (`usePersistManuscriptTabs`)

- Debounce **400 ms** ante cambios en `tabOrder`, `activeFilePath`, `tabs`, `isDirty`, `manuscript`.
- **Inmediato** en `pagehide` / `beforeunload` y al desmontar hook.
- Audit: `obs.editor.session.persist` (`tabCount`, `draftCount`, `activePath`) — nivel **debug**; puede no aparecer en NDJSON si audit solo persiste `info+`.
- Restore audit: `draftCount`, `draftPaths` — nivel **info** (§8).

### 3.5 Limpieza de borrador

Tras guardar, `patchSavedBaseline` pone `isDirty: false` → el siguiente snapshot **omite** esa ruta en `drafts`.

**Seguimiento UX:** FIX-013 (⬜) — visor diff disco vs borrador en panel herramientas; ver [`FIX-013-dirty-diff-viewer.md`](FIX-013-dirty-diff-viewer.md).

---

## 4. Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `src/lib/editor/lastManuscriptFile.ts` | Tipo `ManuscriptTabDraft`, parse/normalize `drafts` |
| `src/lib/editor/lastManuscriptFile.test.ts` | +2 tests drafts |
| `src/stores/useEditorStore.ts` | `getManuscriptSessionSnapshot`, `applyPersistedTabDraft` |
| `src/hooks/usePersistManuscriptTabs.ts` | Debounce + lifecycle + audit |
| `src/hooks/useRestoreLastManuscriptFile.ts` | Aplicar drafts antes de `switchTab` |

---

## 5. Verificación manual

| # | Acción | Esperado |
|---|--------|----------|
| R1 | Abrir 3+ pestañas manuscrito, editar **2+** sin guardar, cerrar app | — |
| R2 | Reabrir mismo proyecto | Mismas pestañas; edits visibles; indicador sucio |
| R3 | Guardar una pestaña, cerrar, reabrir | Esa pestaña limpia; otras sucias siguen |
| R4 | Editar **solo** la pestaña activa, cerrar sin cambiar tab | Borrador del activo restaurado (O4) |
| R5 | Guardar todo, cerrar, reabrir | Sin drafts en localStorage (inspección devtools opcional) |
| R6 | NDJSON | `session.restore` con `draftCount > 0` y `draftPaths` correctos (§8) |

---

## 8. Evidencia NDJSON — post-fix (QA usuario, jun 2026)

Escenario repetido tras FIX-007: editar varias pestañas, guardar **solo una**, cerrar app, reabrir.

### 8.1 Sesión «antes de cerrar» — `session-1781307782589-1952.ndjson`

| t rel. | Evento | Hallazgo |
|--------|--------|----------|
| +267 ms | `session.restore` | 7 tabs; activo `escena.md`; **`draftCount: 0`** (sesión previa limpia o sin drafts) |
| +6742 ms | `tab.switch` | → `skanlnsklnals.md` |
| +8425 ms | `tab.switch` | → `eventoTest.md` |
| +10585 ms | `save.start/end` | **Solo** `eventoTest.md` guardado (`segmentCount: 3`, sync WB `evento1` / `EVENTO 2`) |
| *(fin log)* | Cierre app | Tras editar también `skanlnsklnals` y `escena` (sin guardar) — borrador debía quedar en `localStorage` vía `pagehide` |

**Interpretación:** último guardado explícito = `eventoTest`. Las otras dos pestañas editadas deben entrar en `drafts` al cerrar (no visibles en NDJSON: `session.persist` es debug).

### 8.2 Sesión «después de reabrir» — `session-1781307807051-26148.ndjson`

| t rel. | Evento | Hallazgo |
|--------|--------|----------|
| +287 ms | **`session.restore`** | **`draftCount: 2`** · **`draftPaths`:** `skanlnsklnals.md`, `escena.md` · activo `eventoTest.md` · 7 tabs |
| +2969 ms | `tab.switch` | → `skanlnsklnals.md` (verificación borrador) |
| +5008 ms | `tab.switch` | → `escena.md` |
| +6409 ms | `save.start/end` | `escena.md` guardado → draft de `escena` eliminado en próximo persist |
| +8141 ms | `saveAll.start/end` | Solo `skanlnsklnals.md` sucio; **`switchCount: 0`** (FIX-012 2b OK) |

**Conclusiones cerradas:**

| Criterio | Evidencia |
|----------|-----------|
| O1–O2 Borrador restaurado | `draftCount: 2` con rutas correctas; **`eventoTest` ausente** (estaba guardado) |
| O3 Guardar limpia draft | Tras `save.end` de `escena`, solo `skanlnsklnals` en `saveAll.dirtyPaths` |
| Integración FIX-012 | `saveAll` desde caché del borrador persistido, sin `tab.switch` |
| O5 | Restore inmediato al boot confirma lectura de `localStorage` (persist en cierre previo) |

### 8.3 Cadena QA resumida

```text
[1952]  edit skanlnsklnals + escena + eventoTest
        save solo eventoTest
        close app  →  localStorage.drafts = { skanlnsklnals, escena }

[26148] restore  draftCount=2, draftPaths=[skanlnsklnals, escena]
        usuario confirma contenido
        save escena + saveAll skanlnsklnals  →  drafts vacíos
```

---

## 6. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Cuota `localStorage` | `try/catch` en write; borradores grandes pueden fallar — documentado |
| Conflicto disco externo | Mismo criterio que reload externo (FIX-012); borrador gana hasta guardar o descartar |
| Entidad WB sucia | No persistida (fuera de alcance) |

---

## 7. Checklist

```
[x] Extender sesión localStorage con drafts
[x] Snapshot con flush activo
[x] Restore apply drafts
[x] Persist debounce + pagehide
[x] Tests Vitest lastManuscriptFile
[x] QA manual R1–R6 — NDJSON §8 (`1952` cierre / `26148` reopen)
[x] Docs actualizados
```

---

## 9. Registro

| Fecha | Nota |
|-------|------|
| 2026-06-11 | Implementación FIX-007 (plan documentado retroactivamente) |
| 2026-06-11 | QA NDJSON: `session-1781307782589-1952.ndjson` + `session-1781307807051-26148.ndjson` — cerrado ✅ |

---

**Última actualización:** 2026-06-11
