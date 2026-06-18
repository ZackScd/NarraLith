# Requisitos de producto — NarraLith

Documento de planificación **vigente**. Resume la visión del proyecto original ([`archive/legacy-docs-v1/01-REQUIREMENTS.md`](archive/legacy-docs-v1/01-REQUIREMENTS.md)) y corrige lo que cambió en implementación — sobre todo **manuscrito**, **calendario** y **tiempo**.

Para detalle técnico del formato de manuscrito ver `specs/manuscript-design.md`.

---

## 1. Concepto

**NarraLith** es una herramienta de escritura y worldbuilding orientada a narrativa (inspiración Obsidian, más estructura para tiempo y referencias).

**Enfoque híbrido:** dos entornos claros — **Manuscrito** (prosa) y **Worldbuilding** (fichas de lore) — conectados por wikilinks, timeline y (futuro) mapas.

| Principio | Descripción |
|-----------|-------------|
| Offline-first | Sin nube obligatoria |
| Soberanía de datos | Proyecto = carpeta local + `.md` legibles |
| Un proyecto = una DB | `.narralith/index.db` aislada por obra |
| FS = verdad | En conflicto con SQLite, gana el archivo en disco |
| Opt-in en etiquetas | El sistema no infiere tiempos ni ubicaciones |

---

## 2. Estructura de un proyecto

### 2.1 Plantilla estándar (carpetas raíz)

| Carpeta | Propósito |
|---------|-----------|
| `Manuscrito/` | Escenas y prosa narrativa |
| `Worldbuilding/` | Fichas de entidades (taxonomía por subcarpetas) |
| `Imagenes/` | Assets visuales (mapas, retratos, etc.) |

### 2.2 Worldbuilding — categorías relevantes hoy

La plantilla incluye árbol extenso (Personajes, Ubicaciones, Lore, …). Además del diseño original:

| Ruta | Rol |
|------|-----|
| **`Worldbuilding/Eventos/`** | Fichas de **eventos de escena** extraídos del manuscrito (tipo 1). Plantilla `event.yaml`. |
| `Worldbuilding/Lore_y_Mitos/.../Eventos_Historicos_Clave/` | Eventos de lore histórico (plantilla distinta; no confundir con eventos de escena). |

### 2.3 Metadatos de carpetas

- Descripción en `.folder.md` (oculto en explorador).
- Colores por taxonomía (`taxonomy.json`).

**Estado:** ✅ FS + explorador + CRUD básico.

---

## 3. Manuscrito — requisitos actuales

> **❌ Descartado:** formato legacy de bloques arbitrarios separados por `+++` con YAML de tiempo por bloque.  
> **✅ Vigente:** modelo por **eventos narrativos** (jun 2026).

### 3.1 Unidad narrativa: el evento

- La prosa puede existir **fuera** de eventos (texto libre).
- Un **evento** delimita un tramo narrativo referenciable y sincronizable con Worldbuilding.
- El tiempo **no** parte el archivo en bloques; va en etiquetas (barra o inline).

### 3.2 Formato en disco (resumen)

```markdown
---
title: Escena 1
---
prosa libre

+++event
---
event: Nombre del evento
description: ...
entity: Worldbuilding/Eventos/Nombre del evento.md
barTags:
  - type: time
    value: "10.1.0"
---
Cuerpo con marcas {{time:10.1.0}} y wikilinks [[Personaje]].
+++end-event
```

| Elemento | Regla |
|----------|-------|
| Bloque 0 `title` | Obligatorio; sincronizado al nombre de archivo |
| `+++event` / `+++end-event` | Apertura y cierre de evento |
| `barTags` | Opcional — etiquetas de **origen** confirmadas por el usuario |
| `{{time:…}}` | Marcas **inline** de evolución en el cuerpo |
| `entity` | Ruta a ficha en `Worldbuilding/Eventos/` |

### 3.3 Filosofía de etiquetas (opt-in)

