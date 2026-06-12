# Spec — Manuscrito por eventos

> **Documento de diseño cerrado.** Define el **qué** (UX, disco, reglas). La ejecución está en [`manuscript-roadmap.md`](manuscript-roadmap.md).  
> Sustituye `archive/manuscript-refactor/plan.md` §1 para trabajo nuevo. El baseline histórico (`+++` legacy) vive en ese archivo §2 (solo consulta).

| Campo | Valor |
|-------|--------|
| **Estado** | Diseño cerrado |
| **Ámbito** | `Manuscrito/**` + fichas `Worldbuilding/Eventos/` |
| **Sin migración legacy** | No hay proyectos v1 en circulación |

---

## 1. Filosofía — opt-in explícito

| Principio | Implicación |
|-----------|-------------|
| Sin inferencias | El sistema no rellena tiempos, ubicaciones ni timeline |
| Evento sin etiquetas | Válido; barra solo `[Evento]: nombre` |
| Sin tiempo | Sin filas en timeline para ese evento |
| Commit etiqueta | Aplica al editor en RAM; disco con guardado manual (§1.1) |
| Borrador sucio | **Debe persistir al cerrar** la app (FIX-007 ✅) |
| Ubicación | Era III+; parser tolera `{{location:…}}` sin UI en Era II |

### 1.1 Guardado y pestañas (FIX-012)

| Atajo / acción | Efecto |
|----------------|--------|
| **Ctrl+S** | Guarda **solo** la pestaña activa (manuscrito o entidad WB). No cambia de pestaña. |
| **Ctrl+Shift+S** | Guarda **todas** las pestañas sucias **sin** cambiar la activa ni recorrer la barra (caché de tab; FIX-012 2b). |
| Botón «Guardar todo» (panel 💾) | Igual que Ctrl+Shift+S. |
| Autoguardado (configuración) | Solo la pestaña activa, sin iterar el resto. |

Al guardar un manuscrito con eventos, el sync de fichas `Worldbuilding/Eventos/` es transparente: no debe cerrar pestañas ni marcar archivos como `ghost` en SQLite.

---

## 2. Modelo visual (etiquetas ON)

```text
[bloque 0 — title ↔ nombre archivo]

prosa libre

[eventTest]  [2026-01-17]  [2026-01-18 / 09:00]  [🏷️+]
┌                                                    ┐
│  texto {{time:10.1.0}} …                           │
│  al día siguiente {{time:11.1.0}}                  │
└                                                    ┘

prosa libre
```

- **Chips** (evento, tiempos barra, botón +): fila encima del marco; ocultables con toggle.
- **Esquinas** `┌ ┐ └ ┘`: overlay sobre el cuerpo del evento, **siempre visibles** (sin líneas horizontales).
- **UI de fechas:** `AAAA-MM-DD` o `AAAA-MM-DD / HH:00`; en disco sigue `d.m.aaaa`.

**OFF:** sin chips ni botón +; **esquinas del marco siguen visibles**; solo texto plano editable dentro del evento.

---

## 3. Reglas de interacción

| Acción | Comportamiento |
|--------|----------------|
| Crear evento | Panel → nombre/descripción → «Añadir etiqueta al documento»; solo evento crea bloque; sync WB `Eventos/` |
| `[-]` | Evento **abierto** → cierra en el párrafo del cursor + párrafo libre debajo (D3). Evento **cerrado** sin prosa que absorber → **reposiciona** el cierre en el párrafo del cursor (los párrafos inferiores pasan a prosa libre) |
| `[+]` | Evento **cerrado**, cursor en cuerpo, hay prosa libre debajo → baja el margen inferior hasta EOF o siguiente evento |
| Borrar chip evento | Two-step (rojo → confirmar): quita barra + cuerpo + cierre del **manuscrito**; la ficha WB **no** se borra (queda huérfana → FIX-011 §6.B) |
| Quitar cierre | Two-step en esquinas inferiores `└`/`┘`: solo elimina `+++end-event` lógico; el evento pasa a abierto |
| Toggle etiquetas | Persistente en `localStorage` (ON/OFF al reiniciar) |
| Tiempo | Inline en cursor o `barTags` en staging — **no** inserta `+++` |
| Escribir en evento cerrado | Sin `[+]` disponible si no hay prosa absorbible debajo — escribir dentro del marco |

**Panel:** un solo botón `[-]` / `[+]` — abierto o cerrado sin margen que bajar → `[-]`; cerrado con prosa absorbible debajo → `[+]`.

---

## 4. Formato en disco

```markdown
---
title: Escena 1
---
prosa libre

+++event
---
event: Nombre
description: ...
entity: Worldbuilding/Eventos/Nombre.md
barTags:
  - type: time
    value: "10.1.0"
---
Cuerpo {{time:10.1.0}}
+++end-event
```

| Token | Rol |
|-------|-----|
| `title` (bloque 0) | Sync ↔ stem del archivo |
| `+++event` / `+++end-event` | Delimitación de evento |
| `barTags` | Origen (opcional) |
| `{{time:…}}` | Evolución inline en cuerpo |
| `entity` | Ruta ficha WB |

---

## 5. Worldbuilding — evento tipo 1

Al guardar manuscrito: ficha en `Worldbuilding/Eventos/{nombre}.md`, plantilla `event.yaml`, referenciable `[[nombre]]`. Renombrar evento → actualizar ficha, `entity`, wikilinks.

Prioridad resolver `[[…]]`: `Worldbuilding/Eventos/` sobre homónimos en `Manuscrito/`.

---

## 6. Persistencia SQLite

`time_markers` (schema v5): N filas por evento — `barTags` time + cada `{{time:…}}` con `segment_id`, `tag_kind`, `char_offset`.

---

## 7. Criterios de cierre Era II

- [ ] `title` ↔ rename archivo
- [ ] Evento solo nombre → sin `barTags`; sin timeline por tiempo
- [ ] Tiempo en staging → solo lo confirmado en `barTags`
- [x] Guardado manual; borrador sucio persistente al cerrar app
- [ ] Botón único `[-]`/`[+]` según §3
- [ ] Shift+Enter conserva saltos de línea al guardar
- [ ] Guardar con evento nuevo no falla (sync WB + round-trip §4)
- [ ] Guardar no devuelve scroll al inicio del documento
- [ ] Tiempo inline sin `+++` espurio
- [ ] Toggle OFF sin huecos
- [ ] Commit evento → ficha WB + `entity`
- [ ] Guardar → sync ficha; renombrar → wikilinks
- [ ] Round-trip §4 tras reabrir

---

## Referencias

- Requisitos producto: `../01-REQUIREMENTS.md` §3
- Ejecución: `manuscript-roadmap.md`
- Auditoría histórica: `_docs/archive/manuscript-refactor/plan.md` §11 (solo consulta)
