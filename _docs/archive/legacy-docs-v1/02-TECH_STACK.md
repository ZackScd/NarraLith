# Stack Tecnológico - NarraLith

Este documento define el stack tecnológico oficial para el desarrollo de NarraLith. Las tecnologías seleccionadas responden directamente a los requerimientos definidos en `PLANIFICACION.md`, priorizando el rendimiento, la arquitectura *offline-first*, la ausencia de dependencias comerciales (sin muros de pago) y la soberanía total de los datos.

## 1. Core y Entorno de Escritorio
- **Tecnología:** Tauri (Rust + TypeScript/React).
- **Propósito:** Actuar como el motor base de la aplicación de escritorio y gestor del sistema de archivos local.
- **Justificación:** A diferencia de Electron, que empaqueta todo un entorno Chromium consumiendo considerables recursos, Tauri emplea el WebView nativo del sistema operativo. Esto resulta en binarios ultraligeros (<15MB) y un consumo mínimo de RAM. El backend en Rust asegura operaciones I/O masivas (lectura e indexación de manuscritos) con latencia cercana a cero.

## 2. Frontend y UI
- **Tecnologías:** React.js (Vite), Tailwind CSS, Shadcn/UI, Lucide React (Iconos), Framer Motion (Animaciones), Zustand (Gestión de Estado).
- **Propósito:** Construir la interfaz de usuario interactiva y manejar el estado global de la aplicación (ej. "Modo Concentración", gestión de pestañas y explorador de archivos).
- **Justificación:** React posee el ecosistema más estable para desarrollar editores de texto complejos. La combinación de Shadcn/UI y Tailwind CSS permite construir una interfaz moderna y *pixel-perfect* de forma modular. Zustand maneja estados globales sin causar re-renderizados innecesarios, garantizando fluidez. Framer Motion provee transiciones de alta calidad para componentes como la "Vista Dividida" y paneles desplegables.

## 3. Motor de Edición de Texto (WYSIWYM)
- **Tecnología:** Lexical (Meta).
- **Propósito:** Proveer el entorno de escritura principal interceptando visualmente la sintaxis técnica (`+++`, frontmatter YAML) para ofrecer una experiencia inmersiva sin modificar los metadatos subyacentes.
- **Justificación:** Se elige Lexical de forma definitiva sobre ProseMirror. Su modelo de estado y nodos encaja de forma más natural con la arquitectura de bloques (`+++`) del proyecto. Además, su compatibilidad documentada con Yjs (CRDTs) simplificará enormemente la futura implementación de la co-escritura P2P. Su sistema de "Decorators" es ideal para ocultar la sintaxis técnica en tiempo real.

## 4. Procesamiento de Texto (Parser Markdown/YAML)
- **Tecnología:** `pulldown-cmark` (Rust crate) + `serde_yaml` (Rust crate) para parseo en backend. Ecosistema `unified` (`remark-parse`, `rehype`) reservado exclusivamente para el Motor de Exportación (generación de HTML/EPUB).
- **Propósito:** El backend en Rust divide los documentos en bloques lógicos (`+++`), extrae el frontmatter YAML de cada bloque, y persiste los metadatos en SQLite. El frontend recibe el AST ya procesado vía IPC y solo se encarga del renderizado en Lexical.
- **Justificación:** Ejecutar librerías JS (`remark`, `js-yaml`) dentro del hilo de renderizado de React bloquearía la UI durante operaciones I/O masivas (apertura de proyectos con cientos de archivos, reconciliación del watcher). Delegar el parseo a Rust garantiza que el hilo principal nunca se congele. `unified`/`remark` se mantienen para exportación porque su ecosistema de plugins (rehype, remark-gfm) es el estándar para transformar Markdown en documentos publicables.

## 5. Base de Datos Local y Caché (El "Cerebro")
- **Tecnología:** SQLite (`tauri-plugin-sql`).
- **Propósito:** Almacenar de forma relacional el grafo de conocimiento, metadatos, índices de etiquetas y actuar como motor del *Plothole Checker*.
- **Justificación:** Escanear archivos en disco de forma concurrente penaliza el rendimiento. SQLite actúa como caché indexada local, permitiendo que la UI efectúe consultas en microsegundos y que las verificaciones en segundo plano (ej. consistencia narrativa) operen sin interrumpir el hilo principal de la aplicación.

## 6. Mapas Interactivos y Herramienta de Dibujo
- **Tecnología:** React-Leaflet (`L.CRS.Simple`) + `Excalidraw`.
- **Propósito:** Renderizar mapas estáticos con capas interactivas (Leaflet), y proveer un lienzo vectorial integrado para esbozar mapas desde cero (Excalidraw).
- **Justificación:** Leaflet maneja eficientemente imágenes de alta resolución aportadas por el usuario. Para la creación nativa, se elige `Excalidraw` sobre alternativas como `Tldraw`. Tldraw posee una licencia BSL que requeriría pagos si el proyecto se monetiza; Excalidraw es MIT puro, garantizando que el proyecto sea 100% libre de ataduras legales corporativas en el futuro.

## 7. Grafo de Conocimiento (Estilo Obsidian)
- **Tecnología:** `D3.js` (force-simulation sobre Canvas) con migración planificada a `react-force-graph` (WebGL).
- **Propósito:** Visualizar interactivamente redes semánticas bidireccionales (Personaje <-> Evento <-> Ubicación).
- **Justificación:** La vista objetivo replica fielmente el grafo de Obsidian: física de repulsión d3-force, nodos de tamaño proporcional al degree, fade de no-conectados, y glow via `shadowBlur` nativo de Canvas. Dado que Obsidian usa internamente d3-force, implementarlo directamente sobre un `<canvas>` elimina la capa de abstracción de una librería de grafos y garantiza control total sobre cada parámetro visual (charge, linkDistance, alpha decay, estados hover). Para el MVP y fases iniciales esto es suficiente. La migración a `react-force-graph` (WebGL) se contempla únicamente cuando el rendimiento con grafos de miles de nodos lo exija.

