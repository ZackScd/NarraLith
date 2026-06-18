# Proyecto NarraLith - Documento de Planificación

## 💡 Concepto e Ideas
**Concepto Core:** Una herramienta tipo Obsidian, pero más completa y orientada a la narrativa.
**Enfoque del Producto:** Híbrido equilibrado. El ecosistema separa limpiamente el entorno de escritura (manuscrito) del entorno de construcción de mundo (lore), pero permite que ambas dimensiones interactúen fluidamente gracias al motor temporal y al sistema de referencias.

### Características Principales
- [ ] **Gestión de Proyectos e Inicialización:**
  - **Interfaz de Creación:** Al iniciar la aplicación sin un proyecto activo, no se genera una estructura automáticamente. Se presenta una pantalla de inicio que permite al usuario crear un nuevo proyecto eligiendo entre varias plantillas predefinidas (incluyendo la opción de "Proyecto en Blanco").
    - *Expansión a Futuro:* Incorporar un catálogo de plantillas especializadas tanto por **Medio/Formato** (ej. Novela, Guion de Videojuego, Campaña de Rol) como por **Género Literario** (ej. Alta Fantasía, Ciencia Ficción Hard, Cyberpunk). Estas plantillas pre-configurarán automáticamente el árbol de carpetas, las taxonomías y los campos de las fichas modulares para adaptarse de inmediato a las necesidades de ese universo.
  - **Directorio Raíz:** Los proyectos se almacenan localmente dentro de una carpeta maestra (ej. `proyectos/`). Cada obra cuenta con su propio subdirectorio aislado (ej. `proyectos/Proyecto 1/`, `proyectos/Proyecto 2/`).
  - **Aislamiento Estricto de Datos (Cero Cruces):** Para evitar la contaminación cruzada entre distintas obras, la aplicación **no** utiliza una base de datos global. Cada proyecto genera y mantiene su propio archivo de base de datos SQLite (ej. `.narralith/index.db`) alojado exclusivamente dentro de su propia carpeta. Al cerrar un proyecto, la conexión a su base de datos se destruye completamente antes de abrir el siguiente.

- [ ] **Estructura de Archivos y Vistas del Proyecto:**
  - **Vistas Independientes:** La interfaz de la aplicación se divide lógicamente en dos entornos de trabajo principales, filtrando el explorador de archivos según el enfoque: la **Vista de Manuscrito** y la **Vista de Worldbuilding**.
  - **Plantilla por Defecto (Organización Base):** Al seleccionar la plantilla estándar durante la creación, el proyecto se estructura rígidamente en tres directorios clave:
    - **`/Manuscrito`:** Entorno dedicado exclusivamente al texto narrativo. Contiene una estructura inicial jerárquica:
      - `/Volumen 1`
        - `/Capitulo 1`
          - `Escena_1.md`
    - **`/Imagenes` (Assets visuales):** Repositorio centralizado. Para evitar la fragilidad técnica de "clonar" el árbol de directorios (lo que causaría errores al renombrar o mover carpetas), se organiza mediante subcategorías lógicas base. El usuario posee libertad absoluta para reordenar o crear nuevas carpetas aquí:
      - `/Mapas_y_Geografia`
      - `/Retratos_de_Personajes`
      - `/Artefactos_e_Items`
      - `/Iconografia_y_Simbolos`
      - `/Otros_Recursos`
    - **`/Worldbuilding`:** Directorio de recursos, lore y entidades. Organizado bajo la siguiente estructura de árbol base:
      - **`/Personajes`**
        - `/Principal`
        - `/Secundario`
        - `/Incidental`
      - **`/Ubicaciones`** (Jerarquía anidada)
        - `/Continentes`
          - `/Reinos_y_Naciones`
            - `/Regiones`
              - `/Ciudades_y_Pueblos`
                - `/Edificios_y_Lugares`
      - **`/Facciones`** (Múltiples ramas paralelas)
        - `/Alianzas_Macro`
          - `/Gobiernos_y_Casas`
            - `/Divisiones_y_Sedes`
          - `/Gremios_y_Corporaciones`
            - `/Sedes_Locales`
          - `/Cultos_y_Organizaciones`
      - **`/Lore_y_Mitos`**
        - `/Eras_y_Edades`
          - `/Eventos_Historicos_Clave`
            - `/Mitos_y_Leyendas`
      - **`/Sistemas_de_Poder`**
        - `/Fuentes_y_Sistemas_Base`
          - `/Escuelas_Disciplinas_o_Leyes`
            - `/Técnicas_Hechizos_y_Costos`
      - **`/Naturaleza`**
        - `/Biomas_y_Ecosistemas`
          - `/Bestiario_y_Fauna`
            - `/Clasificaciones_y_Familias` (Ej. Animales_Mundanos, Criaturas_Fantasticas, No_Muertos)
          - `/Flora_y_Hongos`
          - `/Fenomenos_y_Clima`
        - `/Geologia_y_Minerales`
        - `/Cosmologia_y_Astros`
        - `/Materiales_Naturales_y_Derivados`
      - **`/Objetos_y_Artefactos`**
        - `/Reliquias_y_Artefactos_Magicos`
        - `/Armas_y_Equipamiento`
        - `/Vehiculos_y_Transportes`
        - `/Consumibles_y_Pociones`
      - **`/Sociedad_y_Cultura`** (Pilares de la civilización)
        - `/Civilizaciones_y_Razas`
          - `/Sistemas_Politicos_y_Leyes`
          - `/Economia_Monedas_y_Comercio`
          - `/Religiones_y_Creencias`
          - `/Idiomas_y_Conlangs`
          - `/Cultura_Diaria`
            - `/Costumbres`
            - `/Gastronomia`
            - `/Arte_y_Moda`
  - **Sistema de Etiquetado Inteligente y Creación Contextual:** Los archivos y subcarpetas creados dentro de estas jerarquías heredan automáticamente las propiedades y etiquetas de su carpeta padre. La interfaz integra asistencia contextual: al hacer clic derecho en una carpeta (o desde una barra de herramientas lateral derecha), el sistema sugiere y permite crear la siguiente subestructura lógica (ej. estando en la carpeta "Reinos", sugerirá crear una subcarpeta "Ciudades" o "Pueblos", aplicando automáticamente la plantilla y los metadatos correctos). El usuario conserva total libertad para reorganizar este árbol lógico.
  - **Metadatos de Carpetas (Vista de Tarjetas / Entidades):** Las carpetas no operan únicamente como contenedores rígidos y pasivos; pueden poseer su propia descripción. En la interfaz gráfica principal, esto permite renderizar los directorios como "Tarjetas" informativas enriquecidas en lugar de iconos de carpetas tradicionales.
  - **Archivo de Descripción Oculto:** Al asignar una descripción a una carpeta, el sistema genera y gestiona automáticamente un archivo Markdown oculto en su interior (ej. `.folder.md`). Este archivo se omite del árbol del explorador de archivos para evitar ruido visual, pero el motor de la aplicación lo procesa de forma transparente al seleccionar la carpeta para renderizar su descripción y propiedades.


