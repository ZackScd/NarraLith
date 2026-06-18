# Spec — Módulo de mapas

> Define el **qué** del módulo de mapas (Era III).  
> **Inventario y decisiones MAP-000:** [`plans/Fase F/MAP-000-inventory-purge.md`](plans/Fase%20F/MAP-000-inventory-purge.md) ✅  
> **Ejecución:** [`maps-roadmap.md`](maps-roadmap.md) · Purga física legacy → inicio **MAP-001**.

| Campo | Valor |
|-------|--------|
| **Estado** | 🔄 En elaboración (decisiones MAP-000 cerradas jun 2026) |
| **Ámbito** | Módulo Mapas + integración con manuscrito y tiempo |
| **Era objetivo** | III (`03-ROADMAP.md` § Era III — Mapas y espacio) |
| **Precede a** | Worldbuilding v2, ubicación inline en manuscrito |

### Preguntas abiertas (visibles)

Decisiones **cerradas** recientes: §7. **Aún sin cerrar:**

| # | Pregunta | Dónde |
|---|----------|-------|
| — | *(ninguna crítica de arquitectura tras jun 2026)* | — |
| 1 | Visualización de eventos / historia en el mapa | §4bis (post-WB; usuario detallará) |
| 7 | Visualización rica ubicación (iconos, filtros, rutas) — refactor post-WB | §4bis.4.3 |
| 3 | Forma del hotspot; UX volver atrás | §5.5 |
| 4 | Lista cerrada de pinceles v1; estudio ↔ capas internas | §3bis.4 |
| 5 | Selector de mapas; convivencia fijado vs último visto | §3ter.1 |
| 6 | ¿Barra T de solo lectura en modo edición al dibujar parches? | §8.2 |

---


## 1. Propósito

El módulo de mapas existe para **crear mapas** del mundo del proyecto — **tantos como haga falta** (varios mundos, regiones disjuntas, etc.).

Ese mapa participa en la misma **lógica de etiquetas** que el manuscrito: poder especificar **qué ocurre en qué lugar y en qué día**. Sobre esa base, el usuario debe poder ver una **línea de tiempo propia del mapa** — dentro del propio mapa — y observar cómo evoluciona la historia a través del mundo.

```text
Mapa (espacio)  +  Etiquetas tiempo/ubicación (como manuscrito)  →  Timeline del mapa
```

### Integración con manuscrito y tiempo

| Eje | Intención |
|-----|-----------|
| **Manuscrito** | Misma familia de etiquetas para anclar qué ocurre, dónde y cuándo |
| **Tiempo** | Reutilizar calendario / marcas del proyecto; el mapa principal toma por defecto la **primera marca del manuscrito** como «Desde» |
| **Timeline del mapa** | Línea de tiempo propia: cambios del mapa, eventos y movimientos de la historia |
| **Ubicación ↔ calendario** | Integración fuerte: tiempo y lugar comparten el mismo motor |
| **Etiquetas ubicación** | El **sistema de etiquetas** (tiempo + espacio) existe y alimenta el mapa vía manuscrito (§4bis.1, §4bis.4) |
| **Visualización en mapa** | Era III: marcas **X** mínimas donde hay ubicación en T; **refactor visual** post-WB v2 (§4bis.4) |

> Insertar/editar ubicación **desde el mapa** (picker, pin interactivo, vínculo WB bidireccional) se difiere; **mostrar** ubicaciones del manuscrito en el lienzo sí entra en Era III, en forma stub.

> **Nota:** Las fechas **1950 / 2000 / 2100** (y nombres A, B, 1…) usadas en este documento son **solo ejemplos ilustrativos** para explicar el comportamiento. No imponen límites de cantidad, rango temporal ni nombres fijos en el producto.

---

## 2. Estado actual (referencia — no tocar aún)

Capturas de la UI existente (jun 2026):

| Vista | Qué muestra hoy |
|-------|-----------------|
| **Mapa interactivo** | Leaflet + rejilla; capa «General»; propiedades de elemento (etiqueta, entidad vinculada, mapa detallado); capas históricas por época |
| **Modo dibujo** | Lienzo con rejilla; lápiz/goma/zoom/pan; **9 colores fijos**; 3 pinceles (`pen`, `pencil`, `marker`); **sin** selector custom ni presión de tableta |
| **Crear mapa** | Lienzo vacío o importar imagen; nombre; **tres presets** de tamaño (1200×800, 2400×1600, 4000×3000) |

### Código existente (inventario para purga futura)

| Capa | Ubicación |
|------|-----------|
| UI | `src/modules/maps/` |
| Estado / hooks | `useMapStore.ts`, `useMapProject.ts`, `mapMutations.ts` |
| Tipos | `lib/types/maps.ts`, `mapDrawing.ts` |
| Rust | `commands/maps.rs`, `fs/maps_store.rs` (~14 IPC) |
| Stack actual | Leaflet `CRS.Simple`, overlays de imagen, estudio dibujo tipo Excalidraw |

**Decisión MAP-000 (2026-06-11):** **tierra quemada** — purgar casi todo; tabla explícita en [`MAP-000-inventory-purge.md`](plans/Fase%20F/MAP-000-inventory-purge.md). Purga física al iniciar **MAP-001**; barrido final **MAP-012**.

---

## 3. Creación del mapa y lienzo

### 3.1 Problema con el diseño actual

El diálogo **Crear mapa** es demasiado limitado: solo tres tamaños fijos y sin control de relación de aspecto ni edición del lienzo después de crear.

### 3.2 Requisitos del lienzo (nuevo)

#### Al crear

| Requisito | Descripción |
|-----------|-------------|
| **Tamaño libre** | El usuario define ancho y alto (no solo presets). Los presets pueden existir como atajos, no como única opción. |
| **Relación de aspecto (opcional)** | El usuario puede fijar una proporción (ej. 16:9, 4:3, personalizada). |
| **Autoajuste** | Si hay relación de aspecto activa, al cambiar un lado el otro se recalcula automáticamente. |
| **Origen** | Sigue habiendo al menos dos modos: **lienzo vacío** (rejilla) e **importar imagen** (confirmar si la imagen define tamaño inicial o se escala — pendiente). |

#### Después de crear

| Operación | Comportamiento |
|-----------|----------------|
| **Agrandar lienzo** | Añadir espacio dibujable **sin estirar** el contenido ya dibujado. El mapa existente permanece en su posición/escala; solo crece el área de trabajo (equivalente a ampliar el «papel», no a escalar el dibujo). |
| **Recortar lienzo** | Reducir el área de trabajo; definir qué ocurre con contenido fuera del nuevo borde (pendiente: aviso, borrado, o contenido oculto — usuario detallará). |

