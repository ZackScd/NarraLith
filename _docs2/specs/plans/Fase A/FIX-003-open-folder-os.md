# FIX-003 — Abrir carpeta raíz del proyecto en el explorador del SO

> Plan de implementación detallado. Spec origen: [`fix-backlog.md` §5](../fix-backlog.md).  
> **Estado:** ✅ Implementado · **Esfuerzo:** Bajo · **Riesgo:** Bajo

---

## 1. Problema y objetivo (spec acordada)

**Problema:** El botón `FolderOpen` en `WorkspaceTopBar` abría un **file picker modal** (`handleOpenLocalMarkdown`) que bloqueaba la app.

**Objetivo (corregido jun 2026):**

1. Clic → abrir en el SO la **carpeta raíz del proyecto** (`activeProject.rootPath`), **sin diálogo**.
2. La app sigue usable en segundo plano.
3. **Misma posición visual** que antes: primer icono de la barra del explorador (solo cuando el panel explorador está abierto).
4. **No** abre subcarpetas — solo `project_root` del proyecto activo.

**Implementación:** IPC `open_project_root_in_os` (Rust + `OpenerExt`) — más fiable que `openPath` solo desde el frontend.

**Comportamiento retirado:** importar `.md` externo vía este botón.

**No usar** `resolveLastOpenedParentPath` para este botón — solo para «Nuevo archivo/carpeta».

---

## 2. Cambios realizados

### `WorkspaceTopBar.tsx`

- Eliminados: `plugin-dialog`, `handleOpenLocalMarkdown`, `normalizeFsPath`, `toRelativeProjectPath`, `requestOpenDocument`.
- Añadidos: `isTauri`, `openPath`, `handleOpenProjectRootInOs` → `openPath(activeProject.rootPath)`.
- Botón en la **misma barra** del explorador que antes (sin columna extra junto a la nav).
- Handler: `invokeCommand("open_project_root_in_os")`.

### `capabilities/default.json`

- Añadido `opener:allow-open-path` (requerido para `openPath` en Tauri 2).

### i18n

- `toolbar.openLocal` → `toolbar.openFolderInOs` (ES/EN).

---

## 3. Verificación manual

En **`npm run tauri dev`**:

| # | Acción | Esperado |
|---|--------|----------|
| 1 | Manuscrito, explorador **abierto** | Botón carpeta visible junto a la nav |
| 2 | Clic botón carpeta | Explorador de Windows abre la **raíz del proyecto** |
| 3 | Archivo en subcarpeta + clic | Sigue abriendo **raíz**, no la subcarpeta |
| 4 | Sin file picker | No aparece diálogo de archivo |
| 5 | App no bloqueada | Se puede seguir escribiendo |

---

## 4. Mejora futura (fuera de FIX-003)

- Abrir carpeta contextual (`Manuscrito/Cap 1/`, etc.) — spec anterior del backlog; requiere decisión de producto aparte.
- Mostrar botón en vista `all` u otras vistas.

---

## 5. Checklist

```
[x] WorkspaceTopBar refactor
[x] opener:allow-open-path
[x] i18n ES/EN
[x] npm run build
[ ] QA manual §3 — pendiente usuario
[x] Docs actualizados
```

---

**Última actualización:** 2026-06-06
