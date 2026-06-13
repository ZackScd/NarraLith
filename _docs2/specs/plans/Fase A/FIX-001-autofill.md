# FIX-001 — Deshabilitar autocompletado «Información guardada»

> Plan de implementación detallado. Spec origen: [`fix-backlog.md` §1](../fix-backlog.md).  
> **Estado:** ✅ Implementado (capas A–C) · **Esfuerzo:** Bajo · **Riesgo:** Bajo

---

## 1. Problema y objetivo

**Problema:** En WebView2/Chromium (Tauri en Windows), al escribir en campos de texto aparece el desplegable del navegador **«Información guardada»** con valores históricos (ej. nombres de mapas previos).

**Objetivo:** Ningún campo de texto **propio de NarraLith** debe mostrar autofill del navegador en diálogos, paneles y configuración.

**No es bug de NarraLith:** el proyecto no define `autoComplete` hoy; Chromium infiere por `id`, `name`, `placeholder` e historial.

**Fuera de alcance:** inputs dentro de Excalidraw, Leaflet u otros embeds de terceros (salvo reporte concreto).

---

## 2. Estrategia (tres capas)

| Capa | Qué | Cobertura estimada |
|------|-----|-------------------|
| **A** | `autoComplete="off"` en `Input` base | ~23 pantallas que importan `Input` |
| **B** | `autoComplete="off"` en `<form>` de diálogos | Refuerzo Chromium en envíos |
| **C** | `autoComplete="off"` en `<textarea>` nativos | 3 archivos sin componente compartido |
| **D** *(solo si A–C fallan en QA)* | Escalada: `one-time-code`, ids opacos, `readOnly` on focus | Casos rebeldes (ej. `id="map-name"`) |

**Orden de ejecución:** A → B → C → probar → D solo si hace falta.

---

## 3. Cambios por archivo

### 3.1 Capa A — Componente central (obligatorio)

#### `src/components/ui/input.tsx`

**Cambio:**

```tsx
<input
  type={type}
  autoComplete="off"
  data-slot="input"
  className={cn(...)}
  {...props}
/>
```

**Reglas:**

- `autoComplete="off"` **antes** de `{...props}` para permitir override explícito en el futuro.
- No cambiar API del componente.

**Efecto cascada:** todos los consumidores de `Input` quedan cubiertos sin editar cada pantalla.

#### `src/components/EditableNumberInput.tsx`

**Cambio:** ninguno (usa `Input` internamente).

---

### 3.2 Capa B — Formularios `<form>` (obligatorio)

Añadir `autoComplete="off"` al elemento `<form>`:

| Archivo | Línea aprox. | Contexto |
|---------|--------------|----------|
| [`src/modules/project/CreateProjectDialog.tsx`](../../src/modules/project/CreateProjectDialog.tsx) | ~66 | Crear proyecto |
| [`src/modules/worldbuilding/CreateEntityDialog.tsx`](../../src/modules/worldbuilding/CreateEntityDialog.tsx) | ~76 | Crear entidad WB |
| [`src/modules/explorer/ExplorerDialogs.tsx`](../../src/modules/explorer/ExplorerDialogs.tsx) | ~161 | Nuevo archivo / carpeta / renombrar |
| [`src/modules/explorer/FolderDescriptionDialog.tsx`](../../src/modules/explorer/FolderDescriptionDialog.tsx) | ~101 | Editar carpeta |

**Nota:** diálogos **sin** `<form>` (solo `Input` suelto) dependen de capa A:

- [`CreateMapDialog.tsx`](../../src/modules/maps/CreateMapDialog.tsx) — caso reportado (`id="map-name"`)
- [`SaveSnapshotDialog.tsx`](../../src/modules/versions/SaveSnapshotDialog.tsx)
- Renombrado inline en [`FileExplorer.tsx`](../../src/modules/explorer/FileExplorer.tsx)

