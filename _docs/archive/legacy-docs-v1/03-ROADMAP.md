# 🗺️ Roadmap y Planificación de Entregables — NarraLith

## 📖 Propósito de este Documento
Este archivo es la "brújula" del proyecto. Define la planificación a nivel macro (estratégico), dividiendo el desarrollo completo de NarraLith en **Fases** y **Entregables**.

Todo el contenido se estructura desde las bases arquitectónicas hasta las características secundarias, ordenando los entregables desde el **más crítico** (lo que hace que la app exista y funcione) hasta el **menos crítico** (mejoras visuales, QoL, plugins).

**Principios de construcción:**
- Nada se construye dos veces. Cada capa asume que la anterior está sólida.
- Cero God Objects. Cada entregable produce módulos con una sola responsabilidad.
- Las piezas fundacionales (filesystem, parser, SQLite) se diseñan para durar toda la vida del proyecto.
- El motor de referencias cruzadas se construye antes que cualquier feature que lo consuma.

---

## 🏗️ Guía de Estructuración del Roadmap

### 🚀 Fase [N]: [Nombre]
> **Objetivo:** Descripción de lo que se logra y por qué es fundamental.

#### Entregable N.X: [Nombre]
- **Prioridad:** [Crítica | Alta | Media | Baja]
- **Descripción:** Qué se construye.
- **Componentes Clave:**
  - Frontend (React): ...
  - Backend (Rust/Tauri): ...
  - Almacenamiento (SQLite/FS): ...
- **Criterios de Aceptación:**
  - [ ] Condición 1
  - [ ] Condición 2

---

## 🛤️ ROADMAP DE DESARROLLO

---

### 🚀 Fase 0: Cimientos del Proyecto (Scaffolding y Contratos) — ✅ Completada (v0.1.0)

> **Objetivo:** Antes de escribir una sola línea de lógica de negocio, establecer la estructura inamovible del proyecto: el monorepo, los contratos de datos, el sistema de i18n, y las convenciones de código que todo lo demás va a respetar. Esta fase no produce features visibles. Produce la base que evita reescribir todo después.

#### Entregable 0.1: Scaffolding del Proyecto Tauri + React
- **Prioridad:** Crítica
- **Descripción:** Inicializar el proyecto Tauri con React + Vite. Configurar ESLint, Prettier, y la estructura de carpetas del monorepo desde el día cero. Definir la separación estricta entre `/src` (frontend) y `/src-tauri` (backend Rust).
- **Componentes Clave:**
  - Frontend (React): Estructura base de carpetas (`/components`, `/stores`, `/hooks`, `/modules`, `/i18n`, `/lib`). Configuración de paths absolutos en Vite.
  - Backend (Rust/Tauri): Estructura de comandos Tauri (`/commands`, `/models`, `/db`, `/fs`, `/git`). Cada módulo Rust en su propio archivo desde el inicio.
  - Almacenamiento: Ninguno aún.
- **Criterios de Aceptación:**
  - [x] `npm run tauri dev` levanta la app sin errores.
  - [x] ESLint y Prettier configurados y funcionando en pre-commit.
  - [x] Ningún archivo de más de 300 líneas en la estructura inicial.
  - [x] `06-ARCHITECTURE.md` creado con el mapa inicial de carpetas.

---

#### Entregable 0.2: Sistema de Internacionalización (i18n) — Día Cero
- **Prioridad:** Crítica
- **Descripción:** Configurar el sistema i18n antes de que exista cualquier texto en la UI. Cero strings hardcodeados en toda la vida del proyecto. El idioma de desarrollo es Español; el idioma del build de producción es Inglés.
- **Componentes Clave:**
  - Frontend (React): Integración de `react-i18next`. Diccionarios base en `/i18n/es/` y `/i18n/en/`. Alias de traducción para todos los módulos futuros.
  - Backend (Rust/Tauri): Los mensajes de error que lleguen al frontend vía IPC también deben ser claves i18n, no strings en crudo.
  - Almacenamiento: Ninguno.
- **Criterios de Aceptación:**
  - [x] Ningún texto visible en la UI está hardcodeado directamente en JSX.
  - [x] Cambiar el locale de `es` a `en` en config actualiza todos los textos visibles.
  - [x] Estructura de diccionarios separada por módulo (ej. `editor.json`, `worldbuilding.json`).

---

#### Entregable 0.3: Contratos de Datos y Esquema SQLite Base
- **Prioridad:** Crítica
- **Descripción:** Definir los tipos TypeScript y las structs Rust que representan todas las entidades del sistema (Proyecto, Entidad, Bloque, Referencia, Nodo de Grafo). Diseñar el esquema SQLite completo antes de implementar una sola query. Esto es el contrato que une el frontend con el backend para toda la vida del proyecto.
- **Componentes Clave:**
  - Frontend (React): Tipos TypeScript en `/lib/types/` para todas las entidades (`Project`, `Entity`, `Block`, `WikiLink`, `TimeMarker`, `GraphNode`).
  - Backend (Rust/Tauri): Structs Rust equivalentes con `serde` para serialización IPC. Módulo `/models/` separado del módulo `/commands/`.
  - Almacenamiento (SQLite): Esquema completo definido: tablas `entities`, `wiki_links`, `backlinks`, `blocks`, `time_markers`, `graph_edges`, `project_meta`. Migraciones versionadas desde el día 1.
- **Criterios de Aceptación:**
  - [x] Tipos TS y structs Rust definidos para todas las entidades del `01-REQUIREMENTS.md`.
  - [x] Esquema SQLite con migraciones versionadas funcionales.
  - [x] Cero discrepancias entre los tipos TS y las structs Rust en los contratos IPC.
  - [x] Documento de esquema incluido en `06-ARCHITECTURE.md`.

