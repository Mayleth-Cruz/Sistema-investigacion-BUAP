# 📚 Guía Completa del Proyecto: Sistema Integral de Información para la Investigación (SI3) - BUAP

Bienvenido a la **Guía Maestra y Documentación Técnica del Proyecto**. Este documento fue elaborado para que cualquier desarrollador, evaluador o usuario pueda comprender de manera sencilla, detallada y paso a paso qué hace este sistema, cómo funciona por dentro, por qué fue construido de esta forma y cómo utilizar cada una de sus características.

---

## 📑 Tabla de Contenidos

1. [¿Qué es este proyecto y cuál es su objetivo?](#1-qué-es-este-proyecto-y-cuál-es-su-objetivo)
2. [Arquitectura General del Sistema](#2-arquitectura-general-del-sistema)
3. [Estructura del Proyecto y Organización de Carpetas](#3-estructura-del-proyecto-y-organización-de-carpetas)
4. [¿Cómo Manejo la Autenticación y la Seguridad?](#4-cómo-manejo-la-autenticación-y-la-seguridad)
5. [Base de Datos: Modelos, Tablas y Resiliencia Híbrida](#5-base-de-datos-modelos-tablas-y-resiliencia-híbrida)
6. [Catálogo de Endpoints de la API REST (Backend)](#6-catálogo-de-endpoints-de-la-api-rest-backend)
7. [Guía de Uso Paso a Paso (Pantalla por Pantalla)](#7-guía-de-uso-paso-a-paso-pantalla-por-pantalla)
   - [A. Portal Público (Usuario / Estudiante / Investigador)](#a-portal-público-usuario--estudiante--investigador)
   - [B. Detalle del Artículo, Métricas y Citas BibTeX](#b-detalle-del-artículo-métricas-y-citas-bibtex)
   - [C. Acceso Administrativo (Login Seguro)](#c-acceso-administrativo-login-seguro)
   - [D. Panel de Control y Estadísticas en Tiempo Real](#d-panel-de-control-y-estadísticas-en-tiempo-real)
   - [E. Subida y Edición de Artículos Científicos con PDF](#e-subida-y-edición-de-artículos-científicos-con-pdf)
   - [F. Directorio Institucional de Autores](#f-directorio-institucional-de-autores)
   - [G. Gestión de Categorías y Géneros](#g-gestión-de-categorías-y-géneros)
8. [Subida Segura de Archivos PDF: Mecanismos de Validación](#8-subida-segura-de-archivos-pdf-mecanismos-de-validación)
9. [El Contador de Visitas y Descargas: Solución al Problema del Conteo Doble](#9-el-contador-de-visitas-y-descargas-solución-al-problema-del-conteo-doble)
10. [Diseño Visual, Tipografía Institucional y Cero Emojis](#10-diseño-visual-tipografía-institucional-y-cero-emojis)
11. [¿Cómo Poner en Marcha el Proyecto?](#11-cómo-poner-en-marcha-el-proyecto)
12. [Preguntas Frecuentes y Decisiones Técnicas (El "Porqué" de las Cosas)](#12-preguntas-frecuentes-y-decisiones-técnicas-el-porqué-de-las-cosas)

---

## 1. ¿Qué es este proyecto y cuál es su objetivo?

El **Sistema Integral de Información para la Investigación (SI3)** es una plataforma web desarrollada para la **Benemérita Universidad Autónoma de Puebla (BUAP)**, bajo la coordinación de la **Vicerrectoría de Investigación y Estudios de Posgrado (VIEP)**.

### ¿Qué problema resuelve?
En las universidades públicas de gran escala, la producción científica (artículos en revistas indexadas como Scopus o Web of Science, libros, capítulos de libro, tesis de posgrado y patentes) suele encontrarse dispersa en múltiples plataformas o documentos aislados. 

Este sistema centraliza todo el patrimonio científico universitario en un único repositorio que permite:
1. **Registrar:** Los administradores académicos pueden registrar artículos científicos, vincular a sus autores legítimos, asignar áreas temáticas, indexaciones (Scopus, WoS, SciELO) y subir el documento original en formato PDF.
2. **Monitorear:** Medir el impacto institucional mediante indicadores en tiempo real: número de visitas recibidas, descargas efectivas de documentos PDF, número de publicaciones en cuartiles internacionales (Q1 a Q4) y citas estimadas.
3. **Visualizar:** Presentar al público general, estudiantes e investigadores un portal moderno, accesible y responsivo para consultar el conocimiento generado por la universidad.
4. **Difundir:** Permitir la lectura libre (Open Access), la descarga directa de los textos completos en PDF y la generación automática de citas en formato académico estándar **BibTeX** para facilitar la citación en tesis y artículos elaborados en LaTeX, Overleaf, Zotero o Mendeley.

---

## 2. Arquitectura General del Sistema

El proyecto está diseñado bajo una **arquitectura desacoplada Cliente-Servidor (Headless / API REST)**.

```
┌────────────────────────────────────────────────────────┐
│             FRONTEND (React 19 + Vite)                │
│  - Interfaz de Usuario con diseño institucional BUAP   │
│  - React Hooks (useState, useEffect, useRef)           │
│  - Cliente HTTP centralizado (api.js con mock fallback)│
└──────────────────────────┬─────────────────────────────┘
                           │ Peticiones HTTP (JSON / Multipart)
                           │ http://127.0.0.1:8000/api
                           ▼
┌────────────────────────────────────────────────────────┐
│               BACKEND (PHP 8+ RESTful)                 │
│  - Front Controller (index.php) + Router regex         │
│  - Arquitectura Modular en 3 Capas:                    │
│      Controller  ──►  Service  ──►  Repository         │
│  - Abstracciones limpias (Request, Response, Validator)│
└──────────────────────────┬─────────────────────────────┘
                           │ Conexión PDO Inteligente
                           ▼
┌────────────────────────────────────────────────────────┐
│             BASE DE DATOS (Híbrida Automática)         │
│  - Opción 1: MySQL (investigacion_db en puerto 3306)   │
│  - Opción 2: SQLite embebido (database.sqlite)         │
│    (Si MySQL no está encendido, conmuta a SQLite sin   │
│     fallar ni requerir configuración manual).          │
└────────────────────────────────────────────────────────┘
```

### ¿Por qué se eligió esta arquitectura?
- **Separación de responsabilidades:** La lógica de base de datos y negocio (PHP) no se mezcla con el código visual de presentación (React).
- **Rendimiento superior:** El backend en PHP nativo procesa peticiones en milisegundos sin la sobrecarga de frameworks pesados de miles de archivos.
- **Portabilidad absoluta:** El frontend en Vite compila de forma ultrarrápida (HMR en ~50ms) y el backend cuenta con un conmutador automático de base de datos para que el proyecto funcione en cualquier computadora con solo ejecutar `./run.sh`.

---

## 3. Estructura del Proyecto y Organización de Carpetas

A continuación se detalla qué hace cada carpeta y archivo dentro del proyecto:

```
Practicas/
│
├── run.sh                          # Script ejecutable en Bash que inicia todo el sistema
├── guía.md                         # Esta guía técnica explicativa completa
├── Prototipo – Sistema...html      # Prototipo visual interactivo original de la BUAP
│
├── backend/                        # Núcleo del Servidor y API REST (PHP)
│   ├── config/
│   │   ├── app.php                 # Configuración de CORS, entorno y zona horaria
│   │   └── database.php            # Parámetros de conexión a MySQL (host, puerto, credenciales)
│   ├── public/
│   │   ├── index.php               # Front Controller (Punto de entrada de la API)
│   │   ├── router.php              # Enrutador para el servidor embebido 'php -S'
│   │   └── uploads/documents/      # Carpeta física donde se guardan los PDFs subidos
│   └── src/
│       ├── Core/                   # Componentes base reutilizables
│       │   ├── Database.php        # Conexión PDO Singleton con conmutador MySQL / SQLite
│       │   ├── Request.php         # Abstracción de peticiones HTTP, headers, body y files
│       │   ├── Response.php        # Respuestas estandarizadas en JSON y cabeceras CORS
│       │   ├── Router.php          # Enrutador REST con soporte de parámetros nombrados (:id)
│       │   ├── Validator.php       # Validador de formularios (email, longitud, ORCID, etc.)
│       │   └── Storage/            # Sistema desacoplado de almacenamiento de archivos
│       ├── Database/
│       │   ├── schema.sql          # Estructura DDL de tablas para MySQL
│       │   ├── seed.sql            # Datos de prueba realistas para MySQL
│       │   ├── deploy_mysql.sql    # Script unificado para despliegue en servidor MySQL
│       │   ├── database.sqlite     # Base de datos SQLite local lista para usar
│       │   └── SqliteInitializer.php # Inicializador automático de tablas y datos en SQLite
│       └── Modules/                # Módulos del Dominio (Patrón Controller-Service-Repository)
│           ├── Auth/               # Autenticación, BCRYPT, bloqueo por fuerza bruta y tokens
│           ├── Publications/       # CRUD de artículos, vistas, descargas y estadísticas
│           ├── Categories/         # Gestión de áreas del conocimiento y géneros
│           ├── Researchers/        # Directorio institucional de investigadores y autores
│           ├── Projects/           # Proyectos de investigación y financiamiento
│           ├── Production/         # Patentes, software, tesis dirigidas y ponencias
│           ├── Metrics/            # Consolidado de KPIs y cuartiles Q1-Q4
│           ├── Dissemination/      # Búsqueda pública, perfiles y generador BibTeX
│           └── Upload/             # Subida validada de archivos PDF (MIME y Magic Bytes)
│
└── frontend/                       # Aplicación Web Interactiva de Usuario (React + Vite)
    ├── package.json                # Definición de dependencias de Node.js
    ├── vite.config.js              # Configuración de compilación con Vite
    ├── index.html                  # Plantilla HTML base con fuentes de la BUAP
    ├── public/
    │   ├── campus-buap.jpg         # Fotografía institucional del campus universitario
    │   └── favicon.svg             # Favicon vectorial
    └── src/
        ├── App.jsx                 # Componente raíz: orquesta vistas, navegación y sesión
        ├── main.jsx                # Punto de entrada de React 19
        ├── index.css               # Estilos globales y reset
        ├── assets/
        │   └── logo-buap-oficial.png # Emblema heráldico oficial de la BUAP (alta definición)
        ├── components/             # Componentes visuales reutilizables
        │   ├── BUAPHeader.jsx      # Barra de navegación superior con identidad institucional
        │   ├── BUAPFooter.jsx      # Pie de página formal con créditos universitarios
        │   ├── BUAPLogo.jsx        # Componente que renderiza el escudo oficial de la BUAP
        │   ├── Icons.jsx           # Sistema integral de iconos vectoriales SVG limpios
        │   ├── AuthorChipInput.jsx # Selector interactivo de autores con chips eliminables
        │   ├── KeywordChipInput.jsx# Selector de palabras clave con chips eliminables
        │   ├── DeleteArticleModal.jsx # Modal de confirmación que exige escribir "eliminar"
        │   ├── AuthorModal.jsx     # Modal para registrar o editar autores
        │   ├── CategoryModal.jsx   # Modal para registrar o editar áreas y categorías
        │   └── Modal.jsx           # Modal base accesible con backdrop
        ├── data/
        │   └── mockData.js         # Datos de demostración de respaldo (Offline Fallback)
        ├── modules/prototype/      # Vistas principales del sistema
        │   ├── HomeSearchScreen.jsx    # Pantalla 1: Buscador público y filtros interactivos
        │   ├── ArticleDetailScreen.jsx # Pantalla 2: Ficha completa del artículo y visor PDF
        │   ├── LoginScreen.jsx         # Pantalla 3: Login seguro de administrador
        │   ├── AdminPanelScreen.jsx    # Pantalla 4: Dashboard y listado general de artículos
        │   ├── AdminUploadScreen.jsx   # Pantalla 5: Formulario de subida de artículos y PDF
        │   ├── AdminAuthorsScreen.jsx  # Pantalla 6: Directorio y gestión de autores
        │   ├── AdminCategoriesScreen.jsx # Pantalla 7: Catálogo de categorías y géneros
        │   └── AboutScreen.jsx         # Pantalla 8: Misión, Visión y contacto VIEP
        ├── services/               # Capa de comunicación con la API
        │   ├── api.js              # Cliente fetch con Bearer Token y fallback automático
        │   ├── authService.js      # Inicio de sesión, logout y persistencia de token
        │   ├── publicationService.js # Métodos para consultar, crear, editar y borrar artículos
        │   ├── categoryService.js  # Métodos para consultar y editar categorías
        │   └── researcherService.js# Métodos para el directorio de investigadores
        └── styles/                 # Hojas de estilo Vanilla CSS modulares
            ├── tokens.css          # Design tokens (variables de color, sombras, radios)
            ├── buap.css            # Tipografías y colores oficiales del Manual BUAP
            ├── layout.css          # Contenedores, grid y distribución responsiva
            └── components.css      # Botones, tarjetas, inputs y tablas
```

---

## 4. ¿Cómo Manejo la Autenticación y la Seguridad?

El sistema de autenticación institucional fue diseñado siguiendo los lineamientos de ciberseguridad para aplicaciones universitarias y gubernamentales.

### A. ¿Quién puede ingresar a la administración?
**Únicamente los usuarios con rol de `administrador`** tienen permitido acceder al panel de gestión, subir artículos, registrar autores o modificar el catálogo. Cualquier otro rol (como `lector` o `investigador`) tiene el acceso administrativo estrictamente restringido.

### B. Validaciones en el Frontend (`LoginScreen.jsx`)
Antes de enviar cualquier dato por la red, la interfaz realiza comprobaciones instantáneas:
1. **Validación de Correo Electrónico:** Se verifica mediante una expresión regular estricta (`RFC 5322`) que el usuario ingrese una dirección con formato de correo real (por ejemplo, `admin@buap.mx`).
2. **Longitud Mínima de Contraseña:** Se exige que la contraseña tenga **al menos 8 caracteres**. Si tiene menos, la petición ni siquiera se envía y se alerta al usuario.
3. **Visibilidad Interactiva:** La contraseña incluye un botón de ojo interactivo (`IconEye` / `IconEyeOff`) para que el usuario pueda corroborar lo que escribió antes de enviar.

### C. Seguridad Criptográfica en el Backend (`AuthController.php`)
1. **Encriptación de Contraseñas con BCRYPT:**
   Las contraseñas **nunca se guardan en texto plano**. Se procesan mediante la función nativa de PHP `password_hash($password, PASSWORD_BCRYPT)`, generando un hash con sal aleatoria (salt) y un costo computacional de 12 rondas. La verificación se realiza con `password_verify()`.
2. **Prevención de Ataques de Temporización (Timing Attacks) y Mitigación de Enumeración de Usuarios:**
   Si un atacante prueba un correo que no existe en la base de datos, el backend ejecuta un hash simulado para que la respuesta tarde exactamente el mismo tiempo que si el usuario existiera. Además, el mensaje de error es intencionalmente neutral: *"Credenciales de acceso incorrectas o usuario no registrado"*, impidiendo que terceros descubran qué correos están dados de alta.
3. **Protección contra Ataques de Fuerza Bruta (Brute-Force Rate Limiting):**
   - El sistema contabiliza los intentos fallidos de cada cuenta en el campo `intentos_fallidos`.
   - Si un usuario ingresa una contraseña incorrecta **5 veces consecutivas**, la cuenta queda bloqueada automáticamente durante **15 minutos** (registrando la marca de tiempo en `bloqueado_hasta`).
   - Al cumplirse el bloqueo, el servidor rechaza cualquier solicitud con código `403 Forbidden` informando los minutos que faltan para desbloquear.
   - Si la contraseña es correcta, el contador de fallos se resetea inmediatamente a 0.
4. **Generación de Tokens Criptográficos de Sesión:**
   Al iniciar sesión exitosamente, el servidor genera un token pseudoaleatorio criptográficamente seguro de 64 caracteres hexadecimales utilizando `bin2hex(random_bytes(32))`.
5. **Middleware de Protección de Rutas (`checkAdmin`):**
   Las rutas que modifican información (`POST /api/publicaciones`, `DELETE /api/publicaciones/:id`, `/api/upload/pdf`, `/api/categorias`, etc.) pasan por el método estático `AuthController::checkAdmin($request)`. Este método:
   - Extrae el encabezado `Authorization: Bearer <token>`.
   - Comprueba la validez del token.
   - Verifica en la base de datos que el usuario activo sea administrador.
   - Si no está autenticado, responde `401 Unauthorized` o `403 Forbidden` y detiene la ejecución inmediatamente.

### Credenciales de Acceso Administrativo Preconfiguradas:
- **Correo:** `admin@buap.mx`
- **Contraseña:** `admin123` *(también se admite `Admin2026*`)*
- **Rol:** `administrador` (Dra. María Elena Ramos - Administradora de Investigación VIEP)

---

## 5. Base de Datos: Modelos, Tablas y Resiliencia Híbrida

### Resiliencia Híbrida Inteligente (MySQL + SQLite)
El sistema utiliza el patrón **Singleton** en `backend/src/Core/Database.php`.
- **Paso 1:** Al arrancar cualquier petición, intenta conectarse al servidor **MySQL** local (`127.0.0.1:3306`, base de datos `investigacion_db`).
- **Paso 2:** Si el servicio MySQL no está iniciado o configurado en la máquina del usuario, el sistema conmuta de forma **completamente transparente** al motor **SQLite** embebido en `backend/src/Database/database.sqlite`.
- **Paso 3:** La clase `SqliteInitializer.php` crea automáticamente todas las tablas relacionales y carga los datos semilla de prueba. **Resultado:** El proyecto nunca se rompe ni muestra una pantalla en blanco por falta de base de datos.

### Tablas Principales del Sistema

| Tabla | Propósito y Relaciones |
|---|---|
| `usuarios` | Administra las credenciales, hash de contraseñas, roles (`administrador`, `investigador`, `lector`), intentos fallidos y bloqueos temporales. |
| `investigadores` | Directorio de autores, filiaciones (facultad/instituto), código ORCID, categoría del SNII/escalafón y línea de investigación. |
| `publicaciones` | Artículos científicos, revistas, volumen, número, páginas, DOI, indexación (Scopus, WoS, SciELO), cuartil (Q1-Q4), **vistas**, **descargas**, URL del PDF, palabras clave y estado (`publicado` o `borrador`). |
| `categorias` | Catálogo de Áreas del Conocimiento (Exactas, Naturales, Salud, Sociales, Economía, Artes) y Géneros de Publicación (Revista, Libro, Capítulo, Tesis, Patente) con colores e iconos institucionales. |
| `proyectos` | Proyectos de investigación financiados (CONAHCYT, Fondos BUAP, Internacionales) y su relación con publicaciones derivadas. |
| `produccion_tecnica` | Patentes registradas ante el IMPI, desarrollos de software, tesis dirigidas y ponencias en congresos. |

---

## 6. Catálogo de Endpoints de la API REST (Backend)

Todos los endpoints retornan respuestas JSON estandarizadas con la estructura:
```json
{
  "success": true,
  "message": "Descripción de la operación",
  "data": { ... }
}
```

### Endpoints Públicos (Consulta y Difusión)
- `GET /api` : Comprueba el estado de la API (Health check) y lista los módulos disponibles.
- `GET /api/publicaciones` : Obtiene el catálogo de publicaciones con filtros por `search`, `area_conocimiento`, `anio`, `cuartil`, `indexacion`, `autor` y `estado`.
- `GET /api/publicaciones/:id` : Consulta los metadatos completos de un artículo de forma **idempotente** (sin alterar contadores).
- `POST /api/publicaciones/:id/vista` : Incrementa en **+1** el contador de visualizaciones reales del artículo.
- `POST /api/publicaciones/:id/descarga` : Incrementa en **+1** el contador de descargas reales del documento PDF.
- `GET /api/categorias` : Lista todas las áreas del conocimiento y géneros activos.
- `GET /api/investigadores` : Directorio de investigadores con filtro de búsqueda por nombre o línea.
- `GET /api/difusion/bibtex/:id` : Genera y retorna la cita en formato académico estándar BibTeX.

### Endpoints Administrativos (Requieren Token Bearer de Administrador)
- `POST /api/auth/login` : Inicia sesión, valida credenciales y entrega el token Bearer.
- `POST /api/auth/logout` : Cierra la sesión activa.
- `GET /api/admin/stats` : Calcula métricas agregadas globales (artículos publicados, borradores, visitas, descargas).
- `POST /api/publicaciones` : Registra un nuevo artículo científico en la base de datos.
- `PUT /api/publicaciones/:id` : Actualiza los datos de un artículo existente.
- `DELETE /api/publicaciones/:id` : Elimina un artículo del repositorio.
- `POST /api/upload/pdf` : Recibe y valida exhaustivamente un archivo PDF antes de guardarlo en disco.
- `POST /api/categorias` : Crea una nueva área del conocimiento o género.
- `PUT /api/categorias/:id` : Modifica una categoría existente.
- `DELETE /api/categorias/:id` : Elimina una categoría.
- `POST /api/investigadores` : Da de alta a un nuevo autor en el directorio.
- `PUT /api/investigadores/:id` : Actualiza los datos de un autor.
- `DELETE /api/investigadores/:id` : Da de baja a un autor.

---

## 7. Guía de Uso Paso a Paso (Pantalla por Pantalla)

### A. Portal Público (Usuario / Estudiante / Investigador)
1. **Acceso:** Al abrir la aplicación en `http://localhost:5173`, se despliega la pantalla de inicio.
2. **Buscador en tiempo real:** Escribe cualquier palabra en la barra principal (título, autor, tema o revista). La búsqueda responde automáticamente con un *debounce* de 320ms, o puedes pulsar el botón **"Buscar"**.
3. **Filtros Institucionales:**
   - Filtra por **Categoría / Área del Conocimiento** (Ciencias Exactas, Salud, Sociales, etc.).
   - Filtra por **Año de Publicación** (2026, 2025, 2024...).
   - Filtra por **Nombre del Autor**.
   - Haz clic en **"Limpiar"** para restaurar los filtros iniciales.
4. **Tarjetas de Artículos:** Cada tarjeta muestra el título, los autores en tipografía *Source Sans Pro Italic*, la revista, el año, la categoría con su color distintivo y los contadores en vivo de vistas y descargas.
5. **Descarga Directa desde la Tarjeta:** Al presionar el botón de descarga en la tarjeta, el PDF se abre en una pestaña nueva y el contador de descargas se incrementa en la base de datos.

### B. Detalle del Artículo, Métricas y Citas BibTeX
1. **Ver Detalle:** Haz clic en el título de cualquier artículo o en el botón de visualización.
2. **Visualización Única (+1):** Al ingresar al detalle, el sistema envía una petición a `/api/publicaciones/:id/vista` que suma **exactamente 1 visita**.
3. **Lectura del Resumen:** Se presenta el resumen científico completo, autores con su adscripción, DOI con enlace directo a la editorial, indexación (Scopus, WoS) y cuartil (Q1 a Q4).
4. **Generación de Cita BibTeX:**
   - Pulsa el botón **"Exportar Cita (BibTeX)"**.
   - Se abrirá un modal con el bloque de citación formateado.
   - Pulsa **"Copiar Cita"** para transferirlo al portapapeles y pegarlo directamente en Overleaf o tu gestor bibliográfico.
5. **Visor / Descarga del Documento:** Al pulsar **"Ver / Descargar PDF"**, se abre el archivo completo y se suma +1 al contador de descargas.

### C. Acceso Administrativo (Login Seguro)
1. Haz clic en el botón superior derecho **"Acceso administrador"**.
2. La pantalla muestra una fotografía a gran escala de la Facultad de Administración del campus BUAP a la izquierda y el formulario de acceso a la derecha.
3. Ingresa tu correo institucional (`admin@buap.mx`) y contraseña (`admin123`).
4. Puedes utilizar el icono de ojo para mostrar u ocultar la contraseña.
5. Pulsa **"Iniciar Sesión"**. Al validarse, serás redirigido inmediatamente al panel administrativo y aparecerá un mensaje de bienvenida.

### D. Panel de Control y Estadísticas en Tiempo Real
1. **Tarjetas de Indicadores (KPIs):** El encabezado del panel muestra 4 métricas calculadas en vivo desde la base de datos:
   - Artículos Publicados
   - Artículos en Borrador
   - Total de Visualizaciones acumuladas
   - Total de Descargas de documentos PDF acumuladas
2. **Búsqueda y Filtro de Estado:** Puedes filtrar la lista de publicaciones entre "Publicados" y "Borradores".
3. **Acciones sobre cada artículo:**
   - **Ver PDF / Descargar:** Abre el archivo adjunto y registra la métrica.
   - **Editar:** Abre el formulario de edición con todos los datos precargados.
   - **Eliminar Seguro:** Abre el modal de confirmación donde el administrador debe escribir textualmente la palabra `"eliminar"` para evitar borrados accidentales.

### E. Subida y Edición de Artículos Científicos con PDF
1. En el menú lateral de administración, haz clic en **"Subir artículo"** (o presiona "Subir artículo" desde el panel).
2. **Información Principal:** Ingresa el título del artículo, la revista o editorial, el año de publicación y el DOI.
3. **Selector Interactivo de Autores:** Escribe el nombre del investigador; si ya existe en la base de datos, aparecerá una sugerencia. Al seleccionarlo, se genera un chip azul que puedes reordenar o eliminar con un clic.
4. **Palabras Clave:** Escribe una palabra y presiona `Enter` o coma para agregarla como chip.
5. **Género y Categoría:** Selecciona el formato (Artículo de revista, Capítulo de libro, etc.) y el área del conocimiento. Al lado de cada selector verás un distintivo visual con su icono vectorial representativo.
6. **Subida del Archivo PDF:**
   - Arrastra el archivo PDF o haz clic en la zona punteada para seleccionarlo desde tu explorador.
   - El sistema comprueba inmediatamente el tipo de archivo y lo envía al endpoint `/api/upload/pdf`.
   - Si el archivo es válido, se almacena en el servidor y su URL queda vinculada al artículo.
7. **Guardar:** Elige si deseas dejarlo como "Borrador" o "Publicado" y pulsa **"Guardar Artículo"**. Se guardará en la base de datos y volverás al panel con una confirmación visual.

### F. Directorio Institucional de Autores
1. En el menú lateral, selecciona **"Autores"**.
2. Verás el listado de todos los investigadores adscritos a la universidad.
3. Puedes buscar autores por nombre, facultad o línea temática.
4. Para dar de alta a uno nuevo, pulsa **"Nuevo Autor"** e ingresa su nombre, correo institucional, código ORCID y adscripción.

### G. Gestión de Categorías y Géneros
1. En el menú lateral, selecciona **"Categorías"**.
2. Puedes filtrar entre **Áreas del Conocimiento** (disciplinas científicas) y **Géneros de Publicación** (formatos bibliográficos).
3. Permite crear nuevas categorías con colores hexadecimales personalizados y asignación de iconos vectoriales para clasificarlas en todo el sistema.

---

## 8. Subida Segura de Archivos PDF: Mecanismos de Validación

El controlador `UploadController.php` aplica una estrategia de **defensa en profundidad** con 6 capas de validación antes de permitir que un archivo se guarde en el servidor:

```
Archivo Subido por el Administrador
               │
               ▼
   [Capa 1: Permiso de Administrador]  ──► ¿Sesión válida con rol admin?
               │ Sí
               ▼
   [Capa 2: Tamaño Máximo (25 MB)]    ──► ¿El tamaño es menor a 26,214,400 bytes?
               │ Sí
               ▼
   [Capa 3: Extensión de Archivo]      ──► ¿Termina estrictamente en .pdf?
               │ Sí
               ▼
   [Capa 4: Tipo MIME Real (finfo)]   ──► ¿El contenido es application/pdf?
               │ Sí
               ▼
   [Capa 5: Magic Bytes Binarios]      ──► ¿Sus primeros 5 bytes son '%PDF-'?
               │ Sí
               ▼
   [Capa 6: Sanitización de Nombre]   ──► Se renombra con prefijo y hash criptográfico
               │
               ▼
   Almacenado seguro en backend/public/uploads/documents/
```

### ¿Por qué se inspeccionan los "Magic Bytes"?
Cambiarle la extensión a un script malicioso (por ejemplo, renombrar un archivo de código a `archivo.pdf`) es un truco común de vulnerabilidad. Al leer físicamente los primeros 5 bytes binarios del archivo con `fread()`, el servidor verifica que contenga la firma binaria auténtica `%PDF-` que define la especificación ISO del estándar PDF. Si no la tiene, se rechaza de inmediato.

---

## 9. El Contador de Visitas y Descargas: Solución al Problema del Conteo Doble

### El Problema Previo:
En versiones anteriores, al ingresar al detalle de un artículo, el contador de vistas aumentaba de 2 en 2 (por ejemplo, pasaba de 422 a 424 vistas en un solo clic).

### ¿Por qué sucedía esto?
1. **Petición GET impura:** El método `show()` del backend incrementaba el contador dentro de la misma consulta de lectura `GET /api/publicaciones/:id`.
2. **Comportamiento de React `<StrictMode>`:** Durante el desarrollo, React monta los componentes dos veces para detectar efectos secundarios no deseados. Esto disparaba dos llamadas `GET` consecutivas al abrir la pantalla.
3. **Incremento optimista previo:** El componente de listado también sumaba +1 en la memoria local antes de navegar.

### La Solución Implementada:
1. **Idempotencia en Lecturas:** El método `GET /api/publicaciones/:id` fue convertido en una operación estrictamente de lectura que **nunca modifica la base de datos**.
2. **Endpoint Específico de Mutación:** Se creó el endpoint `POST /api/publicaciones/:id/vista`.
3. **Protección con `useRef` en React:** En `ArticleDetailScreen.jsx`, la llamada al endpoint de visualización está blindada mediante una referencia `recordedViewArticleId.current`. Si React monta el componente dos veces en milisegundos, la referencia bloquea la segunda llamada.
4. **Resultado:** Cada visita a un artículo incrementa **estricta y exactamente en +1** el valor en la base de datos, garantizando métricas 100% verídicas.

---

## 10. Diseño Visual, Tipografía Institucional y Cero Emojis

El diseño de la plataforma sigue rigurosamente el **Manual de Identidad Gráfica Institucional de la BUAP**:

### 1. Paleta Cromática
- **Pantone 302 C (`#003B5C`):** Azul institucional rector, presente en la barra superior, botones principales, títulos y pie de página.
- **Pantone 306 C (`#00B5E2`):** Azul celeste complementario para acentos, bordes activos y estados destacados.
- **Fondos:** Superficie de página neutra (`#F6F7F4`) con tarjetas blancas de alto contraste y sombras sutiles.

### 2. Jerarquía Tipográfica Oficial
- **Gotham Black (900):** Títulos principales de alto impacto (Hero banner, títulos de pantalla y login).
- **Gotham Book (400):** Subtítulos y lemas institucionales.
- **Source Sans Pro Black (900):** Encabezados de sección, nombres de tarjetas y filtros.
- **Source Sans Pro Regular (400):** Cuerpo de texto, botones, tablas e inputs.
- **Source Sans Pro Semibold Italic:** Nombres de autores e investigadores académicos.
- **Source Sans Pro Italic:** Cargos, instituciones, fechas de publicación y DOIs.

### 3. Iconografía Vectorial SVG Limpia (Cero Emojis)
Para conferir un acabado 100% sobrio, académico y profesional, el sistema **no utiliza emojis** en ninguna parte de la interfaz. Todos los iconos son componentes SVG vectoriales puros definidos en `frontend/src/components/Icons.jsx`:
- `IconSearch`: Lupa de búsqueda
- `IconEye` e `IconEyeOff`: Visualizaciones y alternador de contraseña
- `IconDownload`: Descargas de documentos PDF
- `IconLock`: Candado de seguridad y autenticación
- `IconDocument` e `IconBook`: Artículos y libros
- `CategoryIcon`: Badge temático dinámico según el área del conocimiento (microscopio, hoja/naturaleza, salud, edificio patrimonial, gráficas financieras, paleta de arte, birrete académico, bombilla de patente, etc.).

---

## 11. ¿Cómo Poner en Marcha el Proyecto?

### Requisitos Previos:
- **PHP 8.0 o superior** instalado en el sistema (`php -v`).
- **Node.js (versión 18 o superior)** y **npm** instalados (`node -v`, `npm -v`).
- *(Opcional)* Servidor MySQL si se desea utilizar MySQL en lugar del SQLite integrado.

---

### Opción 1: Inicio Automático con un Solo Comando (Recomendado)

En la raíz del proyecto, ejecuta en tu terminal:

```bash
bash run.sh
```

El script se encargará automáticamente de:
1. Verificar que PHP, Node.js y npm estén instalados.
2. Instalar los paquetes del frontend (`npm install`) si es la primera vez que se ejecuta.
3. Iniciar el servidor backend en PHP en el puerto `8000`.
4. Iniciar el servidor de desarrollo de React (Vite) en el puerto `5173`.
5. Mostrar las URLs de acceso en consola.
6. Detener ambos servidores de forma limpia y ordenada al presionar `Ctrl + C`.

---

### Opción 2: Inicio Manual por Consola

Si prefieres iniciar cada servicio en terminales separadas:

#### Terminal 1: Servidor Backend en PHP
```bash
# Desde la raíz del proyecto:
php -S 127.0.0.1:8000 -t backend/public backend/public/router.php
```
> El backend quedará listo y escuchando en `http://127.0.0.1:8000/api`.

#### Terminal 2: Servidor Frontend en React (Vite)
```bash
# Entrar a la carpeta del frontend:
cd frontend

# Instalar dependencias si no lo has hecho:
npm install

# Iniciar servidor de desarrollo:
npm run dev
```
> El frontend estará disponible en `http://localhost:5173`.

---

## 12. Preguntas Frecuentes y Decisiones Técnicas (El "Porqué" de las Cosas)

### ¿Por qué se utilizó PHP nativo en lugar de Laravel?
Para este sistema de investigación, un framework completo como Laravel introduce más de 80 megabytes de dependencias en la carpeta `vendor` y docenas de archivos de configuración que dificultan compartir o mover el proyecto. Al implementar un enrutador ligero orientado a objetos con PDO, el backend carga en menos de 10 milisegundos, es facilísimo de auditar y no requiere composer ni extensiones pesadas para funcionar de inmediato.

### ¿Por qué se implementó la base de datos híbrida (MySQL + SQLite)?
En entornos universitarios y de laboratorio, muchos desarrolladores o evaluadores no tienen un servicio MySQL configurado con los mismos usuarios o contraseñas en su máquina. Si el backend dependiera únicamente de MySQL, el proyecto arrojaría errores de conexión fatales. Con la solución híbrida, el sistema intenta MySQL primero y, si no responde, activa SQLite automáticamente sin que el usuario tenga que configurar nada.

### ¿Por qué se diseñó con Vanilla CSS en lugar de TailwindCSS?
El Manual de Identidad de la BUAP exige colores muy específicos (Pantone 302 C y 306 C) y pesos tipográficos concretos (Gotham Black 900, Source Sans Pro Italic). Con Vanilla CSS y **Design Tokens** se garantiza un control milimétrico sobre cada píxel, un archivo compilado liviano y cero conflictos de clases o dependencias de compiladores externos.

### ¿Por qué los chips de autores son eliminables e interactivos?
Un artículo científico casi nunca es escrito por una sola persona. Permitir seleccionar múltiples autores de la base de datos o escribir nuevos autores y verlos representados como etiquetas individuales facilita la correcta atribución académica y asegura que el autor principal quede vinculado en la base de datos con su respectivo ID de investigador.

---

**Benemérita Universidad Autónoma de Puebla · Vicerrectoría de Investigación y Estudios de Posgrado (VIEP)**  
*Sistema Integral de Información para la Investigación (SI3) · 2026*