> Pendiente: bordes de expansión (¿solo derecha/abajo o en las cuatro direcciones?), unidades (px vs unidades lógicas), y si el lienzo tiene un «origen» fijo (0,0) al expandir.

---

## 3ter. Mapas del proyecto (multi-mundo)

Un **proyecto** puede contener **ilimitados mapas** (documentos de mapa). Cada uno representa un espacio propio — p. ej. un mundo de una saga multi-mundo, un plano, un reino distinto.

```text
Proyecto NarraLith
 ├── Mapa «Mundo A»     ← documento de mapa
 │    ├── dibujo principal (terreno de A)
 │    ├── secundarios[], hijos navegación[], timeline T…
 ├── Mapa «Mundo B»
 │    ├── dibujo principal (terreno de B)
 │    └── …
 └── Mapa «…»
```

| Concepto | Alcance | Cantidad |
|----------|---------|----------|
| **Mapa** (documento) | Contenedor de un mundo / espacio | **Ilimitados** en el proyecto |
| **Dibujo principal** | Terreno base **dentro de un mapa** | **Exactamente uno** por mapa |
| **Anclaje al abrir módulo** | Qué **mapa** (documento) carga al entrar a Mapas | Ver §3ter.1 |

> No confundir **mapa del proyecto** (contenedor, multi-mundo) con **dibujo principal** (archivo de terreno dentro de ese contenedor).

### 3ter.1 Qué mapa carga al abrir el módulo

Solo **un mapa del proyecto** se abre al iniciar el módulo Mapas. Cómo se elige:

| Modo | Comportamiento |
|------|----------------|
| **Fijado por el usuario** | El usuario marca **un mapa** como «abrir al iniciar» (`defaultOnOpen`). Solo **uno** puede llevar ese flag a la vez (al fijar otro, se desmarca el anterior). |
| **Último visto** | Preferencia de proyecto/usuario: al abrir Mapas, cargar el mapa **visto por última vez**. |
| **Último modificado** | Preferencia: cargar el mapa **editado más recientemente**. |

```text
Preferencia «al abrir Mapas»  ∈  { fijado, últimoVisto, últimoModificado }

Si fijado     →  el mapa con defaultOnOpen = true
Si últimoVisto / últimoModificado  →  heurística; ignora o complementa el flag (pendiente UX)
```

- El usuario **cambia de mapa** dentro del módulo en cualquier momento (selector / explorador de mapas — UX pendiente).
- Cada mapa conserva su propio **«Desde»**, secundarios, hijos y estado de timeline al volver a él.

> **Pendiente UX:** selector de mapas en la barra superior; si en modo «último visto» convive con un mapa fijado como favorito.

---

## 3bis. Herramientas de dibujo (estudio)

El usuario dibuja el contenido de cada archivo (principal, secundario o hijo de navegación) en **modo edición** (✏️, §8) — un estudio tipo Sketchbook dentro del mismo módulo. La referencia de UX es **Autodesk Sketchbook** (la app gratuita dejó de distribuirse en 2021; el producto siguió bajo otros editores — se toma como **inspiración de flujo**, no como requisito de paridad 1:1).

### 3bis.1 Estado actual en código

| Aspecto | Hoy (`MapDrawStudio`, `mapDrawing.ts`) |
|---------|----------------------------------------|
| Colores | Paleta fija `STUDIO_PALETTE` (9 swatches) |
| Pinceles | 3 presets: `pen`, `pencil`, `marker` |
| Herramientas | Pincel + goma; undo/redo; zoom/pan |
| Presión tableta | **No** — trazos con grosor/opacidad fijos por preset |
| Capas en estudio | Una sola capa de trazos (capas internas del spec aún no en estudio) |

### 3bis.2 Requisitos (nuevo)

#### Color

| Requisito | Descripción |
|-----------|-------------|
| **Paleta predefinida** | Mantener swatches rápidos (como hoy y como la tira de Sketchbook). |
| **Color personalizado** | Selector adicional: elegir **cualquier color** (rueda HSV, hex, o «color puck» — detalle UX pendiente). |
| **Color activo** | Un color «en uso» visible en todo momento mientras se dibuja. |

#### Pinceles

| Requisito | Descripción |
|-----------|-------------|
| **Varios pinceles** | Más de un tipo de trazo (lápiz, rotulador, pincel suave, aerógrafo… — lista final pendiente). |
| **Preset + ajuste** | Cada pincel con tamaño y opacidad base; el usuario puede afinar (como los presets actuales, ampliados). |
| **Selector de pinceles** | Paleta o lista de pinceles accesible sin salir del lienzo (inspiración: columna izquierda de Sketchbook). |

#### Tableta gráfica — sensibilidad a la presión

| Requisito | Descripción |
|-----------|-------------|
| **Presión del lápiz** | Si el dispositivo expone presión (`Pointer Events` / drivers Wacom / Windows Ink), el trazo debe reflejarla. |
| **Qué modula la presión** | Mínimo: **grosor** del trazo. Deseable: también **opacidad** según el pincel (pendiente por pincel). |
| **Ratón** | Sin presión → grosor/opacidad del preset elegido (comportamiento actual). |
| **Persistencia** | Ver §3bis.2.1 — presión **normalizada por punto** (decisión cerrada). |
| **Sensación lápiz** | Como Sketchbook: trazos **débiles o fuertes** según presión; el preset `pencil` debe sentirse como lápiz real (grosor **y** opacidad modulados). |

#### 3bis.2.1 Persistencia de presión (decisión de esquema)

| Opción | Veredicto |
|--------|-----------|
| Guardar `pressure` normalizado **0.0–1.0** por punto | **✅ Elegido** — flexible: al renderizar se recalcula grosor/opacidad según el pincel activo (cambia el preset sin perder el gesto). |
| Guardar `size`/`opacity` ya calculados por punto | ❌ Descartado como único formato — dificulta cambiar pincel después y el efecto lápiz real. |

```text
Entrada                 drawing.json (por punto)           Render
 ratón ──► sin p ──►   { x, y }                    ──►   grosor/opacidad del preset
 tableta ─ presión ─►   { x, y, pressure: 0.0–1.0 } ──►   brushEngine(preset, pressure)
                                                          → lápiz débil/fuerte tipo Sketchbook
```

- **Ratón:** omitir `pressure` o fijar `1.0` → trazo uniforme.
- **Pincel `pencil`:** curva de presión que afecte **tamaño y opacidad** (prioridad UX del usuario).
- **Versión** `drawing.json`: incrementar cuando se añada `pressure` (migración de trazos v1 sin presión).

### 3bis.3 Inspiración Sketchbook (orientativa)