- [ ] **Sistema de Etiquetas Avanzado (Taxonomía Core):** Vinculado directamente al explorador de archivos.
  - **Correspondencia Estructural (Carpeta = Etiqueta):** El sistema de archivos dicta la taxonomía base. Cada carpeta y subcarpeta dentro del proyecto actúa simultáneamente como una categoría y subcategoría lógica. Es decir, cada directorio posee su propia etiqueta generada automáticamente (ej. crear la carpeta `/Personajes/Principal` crea y vincula instantáneamente las etiquetas correspondientes en el motor interno). Esto aplica para todos los directorios troncales (`/Personajes`, `/Ubicaciones`, `/Facciones`, `/Lore_y_Mitos`, `/Sistemas_de_Poder`, `/Naturaleza`, `/Objetos_y_Artefactos`, `/Sociedad_y_Cultura`).
  - **Entidades de Tiempo y Eventos (Arcos):** Sistema de categorización paralelo (no necesariamente atado a carpetas físicas) para agrupar sucesos en la línea temporal, abarcando desde marcadores exactos (años/días) hasta Arcos Narrativos que engloban múltiples eventos.
  - **Gestión de Taxonomía y Libertad Total (CRUD):** El control para crear, editar, renombrar o eliminar carpetas y categorías recae enteramente en el usuario. El sistema proveerá advertencias lógicas de seguridad (ej. si se intenta eliminar una etiqueta o carpeta actualmente en uso por múltiples archivos), pero jamás será restrictivo ni bloqueará la acción.
  - **Visualización Jerárquica por Importancia:** En la interfaz de usuario, las carpetas, subcategorías y etiquetas no se ordenan alfabéticamente de manera forzada. Su disposición se rige por su "importancia" o peso narrativo. Este índice de ordenamiento es libremente personalizable por el usuario (ej. reordenamiento espacial mediante *Drag & Drop*).
  - **Sistema de Colores:** Cada categoría troncal o carpeta posee un código de color asignado para agilizar su reconocimiento visual en el explorador, dentro de las tarjetas y como nodos en el grafo de conocimiento.
  - **Etiquetas y Carpetas Personalizadas (Custom):** Las nuevas categorías creadas desde cero se añaden por defecto al final de la lista de importancia. El sistema les asigna automáticamente un color base neutro (gris), el cual es completamente editable. Estas adiciones se integran de inmediato al motor de búsqueda, autocompletado y vinculación.

- [ ] **Ventanas de Creación y Fichas de Entidad Dinámicas:**
  - **Interfaces de Creación Contextuales:** Cada categoría principal del proyecto posee su propia ventana de creación (UI) adaptada a su naturaleza. La interfaz visual para crear un "Personaje" presenta campos totalmente distintos a los de crear una "Ubicación" o un "Sistema de Poder". A pesar de estas vistas especializadas que facilitan la experiencia de usuario, todas las entidades se guardan internamente como puros archivos Markdown (`.md`) enriquecidos con frontmatter (YAML).
  - **Nombre (Único Campo Obligatorio):** Puesto que cada entidad se traduce en la creación de un archivo físico en el disco, el "Nombre" es el único dato estrictamente obligatorio para iniciar su creación. Todo el resto de la información y metadatos pueden omitirse o llenarse más adelante.
  - **Campos Personalizados y Control Total (Modularidad):** Fiel a la filosofía de apoyar el proceso creativo sin imponer limitaciones rígidas, todas las fichas y formularios de creación son 100% modulares. **Nota:** *Todos los campos detallados en las secciones posteriores de este documento representan las "Plantillas por Defecto" que ofrece la app al instalarse, pero el usuario tiene libertad absoluta para eliminar, ocultar o modificar cualquiera de ellos.* Estas modificaciones pueden aplicarse a una única entidad o guardarse para sobrescribir la plantilla predeterminada.

- [ ] **Fichas de Personaje Dinámicas:**
  - **Imagen:** Opcional (vinculada al directorio `/Imagenes/Retratos_de_Personajes`).
  - **Nombre:** Obligatorio.
  - **Rol Narrativo:** Campo o etiqueta específica (Ej. Protagonista, Antagonista, Mentor). Esto permite clasificar el rol del personaje en la historia de forma independiente a su "tiempo en pantalla" (lo cual dicta si se guarda en la carpeta `/Principal` o `/Secundario`).
  - **Edad:** (Opcional) Establecida manualmente o calculada dinámicamente marcando su año de nacimiento en la línea de tiempo (escenario ideal).
  - **Lugar de Nacimiento:** "Desconocido" por defecto. Soporta texto libre o una etiqueta vinculada a una ubicación en el mapa interactivo.
  - **Biografía:** Campo de escritura libre para el usuario.
  - **Relaciones e Interacciones:** Vinculación con otros personajes mediante etiquetas relacionales directamente en la ficha (Amor, Odio, Familia, Hermanos, Padres, Mentor/Aprendiz). Permite visualizar dinámicamente la red social del personaje y cómo se vincula con otros nodos.
  - **Línea de Tiempo Personal (Evolución):** Al ser el personaje una etiqueta o entidad central, su ficha recopila automáticamente todas sus menciones/eventos en la historia.
    - *Interfaz Optimizada:* Muestra una lista cronológica desde su nacimiento (o desde su primera aparición en la línea de tiempo) con el formato `[marca de tiempo] : [texto...]`. Al seleccionar o hacer clic en la línea, se expande el evento o archivo completo, evitando sobrecargar la vista.

- [ ] **Fichas de Ubicación Dinámicas:**
  - **Imagen / Icono:** Opcional (vinculada al directorio `/Imagenes/Mapas_y_Geografia`).
  - **Nombre:** Obligatorio.
  - **Representación Geográfica Vectorial:** En lugar de limitarse a un pin de coordenadas, la ubicación se vincula a una forma geométrica (polígono) dibujada directamente sobre la capa Canvas/SVG del mapa. Esto permite demarcar el área real, como las fronteras de un país o los muros de una fortaleza.
  - **Jerarquía Espacial (Contención):** Se vincula automáticamente a su estructura de carpetas o capa superior (Ej. "Ciudad X" pertenece a "Reino Y").
  - **Población / Personajes Notables:** Lista relacional autogenerada (backlinks cruzados) que muestra qué Personajes (o Facciones) tienen etiquetada esta ubicación como su lugar de nacimiento, sede o residencia actual.
  - **Descripción / Lore:** Campo de escritura libre para detallar su historia, clima, cultura, etc.
  - **Línea de Tiempo Local:** Recopilación cronológica automática de todos los eventos, nacimientos o escenas que hayan transcurrido estrictamente dentro de los límites espaciales de esta ubicación.