---

### 🚀 Fase 1: Motor de Filesystem y Gestión de Proyectos — ✅ Completada (v0.2.0)

> **Objetivo:** El corazón del sistema. Rust lee, escribe, observa y reconcilia el filesystem. El frontend puede crear proyectos y navegar su estructura. Al final de esta fase, el usuario puede crear un proyecto, ver su árbol de carpetas, y el sistema mantiene SQLite sincronizado con el disco en todo momento.

#### Entregable 1.1: Gestor de Proyectos (Crear / Abrir / Cerrar)
- **Prioridad:** Crítica
- **Descripción:** Pantalla de inicio (no un proyecto vacío automático). El usuario crea un proyecto eligiendo un nombre y una ubicación en disco. Esto inicializa la estructura de carpetas base, el SQLite aislado (`.narralith/index.db`), y el repositorio Git oculto (`.git/`). Al cerrar, la conexión SQLite se destruye limpiamente.
- **Componentes Clave:**
  - Frontend (React): Componente `ProjectLauncher` (pantalla de inicio). Store Zustand `useProjectStore` con estado de proyecto activo.
  - Backend (Rust/Tauri): Comando `create_project(name, path, template)` que genera el árbol de carpetas, inicializa SQLite y llama a `git2` para `git init`. Comando `open_project(path)` y `close_project()`.
  - Almacenamiento (SQLite/FS): Creación de `.narralith/index.db`. Inserción de `project_meta` inicial. Generación del árbol de carpetas base en disco.
- **Criterios de Aceptación:**
  - [x] Crear un proyecto genera la estructura de carpetas correcta en disco.
  - [x] Cada proyecto tiene su propio `.narralith/index.db` aislado.
  - [x] Abrir un proyecto conecta a su SQLite; cerrar destruye la conexión antes de continuar.
  - [x] El repositorio `.git/` se inicializa oculto dentro del directorio del proyecto.
  - [x] La pantalla de inicio no genera nada automáticamente sin acción del usuario.

---

#### Entregable 1.2: Watcher de Filesystem y Reconciliación de Estado
- **Prioridad:** Crítica
- **Descripción:** Rust observa el directorio del proyecto en tiempo real. Si el usuario mueve, renombra o elimina un archivo desde fuera de la app (ej. explorador de Windows), el sistema detecta el cambio y reconcilia SQLite. El archivo físico siempre gana sobre la caché.
- **Componentes Clave:**
  - Frontend (React): Listener de eventos Tauri que actualiza el store del explorador cuando Rust emite cambios.
  - Backend (Rust/Tauri): Módulo `fs_watcher` usando `notify` crate. Lógica de reconciliación: detectar si el cambio fue rename, delete o create; actualizar SQLite en consecuencia; emitir evento al frontend. Manejo de nodos fantasma (referencias a archivos eliminados).
  - Almacenamiento (SQLite): Updates a tabla `entities` cuando se detectan cambios externos.
- **Criterios de Aceptación:**
  - [x] Renombrar un archivo desde el explorador del OS actualiza el árbol en la UI en menos de 500ms.
  - [x] Eliminar un archivo externamente marca sus backlinks como "nodo fantasma" en SQLite, no los borra silenciosamente.
  - [x] El archivo físico siempre gana sobre SQLite en caso de contradicción.
  - [x] El watcher no consume CPU notable cuando no hay cambios.

---

#### Entregable 1.3: Explorador de Archivos (UI del Árbol)
- **Prioridad:** Crítica
- **Descripción:** Panel izquierdo con el árbol de archivos del proyecto. CRUD de carpetas y archivos desde la UI. Drag & drop para reorganizar. Las carpetas tienen color según su categoría taxonómica. Las acciones de renombrar/mover se ejecutan en Rust (no en JS) para garantizar que el watcher las capture y SQLite se actualice correctamente.
- **Componentes Clave:**
  - Frontend (React): Componente `FileExplorer` con `@dnd-kit/core`. Vista de árbol recursiva. Menú contextual (clic derecho) con opciones CRUD. Store `useFileTreeStore`.
  - Backend (Rust/Tauri): Comandos `rename_file`, `move_file`, `delete_file`, `create_file`, `create_folder`. Todas las operaciones pasan por Rust, nunca directamente desde JS.
  - Almacenamiento (SQLite/FS): Cada operación en Rust actualiza SQLite después de confirmar el éxito en disco.
- **Criterios de Aceptación:**
  - [x] Crear, renombrar, mover y eliminar archivos/carpetas desde la UI.
  - [x] Drag & drop funciona para reorganizar sin perder datos.
  - [x] Las carpetas troncales tienen su color de categoría asignado.
  - [x] Ninguna operación de archivo se ejecuta desde el hilo de JS — todo pasa por comandos Tauri.
  - [x] Advertencia antes de eliminar una carpeta con contenido.

---

### 🚀 Fase 2: Parser de Texto y Motor del Editor — ✅ Completada (v0.3.0)

> **Implementación:** `05-CHANGELOG.md` (v0.3.0). Detalle paso a paso archivado en historial de git de `04-TASK.md`.

> **Objetivo:** El motor que procesa los archivos `.md` con sintaxis extendida (`+++` bloques, frontmatter YAML). Al final de esta fase, el usuario puede abrir un archivo, escribir texto, y el sistema parsea, almacena en SQLite los metadatos del bloque, y guarda limpiamente en disco. Esta es la base de todo lo que viene después (referencias, línea de tiempo, grafo).