Elementos de referencia para el rediseño del estudio — **no todos obligatorios en v1**:

| Elemento Sketchbook | Aplicación en NarraLith |
|---------------------|-------------------------|
| Lienzo centrado, UI flotante | Estudio a pantalla completa dentro del módulo Mapas |
| «Color puck» / rueda de color | Color predefinido + **personalizado** |
| Columna de pinceles | Varios pinceles con icono |
| Panel de capas (derecha) | Conectar con **capas internas** §4.1 (hoy el estudio no las tiene) |
| Barra superior (deshacer, guías…) | Undo/redo ya existen; guías/reglas pendiente |

### 3bis.4 Pendiente de detallar

- Lista cerrada de pinceles v1.
- Cuentagotas, relleno, texto en el mapa.
- Inclinación del lápiz (tilt) en tableta.
- ~~Integración estudio ↔ capas internas~~ → **✅ cerrado MAP-000:** un archivo JSON **por dibujo**; capas internas como `layers[]` **dentro** del mismo archivo (no un archivo por capa).
- Motor de render: evolucionar canvas 2D actual vs biblioteca con presión nativa.

---

## 4. Tres sistemas de capas (+ tiempo)

El módulo combina **tres sistemas de capas** ortogonales. No confundir:

| Sistema | Qué es | Eje |
|---------|--------|-----|
| **1 — Capas internas** | Planos de dibujo **dentro de un archivo** | Detalle / edición |
| **2 — Superposición temporal** | Dibujos secundarios **parche** sobre el principal | Tiempo (§4.3–4.4) |
| **3 — Navegación interactiva** | **Zonas clicables** que cargan otro dibujo | Espacio / zoom lógico (§5) |
| *(compositor)* | **Timeline del mapa** elige qué parches temporales activos en T | Tiempo |

```text
Sistema 1 (interno)          Sistema 2 (temporal)           Sistema 3 (navegación)
┌─ Dibujo A ─────────┐       Secundario parche ──┐          ┌─ Dibujo padre ─────┐
│ capa 3, 2, 1       │              ↓ superpone  │          │  Rio, Ciudad       │
└────────────────────┘       ┌─ Principal ─────┐ │          │    ╭── hotspot ──╮ │
                               │  terreno base   │ │          │    │  (clic)     │ │
                               └─────────────────┘ │          │    ╰──────┬──────╯ │
                                        ↑          │          └───────────┼────────┘
                              Timeline en T ──────┘                      │ carga
                                                                           ▼
                                                               ┌─ Dibujo hijo ──────┐
                                                               │ «mapa de la ciudad»│
                                                               │  (puede tener más  │
                                                               │   hotspots…)       │
                                                               └────────────────────┘
```

### 4.0 Flexibilidad — sin restricciones artificiales

| Principio | Implicación |
|-----------|-------------|
| **Mapas ilimitados** | Tantos **documentos de mapa** (mundos) como haga falta — §3ter. |
| **Cantidad libre** | Dentro de cada mapa: tantos secundarios, hijos de navegación, etc. como haga falta. |
| **Un dibujo principal por mapa** | Cada **mapa** tiene **un** dibujo de terreno base (categoría principal §4.2). Varios mundos = varios mapas, cada uno con su principal. |
| **Un mapa al abrir módulo** | Al entrar a Mapas se carga **un** documento de mapa según §3ter.1 (fijado / último visto / último modificado). |
| **Apilamiento libre** | Un secundario puede superponerse **sobre otro secundario** (pila arbitraria de overlays). |
| **Rol del dibujo principal** | Terreno base del mapa activo, coordenadas compartidas y ancla **«Desde»** de ese mapa. |
| **Fechas de ejemplo** | 1950, 2000, 2100, A, B… son **pedagogía del spec**, no constantes del producto. |

```text
Al abrir módulo Mapas  →  carga un mapa del proyecto (§3ter.1)
Dentro del mapa activo →  dibujo principal + secundarios + hijos según T y navegación
```

### Categorías de dibujo

Habrá más categorías en el futuro. Por ahora:

| Categoría | Rol | Archivo |
|-----------|-----|---------|
| **Dibujo principal** | Terreno base del **mapa activo** (un archivo por mapa) | Archivo con capas internas |
| **Dibujo secundario** | Parche temporal superpuesto (histórico o futuro) | Archivo con capas internas + transparencia fuera de la zona editada |
| **Dibujo enlazado (hijo)** | Mapa de detalle cargado al **clic** en una zona del padre | Archivo independiente; ver §5 |

Cada **dibujo (archivo)** lleva en metadatos una **etiqueta de tiempo** (sistemas 1–2). El principal (o el principal activo) define la etiqueta **«Desde»** (origen local del mapa). Los **hotspots** de navegación (sistema 3) enlazan a dibujos hijo sin sustituir la lógica temporal.

```text
Mapa activo (un mundo)
 ├── Dibujo principal (×1)          ← «Desde» de este mapa
 │    └── capas internas (ilimitadas)
 ├── Dibujos secundarios[]          ← parches temporales
 └── Dibujos hijo (navegación)[]    ← hotspots §5
```

---

### 4.1 Capas internas (dentro de un dibujo)

> Boceto: **imagen 1** — planos apilados.

Cada **dibujo es un archivo** con su **propio stack de capas internas**. El usuario puede repartir el detalle en tantas capas como quiera (costas, relieve, vegetación, anotaciones…) sin mezclar trazos.

| Propiedad | Descripción |
|-----------|-------------|
| **Ámbito** | Solo dentro de ese archivo; no se comparten entre principal y secundarios |
| **Cantidad** | Sin límite práctico definido aún |
| **Controles** | Pendiente: visibilidad, orden, bloqueo, opacidad por capa |

```text
Dibujo «principal» (archivo)
 ├── capa interna 3
 ├── capa interna 2
 └── capa interna 1

Dibujo secundario «A» (archivo distinto)
 ├── capa interna …
 └── capa interna 1
```

---

### 4.2 Dibujo principal (terreno base)

Donde se dibuja **todo el terreno principal**. Sujeto al **tiempo global** del proyecto, con ancla local:

| Metadato | Comportamiento |
|----------|----------------|
| **Etiqueta «Desde»** | **Año 0 solo para este mapa** (no redefine el calendario del proyecto). |
| **Valor por defecto** | La **primera marca de tiempo del manuscrito** del proyecto. |
| **Editable** | Manual en cualquier momento. |
| **Unicidad** | **Uno por mapa** (documento de mundo). No compartido entre mapas del proyecto. |
| **Al abrir el módulo** | No define solo la apertura: es el terreno del **mapa activo** (§3ter). |
| **En composición** | Base bajo secundarios activos en T dentro del mapa activo. |