- [ ] **Fichas de Sistemas de Magia / Poder / Tecnología:**
  - **Imagen / Iconografía:** Opcional (símbolos rúnicos, diagramas técnicos, etc., vinculados a `/Imagenes/Iconografia_y_Simbolos`).
  - **Nombre:** Obligatorio.
  - **Origen / Naturaleza:** Etiqueta o campo libre que define la fuente del poder (Ej. Genético, Divino, Combustible fósil, Radiación mágica).
  - **Reglas y Limitaciones (Hard Limits):** Campo crítico para establecer de forma estricta qué *no* puede hacer este sistema, previniendo inconsistencias lógicas en la resolución de tramas.
  - **Costos y Consecuencias:** Sección detallada para definir el peaje por su uso (Ej. pérdida de cordura, consumo de maná, agotamiento de recursos materiales, fatiga física).
  - **Árbol de Habilidades / Jerarquía (Escalado):** Interfaz anidada para definir niveles de poder, rangos (Ej. Clase S a F) o sub-ramas (Ej. Magia Elemental -> Fuego -> Hechizo Específico). 
  - **Impacto Sociocultural:** Campo de texto para documentar cómo es percibida esta tecnología o magia por el mundo (¿Es ilegal? ¿Una herejía? ¿Controlada por monopolios?).
  - **Red de Practicantes:** Vista relacional auto-generada que recopila y lista todos los Personajes o Facciones que poseen la etiqueta de usuarios o dueños de este sistema.

- [ ] **Fichas de Lore, Historia y Mitos (Eventos Dinámicos):**
  - **Imagen / Representación Visual:** Opcional (tapices antiguos, grabados, pinturas, vinculados a `/Imagenes/Otros_Recursos`).
  - **Nombre:** Obligatorio (Nombre del evento, era o leyenda).
  - **Ubicación Temporal (Marcas de Tiempo):** Campo para definir un punto exacto en el calendario (Día/Mes/Año) o un rango de duración (Inicio y Fin, ideal para Guerras o Eras completas). Soporta la etiqueta "Mítico/Desconocido" para eventos previos a los registros históricos.
  - **Ubicación Geográfica:** Enlace relacional a las Fichas de Ubicación donde transcurrió el evento, o a polígonos del mapa interactivo si afectó a territorios enteros.
  - **Involucrados (Actores Clave):** Red relacional auto-generada o manual que vincula a los Personajes y Facciones que participaron directamente o sufrieron el evento.
  - **Descripción Narrativa / Relato:** Campo de texto libre detallando el suceso.
  - **Nivel de Veracidad (Hecho vs Mito):** Campo técnico interno para que el autor clasifique si el suceso es Historia Real (comprobada en el mundo narrativo), una Leyenda (una verdad histórica distorsionada con el tiempo) o un Mito (creencia religiosa o folclórica que los personajes creen, pero que el autor sabe que no pasó).
  - **Impacto y Consecuencias:** Texto para documentar cómo este evento alteró el estado del mundo (Ej. Extinción de una raza, hundimiento de un continente, fundación de un imperio).

- [ ] **Fichas de Naturaleza y Ecosistemas (Plantillas Especializadas):**
  - **Modularidad por Subcategoría:** La creación dentro de la carpeta `/Naturaleza` adapta su formulario (UI) dependiendo de la subcategoría seleccionada, ofreciendo plantillas distintas para ecosistemas, bestias, plantas o materiales.

  - **Ficha de Bioma / Ecosistema:**
    - **Nombre:** Obligatorio.
    - **Clima y Condiciones:** Campo para definir temperatura, clima predominante, estacionalidad y nivel de hostilidad natural.
    - **Ubicación Geográfica (Polígonos Macro):** Vinculación al mapa interactivo. Los biomas se dibujan en una capa vectorial (Canvas/SVG) exclusiva que suele estar por debajo de las jurisdicciones políticas, permitiendo sombrear grandes áreas geográficas que pueden abarcar múltiples reinos.
    - **Flora y Fauna Autóctona:** Lista relacional autogenerada de todas las bestias y plantas que tienen este bioma etiquetado como su hábitat principal.

  - **Ficha de Bestiario / Fauna (Criaturas):**
    - **Nombre:** Obligatorio.
    - **Imagen / Ilustración:** Opcional (vinculada a `/Imagenes/Otros_Recursos`).
    - **Nivel de Peligro y Rareza:** Etiquetas o escalas personalizables (Ej. Inofensivo, Depredador Apex, Especie Invasora, Legendario).
    - **Clasificación Taxonómica (Tipología):** Capacidad de organizar a las criaturas en subcategorías jerárquicas profundas dictadas por el árbol de carpetas (Ej. `/Animales_Mundanos/Aves`, `/Criaturas_Fantasticas/No_Muertos`, o `/Entidades_Divinas/Angeles`).
    - **Territorios y Hábitat (Capas Superpuestas):** Capacidad de adjuntar la criatura a ubicaciones específicas o biomas. En el mapa interactivo, la distribución de criaturas se renderiza en capas vectoriales independientes. Esto permite visualizar cruces e intersecciones ecológicas (Ej. superponer la capa del territorio del "Lobo Gigante" con la de "Ovejas Salvajes" para delimitar una zona de conflicto natural).
    - **Comportamiento y Dieta:** Campo de escritura libre para sus hábitos.
    - **Materiales (Loot / Cosecha):** Enlaces relacionales a materiales o partes que se pueden extraer de la criatura (Ej. cuernos, pieles, núcleos mágicos).
    
  - **Ficha de Flora / Hongos:**
    - **Nombre:** Obligatorio.
    - **Propiedades Biológicas / Mágicas:** Atributos clave (Medicinal, Venenoso, Comestible, Reactivo a la magia, etc.).
    - **Hábitat Natural:** Relación estricta a biomas o microclimas específicos.
  - **Ficha de Materiales Naturales (Derivados):**
    - **Nombre:** Obligatorio.
    - **Origen:** Enlace unidireccional a la bestia o planta de la cual se extrae.
    - **Usos y Valor:** Aplicaciones prácticas en el mundo (alquimia, herrería, comercio) y su nivel de rareza en el mercado.

  - **Ficha de Geología y Minerales:**
    - **Nombre:** Obligatorio.
    - **Propiedades Físicas / Mágicas:** Dureza, peso, conductividad, toxicidad o radiación mágica.
    - **Yacimientos (Distribución):** Enlaces relacionales a las Ubicaciones o Biomas donde se puede extraer (minas, cuevas, lechos de ríos).

  - **Ficha de Fenómenos y Clima:**
    - **Nombre:** Obligatorio.
    - **Naturaleza del Fenómeno:** Tormentas arcanas, mareas de sangre, vientos tóxicos, anomalías gravitacionales.
    - **Frecuencia y Predicción:** Ciclos de aparición (Ej. estacional, cada 100 años, o totalmente caótico).
    - **Área de Efecto y Rutas (Mapas):** Representación visual en el mapa interactivo. Permite dibujar formas geométricas estáticas (Ej. el Área de Efecto circular de una tormenta mágica) o trazar vectores direccionales de línea (Ej. la ruta proyectada que sigue un tornado, un huracán o una corriente migratoria).
    - **Efectos en el Ecosistema:** Campo narrativo sobre cómo altera a la flora, fauna o civilizaciones a su paso.

  - **Ficha de Cosmología y Astros:**
    - **Nombre:** Obligatorio.
    - **Tipo:** Sol, Luna, Constelación, Cometa, Planeta visible.
    - **Impacto Planetario:** Influencia directa en mareas, estaciones, sistemas de magia o incluso en el Motor de Calendarios (Ej. un eclipse que dura un mes y da inicio a una Era).

