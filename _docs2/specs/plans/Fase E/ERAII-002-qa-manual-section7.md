# ERAII-002 — M8: QA manual checklist §7

> **Estado:** ✅ **Cerrado** (2026-06-11) — smoke QA; §7 residual → Afinado final  
> **Esfuerzo:** Medio · **Riesgo:** Bajo  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase E · **Spec:** [`manuscript-design.md`](../../manuscript-design.md) §7 · [`04-TASK.md`](../../../04-TASK.md) § II.5.1 · [`manuscript-roadmap.md`](../../manuscript-roadmap.md) M8

---

## 0. Procedencia (plan antes de ejecutar)

| Pregunta | Respuesta |
|----------|-----------|
| ¿Plan en Fase E **antes** de QA? | **Sí** — este documento. |
| ¿Dependencias cerradas? | ERAII-001 ✅ (`a5c06f6`) · FIX-004…007 ✅ · FIX-012 ✅ · FIX-013 ✅ · OBS-001 ✅ |
| ¿Qué bloquea? | ERAII-003 (changelog v0.10.0) · apertura formal MAP/WB en roadmap |
| ¿Hay código en M8? | **No por defecto.** Bug encontrado → ticket FIX o hotfix acotado → re-QA del ítem afectado. |

**Regla:** ejecutar escenarios → registrar evidencia (OBS) → marcar ítems en [`manuscript-design.md`](../../manuscript-design.md) §7 → cerrar este plan → marcar ERAII-002 ✅.

---

## 1. Objetivo

Validar en **Tauri dev** (`npm run tauri dev`) que el manuscrito por eventos cumple los **criterios de cierre Era II** definidos en [`manuscript-design.md`](../../manuscript-design.md) §7, más la QA residual de fixes ya implementados pero nunca recorrida de punta a punta en una sola sesión.

**Criterio de salida global:** los 13 ítems de §7 marcados `[x]` en `manuscript-design.md`; `npm test` + `cargo test` verdes al cierre; bugs abiertos = **0** (o explícitamente pospuestos con ticket y acuerdo — no silenciosos).

---

## 2. Precondiciones

### 2.1 Entorno

| Requisito | Detalle |
|-----------|---------|
| Comando | `npm run tauri dev` desde raíz del repo |
| Proyecto de prueba | Carpeta bajo `Manuscrito/` con al menos una escena `.md`; ideal: escena con 1–2 eventos + prosa libre |
| OBS | Toggle ① sistema ON; toggle ④ acciones ON (recomendado). Ver [`OBS-001`](../Fase%20B/OBS-001-system-audit-log.md) · [`OBS-003`](../Fase%20D/FIX-010/OBS-003-action-audit-log.md) |
| Limpieza opcional | Menú debug → borrar logs antes de sesión formal M8 |

### 2.2 Gate automatizado (antes de abrir Tauri)

```bash
npm test
npm run build
cargo test
```

Los tres deben pasar **el día de la sesión M8**. Si fallan, no iniciar checklist — arreglar primero.

### 2.3 Estado ya cubierto (no repetir como “nuevo”, sí revalidar si dudas)

| Evidencia previa | Qué cubrió |
|------------------|------------|
| FIX-007 · `session-1781307782589-1952` + `26148` | Borrador sucio al cerrar/reabrir |
| FIX-013 · `session-1781310443496-13516` | Diff inline + refresh al guardar |
| M7 smoke · `17440` + `24412` | Eventos, tiempos, `[-]`/`[+]`, saves, mini-timeline, reinicio |
| FIX-010d · tests `fix010d-qa.test.ts` | Edit stale/valid chips (automatizado) |

**Política:** ítems con evidencia fuerte pueden marcarse tras **smoke de regresión** (1–2 pasos). Ítems sin evidencia → escenario completo obligatorio.

---

## 3. Matriz maestra — §7 → escenarios M8