---

### 4.3 Dibujo secundario (parche histórico transparente)

> Boceto general: secundario **encima** del principal, como capa histórica (archivo distinto, no una capa interna del principal).

Cada secundario es **otro archivo** con capas internas propias. Comparte **dimensiones y origen** con el principal para alinear coordenadas.

#### Parche local — solo la zona que cambia

El secundario **no tiene que cubrir todo el lienzo**. El usuario dibuja únicamente el área que difiere respecto al estado que reemplaza o complementa; el **resto del archivo queda vacío y transparente**, de modo que al componer solo se superpone la **zona específica** que cambia.

| Propiedad | Descripción |
|-----------|-------------|
| **Extensión del parche** | Pequeña o grande — **a decisión del usuario** (desde un barrio hasta un continente). |
| **Fuera del parche** | Píxeles transparentes; se ve el principal (u otro secundario inferior en la pila). |
| **Alineación** | Misma rejilla / mismas coordenadas que el principal. |

#### Ejemplo ilustrativo (río + ciudad → ruinas)

> Fechas **1950 / 2000** son ejemplo; el mecanismo aplica a cualquier par de marcas temporales.

**Estado en T₁ (boceto «mapa en año 1950»):**

```text
[archivo secundario o composición en T₁]
 ┌─────────────────────────────┐
 │         Rio                 │
 │                             │
 │   ┌──────┐                  │
 │   │Ciudad│                  │
 │   └──────┘                  │
 └─────────────────────────────┘
```

**Estado en T₂ — año 0 del mapa (boceto «mapa en el 2000»):**

El **principal** conserva el terreno común (p. ej. el río). Un **secundario** aporta solo el parche de **ruinas** en la zona donde antes estaba la ciudad; el resto del lienzo secundario es transparente.

```text
Principal (cargado al iniciar / base en T₂)     Secundario (parche en T₂)
 ┌─────────────────────────────┐               ┌─────────────────────────────┐
 │         Rio                 │               │  (transparente)             │
 │                             │      +        │      ┌──────┐               │
 │   (zona ciudad: base o       │               │      │RUINA │  ← solo esto   │
 │    vacío según diseño)      │               │      └──────┘    es opaco    │
 └─────────────────────────────┘               └─────────────────────────────┘
                    ═══════════════════════════════════════
 Composición en pantalla: Rio completo + parche RUINA superpuesto en la zona
```

En T₁, un secundario distinto (o la composición activa hacia atrás desde T₁) puede mostrar la **ciudad intacta** en esa misma zona; en T₂, el parche de **ruinas** la sustituye visualmente sin redibujar el mundo entero.

#### Regla de visibilidad temporal

Al consultar el mapa en una fecha **T** (cursor de la **timeline del mapa**):

| Condición | Cuándo entra el dibujo secundario en la composición |
|-----------|-----------------------------------------------------|
| `tiempo_secundario` **≥** `Desde` del principal | Activo **desde** `tiempo_secundario` **hacia adelante** (inclusive). |
| `tiempo_secundario` **<** `Desde` del principal | Activo **desde** `tiempo_secundario` **hacia atrás** (inclusive). |

Las superposiciones «futuras» cubren el estado del principal a partir de su fecha; las «pasadas» muestran cómo era el mundo **antes** del origen del mapa.

#### 4.3.1 Varios secundarios activos a la vez (apilamiento)

Varios dibujos secundarios pueden estar **activos simultáneamente** en la misma fecha **T** si sus reglas temporales lo permiten. No se ocultan entre sí por defecto: cada uno es una **capa superpuesta** encima del principal (y encima de secundarios inferiores en la pila).

```text
Principal (Desde = 2000)
    +
Secundario 2015 — parche zona oeste
    +
Secundario 2017 — parche zona este     ← otra zona, otro año de inicio
    ═══════════════════════════════════
En T = 2020  →  se ven AMBOS parches a la vez (+ el principal debajo)
```

| Principio | Descripción |
|-----------|-------------|
| **Zonas distintas** | Cada parche en su región; en T posterior a todos los inicios, **todos** los secundarios vigentes se componen juntos. |
| **Apilar** | Secundario sobre secundario = **superponer** otra capa; la anterior **sigue existiendo** debajo (no se borra del proyecto). |
| **Orden de pintado (z-order)** | Por defecto: orden cronológico de **inicio** (más antiguo abajo, más reciente arriba) en la zona de solapamiento. |

**Ejemplo (usuario):** principal año 2000 → secundario **2015** (cambio en zona A) → secundario **2017** (cambio en zona B) → en **2020** se ven los dos cambios **al mismo tiempo**.

#### 4.3.2 Mismo lugar, nuevo cambio — dos modos

Si en **T = 2030** hace falta otro cambio en la **misma zona** que ya tenía un secundario (p. ej. el de 2015), el usuario elige al crear el nuevo parche:

| Modo | Nombre | Comportamiento |
|------|--------|----------------|
| **A** | **Apilar** | Dibujar **encima** del secundario de 2015. El de 2015 **no se oculta**; el nuevo (2030) queda **arriba** en el solapamiento. Útil para cambios incrementales o cuando conviene conservar capas históricas visibles al rebobinar. |
| **B** | **Cierre y sustitución** | Poner **fin** al secundario de 2015 en una **fecha de cierre** (p. ej. 2028). A partir de esa fecha, en esa zona se muestra el **nuevo** dibujo (2030). Evita acumular muchas capas opacas en el mismo sitio — **optimización** recomendada si una ciudad (u otra zona) cambia muchas veces. |

```text
Modo A — Apilar (2030 sobre 2015)          Modo B — Cierre (fin 2015 → nuevo desde 2028)

  [Sec 2030]                                 [Sec 2030] solo desde 2028
      ↓                                           ↓
  [Sec 2015] sigue activo sin fin            [Sec 2015] activo hasta 2028 ──X── fin
      ↓                                           ↓
  [Principal]                                [Principal]

T=2030: se ven 2015 + 2030 (2030 arriba)   T=2027: solo 2015  |  T=2030: solo 2030
```

| Metadato del secundario | Uso |
|-------------------------|-----|
| **`tiempo_inicio`** | Etiqueta de tiempo del parche (reglas § arriba). |
| **`tiempo_fin`** (opcional) | Solo en **modo B**: deja de componerse **después** de esta fecha (cierre). El siguiente secundario en la misma zona toma el relevo desde su `tiempo_inicio` (normalmente = `tiempo_fin` del anterior o el año acordado). |

