# Stack tecnológico — NarraLith

Stack **real** del repositorio (jun 2026). Planificación inicial y justificaciones largas: [`archive/legacy-docs-v1/02-TECH_STACK.md`](archive/legacy-docs-v1/02-TECH_STACK.md).

---

## 1. Core de escritorio

| Tecnología | Versión / notas | Uso |
|------------|-----------------|-----|
| **Tauri** | 2.x | Shell, IPC, empaquetado |
| **Rust** | ed. 2021 | Backend, I/O, parser, SQLite |
| **React** | 19.x | UI |
| **Vite** | 7.x | Bundler frontend |
| **TypeScript** | ~5.8 | Tipos compartidos con IPC |

**Justificación:** Tauri + Rust para I/O y parseo sin bloquear la UI; React + Lexical para el editor.

---

## 2. Frontend — UI y estado

| Tecnología | Uso en el repo |
|------------|----------------|
| **Tailwind CSS** + **Shadcn/UI** | Componentes y tema |
| **Zustand** | Stores globales (`useEditorStore`, `useProjectStore`, …) |
| **Lucide React** | Iconos |
| **react-i18next** | i18n (`src/i18n/`) — dev `es`, prod fallback `en` |
| **@dnd-kit** | Drag & drop en explorador |

**No instalado aún** (mencionado en plan original): Framer Motion, Recharts, Howler.js.

---

## 3. Editor de manuscrito (WYSIWYM)

| Tecnología | Uso |
|------------|-----|
| **Lexical** 0.44 | Editor rich text |
| Nodos custom | `EventTagBarNode`, `EventFrameBottomNode`, `InlineTimeTagNode`, `WikiLinkNode` |
| Plugins custom | Hydrate/extract por segmentos, contexto de evento, inline tags, wikilinks |

El usuario **no** edita `+++event` ni YAML en el lienzo. El panel lateral y el staging en RAM traducen a disco al guardar manualmente.

**Legacy en código (pendiente de eliminar):** `BlockSeparatorNode`, `BlockMetadataNode` registrados pero no hidratados.

---

## 4. Parser y formato en disco (Rust)

| Componente | Implementación |
|------------|----------------|
| Split manuscrito | `regex` — `+++event` / `+++end-event` + prosa libre |
| Frontmatter | `serde_yaml` por segmento |
| Tokens inline | `{{type:value}}` — `inline_scanner.rs` (offsets UTF-8) |
| Wikilinks en cuerpo | `wikilink/scanner.rs` |
| Serialización | `serializer.rs` — round-trip §1.4 |

**No se usa** `pulldown-cmark` en el parser de edición. El Markdown del manuscrito se trata como texto estructurado por segmentos, no como AST CommonMark completo.

**Formato legacy** (`+++` genérico por bloque): código de compatibilidad en Rust; **no** es el formato objetivo del producto (sin proyectos legacy en circulación).

---

## 5. Base de datos y caché

| Tecnología | Uso |
|------------|-----|
| **rusqlite** (bundled) | `.narralith/index.db` por proyecto |
| Migraciones versionadas | Schema v5 — `time_markers` multi-marca (`segment_id`, `tag_kind`, `char_offset`) |

**Nota:** El plan original citaba `tauri-plugin-sql`; el proyecto usa **rusqlite directo** en `db/connection.rs`.

Tablas principales: `blocks`, `time_markers`, `wiki_links`, `entities`, `graph_edges`, …

**Fuente de verdad:** archivos `.md` en disco. SQLite es índice; en conflicto gana el archivo.

---

## 6. Calendario y línea de tiempo

| Capa | Tecnología |
|------|------------|
| Lógica de fechas ficticias | TypeScript custom (`src/lib/calendar/`) — sin `date-fns`/`moment` para el calendario narrativo |
| Config calendario proyecto | JSON en FS + comandos IPC `calendar/*` |
| Timeline agregada | Rust `timeline/project.rs` lee `time_markers` |
| Vista timeline UI | React (`modules/timeline/`) |
| Plothole | Rust `checker/plothole.rs` |

Las marcas de tiempo del manuscrito vienen de `barTags` (origen) y `{{time:…}}` inline (evolución), indexadas en SQLite.

---

## 7. Worldbuilding y referencias

| Área | Stack |
|------|-------|
| Fichas entidad | Un frontmatter YAML por `.md` — `entity/document.rs` |
| Plantillas | YAML en `src-tauri/resources/entity_templates/` |
| Taxonomía carpetas | `taxonomy.json` + inferencia en `fs/indexer.rs` |
| Wikilinks `[[ ]]` | Scanner Rust + nodos Lexical + refactor en rename |
| Búsqueda entidades | **MiniSearch** (`src/lib/search/`) |
| Backlinks / menciones | IPC `references/*` |

Eventos de escena: carpeta **`Worldbuilding/Eventos/`**, plantilla `event.yaml`, categoría `Event`.

---

## 8. Mapas y grafo

| Tecnología | Estado |
|------------|--------|
| **Leaflet** + **react-leaflet** | Mapas — 🟡 implementación amplia, **congelada** |
| **Excalidraw** | Bocetos en mapas — 🟡 |
| **D3** | Grafo force en canvas — 🟡 |

No depender de estas áreas hasta cerrar el manuscrito.

---

## 9. Control de versiones (Git)

| Pieza | Estado |
|-------|--------|
| `git2` en Cargo.toml | Dependencia declarada |
| `git/init.rs` | ✅ `git init` al crear/adoptar proyecto |
| `git/snapshot.rs`, `git/diff.rs` | Existen en disco, **no compilados** |
| IPC snapshots | **No registrado** |
| UI `VersionHistoryPanel` | Montada — 🟡 rota |

---

## 10. Herramientas de desarrollo

| Herramienta | Uso |
|-------------|-----|
| ESLint + Prettier | Lint y formato |
| Vitest | Tests frontend (`npm test`) |
| `cargo test` | Tests Rust (144+ en lib) |
| Husky + lint-staged | Pre-commit |

---

## 11. Aspiracional (plan original, sin implementar)

Reservado para fases futuras; **no** asumir que existe en el repo:

- Motor de exportación (DOCX, PDF, EPUB, Wiki HTML)
- `unified` / `remark` para exportación
- Co-escritura **Yjs** + WebRTC
- Plugins comunidad + Web Workers
- Dashboard analíticas (Recharts)
- Modo concentración (Framer Motion, Howler)
- Paisajes sonoros, Pomodoro, heatmaps de hábitos

---

## 12. Reglas técnicas (invariantes)

1. **Offline-first** — sin nube obligatoria; núcleo 100% local.
2. **Soberanía de datos** — proyecto = carpeta + `.md` legibles + `.narralith/index.db` aislada.
3. **FS prevalece** sobre SQLite en conflictos.
4. **I/O y parseo pesado en Rust** — no en el hilo principal de React.
5. **IPC tipado** — contratos en `src/lib/types/` y `src-tauri/src/parser/types.rs`.
6. **i18n** — sin strings hardcodeados en UI.
7. **Licencias permisivas** — MIT/Apache preferidas; **evitar BSL** y stacks con muro de pago (ej. Excalidraw ✅ vs Tldraw BSL ❌ — ver [`archive/legacy-docs-v1/02-TECH_STACK.md`](archive/legacy-docs-v1/02-TECH_STACK.md) §6).

Flujo de trabajo: [`README.md`](README.md).