- [ ] **Fichas de Objetos y Artefactos (Plantillas Especializadas):**
  - **Modularidad por Subcategoría:** Formularios adaptados según la función del ítem (arma, vehículo o reliquia). Todos soportan la adición de imágenes vinculadas a `/Imagenes/Artefactos_e_Items`.
  - **Ficha de Reliquias y Artefactos Mágicos:**
    - **Nombre:** Obligatorio.
    - **Historial de Propiedad y Ubicación (Evolución Temporal):** Dado que los objetos cambian de manos o se pierden, este campo no es estático, sino que está vinculado al motor temporal. Permite registrar una bitácora cronológica de su paradero (Ej. *[Era Antigua]: Perdido en Ruinas X -> [Año 10, Capítulo 1]: Encontrado y equipado por Personaje Y*). La interfaz evaluará esta línea de tiempo para mostrar dinámicamente el "Propietario / Estado Actual" basándose en el punto más avanzado del registro.
    - **Creador / Origen:** Enlace histórico a la Ficha de un Personaje o a una Era detallando quién lo forjó.
    - **Poderes y Maldiciones:** Campo de texto estructurado detallando sus efectos, requisitos de activación o voluntad propia (si el objeto tiene consciencia).
  - **Ficha de Armas y Equipamiento:**
    - **Nombre:** Obligatorio.
    - **Clasificación y Materiales:** Tipo de arma (Ej. Espada a dos manos, Arco largo, Exoesqueleto) y enlaces a los materiales geológicos o biológicos de los que está forjada.
    - **Estadísticas (Stats):** Campos personalizables tipo RPG (Daño, Peso, Durabilidad, Rango) ideales para autores de LitRPG o Game Devs.
    - **Historia y Linaje del Arma:** Registro temporal de dueños anteriores (herencias, robos), batallas en las que participó o su renombre en el mundo, funcionando con la misma lógica cronológica evolutiva.
  - **Ficha de Vehículos y Transportes:**
    - **Nombre / Clase:** Obligatorio (Ej. *La Venganza de la Reina Ana*, o simplemente "Galeón de Guerra Estándar").
    - **Propulsión y Energía:** Fuente de movimiento (Ej. Viento, Motor de vapor, Núcleo arcano).
    - **Capacidad y Tripulación:** Número de pasajeros, tonelaje de carga máxima y rol del vehículo.
    - **Rutas Frecuentes:** Vínculos a trazados vectoriales en el mapa interactivo (Ej. las vías del tren continental o una ruta comercial marítima).

- [ ] **Fichas de Sociedad y Cultura (Plantillas Especializadas):**
  - **Modularidad por Subcategoría:** Formularios adaptados para capturar la esencia intangible y estructural de las civilizaciones.

  - **Ficha de Civilización / Raza:**
    - **Nombre:** Obligatorio.
    - **Anatomía y Rasgos Biológicos:** Opcional (si es una especie no humana). Enlaces a fortalezas o debilidades genéticas.
    - **Cuna / Lugar de Origen:** Vínculo a la Ficha de Ubicación donde se originaron.
    - **Territorios Actuales y Expansión:** Enlaces relacionales a múltiples Ubicaciones o polígonos del mapa para mostrar dónde habitan actualmente o hasta dónde se han expandido.
    - **Valores Centrales y Psicología:** Campo narrativo para definir su forma de ver el mundo (Ej. Sociedad militarista, pacífica, mercantil).
    - **Sub-razas y Derivaciones:** Vínculos jerárquicos a otras Fichas de Civilización que actúan como variantes, mestizajes o evoluciones de la raza principal.

  - **Ficha de Sistema Político y Leyes:**
    - **Nombre:** Obligatorio (Ej. Monarquía Absoluta, Oligarquía Arcana, República).
    - **Figuras de Autoridad:** Enlaces relacionales a los Personajes o Facciones que ostentan el poder actual.
    - **Estructura de Clases / Castas:** Jerarquía social (Ej. Nobleza, Clero, Plebeyos, Esclavos).
    - **Leyes Absolutas y Tabúes:** Registro de crímenes capitales y sus castigos, fundamental para la trama legal del mundo.

  - **Ficha de Economía, Monedas y Comercio:**
    - **Nombre del Sistema o Moneda:** Obligatorio (Ej. Dracmas de Plata, Sistema de Trueque, Patrón de Maná).
    - **Respaldo y Acuñación:** Quién controla el dinero y qué le da valor.
    - **Exportaciones e Importaciones Principales:** Enlaces relacionales a `/Materiales_Naturales_y_Derivados` o `/Objetos_y_Artefactos`.
    - **Rutas Comerciales:** Vínculos a líneas vectoriales en el mapa interactivo.

  - **Ficha de Religión y Creencias:**
    - **Nombre:** Obligatorio.
    - **Panteón / Deidades:** Enlaces a entidades divinas, personajes mitológicos o Facciones sectarias.
    - **Textos Sagrados y Dogmas:** Mandamientos principales que guían a los creyentes.
    - **Pecados y Herejías:** Prácticas prohibidas por la fe (puede entrar en conflicto con la Ficha de Leyes políticas).
    - **Jerarquía Eclesiástica (Roles y Rangos):** Estructura anidada que permite definir los roles dentro de la religión (Ej. "Paladín", "Sumo Sacerdote"). Cada rol es una sub-entidad con su propia descripción, y puede ser asignado como una etiqueta/vínculo a Fichas de Personajes específicos.

  - **Ficha de Idiomas y Conlangs (Lenguas Construidas):**
    - **Nombre:** Obligatorio.
    - **Familia Lingüística y Origen:** A qué Civilización o Raza pertenece.
    - **Sistema de Escritura y Fonética:** Descripción de sus sonidos y grafías (Ej. Runas enanas, pictogramas élficos).
    - **Diccionario Básico (Glosario):** Sub-interfaz tipo tabla (Clave-Valor) integrada en la ficha para registrar vocabulario común (Ej. *Hola -> Suul*, *Gracias -> Mehn*).
    
  - **Ficha de Cultura Diaria (Costumbres, Gastronomía, Arte):**
    - **Nombre / Concepto:** Obligatorio.
    - **Clasificación:** Etiqueta para definir si es un Plato típico, una Festividad, un Rito de paso o un Estilo de ropa.
    - **Origen Geográfico / Asociación Cultural:** Vínculo a la Ficha de una Ubicación o Civilización específica para denotar que esta costumbre es propia de ese lugar o pueblo.
    - **Rol en la Sociedad:** Nivel de importancia (Ej. Festividad exclusiva de la nobleza, comida de supervivencia para campesinos, ritual de cortejo).
    - **Línea de Tiempo (Eventos Cíclicos):** Si es una festividad, se ancla al motor de calendarios para generar notificaciones o marcas recurrentes cada año.