> **Pendiente UX:** asistente al crear secundario en zona ya cubierta («¿Apilar o cerrar capa anterior?»); edición de `tiempo_fin` en propiedades del secundario.

---

### 4.4 Composición en la timeline del mapa

> Boceto: **imagen 3** — al avanzar o retroceder, cambia qué dibujos entran en la composición.

La **timeline del mapa** es una línea de tiempo **propia del módulo**. Muestra:

- Cambios físicos del mapa (parches secundarios activos en cada T).
- **Eventos** y **movimientos** de la historia vinculados al espacio.

Al mover el cursor en **T**, el sistema **compone** la pila de dibujos visibles (principal de base + secundarios activos, con posible secundario-sobre-secundario).

```text
        [sec A]              [principal]              [sec B]
           ↓                      ↓                       ↓
    ──── T₁ ──────── T₂ (año 0 del mapa) ──────── T₃ ────  ← timeline (ejemplo)
```

| Posición T (ejemplo) | Composición típica |
|----------------------|-------------------|
| **T₁** (pasado) | Principal + secundario(s) activos hacia atrás (p. ej. parche «ciudad») |
| **T₂** (año 0) | Principal cargado; solo parches cuyas reglas aplican en el origen |
| **T₃** (futuro) | Principal + secundario(s) activos hacia adelante (p. ej. parche «campo») |

Cada dibujo es un **archivo** con arte ya hecho; la timeline **conmuta composiciones**, no anima un único lienzo.

#### Reglas de visibilidad (recap)

| Condición del secundario | Activo cuando… |
|--------------------------|----------------|
| `tiempo_inicio ≥ Desde` | T en **adelante** desde `tiempo_inicio` (y T ≤ `tiempo_fin` si tiene cierre — §4.3.2 B) |
| `tiempo_inicio < Desde` | T en **atrás** desde `tiempo_inicio` |
| **`tiempo_fin` definido** | El secundario **deja de componerse** después de `tiempo_fin` (modo cierre) |

Varios secundarios vigentes en el mismo **T** se **componen todos** (§4.3.1); en solapamiento de zona, z-order por antigüedad de inicio salvo modo apilar explícito.

> **Pendiente:** transiciones visuales; UX del scrubber; sincronía con timeline global del proyecto.

---

## 4bis. Ubicación, calendario, timeline unificada y entidades

**Ubicación** está **fuertemente integrada al calendario**: no es un eje independiente del tiempo.

### Fuentes de datos

| Fuente | Rol |
|--------|-----|
| **Manuscrito** | Etiquetas de tiempo y ubicación; regla de «última marca activa» (§4bis.1). |
| **Worldbuilding** | Fichas de entidades, eventos, vínculos — **alimenta el mapa** cuando WB esté estable (hoy el módulo WB está disfuncional; el spec asume integración futura). |
| **Dibujos del mapa** | Parches temporales, navegación hijo — **misma timeline**, no relojes separados (§4bis.2). |

### 4bis.1 Regla manuscrito — ubicación y última etiqueta de tiempo

Al insertar **ubicación** en el manuscrito, el tiempo efectivo es la **última etiqueta de tiempo insertada** en el contexto de edición (p. ej. dentro del evento activo):

```text
Evento comienza en día X  →  barra / marca activa = X
  + ubicación A           →  A visible en mapa en fecha X
  + ubicación B           →  B también en X (misma marca, sin nueva etiqueta)
  + nueva etiqueta día Y
  + ubicación C           →  C en Y; A y B siguen ancladas en X
```

| Comportamiento | Descripción |
|----------------|-------------|
| **Acoplamiento** | Cada ubicación hereda la marca de tiempo **vigente** hasta que el usuario inserte otra. |
| **Mapa en T** | Con el cursor del mapa en **T**, se muestran las ubicaciones cuyo tiempo efectivo aplica en **T** (junto con parches y composición §4.4). |

> **Era III:** ubicaciones → **X** en T (§4bis.4.1). **Post-WB:** eventos, historia, movimientos, filtros por personaje (§4bis.4.3 — usuario detallará).

### 4bis.2 Timeline unificada (mapa + dibujos hijo)

Los **dibujos hijo** (§5) **no tienen timeline independiente**. Participan en la **misma línea de tiempo del mapa**, alimentada por manuscrito y WB:

| Principio | Implicación |
|-----------|-------------|
| **T global en el módulo** | Un cursor de tiempo **T** gobierna parches, ubicaciones y estado visible. |
| **Al entrar en hijo** | El motor **conserva T** (hereda del contexto padre / del scrubber del mapa). |
| **Composición en hijo** | Parches temporales y overlays del hijo se evalúan con el **mismo T**. |
| **Arquitectura** | Al cargar un dibujo hijo, el compositor recibe **T actual** — no reinicia el reloj. |

```text
Timeline mapa (T) ──► compositor
                         ├─► dibujo principal + secundarios
                         ├─► dibujo hijo activo (mismo T)
                         ├─► ubicaciones manuscrito @ T
                         └─► datos WB @ T (cuando exista)
```

### 4bis.3 Entidades en el mapa (post-WB v2)

| Capacidad | Descripción |
|-----------|-------------|
| **Consulta** | Calcular en qué **tiempo** y **lugar** está una entidad según manuscrito + WB. |
| **Representación rica** | Iconos por personaje, filtros, rutas, zonas — **refactor post-WB** (§4bis.4.3). |

En **Era III** las entidades no tienen visualización diferenciada; las ubicaciones del manuscrito comparten el marcador **X** stub.

### 4bis.4 Ubicación en el mapa — etiquetas sí, visualización stub

El **sistema de etiquetas** de tiempo y ubicación **debe existir** e integrarse con el compositor del mapa. Lo que se difiere no es leer ni mostrar ubicaciones, sino la **UX completa** y la **integración WB** (hoy disfuncional).

#### 4bis.4.1 Era III — qué sí entra

| Componente | Comportamiento |
|------------|----------------|
| **Etiquetas (manuscrito)** | El mapa **consume** ubicaciones ancladas con la regla §4bis.1 (última marca de tiempo activa). |
| **Compositor @ T** | En vista interactiva, con cursor en **T**, se dibujan marcas donde aplica cada ubicación. |
| **Marcador visual stub** | Por ahora: una **«X»** simple en cada punto con etiqueta de ubicación vigente en T. Sin iconos, sin filtros, sin vínculo WB en UI. |
| **Capa overlay** | Las X viven en una capa del compositor (no en el archivo de dibujo del estudio), separada del arte §3bis. |

```text
Manuscrito: {{location:…}} @ tiempo efectivo
        │
        ▼  (lee etiquetas + calendario)
Compositor @ T  ──►  por cada ubicación activa en T: dibujar «X» en coordenadas
```

