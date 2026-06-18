# Guías de desarrollo e instrucciones para LLMs

Directrices para asistentes de IA y desarrolladores. Evitar alucinaciones, degradación del código y violaciones del stack.

**Documentación vigente:** carpeta `_docs/` (no `_docs/`).

---

## Reglas fundamentales

### 1. Contexto primero

- **No** asumir estructura ni rutas. Consultar `06-ARCHITECTURE.md` o explorar el repo.
- Antes de modificar código, verificar dependencias en todo el stack.
- Para manuscrito: leer `specs/manuscript-design.md` antes de tocar parser o editor.

### 2. Tech stack

- Respetar `02-TECH_STACK.md`.
- **Prohibido:** I/O masivo o parseo pesado en el hilo de React — va en Rust vía IPC.
- **Prohibido:** dependencias con licencias restrictivas (BSL). Preferir MIT/Apache.

### 3. Ejecución de tareas

- El código deriva de una tarea en `04-TASK.md` (fase activa del roadmap).
- Soluciones **completas** y **modulares**; sin placeholders ni `catch` vacíos.
- Archivos nuevos: marcar `[NUEVO]` en la tarea antes de implementar.
- **Un entregable por sesión** cuando el roadmap lo indique — no mezclar manuscrito con mapas/Git.

### 4. Pipeline documental

1. Trabajar según `04-TASK.md`.
2. Probar: `npm run tauri dev`, `cargo test`, `npm test`.
3. Al cerrar: entrada en `05-CHANGELOG.md`; marcar fase en `03-ROADMAP.md`.
4. Nuevo módulo estructural → actualizar `06-ARCHITECTURE.md`.

### 5. Builds limpios

- `_docs/`, `_docs/` y artefactos de IA fuera del binario (`.taurignore`).

### 6. Calidad de código

- Modularidad — sin God Objects.
- **i18n obligatorio** — sin strings hardcodeados en UI. Prod: inglés; dev: español.
- Comentarios solo donde la lógica no sea obvia (reglas de negocio, IPC, invariantes).
- **FS prevalece** sobre SQLite en conflictos.
- **100% offline** para el núcleo.

### 7. Era II — reglas extra (manuscrito)

- Un solo modelo en memoria: `ParsedManuscript` (eliminar adaptador `ParsedDocument` en flujo activo).
- No montar UI sin IPC funcional (anti-patrón: `VersionHistoryPanel`).
- No parchear formato `+++` legacy — no hay proyectos legacy.
- Congelar mapas, grafo re-validación, Git snapshots hasta checklist MVP en `specs/manuscript-design.md` §7.

---

> Si un requerimiento del usuario contradice estas reglas o `01-REQUIREMENTS.md`, advertir antes de implementar.