- Sin etiquetas → evento válido; **sin** puntos en timeline por tiempo.
- Commit de etiqueta → solo RAM; **guardado manual** a disco (Ctrl+S).
- Crear evento → panel lateral + «Añadir etiqueta al documento» — no atajos que inserten `+++` espurios.
- `[-]` cierra evento en cursor; `[+]` expande tramo en evento cerrado (no crea evento).
- Toggle «Mostrar etiquetas» OFF → texto plano sin barra, esquinas ni huecos.

### 3.4 Editor (UX)

- Lienzo limpio (WYSIWYM): el autor no ve sintaxis cruda.
- Panel derecho: pestaña **Evento y tiempo** + pestaña **Referencias**.
- Marco visual tipo cuaderno (esquinas) con etiquetas ON.

### 3.5 Sincronización con Worldbuilding

Al guardar manuscrito, cada evento mantiene ficha en `Worldbuilding/Eventos/` referenciable con `[[nombre]]`. Renombrar evento actualiza ficha, campo `entity` y wikilinks.

### 3.6 Estado de implementación — manuscrito

| Capa | Estado | Notas |
|------|--------|-------|
| Parser Rust §1.4 | ✅ | Tests verdes |
| IPC `read_manuscript` / `save_manuscript` | ✅ | |
| Persistencia `time_markers` multi-marca | ✅ | |
| Lexical (eventos + inline) | 🟡 | Funcional; deuda de adaptador legacy en store |
| QA manual cerrada | 📋 | Checklist §1.6 pendiente |
| Ubicación inline | 📋 | Fuera de MVP actual |
| Migración formato `+++` antiguo | ❌ | Sin proyectos legacy |

**Prioridad actual:** estabilizar editor (un solo modelo en memoria, eliminar legacy Lexical/store).

---

## 4. Tiempo, calendario y timeline

### 4.1 Calendario ficticio

- Calendario **personalizable** por proyecto (años, meses, días, horas).
- Config persistida en FS; UI de workspace calendario.
- Convención UI habitual para fechas: `d.m.año` (texto libre en `barTags` / inline).

**Estado:** ✅ motor TS (`lib/calendar/`) + IPC + vistas; bien testeado.

### 4.2 Marcas de tiempo en manuscrito

Dos capas (no duplicar automáticamente):

| Capa | Dónde | Rol |
|------|-------|-----|
| Origen | `barTags` en YAML de `+++event` | Ancla del evento en timeline |
| Evolución | `{{time:…}}` en cuerpo | Avance narrativo dentro del evento |

**Estado:** ✅ indexación en SQLite; 🟡 integración editor en pulido.

### 4.3 Línea de tiempo global

- Construida desde `time_markers` (no re-parseando todo el `.md` en cada vista).
- Orden por trayectoria (`segment_id`, offset inline).
- Filtros y vista en `modules/timeline/`.

**Estado:** ✅ backend adaptado al nuevo formato; 🟡 validar UX end-to-end.

### 4.4 Plothole checker

- Alertas no prohibitivas (ej. personaje en dos lugares a la misma hora).
- Lee metadata de bloques / markers.

**Estado:** 🟡 funciona con modelo anterior de `location` en metadata; ubicación inline no existe aún.

### 4.5 Descartado / diferido del plan original

- Escenas paralelas en `/Manuscrito/Escenas_Paralelas/` como flujo dedicado — 📋 no implementado como spec original.
- Etiquetas intra-párrafo por **rangos CRDT** — ❌ sustituido por tokens inline `{{…}}`.

---

## 5. Worldbuilding y fichas

### 5.1 Modelo general

- Cada entidad = un `.md` con frontmatter YAML + cuerpo.
- Plantillas por categoría (`character`, `location`, `event`, `lore`, …).
- Nombre de archivo = identidad principal; único campo obligatorio al crear.

### 5.2 Estado por área

| Área | Estado |
|------|--------|
| Explorador + CRUD archivos/carpetas | ✅ |
| Fichas: leer/guardar/crear con plantilla | ✅ |
| Taxonomía por carpeta + colores | ✅ |
| Ficha evento de escena (`event.yaml`) | ✅ |
| Formularios ricos por categoría (todos los campos del plan original) | 🟡 plantillas base; no toda la UI aspiracional |
| Vista tarjetas de carpetas enriquecidas | 📋 |
| Herencia automática de etiquetas al crear en subcarpeta | 🟡 parcial |