## 8. Diccionario Interno y Autocompletado (Full-Text Search)
- **Tecnología:** `MiniSearch`.
- **Propósito:** Proveer indexación invertida local para la detección de entidades durante la escritura y generación de *wiki-links*.
- **Justificación:** Es un motor de búsqueda ultra-ligero que opera 100% *offline* en memoria. Su tolerancia a errores ortográficos (fuzzy search) y tiempos de respuesta en milisegundos garantizan autocompletado en tiempo real sin entorpecer el proceso de escritura.

## 9. Control de Versiones (Snapshots invisibles)
- **Tecnología:** `git2` (Rust Crate).
- **Propósito:** Administrar de manera encubierta el historial y control de versiones del manuscrito ("Instantáneas").
- **Justificación:** Se descarta `isomorphic-git` (JS) por sus potenciales conflictos de acceso al filesystem en un entorno Tauri. Se opta por `git2`, un crate de Rust que permite al backend gestionar el repositorio Git de forma nativa, robusta y segura, evitando problemas de comunicación entre el frontend y el sistema de archivos real que maneja Rust.

## 10. Motor de Exportación Editorial y Estructurada (Game Devs)
- **Tecnología:** `docx` (JS), `@react-pdf/renderer`, Generación EPUB Nativa (`JSZip` + HTML), Pipeline de Wiki HTML (Rust), exportación JSON pura y compresión ZIP nativa (Rust).
- **Propósito:** Compilar el manuscrito en formatos legibles listos para publicar (DOCX, PDF, EPUB), extraer datos estructurados (JSON nativo) para motores de juegos como Unity o Unreal, y empaquetar proyectos íntegros para migración.
- **Justificación:** Para la exportación a Wiki HTML, se implementará una pipeline personalizada en el backend de Rust. Esta tomará los ASTs generados por `remark`, los renderizará a HTML y los empaquetará con un template CSS embebido, creando un sitio estático navegable y 100% autocontenido. Para la "Portabilidad Total", delegar la compresión del proyecto al backend en Rust asegura la creación casi instantánea de un `.zip` maestro.

## 11. Motor de Calendarios y Línea de Tiempo
- **Tecnología:** Lógica *custom* en TypeScript + BigInt. Renderizado mediante `D3.js`.
- **Propósito:** Soportar cronologías ficcionales (edades, años, meses) totalmente desvinculadas de nuestra realidad, y visualizarlas jerárquicamente.
- **Justificación:** Ningún framework de fechas estandarizado (como `moment.js` o `date-fns`) es compatible con calendarios inventados. Emplear librerías prefabricadas de línea de tiempo a menudo arrastra mantenimiento inestable (ej. `vis-timeline`). Una solución algorítmica matemática propia con renderizado directo garantiza escalabilidad ininterrumpida y control total de la interfaz.

## 12. Explorador de Archivos y Vista Dividida (Drag & Drop)
- **Tecnología:** `@dnd-kit/core`.
- **Propósito:** Posibilitar la reorganización en tiempo real de nodos, carpetas y documentos de la jerarquía de proyecto, junto a la manipulación espacial de los paneles.
- **Justificación:** Reemplaza la implementación deficiente de la API *Drag & Drop* nativa de HTML5. Es altamente accesible, modular y soporta reordenaciones complejas sin perturbar el ciclo vital o de re-renderizado de los componentes reactivos circundantes.

## 13. Ecosistema de Plugins (Extensibilidad)
- **Tecnología:** API propietaria inyectada y Web Workers.
- **Propósito:** Dotar de soporte oficial y seguro para extensiones originadas por la comunidad.
- **Justificación:** En lugar de abrir el acceso directo de Node/Rust al plugin, se provee un puente controlado (vía `window.NarraLith`) garantizando la integridad de los textos. Los scripts ajenos no podrán amenazar la seguridad del sistema local del usuario final, cumpliendo con los estándares rigurosos que impone la planificación.

## 14. Estadísticas y Metas (Gamificación)
- **Tecnología:** `Recharts`.
- **Propósito:** Proveer un conjunto de visualizaciones modulares para métricas (progreso literario, conteos de palabras por sesión y cumplimiento de metas).
- **Justificación:** Es un ecosistema compositivo que encaja armónicamente con la semántica de estilos aportada por Tailwind y el modo nocturno. Consume muy poco peso en el empaquetado final a cambio de ofrecer un módulo visual de calidad analítica superior.

## 15. Motor de Audio (Paisajes Sonoros)
- **Tecnología:** `Howler.js`.
- **Propósito:** Gestionar la reproducción de los sonidos ambientales para el "Modo Concentración".
- **Justificación:** Librería de audio ligera y con licencia MIT. Opera 100% offline y ofrece control granular sobre loops, volumen y efectos de fundido (fade), ideal para crear una experiencia de escritura inmersiva.

## 16. Sincronización Colaborativa Offline/P2P (Futuro)
- **Tecnología:** `Yjs` (CRDTs) + `WebRTC` o Conexión LAN.
- **Propósito:** Facilitar la co-escritura en tiempo real sin requerir nubes obligatorias ni servidores centrales.
- **Justificación:** `Yjs` implementa Tipos de Datos Replicados Libres de Conflictos (CRDTs), el estándar industrial que permite a múltiples usuarios editar el mismo documento resolviendo colisiones texto/estado matemáticamente, logrando colaboración descentralizada 100% *offline-first*.