- [ ] **Estructura Narrativa Granular y Etiquetado de Eventos:** El texto no está limitado a "1 archivo = 1 capítulo".
  - **Tecnología Base (Sintaxis de Bloques y Parsers):** Empleo de archivos Markdown con una convención/sintaxis propia extendida para soportar metadatos a nivel de bloque. Se utilizan separadores especiales (ej. `+++`) seguidos de un mini-frontmatter YAML exclusivo para ese bloque, permitiendo asignar tiempos, ubicaciones o etiquetas sin afectar al resto del archivo. A nivel de código, la lectura de archivos requiere un parser de dos fases: expresiones regulares (Regex) para dividir los bloques `+++`, seguido de un parser YAML para extraer metadatos y AST/Markdown para renderizar el contenido.
    - *Ejemplo conceptual (Lo que procesa la máquina, no lo que ve el usuario):*
      ```markdown
      ---
      time: "Año 3, Día 12"
      event: "[[Ataque a Arath]]"
      ---
      Texto del bloque aquí (ej. un flashback)...
      
      +++
      ---
      time: "Año 3, Día 14"
      ---
      Otro bloque con distinto contexto temporal (volviendo al presente)...
      ```
  - **Comportamiento por defecto:** El archivo entero funciona como un único bloque indivisible. El usuario debe separarlo manualmente en múltiples bloques (párrafos) si desea asignar marcas de tiempo o metadatos independientes (ideal para flashbacks/flashforwards).
  - **Marcado de Eventos desde el Manuscrito:** Capacidad de seleccionar una porción de texto (párrafo o escena) directamente en el editor (Ej. la narración de la destrucción de una ciudad) y etiquetarlo como un "Evento". El sistema inyecta la metadata invisible en ese bloque, logrando que esa escena exacta del libro aparezca en la Línea de Tiempo y en la vista de Grafos.
  - **Editor WYSIWYM y Limpieza Visual Absoluta:** Para mantener el texto impecable y evitar el colapso visual del editor, el lienzo central es estrictamente de lectura/escritura limpia. El motor (Parser/Decorators) intercepta, oculta y extrae toda la sintaxis técnica (los `+++` y el YAML) en tiempo real. El usuario **jamás** interactúa con los datos "sucios" en el área de texto. Todo el control de variables se delega a la Interfaz de Usuario lateral.
  - **Manejo de Etiquetas Internas e Intersecciones:** Si se implementan etiquetas intra-párrafo, el motor del editor utilizará un sistema de "Rangos" (índices matemáticos en memoria que marcan el inicio y fin de una etiqueta en caracteres) en lugar de un árbol DOM tradicional. Esto resuelve los problemas de superposición (*overlapping*) de etiquetas sin corromper el documento.

- [ ] **Interfaz de Usuario (UI) Principal (Disposición de 3 Paneles):** Arquitectura visual diseñada para maximizar el control sin ensuciar el lienzo narrativo.
  - **Barra Lateral Izquierda 1 (Navegación Global):** Franja minimalista persistente que contiene únicamente los iconos de los módulos principales (Manuscrito, Worldbuilding, Vista de Grafos, Mapa, Línea de Tiempo, Configuración).
  - **Barra Lateral Izquierda 2 (Explorador Contextual):** Panel expandible que cambia su contenido dependiendo del módulo activo. Muestra el árbol de carpetas, listas de entidades o filtros correspondientes a la categoría seleccionada en la Navegación Global.
  - **Lienzo Central (Área de Trabajo / Clean Text):** El editor narrativo puro o el visor principal (visor de mapas, grafo, etc.). Admite Vista Dividida (Split View) para abrir múltiples paneles o documentos lado a lado.
  - **Barra Lateral Derecha (Panel de Herramientas Contextuales):** Panel dinámico dedicado al control técnico y la manipulación de datos, cuyo contenido se adapta al módulo principal activo:
    - **En Manuscrito y Worldbuilding:** Actúa como un inspector de metadatos. Despliega las propiedades del archivo o del bloque de texto seleccionado, permitiendo editar etiquetas, fechas y otras variables a través de formularios limpios que el motor traduce silenciosamente a código YAML en el archivo de fondo.
    - **En Mapa:** Se convierte en un gestor de capas exhaustivo. Muestra una lista agrupada de todas las capas vectoriales dibujadas, incluyendo fronteras de **Ubicaciones**, territorios de **Ecosistemas** y **Criaturas**, rutas de **Fenómenos Climáticos** y **Vehículos**, y áreas de efecto. Permite al usuario controlar la visibilidad, opacidad y orden de cada capa individualmente o por categoría.
    - **En Línea de Tiempo:** Ofrece controles de visualización, permitiendo al usuario cambiar entre una vista horizontal (tradicional) y una vertical, además de acceder a filtros avanzados por categoría de evento.
    - *Widget Interactivo de Línea de Tiempo:* En las vistas de Manuscrito/Worldbuilding, el campo de "Marca de Tiempo" está altamente vitaminado. Si el usuario escribe una fecha, se despliega una visualización previa (mini-timeline) que le muestra en tiempo real dónde se ubicará cronológicamente esa escena, validando su posición lógica antes de confirmarla.
  - **Sistema de Diseño, Tematización y Accesibilidad:**
    - **Arquitectura de Temas (Shadcn/UI + Tailwind):** El sistema de diseño se fundamenta en el mecanismo de temas de `Shadcn/UI`, que utiliza variables CSS nativas sobre Tailwind CSS. Esto garantiza una base sólida y modular.
    - **Tema por Defecto (Monocromático Oscuro):** La aplicación se entrega con un único tema por defecto: una paleta de grises oscuros neutros diseñada para minimizar la fatiga visual y maximizar la concentración.
    - **Panel de Personalización Visual:** Se incluirá una sección dedicada en la configuración de la aplicación que permitirá al usuario un control granular sobre la apariencia:
        - **Selector de Tema Base:** Un conmutador para cambiar entre los temas predefinidos (inicialmente solo el oscuro, pero preparado para añadir un modo claro).
        - **Selector de Color de Acento:** El usuario podrá elegir un color de acento principal que se aplicará a elementos interactivos (botones, enlaces activos, bordes de foco) para personalizar la experiencia.
        - **Editor de Colores de Sintaxis:** El sistema de colores para categorías (`/Personajes`, `/Ubicaciones`, etc.) se integra aquí. El usuario podrá modificar el color asignado a cada etiqueta troncal, afectando su visualización en el explorador, las tarjetas y los nodos del grafo.
    - **Accesibilidad Tipográfica:** El panel de personalización también incluirá controles para:
        - **Selección de Fuente:** Cambiar la tipografía de la interfaz y del editor.
        - **Tamaño de Fuente:** Ajustar el tamaño del texto para mejorar la legibilidad.
        - **Fuentes para Dislexia:** Un interruptor para activar fuentes de código abierto diseñadas específicamente para la dislexia (ej. OpenDyslexic).