El plan original detalla fichas extensas (bestiario, cosmología, economía, …). Son **plantillas y visión**, no requisitos de MVP.

---

## 6. Referencias y grafo

| Feature | Estado |
|---------|--------|
| Wikilinks `[[entidad]]` y alias `[[Real\|apodo]]` | ✅ en editor y fichas |
| Autocompletado `@` / `[[` | ✅ |
| Backlinks panel | 🟡 montado; navegación aún con índices legacy en partes |
| Menciones sin enlace → convertir | ✅ IPC |
| Rename global de entidad | ✅ |
| Grafo D3 | ⏸ congelado — índice existe, no prioridad |

---

## 7. Mapas

Requisitos originales: Leaflet + capas vectoriales + Excalidraw + evolución temporal.

**Estado:** 🟡 mucho código en `modules/maps/` y Rust `maps_store`; **⏸ congelado** hasta manuscrito estable. No planificar integración mapa ↔ ubicación inline aún.

---

## 8. Control de versiones

Requisitos originales: Git transparente, snapshots, diff, autoguardado inteligente.

**Estado:**

| Pieza | Estado |
|-------|--------|
| `git init` al crear proyecto | ✅ |
| Snapshots / diff / IPC | 🟡 código parcial, no conectado |
| UI historial | 🟡 montada, rota |

**⏸ Congelado** — no reparar hasta después del manuscrito (o ocultar UI).

---

## 9. Exportación

DOCX, PDF, EPUB, Wiki HTML, JSON para game devs, zip portable.

**Estado:** 📋 Fase 9 del roadmap macro — sin implementación.

---

## 10. UI del workspace

### 10.1 Layout

- Navegación global izquierda (manuscrito, worldbuilding, timeline, calendario, mapa, grafo, ajustes).
- Explorador contextual.
- Lienzo central (editor o vista activa).
- Panel derecho contextual.

**Estado:** ✅ estructura; 🟡 contenido del panel varía por módulo.

### 10.2 Tema y accesibilidad

- Tema oscuro por defecto; Shadcn + variables CSS.
- Personalización (acento, fuentes, dislexia): 📋 parcial en settings.

---

## 11. Resumen de prioridades (desde jun 2026)

**Producto:** versión completa y estable al salir a producción (sin MVP recortado).

```text
1. Manuscrito estable (Era II — activa)
2. Tiempo + timeline verificados con el nuevo formato (cierre Era II)
3. Mapas rehechos e integrados (Era III)
4. Worldbuilding v2 (Era IV — depende de 1 y 3)
5. Referencias / grafo / versiones Git / exportación (Eras IV–V)
6. QoL y visión lejana (Era VI)
```

Módulos rotos: **visibles con ✗**, no ocultos.

---

## 12. Visión a largo plazo (sin compromiso de fecha)

Del documento original, **siguen siendo deseables** pero no guían el desarrollo actual:

- Modo concentración, Pomodoro, ambient sounds
- Dashboard de estadísticas y metas
- Co-escritura P2P (Yjs / WebRTC)
- Ecosistema de plugins
- Catálogo ampliado de plantillas por género/medio

No eliminar estas ideas; mantenerlas fuera del camino crítico hasta que el núcleo narrativo (manuscrito + tiempo + referencias) esté cerrado.

---

## 13. Cambios respecto a `_docs/01-REQUIREMENTS.md`

| Tema | Antes (plan inicial) | Ahora (vigente) |
|------|----------------------|-----------------|
| Manuscrito | Bloques `+++` + YAML `time` por bloque | Eventos `+++event` + `barTags` + inline `{{time:…}}` |
| Eventos WB | Solo bajo Lore / histórico | + `Worldbuilding/Eventos/` para escenas |
| Etiquetas en prosa | Rangos CRDT intra-párrafo | Tokens inline en offset |
| Calendario | Especificado abstractamente | Implementado custom TS + config proyecto |
| Mapas / Git / Export | Mismo nivel de prioridad que editor | ⏸ después del manuscrito |
| Muchas fichas WB | Listadas como requisitos | Plantillas base ✅; UI rica = visión futura |