#### Entregable 2.1: Parser de Bloques (Rust Core)
- **Prioridad:** Crítica
- **Descripción:** El módulo de parsing más crítico del sistema. Lee un archivo `.md`, divide en bloques por `+++`, extrae el frontmatter YAML de cada bloque nativamente en Rust, y genera un AST por bloque. Este módulo debe ser 100% testeado antes de integrarlo con el editor.
- **Componentes Clave:**
  - Frontend (React): Ninguno en esta etapa. El parser vive 100% en Rust.
  - Backend (Rust/Tauri): Módulo `parser/block_splitter.rs` que divide por `+++` con Regex. Módulo `parser/frontmatter.rs` que extrae YAML por bloque usando `serde_yaml`.
  - Almacenamiento (SQLite): Al parsear un archivo, los bloques y sus metadatos se insertan/actualizan en la tabla `blocks` y `time_markers`.
- **Criterios de Aceptación:**
  - [x] Un archivo con 3 bloques `+++` genera exactamente 3 objetos de bloque con sus metadatos independientes.
  - [x] Un archivo sin `+++` genera 1 bloque único (comportamiento por defecto).
  - [x] YAML malformado en un bloque lanza error descriptivo sin corromper los otros bloques.
  - [x] Tests unitarios cubriendo: archivo vacío, un bloque, múltiples bloques, YAML inválido, bloques sin frontmatter.

---

#### Entregable 2.2: Editor Lexical (WYSIWYM Core)
- **Prioridad:** Crítica
- **Descripción:** Integración del editor Lexical. El lienzo central muestra texto limpio: los `+++` y el YAML son invisibles para el usuario. Decorators de Lexical interceptan la sintaxis técnica y la ocultan en tiempo real. La barra lateral derecha muestra el inspector de metadatos del bloque activo. Autoguardado en disco cada N segundos y en eventos de riesgo.
- **Componentes Clave:**
  - Frontend (React): Componente `EditorCanvas` con Lexical. Nodo custom `BlockSeparatorNode` que renderiza `+++` como un divisor visual limpio. Plugin `MetadataPlugin` que sincroniza el bloque activo con la barra lateral derecha. Store `useEditorStore`.
  - Backend (Rust/Tauri): Comando `save_file(path, content)`. Lógica de detección de eventos de riesgo (borrado masivo) para trigger de snapshot automático.
  - Almacenamiento (FS): Escritura del archivo `.md` con la sintaxis técnica restaurada al guardar.
- **Criterios de Aceptación:**
  - [x] El usuario nunca ve `+++` ni YAML en el lienzo de escritura.
  - [x] Cambiar el bloque activo actualiza el inspector de metadatos en la barra derecha.
  - [x] El archivo en disco contiene la sintaxis técnica correcta al guardar.
  - [x] Autoguardado opcional (configurable) sin remontar el editor; guardado manual con Ctrl+S y pestañas con indicador de cambios.
  - [~] Documentos >10 000 palabras — prueba de rendimiento diferida (no bloquea la fase).

---

#### Entregable 2.3: Inspector de Metadatos (Barra Lateral Derecha)
- **Prioridad:** Alta
- **Descripción:** El panel derecho en modo editor actúa como inspector del bloque activo. El usuario edita etiquetas, marcas de tiempo y referencias desde formularios limpios. El motor traduce esos cambios silenciosamente a YAML en el archivo de fondo, sin que el usuario toque código.
- **Componentes Clave:**
  - Frontend (React): Componente `MetadataInspector`. Campos de formulario para `time`, `location`, `event`, `characters`, tags custom. Sincronización bidireccional con el store del editor.
  - Backend (Rust/Tauri): Comando `update_block_metadata(path, block_index, metadata)` que reescribe solo el frontmatter del bloque afectado sin tocar el contenido de los demás.
  - Almacenamiento (SQLite/FS): Update a tabla `blocks` y reescritura del archivo en disco.
- **Criterios de Aceptación:**
  - [x] Editar una fecha en el inspector actualiza el YAML del bloque en disco.
  - [x] Los cambios del inspector persisten vía IPC (debounce 300 ms en UI; round-trip Rust).
  - [x] Actualizar el inspector de un bloque no corrompe los metadatos de los otros bloques del mismo archivo.

---

### ✅ Fase 3: Motor de Referencias Cruzadas y Diccionario — **Completada (v0.4.0 / v0.4.1)**

> **Objetivo:** El sistema nervioso que une todo. Sin esto, las fichas son islas. Con esto, cada `[[link]]` crea una conexión bidireccional viva en SQLite que alimenta el grafo, los backlinks, el autocompletado, y el plothole checker. Esta fase se construye antes que las fichas de entidad porque las fichas lo necesitan, no al revés.

#### Entregable 3.1: Indexador de Entidades (Diccionario Interno)
- **Prioridad:** Crítica
- **Descripción:** Al crear o renombrar un archivo en el proyecto, Rust indexa su nombre y ruta en SQLite (`entities`). MiniSearch mantiene este índice en memoria para búsqueda fuzzy instantánea. Este es el diccionario que alimenta el autocompletado de `[[links]]` y la detección de menciones no vinculadas.
- **Componentes Clave:**
  - Frontend (React): Hook `useEntitySearch(query)` que consulta MiniSearch en memoria.
  - Backend (Rust/Tauri): Módulo `indexer/entity_indexer.rs`. Al detectar creación/rename de archivo, actualiza tabla `entities` en SQLite y emite evento al frontend para reindexar MiniSearch.
  - Almacenamiento (SQLite): Tabla `entities` con campos: `id`, `name`, `path`, `category`, `aliases`, `color`.
- **Criterios de Aceptación:**
  - [x] Crear un archivo lo añade al índice en menos de 100ms.
  - [ ] Búsqueda fuzzy tolera 1-2 errores ortográficos y devuelve resultados correctos (verificar manual).
  - [x] El índice se reconstruye desde SQLite al abrir un proyecto (no desde cero leyendo todos los archivos).
  - [x] MiniSearch se actualiza en memoria sin recargar la app.