- [ ] **Gestión del Tiempo y Calendarios:**
  - **Motor de Calendarios Personalizados:** Calendario base modificable. Permite al usuario crear sistemas cronológicos desde cero, definiendo años, meses, días, eventos astronómicos/años bisiestos, y precisión del tiempo hasta el nivel de horas.
  - **Línea de Tiempo Interactiva Auto-generada:** Se construye y actualiza dinámicamente escaneando y leyendo todas las marcas de tiempo distribuidas en los textos o bloques del proyecto.
    - **Múltiples Vistas:** Opciones para filtrar la línea de tiempo por Eventos, Capítulos u otras entidades.
    - **Navegación Profunda (Drill-down):** Al hacer clic o abrir un período específico (año, mes o día), la vista se actualiza para listar en detalle todo lo ocurrido exclusivamente en ese lapso de tiempo.
  - **Eventos Simultáneos (Fuera de Cámara):** Capacidad de documentar y asignar marcas de tiempo idénticas a eventos que ocurren al mismo tiempo en lugares distintos. Permite registrar las acciones de otros personajes en paralelo. A nivel de arquitectura, estos textos no se integran en el flujo de lectura de los capítulos para no entorpecer el manuscrito principal; se redactan y almacenan en la subcarpeta dedicada `/Manuscrito/Escenas_Paralelas`. El motor temporal las escanea y las inyecta visualmente en la Línea de Tiempo junto a los eventos principales basándose en sus metadatos.
  - **Reordenamiento Narrativo vs Cronológico:** El explorador de archivos (manuscrito) dicta el orden de lectura. La línea de tiempo dicta el orden cronológico basado puramente en las marcas de tiempo. Son independientes.
  - **Alertas de Inconsistencia (Plothole Checker No Prohibitivo):** El sistema notifica de forma pasiva posibles conflictos lógicos (ej. un personaje etiquetado en dos lugares distintos a la misma hora). No restringe ni bloquea el proceso creativo del usuario, dejando la responsabilidad final de la consistencia narrativa en manos del autor.
 
- [ ] **Mapas Interactivos y Evolución Geográfica:**
  - **Arquitectura Base (Imágenes + SVG):** El usuario carga una imagen estática (mapa) y el sistema superpone una capa transparente (Canvas/SVG). En esta capa superior es donde se dibujan las zonas interactivas, los pines y se alojan los metadatos.
  - **Herramientas de Dibujo Dual:**
    - **Dibujo Vectorial Estructurado:** Herramienta principal para trazar polígonos precisos que definen territorios (continentes, reinos, etc.), rutas y áreas de efecto. Estas formas geométricas están vinculadas a las entidades del worldbuilding.
    - **Bocetos a Mano Alzada (Opcional):** Integración de un lienzo tipo pizarra (Excalidraw) que permite al usuario esbozar mapas desde cero o realizar anotaciones rápidas directamente sobre el mapa, actuando como una capa de borrador no vinculante.
  - **Geometría Jerárquica y Optimización por Capas (Layers Independientes):** El sistema permite dibujar polígonos para representar contenciones territoriales anidadas (Ej. el contorno de un "Continente" alberga las fronteras de los "Reinos", que a su vez albergan "Ciudades"). Para garantizar un rendimiento óptimo al escalar la complejidad del mundo, el renderizado no agrupa todas las geometrías en un único lienzo (canvas) monolítico. Se emplean capas vectoriales independientes y modulares para cada jerarquía taxonómica. Esto permite al motor montar y desmontar de la memoria visual grupos enteros de formas dinámicamente, dependiendo del nivel de zoom (LOD) o los filtros activos, evitando cuellos de botella en la GPU al renderizar miles de polígonos simultáneamente.
  - **Filtros de Capa Taxonómica:** Controles integrados en el visor del mapa que permiten activar o desactivar la visualización por categorías. El usuario puede elegir, por ejemplo, ocultar temporalmente todas las ciudades y aldeas para observar un mapa limpio enfocado únicamente en los dominios de los Reinos.
  - **Pines y Marcadores Puntuales:** Además de las áreas poligonales, el sistema soporta la colocación de pines o iconos en coordenadas específicas para marcar puntos de interés que no constituyen un territorio (Ej. una cueva, un monumento, la ubicación de una batalla).
  - **Exploración Espacial Profunda (Enfoque / Drill-down):** Al hacer clic o seleccionar un área macro (como un Continente), el mapa aísla la vista resaltando o desplegando exclusivamente todo el contenido (sub-regiones, pines, entidades) que existe dentro de ese polígono. Además, soporta la transición a mapas nuevos (Ej. Clicar en la silueta de una ciudad puede cargar una imagen totalmente nueva que sirva de mapa detallado de las calles).
  - **Vinculación Universal de Entidades:** Cualquier punto (pin) o área (polígono) en el mapa puede ser vinculado bidireccionalmente a cualquier otra entidad del proyecto. Esto permite, por ejemplo, definir el lugar de nacimiento de un personaje, la última ubicación conocida de un artefacto, o la sede de una facción directamente en el mapa.
  - **Mapas ligados al Tiempo (Capas Históricas):** El mapa evoluciona junto con la historia.
    - **Imágenes Superpuestas (Overlays) por Periodo:** En lugar de requerir un mapa global nuevo para cada cambio, el usuario puede cargar imágenes parciales (ej. el dibujo de una ciudad en ruinas). Esta imagen se posiciona, escala y superpone libremente sobre las coordenadas del mapa base original, activándose visualmente según la línea de tiempo (ej. a partir del Año 5).
    - **Vista de Tiempo en el Mapa:** Al abrir un mapa, se muestra una línea de tiempo integrada filtrada por defecto para exhibir únicamente los puntos cronológicos donde el mapa sufre modificaciones visuales.
    - **Vista Geográfica Completa:** Expandir la línea de tiempo dentro del mapa muestra de forma gráfica todos los eventos vinculados a esa ubicación en cada período (vista diaria por defecto).
    - **Vista de Evolución Geocronológica (Híbrida):** Un modo de visualización avanzado que fusiona el mapa y la línea de tiempo. Permite al usuario "reproducir" la historia visualmente. Al mover un cursor a lo largo de la línea de tiempo, el mapa se actualiza en tiempo real para mostrar la evolución de fronteras, la aparición o desaparición de ciudades, las rutas de movimiento de personajes clave, y las áreas afectadas por eventos históricos.
    
