# FIX-010d — Editar marcas de tiempo existentes

> **Estado:** 📋 Planificado · **Esfuerzo:** Medio · **Riesgo:** Medio  
> **Épica:** [FIX-010 índice](FIX-010-calendar-stale-time-chips.md) · **Depende de:** [010a](FIX-010a-classify-red-chips.md) · **Decisión:** D3

---

## 1. Problema

`TimeTagDialog` + `useTimeTagDialogStore` solo soportan **inserción**. Tras poner una marca no hay flujo para seleccionarla y editarla.

---

## 2. Objetivo

| # | Criterio |
|---|----------|
| O1 | Clic chip **inline** → diálogo modo edit |
| O2 | Clic chip **barTag** evento → mismo diálogo |
| O3 | Guardar persiste Lexical / barTags + re-index SQLite |
| O4 | Panel lateral (`SideTimeSection`) sin duplicar UX |

---

## 3. Diseño

### Store

```typescript
mode: "insert" | "edit";
editTarget?:
  | { kind: "inline"; nodeKey: string }
  | { kind: "bar"; segmentId: string; tagIndex: number };
```

### Flujo

1. Plugin Lexical o handler en chip inline → `open({ mode: "edit", … })`
2. `EventTagBar`: clic en `TimeTagChip` → edit bar
3. Confirmar:
   - Inline: `$getNodeByKey` → actualizar valor
   - Bar: mutar `EventTagBarNode.__barTags[i]`
4. i18n: `editor.timeTag.editTitle`

**Fuera de alcance:** metadata bloque 0 hora-only (panel lateral).

---

## 4. Implementación

- [ ] Extender `useTimeTagDialogStore.ts`
- [ ] `EditInlineTimeTagPlugin.tsx` (o extensión existente)
- [ ] `EventTagBar.tsx` — handler clic
- [ ] Tests mutación barTags / plugin

---

## 5. Archivos

| Archivo | Cambio |
|---------|--------|
| `src/stores/useTimeTagDialogStore.ts` | Modo edit |
| `src/modules/editor/plugins/EditInlineTimeTagPlugin.tsx` | **Nuevo** |
| `src/modules/editor/components/EventTagBar.tsx` | Clic edit |
| `src/modules/editor/sidePanel/TimeTagDialog.tsx` | Título/botón edit |

---

## 6. QA

| # | Acción | Esperado |
|---|--------|----------|
| D1 | Clic chip inline | Diálogo edit; guardar actualiza `{{time:…}}` |
| D2 | Clic barTag | Idem barTags |
| D3 | Marca stale editada a fecha válida | Chip vuelve a normal |

---

**Anterior:** [010c](FIX-010c-calendar-entries.md) · **Siguiente:** [010h](FIX-010h-calendar-draft-persist.md)