Opcional coherencia: envolver esos diálogos en `<form autoComplete="off">` en un fix posterior; **no requerido** si capa A basta.

---

### 3.3 Capa C — `<textarea>` nativos (obligatorio)

No existe `components/ui/textarea.tsx`. Añadir `autoComplete="off"` en cada `<textarea>`:

| Archivo | Uso |
|---------|-----|
| [`src/components/workspace-ui/manuscript/ManuscriptEventCard.tsx`](../../src/components/workspace-ui/manuscript/ManuscriptEventCard.tsx) | Descripción de evento (panel lateral) |
| [`src/modules/worldbuilding/EntityFormRenderer.tsx`](../../src/modules/worldbuilding/EntityFormRenderer.tsx) | Campos `textarea` y `textarea[]` de fichas WB |
| [`src/modules/explorer/FolderDescriptionDialog.tsx`](../../src/modules/explorer/FolderDescriptionDialog.tsx) | Descripción de carpeta |

**Opcional (mejora futura, no bloquea FIX-001):** crear `src/components/ui/textarea.tsx` con el mismo patrón que `Input` y migrar los 3 usos.

---

### 3.4 Nativos `<input>` — sin cambio

Estos **no** muestran «Información guardada» (no son campos de texto libre):

| Archivo | `type` |
|---------|--------|
| `PanelFilterCheckbox.tsx` | checkbox |
| `EntityFormCustomizer.tsx` | checkbox |
| `GraphFilterPanel.tsx` | checkbox |
| `MapLayerPanel.tsx` | checkbox, range |
| `SettingsDialog.tsx` | checkbox |
| `CalendarSettingsSection.tsx` | checkbox |
| `VersionHistoryPanel.tsx` | checkbox |
| `CalendarEditPanel.tsx` | color, range |
| `MapDrawStudio.tsx` | range |

**Acción:** no modificar (evitar ruido en el diff).

---

### 3.5 Inventario: pantallas que usan `Input` (cubiertas por capa A)

Verificación post-cambio; **no editar** salvo QA fallido:

| Módulo | Archivo |
|--------|---------|
| Mapas | `CreateMapDialog.tsx`, `MapOverlayPanel.tsx`, `MapLayerPanel.tsx` |
| Proyecto | `CreateProjectDialog.tsx` |
| Explorador | `ExplorerDialogs.tsx`, `FolderDescriptionDialog.tsx`, `FileExplorer.tsx` |
| Manuscrito | `ManuscriptEventCard.tsx` |
| Worldbuilding | `CreateEntityDialog.tsx`, `EntityFormRenderer.tsx`, `EntityFormCustomizer.tsx`, `fields/KeyValueField.tsx`, `fields/NestedField.tsx`, `fields/RelationField.tsx` |
| Calendario | `CalendarEditPanel.tsx`, `CalendarHoursSection.tsx`, `CalendarWeekDaysSection.tsx`, `CalendarMonthRows.tsx`, `CalendarRecurringEventsSection.tsx`, `WikiPathInput.tsx` |
| Ajustes | `CalendarSettingsSection.tsx` |
| Versiones | `SaveSnapshotDialog.tsx` |

**Total:** 23 archivos importan `Input` → 1 cambio en `input.tsx`.

---

## 4. Capa D — Escalada (solo tras QA fallido)

Aplicar **en este orden**, probando tras cada paso:

### D.1 `autoComplete="one-time-code"`

En campos que sigan mostrando autofill (Chromium los trata como no-autocompletables):

- `CreateMapDialog.tsx` — `Input` nombre mapa
- `CreateProjectDialog.tsx` — nombre proyecto
- `CreateEntityDialog.tsx` — nombre entidad
- `ExplorerDialogs.tsx` — nombre archivo/carpeta

```tsx
<Input autoComplete="one-time-code" ... />
```

*(Override explícito sobre el default `off` del componente.)*

### D.2 Ids menos «semánticos»