- [ ] **Sincronización de Entidades y Referencias:**
  - **Referencias Cruzadas Universales, Alias y Menciones Rápidas:** Uso de sintaxis estilo wiki-links `[[Nombre de Entidad]]` para crear enlaces formales de forma manual. Soporta nativamente **Alias** (`[[Nombre Real|Apodo o Pronombre]]`), permitiendo que el texto fluya naturalmente en el manuscrito (ej. escribir `[[Rey Arthur|el anciano]]`). Adicionalmente, el símbolo `@` funciona como un atajo de teclado (mención rápida) que invoca instantáneamente un menú desplegable de autocompletado en la línea de texto; al seleccionar una entidad, el sistema la formatea de fondo como un wiki-link válido sin obligar al usuario a escribir corchetes
  - **Diccionario Interno y Autocompletado:** La app mantiene un índice dinámico de entidades por proyecto con soporte para búsqueda difusa (*fuzzy search*). Al escribir en el editor o en los campos de las fichas, el sistema sugiere vínculos en tiempo real, tolerando pequeños errores ortográficos.
  - **Previsualización Flotante (Hover Previews):** Al pasar el cursor sobre un enlace en el texto, se despliega una pequeña tarjeta o popover mostrando un resumen de la entidad (imagen, metadatos clave, descripción corta), evitando que el usuario deba cambiar de vista y perder su flujo de concentración.
  - **Panel de Backlinks (Menciones):** Integrado en la barra lateral derecha. Muestra una lista interactiva de todos los archivos y párrafos exactos que enlazan a la entidad activa. El motor también es capaz de rastrear "menciones no vinculadas" (cuando el nombre aparece escrito en el texto, pero el usuario olvidó ponerle corchetes) y sugerir convertirlas en enlaces con un clic.
  - **Auto-Refactorización (Renombrado Global Inteligente):** Si el usuario cambia el nombre de un archivo o ficha (Ej. de "Príncipe William" a "Rey William"), el motor en Rust escanea y actualiza silenciosamente en milisegundos todos los `[[Príncipe William]]` esparcidos por el proyecto. Esto previene en su totalidad la aparición de enlaces rotos, manteniendo la integridad referencial intacta.
  - **Grafo de Conocimiento (Nodos) y Rendimiento:** Visualización de las conexiones bidireccionales generadas por los enlaces entre "nodos" (personaje <-> evento <-> ubicación). Para optimizar el rendimiento, el grafo no se recalcula ni se genera desde cero al iniciar la aplicación. Se almacena y persiste en una base de datos local (ej. SQLite). La actualización del grafo ocurre exclusivamente bajo demanda al abrir su función/vista. El usuario tendrá la opción de activar o desactivar esta actualización automática al ingresar a la herramienta.
    - **Filtrado por Categoría:** La interfaz del grafo incluye un panel de control (en la barra lateral derecha) que permite al usuario filtrar los nodos visibles por su categoría taxonómica. Esto permite aislar y analizar relaciones específicas, como ver únicamente los nodos de "Personajes" y "Facciones", ocultando todo el resto.
  - **Fuente de la Verdad y Política de Desempate:** El sistema de archivos (File System) local es la única fuente de verdad absoluta. Si durante la Reconciliación de Estado impulsada por Rust se detecta una contradicción entre los metadatos YAML de un archivo físico y el índice guardado en SQLite (ej. el archivo fue editado con el bloc de notas de Windows), **el archivo físico siempre gana** y sobrescribe la caché en SQLite, eliminando nodos fantasmas o actualizando atributos.

- [ ] **Motor de Compilación y Exportación (Proceso Complejo):**
  - **Manuscrito vs. Worldbuilding:** Diferenciación clara al exportar. El usuario puede seleccionar compilar únicamente el `/Manuscrito` (ordenada jerárquicamente por tomos, capítulos, escenas) en un documento de lectura limpia, ignorando toda la sintaxis técnica del editor (`+++`, YAML).
  - **Exclusión de Escenas Paralelas:** Para proteger la integridad de la novela, el motor de compilación excluye de forma automática e inteligente la subcarpeta `/Manuscrito/Escenas_Paralelas` de todas las exportaciones editoriales, garantizando que estos eventos simultáneos o anotaciones "fuera de cámara" no aparezcan en el documento de lectura final.
  - **Formatos de Manuscrito:** Soporte para formatos estándar de la industria editorial (DOCX, PDF, EPUB).
  - **Glosarios y Exportación a Wiki HTML:** Opciones avanzadas de procesamiento. El motor inteligente puede extraer todas las referencias cruzadas utilizadas en el manuscrito para compilar un apéndice/glosario automatizado al final del libro físico. Además, ofrece la capacidad de exportar toda la carpeta de `/Worldbuilding` como un **Wiki interactivo e independiente en HTML**. Esto compila un mini-sitio web offline (conservando la navegación, los enlaces cruzados funcionales, las imágenes y el diseño CSS), ideal para compartir la "biblia" del mundo con beta-readers, coautores o fans sin requerir que instalen la aplicación.
  - **Exportación Estructurada (Para Game Devs):** Opción orientada a diseñadores narrativos para exportar el diccionario interno, el árbol de diálogos/bloques o el grafo relacional en formatos estructurados (como JSON) para ser consumidos directamente por motores gráficos (Unity, Unreal, Godot).
  - **Portabilidad Total (Empaquetado de Proyecto):** Opción para exportar el proyecto íntegro (archivos Markdown, imágenes y configuraciones) en un archivo `.zip`. El usuario dispondrá de un interruptor para decidir si desea incluir el historial de versiones oculto (`.git`) —asumiendo un mayor peso del archivo pero conservando los *snapshots*— o si prefiere un "Clean Export" que empaquete únicamente el estado actual de los textos.

- [ ] **Control de Versiones e Instantáneas (Snapshots):**
  - **Integración Git Transparente (Abstracción Total):** El sistema utiliza un repositorio Git local instanciado de forma invisible. La interfaz oculta por completo la terminología técnica compleja (commits, branches, merges). El escritor solo interactúa con conceptos amigables como "Versiones", "Historial" y "Restaurar".
  - **Instantáneas Manuales (Puntos de Control):** El usuario puede tomar una "foto" del estado actual de un capítulo o de todo el proyecto antes de realizar reescrituras mayores, asignándole un nombre descriptivo o nota (Ej. "Borrador 1", "Antes de eliminar a X personaje").
  - **Autoguardado Inteligente (Snapshots Automáticos):** El motor genera copias de seguridad temporales invisibles periódicamente o tras detectar eventos de riesgo (ej. si el usuario selecciona y borra múltiples párrafos de golpe), actuando como una red de seguridad contra accidentes (Ctrl+Z extendido).
  - **Comparación Visual (Diff View):** Al explorar el historial, la aplicación ofrece una vista dividida que compara la versión antigua con la actual, resaltando semánticamente (con colores verde y rojo) las palabras y párrafos exactos que fueron añadidos o eliminados. Esto permite rescatar fragmentos específicos del pasado sin tener que restaurar todo el documento a ciegas.