- **No** implementar aún: colocar ubicación **desde el mapa** (clic → crea etiqueta), picker WB, pins con nombre de ficha, estilos por tipo de entidad.
- La regla §4bis.1 es **contrato activo** de Era III, no solo diseño futuro.

#### 4bis.4.2 Nota de refactor (post-WB v2)

La visualización **X** es **temporal**. Tras el **refactor de Worldbuilding**, tiempo y espacio quedarán **directamente integrados** en mapa ↔ manuscrito ↔ fichas. Se **reemplazará** el stub por un sistema rico; no es la UI definitiva.

> **Importante:** planificar el compositor y el modelo de datos para que el stub X se pueda sustituir sin rehacer arte, parches ni timeline.

#### 4bis.4.3 Visión post-WB (usuario documentará más adelante)

Ejemplos de lo que habilita WB v2 — **fuera de alcance Era III mapas**:

| Capacidad futura | Descripción |
|------------------|-------------|
| **Personajes por separado** | Varios protagonistas; ubicación de **cada uno** en el mapa, con estilo distinto. |
| **Filtros** | Mostrar/ocultar personajes, eventos, capas narrativas. |
| **Movimiento de eventos** | Ver **por dónde se mueve** un evento en el tiempo (trayectoria, no solo punto). |
| **Zonas semánticas** | Áreas de peligro (animales, facciones…), regiones WB vinculadas al lienzo. |
| **Edición bidireccional** | Marcar en mapa ↔ commit en manuscrito ↔ ficha WB, con ambas etiquetas tiempo/espacio. |

```text
Era III (ahora)                    WB v2 (después)
 · etiquetas leídas del MS    →     · tiempo + espacio integrados end-to-end
 · marcas «X» en T            →     · iconos, filtros, rutas, zonas
 · sin picker / sin WB UI     →     · personajes, eventos, peligros en el mapa
```

- El módulo WB actual está **disfuncional**; la UX rica se diseña contra **WB v2**, no contra el código legacy.

---

### 4.5 Relación con la UI actual

| UI actual (aprox.) | Spec nuevo |
|--------------------|------------|
| Capa «General» | Capas internas de un dibujo (probablemente del principal) |
| «Capas históricas» / «Añadir imagen por época» | Candidato a **dibujos secundarios** (archivos overlay + tiempo) |
| «Mapa detallado» en propiedades | **Navegación interactiva** (§5): zona → dibujo hijo |

**Aún pendiente por el usuario:**

- Más **categorías** además de principal / secundario.
- Orden de composición (z-order), opacidad, bloqueo, agrupación por capa.
- ~~Serialización en disco~~ → **✅ cerrado MAP-000:** ver **§9** (JSON por dibujo; secundarios transparentes fuera del parche).
- Sintaxis exacta de etiquetas tiempo/ubicación en metadatos (detalle en MAP-007/008).

---

## 5. Navegación interactiva (tercer sistema de capas)

> Bocetos: **imagen 1** (mapa padre con zona señalada) · **imagen 2** (hotspot en ciudad → carga «mapa de la ciudad»).

Permite **entrar** en regiones del mapa: dentro de un dibujo, el usuario **selecciona un área** y la asocia a **otro dibujo (archivo)** que se **carga al hacer clic** en esa zona.

### 5.1 Concepto

| Elemento | Descripción |
|----------|-------------|
| **Dibujo padre** | Mapa de contexto amplio (p. ej. continente con río y ciudad). |
| **Hotspot / zona de navegación** | Región del lienzo marcada por el usuario (forma libre o rectángulo — pendiente). |
| **Dibujo hijo** | Archivo de detalle que se abre al activar el hotspot (p. ej. «mapa de la ciudad»). |
| **Anidación** | El hijo es un dibujo **completo**: puede tener sus propias capas internas, parches temporales **y nuevos hotspots** (p. ej. edificio → interior). |

```text
Mapa mundo (padre)                    Clic en zona «Ciudad»
┌────────────────────────┐                    │
│      Rio               │                    ▼
│   ┌────────┐           │            Mapa ciudad (hijo)
│   │ Ciudad │ ◄─hotspot│            ┌────────────────────────┐
│   └────────┘           │            │  calles, edificios…    │
└────────────────────────┘            │  ┌────┐ ◄─ hotspot     │
                                      │  │Edif│ → mapa interior│
                                      │  └────┘                │
                                      └────────────────────────┘
```

### 5.2 Flujo de usuario

1. En modo edición del dibujo padre, el usuario **marca el área** que actuará como enlace (boceto imagen 1: flecha hacia la ciudad).
2. Crea o elige el **dibujo hijo** asociado (nuevo archivo o existente).
3. En modo **mapa interactivo**, al **clic** en el hotspot se **carga el dibujo hijo** a pantalla completa (o en el viewport del módulo).
4. Dentro del hijo, el mismo mecanismo puede repetirse **sin límite de profundidad** (ciudad → edificio → planta → habitación…).

### 5.3 Relación con los otros sistemas

| Sistema | Interacción |
|---------|-------------|
| **Capas internas (§4.1)** | Cada padre e hijo tiene su propio stack interno. |
| **Parches temporales (§4.3)** | Un hijo puede tener sus propios secundarios; se evalúan con el **mismo T** (§4bis.2). |
| **Timeline (§4.4)** | Navegación cambia el **dibujo activo**; **T no se reinicia** — compositor unificado. |

### 5.4 Distinción: navegación vs parche temporal

| | **Navegación (§5)** | **Secundario temporal (§4.3)** |
|--|----------------------|--------------------------------|
| **Disparador** | Clic del usuario en zona | Fecha T en la timeline |
| **Relación espacial** | Otro lienzo (mapa de detalle) | Mismo lienzo, parche transparente alineado |
| **Propósito** | Zoom lógico / entrar en región | Cambio histórico en la misma vista |

### 5.5 Pendiente de detallar

- Forma del hotspot (rectángulo, polígono, trazo cerrado).
- UX de **volver** (breadcrumb, botón atrás, mini-mapa).
- Vínculo a entidad WB desde la zona (¿además del dibujo hijo?).
- Serialización: metadatos del enlace padre → hijo en disco.

> **Hotspots:** se **definen** en modo edición; se **activan** (clic) solo en vista interactiva — §8.

---

## 8. Modos de vista: interactivo y edición

El módulo Mapas es **una sola pantalla** con **dos modos** (no apps ni rutas separadas). La UI actual («Ver mapa interactivo» / «Editar dibujo») anticipa este patrón.

### 8.1 Vista por defecto — mapa interactivo