---

#### Entregable 3.2: Sistema de Wiki-Links (`[[]]`, `@`, Alias)
- **Prioridad:** Crítica
- **Descripción:** Plugin Lexical que detecta `[[texto]]` en tiempo real y lo convierte en un nodo de link interactivo. Soporte para alias `[[Real|Alias]]`. El símbolo `@` invoca el menú de autocompletado. Al confirmar un link, Rust registra la referencia en SQLite (tabla `wiki_links`) y actualiza los backlinks de la entidad destino.
- **Componentes Clave:**
  - Frontend (React): Plugin Lexical `WikiLinkPlugin`. Nodo `WikiLinkNode` con renderizado destacado. Menú desplegable de autocompletado usando `useEntitySearch`. Soporte para `@` como trigger.
  - Backend (Rust/Tauri): Comando `register_wikilink(source_path, target_path, alias, block_index)` que inserta en `wiki_links` y actualiza `backlinks`.
  - Almacenamiento (SQLite): Tablas `wiki_links` y `backlinks` completamente funcionales.
- **Criterios de Aceptación:**
  - [x] Escribir `[[` abre el menú de autocompletado con fuzzy search.
  - [x] Escribir `@` hace lo mismo de forma equivalente y formatea el resultado como `[[]]`.
  - [x] `[[Real|Alias]]` muestra "Alias" en el editor pero el link apunta a "Real".
  - [x] Confirmar un link registra la relación bidireccional en SQLite.
  - [x] Links a entidades inexistentes se marcan visualmente como "no resueltos".

---

#### Entregable 3.3: Auto-Refactorización (Renombrado Global)
- **Prioridad:** Alta
- **Descripción:** Al renombrar un archivo desde la UI, Rust escanea todos los archivos del proyecto buscando `[[NombreAntiguo]]` y los reemplaza por `[[NombreNuevo]]`, actualizando también SQLite. El usuario no ve ninguno de este proceso — solo que sus links no se rompen.
- **Componentes Clave:**
  - Frontend (React): Ninguno específico. El rename en el explorador de archivos ya dispara esto automáticamente.
  - Backend (Rust/Tauri): Módulo `refactor/rename_entity.rs`. Búsqueda concurrente con Rust en todos los `.md` del proyecto. Reescritura atómica de archivos afectados. Update de `wiki_links` y `backlinks` en SQLite.
  - Almacenamiento (SQLite/FS): Update masivo de referencias en `wiki_links` y `backlinks`.
- **Criterios de Aceptación:**
  - [x] Renombrar "Príncipe William" a "Rey William" actualiza todos los `[[Príncipe William]]` en el proyecto.
  - [x] La operación es atómica: o todo se actualiza o nada (sin estados intermedios corruptos).
  - [ ] El proceso completo para un proyecto de 500 archivos tarda menos de 2 segundos (medir manual).
  - [x] SQLite queda consistente con los archivos en disco tras la operación.

---

#### Entregable 3.4: Panel de Backlinks y Menciones No Vinculadas
- **Prioridad:** Alta
- **Descripción:** La barra lateral derecha, cuando hay una entidad activa, muestra todos los archivos y párrafos que la mencionan. Además, detecta menciones de texto plano (sin corchetes) y sugiere convertirlas en links con un clic.
- **Componentes Clave:**
  - Frontend (React): Componente `BacklinksPanel` en la barra lateral derecha. Lista de menciones con fragmento de contexto y enlace para navegar. Sección "Menciones no vinculadas" con botón de conversión.
  - Backend (Rust/Tauri): Comando `get_backlinks(entity_path)` que consulta SQLite. Comando `find_unlinked_mentions(entity_name)` que hace búsqueda de texto en archivos.
  - Almacenamiento (SQLite): Consulta a tabla `backlinks`.
- **Criterios de Aceptación:**
  - [x] Al abrir una ficha de personaje, el panel muestra todos los archivos que lo mencionan.
  - [x] Las menciones no vinculadas aparecen en sección separada con opción de convertir.
  - [x] Hacer clic en un backlink navega al archivo y posición exacta de la mención (bloque; offset/snippet diferido).
  - [x] El panel se actualiza al guardar cambios en el editor.

---

### 🚀 Fase 4: Fichas de Entidad y Sistema de Worldbuilding — ✅ Completada (v0.5.0)

> **Objetivo:** El usuario puede crear y editar fichas de personajes, ubicaciones, facciones, y todas las demás entidades del worldbuilding. Estas fichas se guardan como `.md` con frontmatter YAML y se vinculan al motor de referencias de la Fase 3. Las vistas relacionales (backlinks, línea de tiempo personal) son consecuencia directa de lo ya construido.

#### Entregable 4.1: Motor de Fichas Genérico (Plantilla Base)
- **Prioridad:** Crítica
- **Descripción:** El sistema de fichas es un motor genérico de formularios dinámicos que renderiza campos según la plantilla YAML de la categoría. No es un componente por cada tipo de ficha — es un motor que lee la plantilla y genera el formulario. Esto garantiza que añadir un nuevo tipo de ficha sea solo añadir una plantilla YAML, sin tocar código.
- **Componentes Clave:**
  - Frontend (React): Componente `EntityFormRenderer` que recibe un schema de plantilla y genera el formulario dinámicamente. Store `useEntityStore`. Tipos de campo soportados: texto libre, texto corto, imagen, relación (wiki-link), fecha, select, árbol anidado.
  - Backend (Rust/Tauri): Comando `save_entity(path, frontmatter, body)`. Las plantillas de cada categoría viven en `/templates/` como archivos YAML.
  - Almacenamiento (SQLite/FS): El archivo `.md` de la entidad contiene su frontmatter completo. SQLite indexa los campos relacionales para consultas rápidas.