Chromium usa heurísticas en `id` / `name`. Candidatos a renombrar:

| Actual | Sugerido | Archivo |
|--------|----------|---------|
| `map-name` | `narra-map-label` | `CreateMapDialog.tsx` |
| `project-name` | `narra-project-label` | `CreateProjectDialog.tsx` |
| `entity-name` | `narra-entity-label` | `CreateEntityDialog.tsx` |
| `snapshot-name` | `narra-snapshot-label` | `SaveSnapshotDialog.tsx` |
| `folder-title` | `narra-folder-title` | `FolderDescriptionDialog.tsx` |

Actualizar `htmlFor` del `Label` asociado en el mismo archivo.

**No** añadir atributo `name` a inputs (hoy no se usa; añadirlo podría empeorar autofill).

### D.3 Patrón `readOnly` hasta focus (último recurso)

Solo en el campo más problemático si D.1–D.2 no bastan:

```tsx
const [armed, setArmed] = useState(false);
<Input
  readOnly={!armed}
  onFocus={() => setArmed(true)}
  ...
/>
```

Documentar en comentario por qué existe (anti-autofill WebView2).

### D.4 Tauri / WebView2 (documentación, no código)

Si persiste en `tauri dev`:

- Revisar [`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json) — no hay flag estándar para desactivar autofill en WebView2.
- Mitigación usuario: borrar «Información guardada» en Edge para el origen de la app.

---

## 5. Pasos de implementación (checklist)

```
[x] 1. Editar input.tsx (capa A)
[x] 2. Editar 4 forms (capa B)
[x] 3. Editar 3 textareas (capa C)
[x] 4. npm run build (sin errores TS)
[ ] 5. QA manual §6 (Tauri + opcional Vite) — pendiente usuario
[ ] 6. Si falla QA → capa D.1, reprobar
[ ] 7. Si falla → D.2, reprobar
[ ] 8. Si falla → D.3 en campo concreto
[x] 9. Marcar FIX-001 ✅ en implementation-plan.md
```

**Sin tests automatizados** previstos (comportamiento del navegador); QA manual es el criterio de salida.

---

## 6. Verificación manual (obligatoria)

Ejecutar en **`npm run tauri dev`** (WebView2 — entorno del reporte).

| # | Pantalla | Campo | Resultado esperado |
|---|----------|-------|-------------------|
| 1 | Crear mapa | Nombre | Sin «Información guardada» |
| 2 | Crear proyecto | Nombre | Idem |
| 3 | Crear entidad WB | Nombre | Idem |
| 4 | Explorador | Nuevo archivo / carpeta | Idem |
| 5 | Explorador | Renombrar | Idem |
| 6 | Panel manuscrito | Nombre / descripción evento | Idem |
| 7 | Calendario | Cualquier `Input` de edición | Idem |
| 8 | Ajustes → calendario | Días por semana, etc. | Idem |
| 9 | Mapas → capa / overlay | Filtros y etiquetas | Idem |

**Regresión:** envío de formularios, validación, guardado IPC sin cambios.

Opcional: repetir puntos 1–3 en `npm run dev` (Chrome puro) por si el comportamiento difiere.

---

## 7. Criterio de salida

- Recorrido §6 sin desplegable de autofill en campos propios.
- Build verde.
- FIX-001 marcado ✅ en [`implementation-plan.md`](../implementation-plan.md).

---

## 8. Riesgos y notas

| Riesgo | Mitigación |
|--------|------------|
| Chromium ignora `off` | Capa D |
| Confundir con autofill de **NarraLith** (typeahead propio) | No existe hoy en estos campos |
| Password managers | No hay campos `type="password"` en alcance |
| Romper accesibilidad | `autoComplete="off"` no afecta labels ni `aria-*` |

**Diff estimado:** ~6 archivos, <30 líneas (sin escalada D).

---

**Última actualización:** 2026-06-06