| Aspecto | Comportamiento |
|---------|----------------|
| **Al abrir** | El mapa entra en **vista interactiva** por defecto (no en modo dibujo). |
| **Compositor** | Composición en **T**: principal + secundarios + **marcas X** de ubicación (§4bis.4.1) + overlays narrativos futuros. |
| **Timeline** | El **scrubber** de la línea de tiempo vive aquí — es el modo de **consumo** espacio-temporal. |
| **Navegación §5** | Clic en **hotspots** para cargar dibujos hijo. |
| **Edición de trazos** | **No** — no se dibuja ni se borra arte en esta vista. |

### 8.2 Modo edición — ✏️

| Aspecto | Comportamiento |
|---------|----------------|
| **Entrada** | Solo al pulsar **✏️ Editar** (o equivalente). |
| **Salida** | Volver a vista interactiva (botón «Ver mapa interactivo» / cerrar edición). |
| **Herramientas** | Estudio §3bis: pinceles, colores, capas internas, goma, zoom/pan de trabajo. |
| **Hotspots** | Se **crean y marcan** zonas de navegación; no se navega a hijos al clic (eso es interactivo). |
| **Timeline** | **T se conserva** en el estado del mapa al cambiar de modo; el scrubber **no es el foco** del modo edición (pendiente: barra T de solo lectura mientras se dibuja un parche histórico). |

### 8.3 Arquitectura del compositor

```text
                    ┌─────────────────────────────────┐
                    │  Estado compartido del mapa      │
                    │  · mapa activo (§3ter)           │
                    │  · T (timeline unificada)        │
                    │  · dibujo/nivel navegación activo│
                    └───────────────┬─────────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              ▼                                           ▼
   Vista INTERACTIVA (default)              Modo EDICIÓN (✏️)
   · compositor renderiza                   · estudio dibujo
   · scrubber T                             · edita archivo activo
   · hotspots → hijos                       · define hotspots
   · sin trazos nuevos                      · sin navegación hijo
```

Un solo **motor de composición** alimenta la vista interactiva; el modo edición escribe en el **archivo de dibujo** que el compositor ya referencia para el mapa / capa / parche en edición.

### 8.4 Relación con la UI actual

| UI actual | Spec |
|-----------|------|
| Vista mapa (Leaflet, capas, propiedades) | **Vista interactiva** |
| «Editar dibujo» / estudio con paleta | **Modo edición ✏️** |
| «Ver mapa interactivo» desde estudio | Salir de edición → interactivo |

---

## 9. Persistencia en disco (decisiones Era III)

> Cerrado en MAP-000 (jun 2026). Implementación: **MAP-001** (esquema + IPC) · **MAP-005** (autosave estudio).

### 9.1 Principio: documento de trabajo, no imagen

El dibujo del mapa **no** se guarda como TIFF/PNG/PSD (formatos de **export** o fondos raster). Se guarda como **documento estructurado**: capas, trazos vectoriales, metadatos. La app **renderiza** a píxeles al visualizar; TIFF/PNG para compartir fuera de NarraLith queda **fuera de Era III**.

| Tipo | Formato | Rol |
|------|---------|-----|
| Dibujos editables | **JSON** | Fuente de verdad (trazos, capas, hotspots…) |
| Imágenes importadas | PNG / WebP / JPEG | Fondos, texturas, scans |
| Caché opcional | PNG | Acelerar render; regenerable |
| Índice proyecto mapas | JSON | `index.json`, `map.json` por mapa |
| SQLite | — | **No** para trazos en v1 |

### 9.2 Layout en disco (v2)

```text
.narralith/maps/
  index.json                         # lista mapas, defaultOnOpen, prefs apertura
  {mapId}/
    map.json                         # nombre, dimensiones lienzo, «Desde», refs
    drawings/
      principal.json                 # dibujo principal (layers[] + strokes)
      secondary/{id}.json            # parches temporales
      nav/{id}.json                  # dibujos hijo (navegación)
    hotspots.json                    # zonas → drawingId (o embebido en padre)
    assets/                          # PNG/WebP importados, cachés opcionales
```

**Un archivo JSON por dibujo** (principal, secundario, hijo). Las **capas internas** viven en `layers[]` **dentro** de ese archivo — no un archivo por capa (escala y guardado más simple a largo plazo).

### 9.3 Esquema `drawing.json` (v2, orientativo)

```json
{
  "version": 2,
  "width": 4000,
  "height": 3000,
  "layers": [
    {
      "id": "layer-relieve",
      "name": "Relieve",
      "visible": true,
      "opacity": 1,
      "locked": false,
      "strokes": [
        {
          "id": "stroke-001",
          "tool": "brush",
          "brush": "pencil",
          "color": "#2d5016",
          "baseSize": 4,
          "baseOpacity": 0.8,
          "points": [
            { "x": 1200, "y": 800, "pressure": 0.15 },
            { "x": 1210, "y": 825, "pressure": 0.91 }
          ]
        }
      ]
    }
  ]
}
```

- **`pressure` 0.0–1.0** por punto (tableta); omitido o `1.0` con ratón — ver §3bis.2.1.
- **`version`**: incrementar al añadir campos; migradores en Rust/TS.
- Secundarios: mismo esquema; píxeles fuera del parche = transparentes al componer.

### 9.4 Borrador sucio (no perder trabajo al cerrar)

Objetivo UX: igual sensación que manuscrito (trabajo no perdido al cerrar la app). **Mecanismo distinto** al FIX-007:

| Aspecto | Manuscrito (FIX-007) | Mapas (MAP-001/005) |
|---------|----------------------|---------------------|
| Unidad | Pestaña `.md` sucia | `drawing.json` activo en estudio |
| Persistencia al cerrar | `localStorage` | **Autosave debounced a disco** + flush en `pagehide` |
| Motivo | Texto pequeño (KB) | Trazos pueden ser MB; sin reconciliación global |
| Calendario (contraste) | Dirty solo en sesión; reconciliación cruzada con MS | Mapas **auto-contenido** — guardar trazo no invalida marcas del proyecto |

Opcional v1: hermano `*.autosave.json` para recuperación ante crash mid-write. **Sin** baseline/reconcile tipo FIX-010i.

### 9.5 Migración legacy

**Ninguna.** Solo entorno dev; borrar proyecto de prueba si hace falta. Esquema `.narralith/maps/` actual (`manifest.json`, `layers.json`, Excalidraw…) queda obsoleto.

### 9.6 Stack descartado (MAP-000)

Leaflet, Excalidraw, `layers.json` vectorial legacy, overlays imagen por época como modelo principal — reemplazados por compositor canvas 2D + dibujos JSON. Ver inventario: [`MAP-000-inventory-purge.md`](plans/Fase%20F/MAP-000-inventory-purge.md).

