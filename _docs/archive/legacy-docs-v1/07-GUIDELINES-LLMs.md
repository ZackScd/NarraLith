# 🤖 Guías de Desarrollo e Instrucciones para LLMs

## 📖 Propósito de este Documento
Este archivo contiene las directrices estrictas ("System Prompts" y reglas de negocio) que todo asistente de Inteligencia Artificial y desarrollador humano debe acatar al interactuar con la base de código. 

El objetivo es evitar alucinaciones, prevenir la degradación del código ("código espagueti") y asegurar que el stack tecnológico se respete rigurosamente.

---

## 🛑 Reglas Fundamentales de Interacción

### 1. Búsqueda y Contexto Primero
- **NUNCA** asumas la estructura del proyecto ni inventes rutas de archivos. Consulta siempre `06-ARCHITECTURE.md` o explora el directorio base antes de proponer código nuevo.
- Antes de modificar una función existente, verifica sus dependencias a lo largo de todo el stack.

### 2. Adherencia al Tech Stack
- Respeta estrictamente las tecnologías definidas en `02-TECH_STACK.md`. 
- **PROHIBIDO** realizar operaciones masivas de I/O o parseo en el hilo de JavaScript/React. Todo el trabajo pesado de archivos y Markdown/YAML debe ejecutarse asíncronamente en Rust.
- **PROHIBIDO** introducir dependencias con licencias comerciales restrictivas (ej. BSL). Priorizar siempre herramientas de código abierto libres (MIT/Apache) para evitar ataduras legales (ej. Excalidraw).

### 3. Ejecución de Tareas
- Todo el trabajo de código debe derivar obligatoriamente de una tarea bien definida en `04-TASK.md`.
- Las soluciones de código propuestas deben ser **completas**, **funcionales** y presentarse de forma **modular**.
- Si un archivo se va a modificar, proporciona siempre el bloque de código exacto o el parche (diff) indicando la línea específica o el contexto circundante. No dejes comentarios del tipo `// ... resto del código ...` si esto compromete la compilación.
- **Cero Fallos Silenciosos:** Está estrictamente prohibido usar placeholders (como `pass` en Python, o funciones vacías en TS/Rust), dejar bloques de captura de errores (`catch`/`match`) en blanco, o silenciar excepciones sin manejarlas adecuadamente. Si algo puede fallar, se debe escribir la lógica para manejar el fallo.
- **Cero Archivos Fantasma:** Si una tarea requiere interactuar con un archivo que aún no se ha creado, se debe etiquetar explícitamente como `[NUEVO]` en la planificación de la tarea. No asumas su existencia previa si no está en el mapa arquitectónico.

### 4. Flujo de Trabajo (Pipeline Documental)
- Al terminar una tarea, indícale al usuario los comandos necesarios para realizar pruebas locales (`npm run tauri dev`).
- Una vez aprobada la funcionalidad por el usuario, redacta la entrada correspondiente para `05-CHANGELOG.md`, resumiendo limpiamente la implementación.
- **Mantenimiento del Mapa:** Cada vez que se cree un nuevo archivo clave o carpeta, es obligatorio actualizar `06-ARCHITECTURE.md` para reflejar y documentar su adición.

### 5. Compilación Limpia (Clean Builds)
- El empaquetado final (`build`) debe ser inmaculado. Asegúrate de gestionar correctamente `.taurignore` y la configuración de Vite para que directorios como `_docs/`, archivos de configuración de IA, scripts de pruebas personales o placeholders jamás terminen dentro del binario del usuario final.

### 6. Estilo de Código y Calidad
- **Modularidad Radical (Cero "God Objects"):** Está absolutamente prohibido crear archivos monolíticos gigantes. Todo componente, store, o lógica de parsing debe extraerse y dividirse por sus responsabilidades lógicas.
- **Internacionalización (i18n):** **PROHIBIDO** el texto *hardcodeado* en la interfaz. El desarrollo debe contemplar el sistema i18n desde el día cero. **El idioma por defecto en la versión compilada debe ser Inglés**, mientras que el entorno de desarrollo local podrá configurarse en Español. Todos los strings visibles deben vincularse a diccionarios.
- **Documentación Extrema (Comentarios):** Todas las líneas de código o bloques lógicos deben estar rigurosamente comentados. Se debe explicar detalladamente qué hace cada línea, qué datos o dependencias utiliza, y cómo se comunica con otras partes del sistema (por ejemplo, el flujo de datos IPC entre Rust y React).

- **Fuente de la Verdad Absoluta:** El sistema de archivos (Markdown/YAML) prevalece siempre. Si existe una discrepancia durante la reconciliación entre la caché de SQLite y el archivo `.md`, el archivo físico sobrescribe a la base de datos.
- **Aislamiento 100% Offline:** Ninguna feature debe requerir una llamada a red externa. Las bases de datos (`.narralith/index.db`) y el historial Git (`.git/`) son estrictamente locales y su alcance se aísla por completo al directorio de cada proyecto.

---
> **Para la IA:** Al leer este documento, confirmas que entiendes el alcance del proyecto. Si un requerimiento del usuario entra en conflicto con estas directrices, debes advertir de la violación de las reglas de arquitectura antes de proceder.