- [ ] **Características de Calidad de Vida (QoL) y Herramientas del Autor:**

  - **Estadísticas, Analíticas y Metas (Gamificación):**
    - **Módulo de Dashboard:** Un módulo dedicado en la barra de navegación principal que presenta todas las métricas y análisis en un panel de control visual.
    - **Métricas de Escritura:**
      - **Conteo Granular:** Palabras, caracteres, párrafos y tiempo de lectura estimado, calculados por el backend en Rust y evaluables a nivel de bloque, escena, capítulo o proyecto completo.
      - **Gestor de Objetivos y Plazos:** Capacidad de establecer metas (ej. "50,000 palabras para el borrador") y plazos (ej. "Terminar Capítulo 5 antes del 30/11"). La interfaz muestra el progreso con barras, gráficos de `burndown` y notificaciones.
      - **Registro de Hábitos:** Calendario de constancia (Heatmap) y contador de rachas (streaks) para incentivar la escritura diaria, basado en el historial de snapshots de Git.
    - **Análisis Narrativo y de Estilo:**
      - **Análisis de "Tiempo en Pantalla" (Screen Time):** El sistema aprovecha el motor de `backlinks` para calcular y graficar qué porcentaje del manuscrito está dedicado a cada Personaje, Ubicación o Facción, ayudando a detectar entidades infrautilizadas.
      - **Análisis de Ritmo (Pacing):** Gráfico de barras que visualiza la longitud (en palabras) de cada capítulo o escena, permitiendo al autor identificar rápidamente picos o valles en el ritmo narrativo.
      - **Análisis de Frecuencia Léxica:** Herramienta para identificar las palabras más utilizadas en un texto, ayudando a detectar muletillas o repeticiones excesivas.
      - **Ratio Diálogo/Narración:** Métrica que calcula el porcentaje de texto que corresponde a diálogos (texto entre comillas) frente a la narración, ofreciendo una visión del estilo del capítulo.

  - **Modo Concentración (Focus Mode) y Entorno Inmersivo:**
    - **Transición Fluida a Pantalla Completa:** Al activarse, la aplicación entra en modo de pantalla completa nativo. La disposición de tres paneles colapsa con una animación fluida (gestionada por Framer Motion), ocultando todas las barras laterales y menús para eliminar el ruido visual y centrar el lienzo del texto. La salida del modo se realiza de forma intuitiva (ej. tecla `Esc` o un botón sutil al mover el cursor a los bordes).
    - **Foco de Escritura (Typewriter Scrolling):**
        - **Foco de Línea:** Opción para mantener la línea de texto actual siempre centrada verticalmente en la pantalla.
        - **Foco de Párrafo:** Alternativa que mantiene el párrafo activo resaltado mientras atenúa la opacidad del resto del documento.
    - **Gestor de Tiempo (Pomodoro Integrado):** Temporizador nativo y discreto para organizar sesiones de escritura. Incluye notificaciones visuales y sonoras (opcionales y personalizables) para marcar el inicio y fin de los ciclos de trabajo y descanso.
    - **Paisajes Sonoros (Ambient Sounds):** Reproductor de audio ambiental integrado con una selección de sonidos de fondo (ej. lluvia, cafetería, bosque) diseñados para fomentar la inmersión y bloquear distracciones externas.
    - **Interfaz Minimalista Personalizable:** El usuario puede configurar qué elementos mínimos permanecen visibles en el modo concentración, como un contador de palabras/caracteres o la meta de la sesión actual.
    
  - **Colaboración P2P (Peer-to-Peer) y Co-escritura (Arquitectura Base):**
    - **Estructura CRDT-Ready (Resolución de Conflictos):** El motor de edición (AST) y la estructura de archivos se diseñan bajo el paradigma de Tipos de Datos Replicados Libres de Conflictos (CRDTs, ej. Yjs). Esto asegura que si dos autores editan el mismo párrafo desconectados y luego se sincronizan, los cambios se fusionan matemáticamente. **Nota:** *Durante la sincronización P2P, la base de datos SQLite no viaja por la red*. Solo se transmiten las operaciones sobre los archivos `.md`. Cada cliente conectado actualiza su propia caché SQLite local en base a los archivos sincronizados.
    - **Sincronización Descentralizada (LAN y WebRTC):** Protocolos de conexión directa entre equipos. En la misma red local (LAN), los clientes se descubren automáticamente (ej. vía mDNS). Para conexiones remotas sobre internet, se utiliza WebRTC para establecer un túnel seguro P2P, eliminando la necesidad de que los datos pasen por servidores de terceros.
    - **Emparejamiento Seguro (Pairing) y Cifrado:** Las sesiones de co-escritura requieren autorización explícita. Los autores vinculan sus instancias mediante el intercambio de códigos de un solo uso o tokens criptográficos, garantizando que todo el tráfico de la red esté protegido por Cifrado de Extremo a Extremo (E2EE).
    - **Permisos Granulares (Control de Acceso):** El creador del proyecto ("Host") puede asignar roles estrictos a los colaboradores invitados. (Ej. Permitir que el coautor edite libremente la carpeta `/Worldbuilding`, pero otorgarle solo permisos de lectura o sugerencia en la carpeta `/Manuscrito`).
    - **Presencia e Indicadores Visuales (Awareness):** La interfaz incluye soporte base para renderizar cursores remotos con el nombre del coautor, avatares en la barra de navegación indicando quién está conectado, e indicadores a nivel de bloque de texto (para evitar que dos personas intenten reescribir el mismo diálogo simultáneamente).

## 🛡️ Filosofía, Privacidad y Compromiso con el Creador
- [ ] **100% Offline-First:** Las funciones principales de la aplicación no requieren conexión a internet.
- [ ] **Soberanía de Datos:** Todo el proyecto se guarda localmente en el equipo del usuario (ej. archivos de texto plano). Sin nubes obligatorias, protegiendo los textos de cambios de políticas comerciales, paywalls o uso para entrenamiento de IAs.
- [ ] **Libertad Absoluta y Personalización:** El usuario final posee el control total sobre la herramienta. Desde la estructura de las fichas modulares hasta la tematización de la UI, la aplicación está diseñada para moldearse a las preferencias de cada autor, garantizando un entorno de trabajo cómodo y sin imposiciones rígidas.
- [ ] **Respeto por el Proceso Creativo:** Concebida con un profundo respeto por los artistas, la herramienta elimina barreras artificiales. El objetivo principal es potenciar la imaginación y asegurar que la obra pertenezca siempre a su creador, construyendo una base ética que permita una monetización futura justa y transparente (sin secuestrar el trabajo del usuario detrás de barreras restrictivas).
- [ ] **Ecosistema de Plugins (Extensibilidad):** Arquitectura abierta con soporte para extensiones desarrolladas por la comunidad, permitiendo ampliar radicalmente las funciones narrativas de la aplicación.
- [ ] **Licencias Libres de Riesgo:** Priorización de herramientas base bajo licencias permisivas (MIT/Apache) asegurando que el motor principal pueda mantenerse, distribuirse y monetizarse en el futuro sin depender de licencias corporativas hostiles (como BSL) o suscripciones freemium forzadas.

## 🏗️ Visión Arquitectónica (Resumen Técnico)
- **Núcleo y Almacenamiento Base:** Backend de alto rendimiento (Rust/Tauri) operando 100% offline. Toda la información se almacena localmente en el File System como archivos de texto plano Markdown (`.md`) enriquecidos con frontmatter YAML.
- **Aislamiento de Caché y Grafos:** Cada proyecto mantiene su propia base de datos SQLite oculta (`.narralith/index.db`) exclusiva, encargada de indexar referencias, alimentar el autocompletado del diccionario y estructurar el Grafo de Conocimiento bajo demanda.
- **Procesamiento de Texto (AST & CRDT):** Parser personalizado que divide los documentos en bloques lógicos (`+++`) para asignar metadatos granulares. La arquitectura de datos se diseña bajo principios CRDT para habilitar la futura co-escritura P2P.
- **Interfaz WYSIWYM (3 Paneles):** Frontend en React que abstrae la complejidad técnica. Un lienzo central intercepta y oculta el código (YAML) ofreciendo escritura limpia, mientras una barra lateral dinámica gestiona todas las variables y capas.
- **Control de Versiones Invisible:** Historial de cambios, instantáneas y autoguardado respaldados por un repositorio Git local encubierto, ofreciendo vistas de comparación (Diff) sin fricción técnica.
- **Referencias Cruzadas Dinámicas:** Sintaxis de enlaces `[[links]]` con soporte de Alias y auto-refactorización (renombrado global) para prevenir enlaces rotos.
- **Geografía Interactiva:** Visor de mapas renderizado en capas vectoriales jerárquicas con optimización de memoria, combinando geometría territorial estructurada y bocetos a mano alzada.
- **Motor de Exportación:** Compilación modular capaz de exportar el manuscrito para editoriales (EPUB, PDF, DOCX), el lore como un Wiki interactivo en HTML, y la metadata del mundo como JSON estructurado para Game Devs.