Cada fila es un ítem de [`manuscript-design.md`](../../manuscript-design.md) §7. Columna **ID** para registrar en este plan al cerrar.

| ID | Ítem §7 | Escenario M8 | Ref. FIX / spec |
|----|---------|--------------|-----------------|
| **S7-01** | `title` ↔ rename archivo | [§4.1](#41-s7-01--title--rename-archivo) | §4 `manuscript-design` |
| **S7-02** | Evento solo nombre → sin `barTags`; sin timeline por tiempo | [§4.2](#42-s7-02--evento-solo-nombre) | §1, §6 |
| **S7-03** | Tiempo staging → solo confirmado en `barTags` | [§4.3](#43-s7-03--tiempo-staging) | §3 |
| **S7-04** | Guardado manual; borrador sucio al cerrar app | [§4.4](#44-s7-04--borrador-sucio) | FIX-007 ✅ pre-QA |
| **S7-05** | Botón único `[-]` / `[+]` según §3 | [§4.5](#45-s7-05--expand-collapse) | §3 · M7 `17440`/`24412` |
| **S7-06** | Shift+Enter conserva saltos al guardar | [§4.6](#46-s7-06--shiftenter) | FIX-005 §8.2 #6 |
| **S7-07** | Guardar evento nuevo no falla (sync WB + round-trip §4) | [§4.7](#47-s7-07--evento-nuevo--wb) | §4, §5 |
| **S7-08** | Guardar no devuelve scroll al inicio | [§4.8](#48-s7-08--scroll-tras-guardar) | FIX-012 |
| **S7-09** | Tiempo inline sin `+++` espurio | [§4.9](#49-s7-09--inline-sin-plusplus) | §3 |
| **S7-10** | Toggle OFF sin huecos | [§4.10](#410-s7-10--toggle-etiquetas) | §2 |
| **S7-11** | Commit evento → ficha WB + `entity` | [§4.11](#411-s7-11--commit--ficha-wb) | §5 |
| **S7-12** | Guardar → sync ficha; renombrar → wikilinks | [§4.12](#412-s7-12--renombrar-evento) | §5 |
| **S7-13** | Round-trip §4 tras reabrir | [§4.13](#413-s7-13--round-trip-disco) | §4 |

---

## 4. Escenarios detallados

> **Formato por escenario:** Acción → Esperado → Verificación disco (si aplica) → Evidencia OBS.

### 4.1 S7-01 — `title` ↔ rename archivo

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Abrir escena `Manuscrito/.../Mi Escena.md` | Frontmatter `title:` coincide con stem o valor explícito |
| 2 | Cambiar `title:` en cabecera del manuscrito (bloque 0) | UI refleja título |
| 3 | Guardar (Ctrl+S) | Sin error IPC |
| 4 | Renombrar archivo en explorador **o** sync título→stem según flujo producto | `title` en disco coherente con nombre archivo (o viceversa según acción elegida) |
| 5 | Reabrir escena | Título correcto; sin duplicar frontmatter |

**Fallo típico:** título desincronizado tras rename externo → ticket FIX, no marcar §7.

---

### 4.2 S7-02 — Evento solo nombre

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Panel lateral → crear evento con **solo nombre** (sin tiempos) | Barra `[Evento]: nombre`; sin chips de tiempo |
| 2 | Guardar | YAML sin `barTags:` o `barTags` vacío |
| 3 | Abrir timeline del proyecto | **Sin** filas de tiempo para ese evento |
| 4 | Toggle etiquetas ON/OFF | Esquinas marco visibles; sin chips fantasma |

---

### 4.3 S7-03 — Tiempo staging

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Abrir diálogo tiempo desde barra (staging) | Panel staging visible |
| 2 | Elegir fecha **sin** confirmar / cancelar | **No** aparece chip en barra; **no** `barTags` en RAM |
| 3 | Confirmar fecha en staging | Chip en barra; tras guardar, `barTags` con `type: time` en disco |
| 4 | Inspeccionar `.md` | **No** hay `+++` extra por el tiempo de barra |

---

### 4.4 S7-04 — Borrador sucio

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Editar prosa sin guardar | Botón guardar / indicador sucio activo |
| 2 | Cerrar app (sin guardar) | Sin crash |
| 3 | Reabrir mismo proyecto | Borrador restaurado; contenido = última edición |
| 4 | Guardar | Disco alineado; sucio limpio |

**Regresión mínima** si confías en FIX-007: pasos 2–3 con una línea nueva. Evidencia histórica: `26148` (`draftCount`).

---

### 4.5 S7-05 — Expand / collapse

Referencia reglas: [`manuscript-design.md`](../../manuscript-design.md) §3.

| Paso | Acción | Esperado |
|------|--------|----------|
| A | Evento **abierto**, cursor en párrafo medio, pulsar `[-]` | Cierra en párrafo cursor; prosa debajo queda libre |
| B | Evento **cerrado**, cursor en cuerpo, prootro evento debajo | Botón `[+]`; al pulsar, margen baja hasta EOF o siguiente evento |
| C | Evento cerrado **sin** prosa absorbible debajo | Solo `[-]` (reposicionar cierre), no `[+]` |
| D | Panel lateral | **Un solo** botón `[-]` o `[+]` según estado |
| E | Guardar + reabrir | `+++end-event` coherente con UI |

**Smoke M7:** revalidar A–B si sesión `17440`/`24412` reciente; D–E obligatorios si no consta en log.

---

### 4.6 S7-06 — Shift+Enter

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Cabecera o cuerpo evento: escribir texto, **Shift+Enter** mid-línea | Salto intra-párrafo visible (no nuevo párrafo block) |
| 2 | Guardar → reabrir | Mismo salto conservado |
| 3 | Enter normal al final ×2 | Párrafos extra conservados (FIX-005 §8.1) |

Fuente detalle: [`FIX-005-whitespace-persist.md`](../Fase%20B/FIX-005-whitespace-persist.md) §8.

---

### 4.7 S7-07 — Evento nuevo + WB

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Crear evento nuevo desde panel | Bloque en editor |
| 2 | Ctrl+S | `save.end` `ok: true`; sin toast error |
| 3 | FS: `Worldbuilding/Eventos/{nombre}.md` | Ficha existe; plantilla evento |
| 4 | FS: manuscrito | `entity: Worldbuilding/Eventos/...` en frontmatter evento |
| 5 | Insertar `[[nombre]]` en prosa | Resuelve a ficha Eventos (prioridad §5) |
| 6 | Reabrir escena | Round-trip §4 intacto |

---

### 4.8 S7-08 — Scroll tras guardar

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Documento largo; scroll ~ mitad o final | — |
| 2 | Editar una palabra; Ctrl+S | **Scroll no salta** al inicio del documento |
| 3 | Ctrl+Shift+S con varias tabs sucias (FIX-012 R10–R12) | Sin switch de tab; scroll activo estable |
| 4 | Recarga externa del archivo (opcional) | Comportamiento documentado FIX-012 — scroll al inicio **solo** en ese caso, no en save manual |

---

### 4.9 S7-09 — Inline sin `+++` espurio

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Cursor en cuerpo evento; insertar tiempo **inline** (no staging) | `{{time:…}}` en editor |
| 2 | Guardar | Cuerpo contiene `{{time:…}}`; **no** aparece `+++` suelto ni bloque evento duplicado |
| 3 | Timeline | Marca indexada para inline |

---

### 4.10 S7-10 — Toggle etiquetas

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Etiquetas ON → OFF | Chips y botón `🏷️+` ocultos; **esquinas** `┌┐└┘` siguen visibles |
| 2 | Editar texto dentro del evento con OFF | Sin huecos/layout rotos; líneas alineadas |
| 3 | OFF → ON | Chips reaparecen; estado coherente |
| 4 | Reiniciar app | Preferencia ON/OFF persistida (`localStorage`) |

**Gap M7:** toggle no cubierto en OBS `17440`/`24412` — **escenario obligatorio**.

---

### 4.11 S7-11 — Commit → ficha WB

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Panel → nombre + descripción → «Añadir etiqueta al documento» | Evento en RAM |
| 2 | **Sin** Ctrl+S todavía | Ficha WB puede no existir aún (commit RAM §1) |
| 3 | Primer guardado | Ficha + `entity` en manuscrito |
| 4 | NDJSON | `obs.rust.save_manuscript` sin error sync |

---

### 4.12 S7-12 — Renombrar evento

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Evento existente con ficha WB | — |
| 2 | Cambiar nombre del evento en barra/panel; guardar | Ficha renombrada o recreada según implementación; `entity` actualizado |
| 3 | Wikilink `[[nombre-viejo]]` en otro archivo | Actualizado a `[[nombre-nuevo]]` **o** documentar comportamiento si no auto-migra (bug → FIX) |
| 4 | Timeline / SQLite | Sin entradas huérfanas críticas |

---

### 4.13 S7-13 — Round-trip §4

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Escena con cabecera + prosa + evento cerrado con `barTags` + inline + `+++end-event` | — |
| 2 | Guardar; cerrar tab o app | — |
| 3 | Reabrir | Estructura visual = disco; segmentos = parse Rust |
| 4 | Diff (FIX-013) tras reabrir sin editar | Visor limpio / botón diff disabled |

Formato disco esperado: ejemplo en [`manuscript-design.md`](../../manuscript-design.md) §4.

---

## 5. QA residual de fixes (misma sesión M8)

Integrar en una o dos sesiones largas; no hace falta repetir si S7-xx ya cubrió el mismo gesto.

### 5.1 FIX-004 — Clic zona vacía (12 escenarios)

Plan: [`FIX-004-click-empty-focus.md`](../Fase%20B/FIX-004-click-empty-focus.md) §7.

| Grupo | IDs | Prioridad M8 |
|-------|-----|--------------|
| Clic debajo prosa / vacío | 1–6, 12 | Alta |
| Clic en texto / wikilink / panel | 7–11 | Media |
| Regresión dirty | # regresión | Alta — clic vacío **no** marca sucio |

### 5.2 FIX-005 — Whitespace (14 escenarios)

Plan: [`FIX-005-whitespace-persist.md`](../Fase%20B/FIX-005-whitespace-persist.md) §8.

Prioridad: **8.1 #1–4**, **8.2 #5–7**, **8.3 #8–10**, **8.4 #11–14**. Solapamiento con S7-06/S7-07.

### 5.3 FIX-012 — Save-all sin switch (R10–R12)

Plan: [`FIX-012-save-tab-navigation.md`](../Fase%20B/FIX-012-save-tab-navigation.md) §10.

| ID | Verificación |
|----|--------------|
| R10 | ≥3 tabs sucias; Guardar todo → **0** `obs.editor.tab.switch` en correlación save-all |
| R11 | Editar tab inactiva; cambiar tab; Guardar todo → disco = edición inactiva |
| R12 | Sync WB en batch; sin cierre tabs |

### 5.4 FIX-013 — Diff borrador (R1–R10)

Plan: [`FIX-013-dirty-diff-viewer.md`](../Fase%20B/FIX-013-dirty-diff-viewer.md) §7.

**Mínimo M8:** R1, R2, R4, R4b, R5 (evento/barTags en diff). Resto: regresión rápida si evidencia `13516` reciente.

### 5.5 FIX-010d — Edit time tags (smoke manual)

Automatizado en tests; **smoke manual** opcional en M8:

| ID | Acción |
|----|--------|
| D1 | Clic chip inline → edit → guardar |
| D2 | Clic barTag → edit → guardar |

Stale D3 completo: confiar en `fix010d-qa.test.ts` salvo sospecha de regresión.

---

## 6. Protocolo de sesión

### 6.1 Orden sugerido (minimiza resets de proyecto)

```text
1. Gate npm/cargo
2. S7-02 → S7-03 → S7-09 → S7-11 (evento + tiempos)
3. S7-05 → S7-10 (UI evento)
4. S7-06 + FIX-005 subset (whitespace)
5. S7-07 → S7-12 → S7-13 (WB + round-trip)
6. S7-01 → S7-08 (archivo + scroll)
7. S7-04 smoke + FIX-013 + FIX-012 R10–R12
8. FIX-004 bloque final (focus)
```

### 6.2 Plantilla registro (rellenar al ejecutar)

```markdown
## Sesión M8 — YYYY-MM-DD

- bootId: session-________-______
- action log: action-session-________-______ (si ④ ON)
- Proyecto: ___
- Escena principal: ___

| ID | Pass/Fail | Notas |
|----|-----------|-------|
| S7-01 | | |
| … | | |
```

### 6.3 Si falla un escenario

1. Capturar `bootId` + pasos exactos.
2. **No** marcar ítem §7 en `manuscript-design.md`.
3. Abrir entrada en [`fix-backlog.md`](../../fix-backlog.md) o hotfix acotado.
4. Tras fix: re-ejecutar **solo** escenarios afectados + regresión vecina.
5. Actualizar tabla §8 de este plan.

---

## 7. Criterios de cierre M8

| # | Criterio | Evidencia |
|---|----------|-----------|
| C1 | 13/13 ítems §7 `[x]` en `manuscript-design.md` | Diff doc |
| C2 | FIX-004 §7 y FIX-005 §8 recorridos o equivalente vía S7-xx | Tabla §8 |
| C3 | FIX-012 R10–R12 OK o NDJSON adjunto | `switchCount === 0` |
| C4 | Toggle OFF (S7-10) verificado en Tauri | OBS o nota sesión |
| C5 | `npm test` + `cargo test` verdes post-QA | Salida terminal |
| C6 | Este plan §8 completo + estado ✅ | Commit docs o nota fecha |
| C7 | [`implementation-plan.md`](../../implementation-plan.md) ERAII-002 → ✅ | Registro changelog plan |

**Desbloquea:** ERAII-003 (v0.10.0) · § Afinado final opcional en paralelo (no bloqueante para M8).

---

## 8. Registro de ejecución

### Sesión M8 — 2026-06-11 (bloque 1 parcial)

- **Escena:** `Manuscrito/Volumen 1/Capitulo 1/maoa.md`
- **bootId trabajo:** `1781740703716-5608` (+ action `5608`)
- **bootId reinicio:** `1781740884506-22856` (+ action `22856`)
- **Veredicto global:** ✅ **Cerrado** — smoke suficiente; ítems ⬜ movidos a [`manuscript-roadmap.md`](../../manuscript-roadmap.md) § Afinado final

| ID | Fecha | bootId / notas | Resultado |
|----|-------|----------------|-----------|
| **Gate** | 2026-06-11 | `npm test` 203/203 · `cargo test` 176/176 · `npm run build` OK | ✅ |
| S7-01 | | title ↔ rename — sin evidencia en logs | ⬜ |
| S7-02 | 2026-06-11 | `5608`: crea `eventoSinChips.md`; saves `touchedEntityPaths` sin barTags time; timeline visitado (`5608` action) | ✅* |
| S7-03 | | staging cancel/confirm — sin evento time en logs | ⬜ |
| S7-04 | | `22856`: `draftCount:0` al restore (no prueba borrador sucio) | ⬜ |
| S7-05 | 2026-06-11 | `5608`: `segmentCount` 5→2→1; `label.commit` null + seg 0; 4× save ok | ✅* |
| S7-06 | | Shift+Enter — sin evidencia | ⬜ |
| S7-07 | 2026-06-11 | `5608`: evento nuevo + save ok + ficha WB (`eventoSinChips`, `eventoTest2`) | ✅* |
| S7-08 | | scroll tras guardar — sin evidencia | ⬜ |
| S7-09 | | tiempo inline — sin `insertTimeTag` / commit time en action log | ⬜ |
| S7-10 | 2026-06-11 | `22856` action: `sidePanelTab` `inlineTags` ON→OFF ×2 tras reinicio; save ok post-toggle | ✅* |
| S7-11 | 2026-06-11 | `5608`: FS create `eventoSinChips.md` **antes** del primer save | ✅ |
| S7-12 | | renombrar evento — sin evidencia | ⬜ |
| S7-13 | 2026-06-11 | `22856`: restore 2 tabs, `maoa.md` activo, save ok, `issueCount:0` | ✅* |
| FIX-004 | | | ⬜ |
| FIX-005 | | | ⬜ |
| FIX-012 R10–R12 | | solo Ctrl+S (`scope:file`); sin save-all | ⬜ |
| FIX-013 R1–R5 | | sin `obs.editor.diff.*` en sesión | ⬜ |

\* Pass **inferido** desde OBS — confirma visualmente si algo no cuadra en UI/disco.

#### Evidencia clave (`5608`)

| Evento | Lectura |
|--------|---------|
| `obs.editor.label.commit` ×2 | Commit evento (seg null → seg 0) |
| FS `eventoSinChips.md` create | Ficha WB evento sin chips |
| `save.end` ×3 `ok:true` | Guardado manual estable |
| `segmentCount` 5 → 2 → 1 | Colapso/resegmentación (`[-]`) |
| `obs.action.workspace.viewChange` → timeline | Inspección timeline post-evento |
| `issueCount:0` | Sin issues consistencia |

#### Evidencia clave (`22856` — reinicio)

| Evento | Lectura |
|--------|---------|
| `obs.editor.session.restore` | `tabCount:2`, `draftCount:0`, activo `maoa.md` |
| `sidePanelTab` `inlineTags` visible true/false ×2 | Toggle etiquetas (S7-10) |
| `save.end` `ok:true` | Round-trip post-reinicio |

#### Gaps / observaciones

- **S7-03 / S7-09:** no hay acciones de tiempo en action log (afinado OBS `insertTimeTag` sigue pendiente).
- **S7-04:** restore limpio — no demuestra borrador sucio al cerrar (revalidar FIX-007 en sesión dedicada).
- **segmentCount FE vs Rust:** en un save FE=5 / Rust=5; en otros FE≠Rust al expand — conocido post-M7; todos `ok:true`.
- **FIX-012 R10–R12:** requiere sesión con ≥3 tabs sucias + Guardar todo.

---

## 9. Fuera de alcance M8

| Tema | Dónde |
|------|-------|
| Borrado dead code Lexical legacy | [`manuscript-roadmap.md`](../../manuscript-roadmap.md) § Afinado final |
| Tests unitarios helpers M7 | Idem |
| FIX-011 eventos WB huérfanos | Post-WB |
| MAP-* / calendario 010i | Era III |
| `obs.action.insertTimeTag` en action log | Afinado OBS |

---

## 10. Relación con otros documentos

| Documento | Acción al cerrar M8 |
|-----------|---------------------|
| [`manuscript-design.md`](../../manuscript-design.md) §7 | Marcar `[x]` ítems pasados |
| [`04-TASK.md`](../../../04-TASK.md) § II.5.1 | Marcar checklist + histórico |
| [`manuscript-roadmap.md`](../../manuscript-roadmap.md) M8 | ✅ |
| [`03-ROADMAP.md`](../../../03-ROADMAP.md) | Era II pendiente hasta ERAII-003 |
| [`ERAII-001-single-model-manuscript.md`](ERAII-001-single-model-manuscript.md) | Referencia smoke previo |