- **Criterios de Aceptación:**
  - [x] Añadir una nueva plantilla YAML en `/templates/` genera automáticamente el formulario correcto sin código adicional.
  - [x] Los campos de tipo "relación" abren el autocompletado de wiki-links.
  - [ ] Los campos de tipo "imagen" vinculan al directorio `/Imagenes/` correcto según categoría (diferido: input de ruta MVP).
  - [x] Guardar una ficha escribe el `.md` correcto en disco y actualiza SQLite.

---

#### Entregable 4.2: Fichas Prioritarias (Personaje, Ubicación, Lore)
- **Prioridad:** Alta
- **Descripción:** Implementar las plantillas YAML para las fichas más usadas: Personaje, Ubicación, y Evento/Lore. Son las que el usuario necesita primero y las que más consumen el motor de referencias.
- **Componentes Clave:**
  - Frontend (React): Plantillas renderizadas por `EntityFormRenderer`. Vista de "Línea de Tiempo Personal" en la ficha de Personaje (consulta a SQLite por backlinks con marca de tiempo). Vista de "Población/Personajes Notables" en Ubicación (consulta de backlinks cruzados).
  - Backend (Rust/Tauri): Comandos específicos para consultas relacionales: `get_entity_timeline(entity_path)`, `get_location_inhabitants(location_path)`.
  - Almacenamiento (SQLite): Consultas relacionales entre `entities`, `wiki_links`, `backlinks`, `time_markers`.
- **Criterios de Aceptación:**
  - [x] Ficha de Personaje muestra su línea de tiempo personal autogenerada desde backlinks con marca de tiempo.
  - [x] Ficha de Ubicación muestra los personajes/facciones que la tienen etiquetada.
  - [x] Ficha de Evento muestra involucrados y ubicación geográfica vinculados.
  - [x] Todas las fichas son modulares: el usuario puede ocultar o añadir campos.

---

#### Entregable 4.3: Fichas Secundarias (Naturaleza, Objetos, Sociedad)
- **Prioridad:** Media
- **Descripción:** Implementar las plantillas para las categorías restantes: Bioma, Bestiario, Flora, Geología, Fenómenos, Cosmología, Artefactos, Armas, Vehículos, Civilización, Política, Economía, Religión, Idiomas, Cultura Diaria. Son el mismo motor de la 4.1/4.2, solo más plantillas YAML.
- **Componentes Clave:**
  - Frontend (React): Plantillas YAML para cada subcategoría. El `EntityFormRenderer` existente las procesa sin cambios.
  - Backend (Rust/Tauri): Sin cambios al backend. Plantillas nuevas en `/templates/`.
  - Almacenamiento: Sin cambios al esquema.
- **Criterios de Aceptación:**
  - [x] Cada plantilla cubre los campos definidos en `01-REQUIREMENTS.md` para su categoría.
  - [x] El formulario de Bestiario renderiza campos de "Loot/Cosecha" con links relacionales.
  - [x] El formulario de Artefactos renderiza la bitácora cronológica de propiedad.
  - [x] Las plantillas de Idiomas incluyen la sub-interfaz de Diccionario tipo tabla clave-valor.

---

#### Entregable 4.4: Vista de Tarjetas y Explorador de Worldbuilding
- **Prioridad:** Media
- **Descripción:** La Vista de Worldbuilding muestra las carpetas como tarjetas enriquecidas, no como iconos de carpeta. Cada tarjeta muestra imagen (si tiene), nombre, descripción del `.folder.md` y count de entidades hijas. El `.folder.md` es invisible en el explorador pero procesado por el motor.
- **Componentes Clave:**
  - Frontend (React): Componente `CardView` alternativo al árbol de archivos. Toggle entre vista árbol y vista tarjetas. Componente `FolderCard`.
  - Backend (Rust/Tauri): Comando `get_folder_meta(path)` que lee `.folder.md` si existe. Comando `set_folder_description(path, content)` que crea/actualiza `.folder.md`.
  - Almacenamiento (FS): Archivos `.folder.md` ocultos en cada directorio con descripción.
- **Criterios de Aceptación:**
  - [x] Las carpetas con `.folder.md` muestran su descripción en la tarjeta.
  - [x] El `.folder.md` no aparece en el árbol de archivos del explorador.
  - [x] El toggle árbol/tarjetas funciona sin recargar la vista.

---

### 🚀 Fase 5: Control de Versiones (Git Invisible)

> **Objetivo:** El usuario tiene una red de seguridad invisible. Puede tomar snapshots manuales, el sistema hace autoguardado automático, y puede comparar versiones con diff visual. Nadie ve la palabra "commit" nunca.

#### Entregable 5.1: Snapshots Manuales e Historial
- **Prioridad:** Alta
- **Descripción:** El usuario puede tomar un "Punto de Control" con un nombre descriptivo. Internamente es un `git commit` via `git2` en Rust. El historial muestra una lista de versiones con nombre y fecha, sin terminología Git.
- **Componentes Clave:**
  - Frontend (React): Componente `VersionHistory` en la barra lateral o modal. Botón "Guardar versión" con campo de nombre. Lista de versiones anteriores con opción de restaurar.
  - Backend (Rust/Tauri): Módulo `git/snapshot.rs` usando `git2`. Comandos `create_snapshot(name)`, `list_snapshots()`, `restore_snapshot(snapshot_id)`.
  - Almacenamiento (FS/.git): El repositorio Git oculto gestiona el historial.