---

## 6. Secciones pendientes

El usuario irá añadiendo bloques. Lista de trabajo:

- [x] **§4** — Capas internas, principal/secundario, parches transparentes, composición temporal
- [x] **§4.0** — Sin límites de cantidad; secundario sobre secundario; principal = carga al iniciar módulo
- [x] **§4bis** — Ubicación ↔ calendario; posición de entidades (borrador)
- [x] **§5** — Navegación interactiva: hotspots → dibujo hijo, anidación recursiva
- [x] **§3ter** — N mapas por proyecto; un dibujo principal por mapa; apertura fijada / último visto / último modificado
- [x] **§3bis.2.1** — Presión 0.0–1.0 por punto; render tipo lápiz Sketchbook
- [x] **§4bis.2** — Timeline unificada; hijos heredan T; manuscrito + WB
- [x] **§4bis.1** — Ubicación en manuscrito = última etiqueta de tiempo activa
- [ ] **§5** — Forma del hotspot, volver atrás
- [x] **§4.3.1–4.3.2** — Varios secundarios en T; apilar vs cierre+sustitución
- [ ] **§4.3.2** — UX asistente «apilar o cerrar» al crear parche en zona ocupada
- [x] **§4bis.4.1** — Etiquetas consumidas del MS; marcas **X** en T (Era III stub)
- [ ] **§4bis.4.3** — Visualización rica + edición desde mapa — post-WB v2
- [ ] **Timeline del mapa** — UX scrubber; trayectorias de eventos (post-WB)
- [ ] **«¿Dónde está X en T?»** — Consulta por personaje + filtros — post-WB v2
- [x] **§3bis** — Color custom, varios pinceles, presión tableta; inspiración Sketchbook
- [ ] **§3bis** — Lista pinceles v1
- [x] **§3bis** — Estudio ↔ capas internas: un JSON/dibujo, `layers[]` dentro (MAP-000)
- [x] **§8** — Interactivo por defecto; edición solo con ✏️; scrubber en interactivo
- [x] **Persistencia** — §9: JSON + assets; autosave disco; sin SQLite v1 (MAP-000)
- [x] **Conservar vs purgar** — [`MAP-000-inventory-purge.md`](plans/Fase%20F/MAP-000-inventory-purge.md)
- [ ] **Fuera de alcance v1** — export TIFF; diff visual borrador vs disco (tipo FIX-013)

---

## 7. Decisiones tomadas (log)

| Fecha | Decisión |
|-------|----------|
| 2026-06-06 | Propósito: crear mapa + etiquetas como manuscrito + timeline propia del mapa |
| 2026-06-06 | Lienzo: relación de aspecto opcional, tamaño libre, expandir sin estirar, recortar |
| 2026-06-06 | Tres sistemas de capas: internas + temporal + navegación interactiva |
| 2026-06-06 | Cada capa/superposición: metadato con etiqueta de tiempo |
| 2026-06-06 | Mapa principal: «Desde» = origen local (default: 1ª marca del manuscrito) |
| 2026-06-06 | Mapa secundario: visible hacia adelante si T≥Desde, hacia atrás si T&lt;Desde |
| 2026-06-06 | Cada dibujo = archivo con capas internas propias (imagen 1) |
| 2026-06-06 | Secundario = archivo superpuesto al principal, capa histórica (imagen 2) |
| 2026-06-06 | Timeline del mapa compone qué dibujos se muestran al avanzar/retroceder (imagen 3) |
| 2026-06-06 | Sin topes en secundarios/hijos; secundario sobre secundario permitido |
| 2026-06-06 | **N mapas** por proyecto (multi-mundo); **1 dibujo principal por mapa** |
| 2026-06-06 | Al abrir Mapas: un mapa según **fijado** / **último visto** / **último modificado** (solo un `defaultOnOpen`) |
| 2026-06-06 | Presión tableta: `pressure` 0.0–1.0 por punto; render lápiz tipo Sketchbook |
| 2026-06-06 | Timeline **unificada**; dibujos hijo heredan T; fuentes manuscrito + WB |
| 2026-06-06 | Ubicación manuscrito: tiempo = **última etiqueta de tiempo** insertada |
| 2026-06-06 | Secundario = parche transparente; solo zona editada es opaca |
| 2026-06-06 | Ubicación integrada al calendario; calcular y mostrar posición de entidades en T |
| 2026-06-06 | Fechas 1950/2000/2100 = ejemplos ilustrativos, no restricciones del producto |
| 2026-06-06 | Estudio: paleta + color personalizado; varios pinceles; presión de tableta |
| 2026-06-06 | Referencia UX dibujo: Autodesk Sketchbook (inspiración, no clon) |
| 2026-06-06 | **§8** Vista interactiva por defecto; edición/dibujo solo con ✏️; scrubber en interactivo |
| 2026-06-06 | Navegación: zona clicable en dibujo → carga dibujo hijo; anidación recursiva |
| 2026-06-06 | «Mapa detallado» UI actual ≈ sistema de navegación (no parche temporal) |
| 2026-06-06 | Era III: etiquetas ubicación desde MS + marcas **X** en T; UX rica y WB → refactor post-WB v2 |
| 2026-06-06 | Varios secundarios activos en mismo T; apilar (A) vs cierre `tiempo_fin` (B) en misma zona |
| 2026-06-06 | No tocar código hasta cerrar spec y lista conservar/purgar |
| 2026-06-11 | **MAP-000:** tierra quemada; purga física al inicio MAP-001; barrido MAP-012 |
| 2026-06-11 | **MAP-000:** sin Leaflet/Excalidraw; compositor + estudio canvas 2D propio |
| 2026-06-11 | **MAP-000:** persistencia JSON (un archivo/dibujo, `layers[]` dentro); no TIFF/PSD como formato de trabajo |
| 2026-06-11 | **MAP-000:** trazos vectoriales + `pressure` 0–1; versión en esquema |
| 2026-06-11 | **MAP-000:** borrador sucio = autosave a disco + flush al cerrar; no localStorage (FIX-007) |
| 2026-06-11 | **MAP-000:** sin migración legacy; solo entorno dev |
| 2026-06-11 | **MAP-000:** Fase F entrega módulo completo MAP-001…012 en tareas incrementales |
| 2026-06-11 | Inventario conservar/purgar → [`MAP-000-inventory-purge.md`](plans/Fase%20F/MAP-000-inventory-purge.md); roadmap → [`maps-roadmap.md`](maps-roadmap.md) |

---

**Última actualización:** 2026-06-11 (§9 persistencia; MAP-000 decisiones)