- **Criterios de Aceptación:**
  - [x] "Guardar versión" crea un commit con el mensaje del usuario, sin exponer terminología Git.
  - [x] El historial muestra versiones con nombre amigable y fecha.
  - [x] Restaurar una versión recupera el estado del proyecto completo.
  - [x] El `.git/` nunca es visible ni accesible desde la UI.

---

#### Entregable 5.2: Autoguardado Inteligente y Detección de Riesgo
- **Prioridad:** Alta
- **Descripción:** El sistema hace commits automáticos periódicos (cada X minutos) y detecta eventos de riesgo (borrado masivo de texto) para hacer un snapshot preventivo antes de que el usuario confirme la acción.
- **Componentes Clave:**
  - Frontend (React): Indicador visual sutil de "autoguardado" en la UI. Detección en Lexical de borrado de más de N caracteres en una operación.
  - Backend (Rust/Tauri): Timer de autoguardado en Rust. Comando `auto_snapshot()` disparado por el frontend en eventos de riesgo.
  - Almacenamiento (FS/.git): Commits automáticos con mensajes internos (no visibles al usuario en el historial principal).
- **Criterios de Aceptación:**
  - [x] El autoguardado ocurre cada 5 minutos sin interrumpir el foco del usuario.
  - [x] Borrar más de 500 caracteres en una operación dispara un snapshot preventivo antes de aplicar el cambio.
  - [x] Los snapshots automáticos tienen una retención configurable (ej. últimas 50 versiones automáticas).

---

#### Entregable 5.3: Diff View (Comparación Visual)
- **Prioridad:** Media
- **Descripción:** Al explorar el historial, el usuario puede comparar dos versiones del mismo archivo con resaltado semántico de cambios (verde/rojo por palabra, no por línea).
- **Componentes Clave:**
  - Frontend (React): Componente `DiffViewer` en vista dividida. Resaltado de palabras añadidas (verde) y eliminadas (rojo). Botón "Rescatar este fragmento" para copiar texto de la versión antigua.
  - Backend (Rust/Tauri): Comando `get_diff(path, snapshot_id_a, snapshot_id_b)` que retorna el diff word-level usando `git2`.
  - Almacenamiento (FS/.git): Lectura de blobs Git para las dos versiones.
- **Criterios de Aceptación:**
  - [x] El diff muestra cambios a nivel de palabra, no de línea completa.
  - [x] El usuario puede copiar texto de la versión antigua sin restaurar todo el archivo.
  - [x] El DiffViewer funciona para archivos de hasta 10,000 palabras sin lag (smoke test Rust &lt;5 s).

> **Estado Fase 5:** ✅ cerrada en **v0.6.0** — ver `05-CHANGELOG.md`.

---

### 🚀 Fase 6: Motor Temporal y Línea de Tiempo

> **Objetivo:** El usuario puede definir un calendario de fantasía personalizado y ver la línea de tiempo de su proyecto autogenerada desde los metadatos de los bloques. La línea de tiempo es una consecuencia de los datos ya existentes en SQLite — no hay que introducir información nueva.

> **Estado:** ✅ cerrada en **v0.7.0** — tareas en **`05-CHANGELOG.md` § v0.7.0** · arquitectura en **`06-ARCHITECTURE.md` § Fase 6**.

#### Entregable 6.1: Motor de Calendario Personalizado
- **Criterios de Aceptación:**
  - [x] El usuario puede definir un calendario con meses de longitud variable y nombre personalizado.
  - [x] El motor convierte fechas del calendario custom a timestamps BigInt comparables.
  - [x] Dos fechas de cualquier calendario custom pueden ordenarse correctamente.
  - [x] El calendario se persiste en el proyecto y se carga al abrirlo.

#### Entregable 6.2: Línea de Tiempo Interactiva Autogenerada
- **Criterios de Aceptación:**
  - [x] La línea de tiempo se genera automáticamente desde los metadatos existentes sin entrada adicional del usuario.
  - [x] Filtrar por "Personaje X" muestra solo los eventos donde aparece.
  - [x] Drill-down en "Año 3" lista todos los eventos de ese año con detalle.
  - [x] Las Escenas Paralelas aparecen visualmente diferenciadas de la narrativa principal.
  - [x] El widget mini-timeline en el inspector de metadatos muestra la posición del bloque activo.

#### Entregable 6.3: Plothole Checker
- **Criterios de Aceptación:**
  - [x] El checker corre en background sin afectar la performance del editor.
  - [x] Detecta personaje en dos ubicaciones simultáneas y reporta el conflicto con contexto.
  - [x] Ninguna alerta bloquea ni interrumpe la escritura.
  - [x] El usuario puede marcar una alerta como "intencional" para silenciarla.

---

### 🚀 Fase 7: Mapas Interactivos

> **Objetivo:** El usuario puede cargar imágenes de mapas, dibujar polígonos y pines sobre ellos, vincularlos a entidades del worldbuilding, y ver cómo el mapa evoluciona con la línea de tiempo.

> **Estado:** ✅ cerrada en **v0.8.0** — tareas en **`05-CHANGELOG.md` § v0.8.0** · arquitectura en **`06-ARCHITECTURE.md` § Fase 7**.

#### Entregable 7.1: Visor de Mapas Base (Leaflet + Capas SVG)
- **Criterios de Aceptación:**
  - [x] Cargar una imagen de mapa y navegar con zoom/pan sin lag.
  - [x] Dibujar un polígono y guardarlo persiste entre sesiones.
  - [x] El gestor de capas permite ocultar/mostrar grupos de elementos.
  - [x] Los pines y polígonos soportan vinculación a entidades (wiki-links).

#### Entregable 7.2: Mapas Anidados, Drill-down y Capas Históricas
- **Criterios de Aceptación:**
  - [x] Clicar en un área navega al mapa hijo correspondiente.
  - [x] Arrastrar el cursor de la mini-timeline actualiza los overlays visibles en tiempo real.
  - [x] La Vista de Evolución Geocronológica reproduce la historia visualmente.

#### Entregable 7.3: Bocetos a Mano Alzada (Excalidraw)
- **Criterios de Aceptación:**
  - [x] La capa de bocetos es independiente de las capas vectoriales estructuradas.
  - [x] Los bocetos persisten entre sesiones.
  - [x] Ocultar la capa de bocetos no afecta las capas de entidades.

---

### 🚀 Fase 8: Grafo de Conocimiento

> **Objetivo:** La vista del grafo renderiza las conexiones bidireccionales de SQLite de forma visual e interactiva, replicando la experiencia de Obsidian.

> **Estado:** ✅ implementada (v0.9.0) — ver **`05-CHANGELOG.md` § v0.9.0** y **`06-ARCHITECTURE.md` § Fase 8**.

#### Entregable 8.1: Grafo D3 Force-Directed
- **Prioridad:** Media
- **Descripción:** Vista de grafo con D3.js sobre Canvas. Física de repulsión, nodos proporcionales al degree, fade de no-conectados, glow en hover, colores por categoría taxonómica. Filtrado por categoría desde el panel lateral. El grafo se construye desde SQLite bajo demanda, no al arrancar.
- **Componentes Clave:**
  - Frontend (React): Módulo `GraphView` con D3 force-simulation sobre `<canvas>`. Panel de filtros por categoría. Interacciones: hover, click, drag, zoom, pan.
  - Backend (Rust/Tauri): Comando `get_graph_data(filters)` que consulta `graph_edges` desde SQLite.
  - Almacenamiento (SQLite): Tabla `graph_edges` con nodos y aristas precalculados.
- **Criterios de Aceptación:**
  - [x] El grafo replica visualmente la estética de Obsidian (fondo negro, glow, fade, nodos proporcionales).
  - [x] Hover en un nodo atenúa todos los no-conectados a ~20% de opacidad.
  - [x] Filtrar por "Solo Personajes y Facciones" oculta el resto de nodos.
  - [x] El grafo con 500 nodos no congela la UI (objetivo MVP; benchmark manual pendiente en proyectos grandes).
  - [x] Hacer clic en un nodo navega a la ficha correspondiente.

---

### 🚀 Fase 9: Motor de Exportación

> **Objetivo:** El usuario puede exportar su trabajo en los formatos relevantes para cada audiencia: manuscrito para editoriales, worldbuilding como wiki, datos como JSON para game devs.

#### Entregable 9.1: Exportación de Manuscrito (DOCX, PDF, EPUB)
- **Prioridad:** Alta
- **Descripción:** El motor compila `/Manuscrito` en orden jerárquico (Volumen > Capítulo > Escena), elimina toda sintaxis técnica (`+++`, YAML), y genera el documento limpio. Excluye automáticamente `/Manuscrito/Escenas_Paralelas`. Soporte para glosario autogenerado desde wiki-links.
- **Componentes Clave:**
  - Frontend (React): UI de exportación con opciones (formato, incluir glosario, incluir apéndice).
  - Backend (Rust/Tauri): Pipeline de compilación en Rust: lee archivos en orden, elimina sintaxis técnica, entrega contenido limpio al frontend. Librerías JS (`docx`, `@react-pdf/renderer`, `JSZip`+HTML para EPUB) ensamblan el formato final.
  - Almacenamiento: Lectura del FS. Sin cambios a SQLite.
- **Criterios de Aceptación:**
  - [ ] El DOCX exportado no contiene ningún `+++`, YAML, ni wiki-link sin resolver.
  - [ ] `/Manuscrito/Escenas_Paralelas` está siempre excluido de exportaciones editoriales.
  - [ ] El glosario incluye todas las entidades mencionadas con `[[]]` en el manuscrito.
  - [ ] El orden del documento respeta la jerarquía de carpetas, no los timestamps.

---

#### Entregable 9.2: Wiki HTML y Exportación para Game Devs
- **Prioridad:** Media
- **Descripción:** Exportar `/Worldbuilding` como un mini-sitio web estático navegable offline. Pipeline Rust que toma los ASTs de remark, genera HTML con CSS embebido y preserva los links cruzados como hrefs relativos. Exportación JSON del diccionario interno y grafo para Unity/Unreal/Godot.
- **Componentes Clave:**
  - Frontend (React): UI de opciones de exportación avanzada.
  - Backend (Rust/Tauri): Pipeline `wiki_exporter.rs` que genera el sitio estático. Serialización del grafo SQLite a JSON.
  - Almacenamiento: Lectura de FS y SQLite. Output en directorio elegido por el usuario.
- **Criterios de Aceptación:**
  - [ ] El Wiki HTML abre en cualquier navegador sin servidor, sin internet, sin instalar nada.
  - [ ] Los links cruzados entre entidades funcionan como hrefs relativos en el Wiki.
  - [ ] El JSON exportado para Game Devs contiene el grafo completo de relaciones con metadata.

---

#### Entregable 9.3: Empaquetado Total del Proyecto (ZIP)
- **Prioridad:** Media
- **Descripción:** Exportar el proyecto íntegro como `.zip`. El usuario elige si incluir el historial Git (más pesado) o solo el estado actual (Clean Export). La compresión la hace Rust.
- **Componentes Clave:**
  - Frontend (React): Modal de exportación con toggle "Incluir historial de versiones".
  - Backend (Rust/Tauri): Módulo `exporter/zip_project.rs`. Compresión nativa en Rust. Exclusión condicional de `.git/`.
  - Almacenamiento: Lectura del FS completo del proyecto.
- **Criterios de Aceptación:**
  - [ ] El ZIP con Clean Export contiene solo `.md`, imágenes, `.narralith/` (sin `.git/`).
  - [ ] El ZIP con historial incluye `.git/` completo y permite restaurar versiones en otra máquina.
  - [ ] La compresión de un proyecto de 1GB tarda menos de 30 segundos.

---

### 🚀 Fase 10: QoL, Dashboard y Modo Concentración

> **Objetivo:** Las features que hacen la herramienta placentera de usar a diario. Nada de esto es crítico para que el sistema funcione — todo es para que el escritor quiera abrirla cada mañana.

#### Entregable 10.1: Modo Concentración (Focus Mode)
- **Prioridad:** Media
- **Descripción:** Pantalla completa con paneles colapsados, typewriter scrolling, Pomodoro integrado, y paisajes sonoros con Howler.js. El usuario configura qué elementos mínimos permanecen visibles.
- **Criterios de Aceptación:**
  - [ ] Activar Focus Mode colapsa todos los paneles con animación Framer Motion.
  - [ ] Typewriter scrolling mantiene la línea activa centrada verticalmente.
  - [ ] El Pomodoro notifica con sonido/visual sin interrumpir la escritura.
  - [ ] Los ambient sounds hacen loop sin clicks ni silencios.

---

#### Entregable 10.2: Dashboard de Estadísticas y Metas
- **Prioridad:** Baja
- **Descripción:** Módulo de analytics: conteo de palabras granular (calculado en Rust), heatmap de escritura diaria (desde historial Git), análisis de screen time por personaje, análisis de ritmo por capítulo, ratio diálogo/narración. Gestor de metas y plazos.
- **Criterios de Aceptación:**
  - [ ] El conteo de palabras es calculado por Rust, no por JS.
  - [ ] El heatmap refleja los días con commits en el repositorio Git del proyecto.
  - [ ] El análisis de screen time usa el motor de backlinks existente sin cálculo adicional.
  - [ ] Las metas y plazos se guardan en `.narralith/goals.json` por proyecto.

---

#### Entregable 10.3: Personalización Visual y Accesibilidad
- **Prioridad:** Baja
- **Descripción:** Panel de configuración de temas (oscuro base, selector de acento), editor de colores de categorías, selección de fuente, tamaño de fuente, toggle de fuente para dislexia (OpenDyslexic).
- **Criterios de Aceptación:**
  - [ ] Cambiar el color de acento actualiza todos los elementos interactivos de la UI.
  - [ ] Cambiar el color de una categoría actualiza el explorador, tarjetas y grafo simultáneamente.
  - [ ] OpenDyslexic carga offline, sin llamadas a CDN externas.

---

### 🚀 Fase 11: Ecosistema de Plugins

> **Objetivo:** La arquitectura permite que la comunidad extienda NarraLith sin comprometer la seguridad ni los datos del usuario.

#### Entregable 11.1: API de Plugins y Sandbox
- **Prioridad:** Baja
- **Descripción:** Exponer una API controlada via `window.NarraLith`. Los plugins corren en Web Workers aislados. Tauri gestiona los permisos de acceso al filesystem de cada plugin. El usuario instala plugins desde una carpeta local, no desde un marketplace externo.
- **Criterios de Aceptación:**
  - [ ] Un plugin de terceros puede leer el índice de entidades vía API pero no acceder directamente al SQLite.
  - [ ] Un plugin malicioso no puede escribir fuera del directorio del proyecto.
  - [ ] Los plugins se cargan sin reiniciar la app.

---

### 🚀 Fase 12: Colaboración P2P (Futuro)

> **Objetivo:** Co-escritura en tiempo real sin servidores, sin nubes, sin intermediarios. Esta fase es la más compleja del proyecto y requiere que todo lo anterior esté estable.

#### Entregable 12.1: Infraestructura CRDT-Ready
- **Prioridad:** Baja (Futuro)
- **Descripción:** Integración de Yjs con Lexical para que el AST del editor sea CRDT-compatible. El SQLite local de cada cliente se actualiza desde los archivos sincronizados, no desde la red. Descubrimiento en LAN vía mDNS. Conexión remota vía WebRTC con E2EE. Permisos granulares por carpeta.
- **Criterios de Aceptación:**
  - [ ] Dos instancias en la misma LAN se descubren automáticamente.
  - [ ] Editar el mismo párrafo desde dos clientes desconectados y sincronizar no produce corrupción.
  - [ ] El SQLite nunca viaja por la red — solo los diffs de archivos `.md`.
  - [ ] El host puede otorgar permisos de solo lectura a colaboradores en carpetas específicas.

---

## 📊 Resumen de Fases

| Fase | Nombre | Prioridad Global |
|------|--------|-----------------|
| 0 | Cimientos (Scaffolding, i18n, Contratos) | Crítica |
| 1 | Motor de Filesystem y Proyectos | Crítica |
| 2 | Parser de Texto y Editor | Crítica |
| 3 | Referencias Cruzadas y Diccionario | Crítica |
| 4 | Fichas de Entidad y Worldbuilding | Alta |
| 5 | Control de Versiones (Git Invisible) | Alta |
| 6 | Motor Temporal y Línea de Tiempo | Alta |
| 7 | Mapas Interactivos | Media-Alta |
| 8 | Grafo de Conocimiento | Media |
| 9 | Motor de Exportación | Alta |
| 10 | QoL, Dashboard, Focus Mode | Media-Baja |
| 11 | Ecosistema de Plugins | Baja |
| 12 | Colaboración P2P | Futuro |
