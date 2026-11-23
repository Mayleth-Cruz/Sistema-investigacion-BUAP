# Informe de auditoría de seguridad — Eje 3 (SI3 / sistema-buap)

**Proyecto:** `/Users/angelsosa/apps/sistema-buap` (backend PHP puro + frontend React/Vite)
**Rama:** `feat/eje3-investigacion` (sin commits; cambios en el árbol de trabajo)
**Fecha:** 2026-11-15
**Metodología:** skills del proyecto `security-audit` (escáner + comprobaciones manuales) y `audit-codebase` (reconocimiento de superficie, IDOR, autorización a nivel de función, mass assignment, SQLi, XSS, información expuesta, subida de archivos, autenticación). Pruebas dinámicas con `php -S` sobre una COPIA de la BD (`SI3_SQLITE_PATH`), nunca sobre la BD tracked.
**Nota del orquestador incorporada:** `GET /api/eje3/visualizar` pasa a ser SOLO ADMIN (cambio pedido por el usuario, aún en curso al cerrar esta auditoría). Los hallazgos sobre ese endpoint se leen con esa premisa: los datos de producción por docente dejan de ser públicos.

---

## 1. Resumen ejecutivo

| | |
|---|---|
| **Riesgo global tras las correcciones** | **Medio** (dominado por riesgos PREEXISTENTES de despliegue: credenciales semilla conocidas y política de CORS/borradores) |
| **Riesgo introducido por Eje 3 antes de corregir** | Medio (dos fugas de datos por endpoints clásicos públicos) |
| **Hallazgos NUEVOS** | 7 (Alta 0, Media 2, Baja 4, Info 1) — 4 corregidos, 1 en manos del orquestador, 1 de diseño pendiente, 1 aceptado |
| **Hallazgos PREEXISTENTES** | 14 (Alta 1, Media 5, Baja 6, Info 2) — ninguno cambiado (salvo el tramo trivial de SEC-002) |
| **Críticos** | 0 |
| **Adenda — Rol docente** | 10 hallazgos NUEVOS (Media 3, Baja 6, Info 1) y 4 PREEXISTENTES descubiertos o agravados (Media 1, Baja 1, Info 2); 0 Críticos/Altos; 9 corregidos con prueba (más la mitigación parcial de SEC-P03) y 5 pendientes por decisión de diseño/infraestructura. Ver «ADENDA — Rol docente» al final. |

Lo más importante:

1. La autenticación nueva es sólida: token de 256 bits (`random_bytes`), solo se guarda `sha256(token)`, expiración de 8 h verificada en servidor, usuario activo y rol re-validados en cada petición, logout real y puerta trasera (`Admin2026*` / token de 16+ caracteres) eliminada. Se verificó con requests reales: **43 rutas de escritura/administración × 4 variantes de credencial** (sin token, `Bearer` inventado, esquema `Basic`, token en mayúsculas) devuelven 401 en todas; 0 anomalías.
2. No hay inyección SQL en Eje 3 (todo parametrizado; nombres de tabla/columna salen solo de `RegistryConfig`). No hay XSS almacenado explotable: React escapa, no hay `dangerouslySetInnerHTML`/`innerHTML` en `frontend/src`; `<script>…` guardado en eventos/apartados regresa como texto JSON inerte.
3. El riesgo real que introdujo Eje 3 era de **exposición**: los endpoints públicos clásicos (`/api/proyectos`, `/api/difusion/*`, `/api/investigadores`) devolvían los proyectos de semilleros/titulación (con presupuesto, financiadora y proyectos de eventos NO públicos) y la marca interna `snii_elegible`. Corregido y probado.
4. Lo más grave sigue siendo **preexistente**: credenciales semilla `admin@buap.mx / admin123` (y `lector123`) creadas automáticamente, documentadas en `guia.md` y con el correo precargado en el login; y el respaldo automático MySQL→SQLite que las reactiva si MySQL no responde.

### Top 3 acciones
1. Eliminar/rotar las credenciales semilla (SEC-P01): contraseña inicial por variable de entorno o aleatoria y cambio obligatorio; quitar el correo precargado del login.
2. Fijar `CORS_ALLOWED_ORIGINS` y `APP_DEBUG=0` en producción, y añadir un interruptor para desactivar el respaldo SQLite en producción (SEC-P02/P03/P04).
3. Decidir y cerrar las exposiciones públicas de datos personales/borradores (SEC-P05, SEC-P07, SEC-N05).

---

## 2. Tabla de hallazgos

| ID | Sev. | Origen | Título | Estado |
|---|---|---|---|---|
| SEC-N01 | Media | NUEVO | `GET /api/proyectos`, `/api/difusion/buscar` y `/api/difusion/perfil/:id` filtran proyectos de semilleros/titulación y de eventos no públicos | **Corregido** |
| SEC-N02 | Media | NUEVO | `GET /api/investigadores[/:id]` expone `snii_elegible` (marca interna del admin) | **Corregido** |
| SEC-N03 | Baja | NUEVO | `?campo[]=x` en listados Eje 3: 500 (`/docentes`) o avisos "Array to string conversion" | **Corregido** |
| SEC-N04 | Baja | NUEVO | Sin topes de rango/tamaño: `horas` 1e30 → basura/INT overflow, `presupuesto` 1e308, textos de MB, apartados ilimitados | **Corregido** |
| SEC-N05 | Baja | NUEVO | Difusión pública muestra proyectos de cualquier tipo/estado ligados a un evento público (incl. `titulacion`, `suspendido`) | Pendiente (decisión de diseño) |
| SEC-N06 | Baja | NUEVO | Inicialización/migración SQLite en cada request (DDL, `PRAGMA`, timeouts 30 s) amplifica DoS | En manos del orquestador |
| SEC-N07 | Info | NUEVO | IDs "sucios" (`/eventos/1 OR 1=1`, `/eventos/1'`) se castean a `1`; `LIKE` sin escapar `%`/`_` | Aceptado |
| SEC-P01 | **Alta** | PREEXISTENTE | Credenciales semilla `admin123` / `lector123` y documentación pública | Pendiente |
| SEC-P02 | Media | PREEXISTENTE | Respaldo silencioso MySQL→SQLite reactiva la BD semilla (credenciales conocidas) | Pendiente |
| SEC-P03 | Media | PREEXISTENTE | Enumeración de cuentas y bloqueo de la cuenta admin por terceros (DoS de login) | Pendiente |
| SEC-P04 | Media | PREEXISTENTE | CORS `*` por defecto; `APP_DEBUG=true` en `.env.example` | Pendiente |
| SEC-P05 | Media | PREEXISTENTE | Borradores visibles con `?estado=borrador`; contadores de vistas/descargas sin autenticación | Pendiente |
| SEC-P06 | Media | PREEXISTENTE | `EMULATE_PREPARES=false` + parámetros nombrados repetidos (`:search`) en repos clásicos: fallan en MySQL | Pendiente |
| SEC-P07 | Baja | PREEXISTENTE | Correos/ORCID de investigadores y `investigador_correo` en endpoints públicos | Pendiente |
| SEC-P08 | Baja | PREEXISTENTE | Cabeceras de seguridad solo en respuestas JSON; sin CSP/HSTS/Referrer-Policy; `X-XSS-Protection` obsoleta | Pendiente |
| SEC-P09 | Baja | PREEXISTENTE | `.gitignore` no cubre `.env`; BD SQLite y PDFs versionados en git | Pendiente |
| SEC-P10 | Baja | PREEXISTENTE | Subida de PDF: mensaje de excepción al cliente; URL construida con `HTTP_HOST` | Pendiente |
| SEC-P11 | Baja | PREEXISTENTE | Contador de intentos no se reinicia al expirar el bloqueo; sin límite por IP; bcrypt costo 12 sin throttling | Pendiente |
| SEC-P12 | Baja | PREEXISTENTE | Token Bearer en `localStorage`; `apiDelete` legado simula éxito sin backend | Pendiente |
| SEC-P13 | Info | PREEXISTENTE | Cuerpo JSON sin tope propio (solo `post_max_size`); `deploy_mysql.sql` hace `DROP TABLE` | Pendiente |
| SEC-P14 | Info | PREEXISTENTE | `/api/metricas/dashboard` público agrega presupuestos/estado de TODOS los proyectos (incluye Eje 3) | Pendiente |

---

## 3. Detalle

### SEC-N01 — Fuga de proyectos Eje 3 por endpoints clásicos (Media, NUEVO, corregido)
- **Archivos:** `backend/src/Modules/Projects/ProjectRepository.php:26-31,49-63,80-100` (`PUBLIC_FILTER`), `ProjectController.php:28-60`, `Dissemination/DisseminationRepository.php` (búsqueda de proyectos y perfil).
- **Escenario:** el contrato marca `/api/eje3/proyectos` como [A] y los eventos con `publico=0` como ocultos, pero `GET /api/proyectos` (público, `SELECT p.*`) devolvía además los proyectos de semilleros/titulación con `presupuesto`, `entidad_financiadora`, `co_investigadores`, correo del investigador principal y los vinculados a eventos NO públicos. Lo mismo `/api/difusion/buscar?q=` y `/api/difusion/perfil/:id`.
- **Evidencia (antes):** crear evento `publico=0` y un proyecto `semillero` con `presupuesto=99999` ligado a él, y luego `curl /api/proyectos/12` sin token → `200` con el proyecto completo; `/api/eje3/proyectos/12` → 401; `/api/eje3/eventos/7` → 404.
- **Remediación aplicada:** para quien no es administrador (`AuthController::optionalAdmin`) solo se listan proyectos `tipo='investigacion'` que no estén ligados a un evento no público; el administrador ve todo. Los semilleros llegan al público únicamente por `/api/eje3/difusion` (eventos públicos). Los datos existentes (todos `investigacion` por defecto) se comportan igual.

### SEC-N02 — `snii_elegible` público (Media, NUEVO, corregido)
- **Archivo:** `backend/src/Modules/Researchers/ResearcherController.php` (`index`, `show`, `hideInternalFields`). El repositorio usa `SELECT i.*`, por lo que las columnas nuevas viajaron a un endpoint público junto con el correo.
- **Escenario:** cualquiera obtiene qué docentes el administrador marcó como elegibles al SNII (evaluación interna).
- **Evidencia (antes):** `curl /api/investigadores` → cada fila trae `"snii_elegible": 0|1`.
- **Remediación aplicada:** se quita `snii_elegible` para no administradores; `snii_nivel` (dato público del SNII) se conserva. El frontend no consume esos campos desde `/investigadores`; el admin usa `/api/eje3/docentes` [A].

### SEC-N03 — Parámetros de consulta en forma de arreglo (Baja, NUEVO, corregido)
- **Archivos:** `Eje3/Eje3Controller.php` (`queryString`), `EventController`, `Eje3ProjectController`, `FacultyController`, `RegistryController`; `Researchers/ResearcherController::index` y `Projects/ProjectController::index`.
- **Escenario:** `GET /api/eje3/docentes?search[]=x` → `TypeError` → 500; en listados públicos (`/api/eje3/eventos?search[]=x`) se emitía `Array to string conversion` (con `APP_DEBUG` activo se imprime en la respuesta y corrompe el JSON).
- **Remediación aplicada:** los parámetros no escalares se descartan (`null`).

### SEC-N04 — Sin topes de rango y tamaño (Baja, NUEVO, corregido)
- **Archivos:** `Eje3/Eje3Fields.php` (`MAX_INT`, `MAX_DECIMAL`, `MAX_TEXT_BYTES`), `Eje3ProjectService.php::parseSections` (máx. 100 apartados, contenido ≤ 65 535 bytes, tipos escalares).
- **Escenario/evidencia:** `horas: 1e30` se guardó como `5076964154930102272`; `horas: "9223372036854775808"` → `9223372036854775807`; `presupuesto: "1e308"` aceptado (una suma de varios desbordaría a `INF` y `json_encode` fallaría en el dashboard público); una descripción de 5 MB se aceptó y se reenvió íntegra en el listado público de eventos. En MySQL (columnas `INT`, `DECIMAL(14,2)`, `TEXT`) esos valores provocarían errores 500.
- **Remediación aplicada:** topes alineados con las columnas (INT, DECIMAL(14,2), TEXT 65 535 bytes) y rechazo con 400.

### SEC-N05 — Difusión pública sin filtrar tipo/estado del proyecto (Baja, NUEVO, pendiente)
- **Archivo:** `Eje3/EventRepository.php::findProjectsWithSections` (usado por `PublicDisseminationService`).
- **Escenario:** si un proyecto de `titulacion` o con estado `propuesta`/`suspendido` se liga a un evento público, aparece en `/api/eje3/difusion` con todos sus apartados. Es coherente con el contrato ("proyectos del evento"), pero el admin podría no esperarlo.
- **Recomendación:** definir una bandera por proyecto (`publicable`) o limitar a `tipo IN ('semillero','investigacion')`; no se cambió por ser comportamiento visible.

### SEC-N06 — Inicialización SQLite por request (Baja, NUEVO, orquestador)
- **Archivos:** `Database/SqliteInitializer.php::migrateEje3` (ejecuta `CREATE … IF NOT EXISTS`, `PRAGMA table_info`, `CREATE INDEX` en cada petición), `Core/Database.php`.
- **Impacto:** bloqueos de escritura (`database is locked`), latencias de varios segundos y amplificación de DoS para cualquier visitante anónimo. El orquestador ya indicó que corregirá esto (busy_timeout/WAL y salto del DDL con esquema al día); no se tocó.

### SEC-N07 — Casteos laxos (Info, NUEVO)
`/api/eje3/eventos/1 OR 1=1` y `/eje3/eventos/1'` resuelven `id=1` por `(int)`; no es explotable (todo parametrizado), solo impreciso. `LIKE` no escapa `%`/`_` (sin impacto de seguridad).

### SEC-P01 — Credenciales semilla conocidas (Alta, PREEXISTENTE)
- **Archivos:** `backend/src/Database/SqliteInitializer.php:219-220` (`password_hash('admin123')`, `password_hash('lector123')`), `deploy_mysql.sql:356-358` y `seed.sql:62-64` (hash equivalente), `guia.md:212,316,537,647`, `frontend/src/modules/prototype/LoginScreen.jsx:16` (correo `admin@buap.mx` precargado).
- **Evidencia:** `POST /api/auth/login {"correo":"admin@buap.mx","password":"admin123"}` → 200 con token de administrador sobre la BD semilla.
- **Matiz:** la puerta trasera `Admin2026*` fue eliminada correctamente (login con esa clave → 401). Queda la contraseña semilla, que es de facto un secreto público.
- **Remediación recomendada:** contraseña inicial vía variable de entorno (p. ej. `SI3_ADMIN_PASSWORD`) o generada aleatoriamente y mostrada una vez; forzar cambio en el primer inicio; no precargar el correo; no documentar la clave. No se aplicó aquí porque `SqliteInitializer.php` está siendo editado por el orquestador.

### SEC-P02 — Respaldo MySQL→SQLite en producción (Media, PREEXISTENTE)
- **Archivo:** `Core/Database.php` (timeout de 1 s; cualquier fallo de MySQL abre/crea `database.sqlite` y lo siembra). Un corte o saturación de MySQL deja la API contestando contra una BD distinta con credenciales semilla. **Recomendación:** variable `SI3_ALLOW_SQLITE_FALLBACK=0` en producción.

### SEC-P03 — Enumeración y bloqueo de cuenta (Media, PREEXISTENTE)
- **Archivo:** `Modules/Auth/AuthController.php:70-76,88-120`.
- **Evidencia:** usuario inexistente → "…o usuario no registrado."; usuario existente con clave mala → "Te quedan N intento(s)…" (distinguible). Además 5 intentos fallidos contra `admin@buap.mx` (correo conocido) bloquean al administrador 15 min sin necesidad de credenciales.
- **Recomendación:** mensaje único, límite por IP+cuenta con retardo progresivo en vez de bloqueo duro. No se cambió (modifica mensajes visibles).

### SEC-P04 — CORS y modo debug (Media, PREEXISTENTE)
`Core/Response.php::applyCorsHeaders`: sin `CORS_ALLOWED_ORIGINS` se responde `Access-Control-Allow-Origin: *` (aceptable porque la API usa Bearer y no cookies, y se eliminó `Allow-Credentials`). `backend/.env.example` trae `APP_DEBUG=true`: copiarlo a producción mostraría el detalle de excepciones. **Recomendación:** definir la lista de orígenes y `APP_DEBUG=0` en producción.

### SEC-P05 — Borradores y contadores (Media, PREEXISTENTE)
`Publications/PublicationRepository.php:75-80` acepta `?estado=borrador` de forma anónima; `POST /api/publicaciones/:id/vista` y `/descarga` no requieren sesión ni limitan repeticiones (inflado de métricas). Pendiente por cambiar comportamiento.

### SEC-P06 — Parámetros nombrados repetidos con prepares nativos (Media, PREEXISTENTE)
`config/database.php` fija `EMULATE_PREPARES=false` y repos clásicos (`ResearcherRepository`, `ProjectRepository`, `PublicationRepository`, `DisseminationRepository`) repiten `:search`/`:term`; en MySQL real provoca `SQLSTATE[HY093]` (500). Es un problema de disponibilidad, no de inyección (SQLite lo tolera por eso las pruebas no lo ven). El código nuevo de Eje 3 evita la repetición (`:s1…:s5`) y es compatible con MySQL.

### SEC-P07 a SEC-P14 (resumen)
- **P07:** `correo`, `orcid`, `investigador_correo` públicos en `/api/investigadores`, `/api/proyectos`, `/api/publicaciones*`. Decidir si es intencional.
- **P08:** `X-Content-Type-Options`, `X-Frame-Options` solo en JSON; el SPA servido por Apache/`router.php` no recibe cabeceras; faltan CSP, HSTS, `Referrer-Policy`; `X-Powered-By` visible.
- **P09:** `.gitignore` (raíz) solo cubre `.env.local`; `backend/src/Database/database.sqlite` y los PDF de `uploads/` están versionados. El código no carga `.env` por sí mismo (variables vía entorno/Docker), por lo que el riesgo es de higiene.
- **P10:** `UploadController.php:112` concatena `$e->getMessage()`; `LocalStorage` usa `HTTP_HOST` para la URL pública. Validaciones de extensión + MIME + `%PDF-` + tope 25 MB y nombre saneado con aleatorio son correctas.
- **P11:** tras expirar el bloqueo `intentos_fallidos` queda en 5, de modo que un solo fallo vuelve a bloquear; no hay límite por IP.
- **P12:** `localStorage` para el token (mitigado: no hay sinks XSS en `frontend/src`); `apiDelete` legado simula éxito (Eje 3 usa `apiDeleteStrict`, correcto).
- **P13:** sin tope propio para JSON (lo limita `post_max_size`); `deploy_mysql.sql` incluye `DROP TABLE IF EXISTS` (ejecutar en una BD viva borra datos).
- **P14:** el dashboard público suma presupuesto y estados de todos los proyectos, incluidos los de Eje 3 (agregado, sin identificar personas).

---

## 4. Correcciones aplicadas con su prueba

Todas son aditivas; los datos y comportamientos existentes se conservan. Pruebas nuevas en `backend/tests/run.php`, suite `suiteAudit` (se ejecuta en ambos escenarios: BD copiada y BD creada desde cero).

| Hallazgo | Archivos modificados | Pruebas (fallan sin el arreglo, pasan con él) |
|---|---|---|
| SEC-N01 | `Modules/Projects/{ProjectRepository,ProjectService,ProjectController}.php`, `Modules/Dissemination/DisseminationRepository.php` | anónimo no ve semillero/titulación/proyecto de evento no público en `/api/proyectos`, `/api/proyectos/:id` (404), `/api/difusion/buscar` y `/api/difusion/perfil/:id`; admin ve los 4; difusión de evento público sigue mostrando su semillero |
| SEC-N02 | `Modules/Researchers/ResearcherController.php` | anónimo sin `snii_elegible` (lista y detalle), con `snii_nivel`; admin sí lo recibe |
| SEC-N03 | `Eje3/{Eje3Controller,EventController,Eje3ProjectController,FacultyController,RegistryController}.php`, `ResearcherController`, `ProjectController` | 10 rutas con `?campo[]=` devuelven 200; el log no contiene "Array to string conversion" |
| SEC-N04 | `Eje3/Eje3Fields.php`, `Eje3/Eje3ProjectService.php` | `horas` 3 000 000 000 → 400; `presupuesto` 1e13 y `"1e999"` → 400; descripción/apartado > 65 535 bytes → 400; 101 apartados → 400; título/contenido de apartado en forma de arreglo → 400; valores razonables (120 h, 1 250 000.5, apartado de 60 000 bytes) → 201 |

Verificación "falla antes / pasa después": se ejecutó la suite sobre una copia del backend con cada arreglo neutralizado; fallaron los casos nuevos correspondientes (17 por escenario) y con el código corregido pasan.

Tests preexistentes ajustados (documentaban el comportamiento filtrado): `run.php` — "Investigadores: incluye las columnas nuevas…" (ahora `snii_elegible` solo para admin) y "El proyecto del Eje 3 se ve en GET /api/proyectos/:id" (ahora vía token de admin).

## 5. Pendientes recomendados (no se cambiaron)

1. SEC-P01 (Alta): credenciales semilla. 2. SEC-P02/P04: interruptor del respaldo SQLite, `CORS_ALLOWED_ORIGINS`, `APP_DEBUG=0`. 3. SEC-P03: mensajes de login uniformes + límite por IP. 4. SEC-P05: ocultar borradores a anónimos y limitar vistas/descargas (por IP/ventana). 5. SEC-P06: activar prepares emulados o renombrar parámetros repetidos antes de usar MySQL real. 6. SEC-N05: bandera de publicación por proyecto. 7. SEC-P08/P09: cabeceras en el servidor web (CSP, HSTS, Referrer-Policy), `.env`/`*.sqlite` en `.gitignore` y sacar la BD del control de versiones. 8. SEC-P07: decidir si los correos deben ser públicos.
9. (Adenda docente) SEC-D02: el correo público de la ficha es también el usuario de acceso; SEC-D03: cuenta demo `investigador@buap.mx` (ahora acceso docente) y respaldo SQLite; SEC-D10: ficha inactiva con cuenta activa; SEC-D12: tope de sesiones por usuario; SEC-D14: `guia.md` y precarga de `admin123`. Detalle en la adenda.

## 6. Dependencias

`npm audit` (frontend, completo y `--omit=dev`): **0 vulnerabilidades**. Dependencias de desarrollo nuevas (`vitest@4.1.12`, `jsdom@29.1.1`, `@testing-library/*`): todas resueltas desde `registry.npmjs.org` con integridad en `package-lock.json`; el único script de instalación es el habitual `fsevents` (opcional, macOS). Sin dependencias de runtime nuevas. El backend no usa Composer.

## 7. Lo que está bien
- Sesiones: token aleatorio de 256 bits, hash SHA-256 en BD, expiración 8 h, validación de usuario activo y rol en cada petición, logout efectivo, limpieza de expiradas en el login.
- Sin SQLi: sentencias preparadas y listas blancas de tablas/columnas; `LIMIT` casteado.
- Sin mass assignment: los campos salen de una especificación declarativa (`id`, `created_at`, etc. enviados en el body se ignoran — verificado).
- Validación de enums, fechas reales, FKs existentes, correo, longitudes; respuestas de error genéricas (sin SQLSTATE ni rutas) salvo `APP_DEBUG=1`.
- Endpoints públicos de Eje 3 (`/eventos`, `/difusion`) sin correos ni participantes; eventos no públicos devuelven 404 y las publicaciones en borrador no se cuentan.
- Transacciones en alta/edición/borrado de proyectos con apartados y eventos.
- Frontend: sin `dangerouslySetInnerHTML`/`innerHTML`/`eval`; enlaces externos con prefijo fijo `https://`.
- Path traversal en el servidor embebido: `/uploads/../../src/Database/database.sqlite` (y variantes codificadas) no devuelve archivos.

## 8. Alcance y limitaciones
- **Alcance:** `backend/**` (PHP), `frontend/src/**`, esquemas SQL/migración, `.env.example`, Dockerfile/.htaccess; pruebas dinámicas contra copia de la BD.
- **Escáner:** `scan.js` es de Node/JS; sobre `frontend/src` solo reportó ítems genéricos de Express no aplicables (0 críticos/altos) y sobre `backend` únicamente falsos positivos en bundles minificados de `backend/public/assets`. Además ~17 de sus `grep` internos fallan con error de sintaxis de shell, por lo que su cobertura es parcial; el PHP se cubrió con revisión manual dirigida.
- **No se probó:** MySQL real (solo SQLite), Apache/Docker, S3Storage, el comportamiento tras la reescritura de `SqliteInitializer`/`Database` y de `visualizar` que el orquestador está realizando, ni las pantallas del frontend que edita otro agente (se ejecutó su suite: 137 verdes).
- **Integridad:** durante la auditoría `git status` muestra `backend/src/Database/database.sqlite` modificado (mtime 20:47). No fue provocado por esta auditoría (todas las pruebas usaron copias; el archivo no contiene ningún dato de las pruebas y la suite verifica su hash); corresponde a un proceso externo que arrancó la API contra la BD real y aplicó la migración Eje 3. Conviene restaurar con `git checkout backend/src/Database/database.sqlite` cuando no haya servidores usando la BD.

---

# ADENDA — Rol docente

**Fecha:** 2026-11-15 · **Alcance:** incorporación del rol DOCENTE (cuentas `rol='investigador'` ligadas a una ficha, API `/api/docente/*`, flujo `borrador → enviado → aprobado | devuelto`, usuarios docentes y revisión del administrador, regla «solo aprobados» y el frontend asociado).
**Método:** skills `security-audit` y `audit-codebase`; `scan.js` sobre `frontend/src` (solo 4 avisos genéricos de Express, no aplicables; `npm audit` completo y `--omit=dev`: **0 vulnerabilidades**); revisión dirigida del PHP y **pruebas dinámicas** con `php -S` (también con `PHP_CLI_SERVER_WORKERS=8` para concurrencia real) sobre una COPIA de la BD tracked (que estaba en `user_version=2`, así que además se ejercitó la migración v2→v3). Se respetan las conclusiones de la auditoría previa; lo ya cubierto no se repite.

## A.1 Resumen

| Severidad | NUEVOS (por el rol docente) | PREEXISTENTES descubiertos/agravados |
|---|---|---|
| Crítica | 0 | 0 |
| Alta | 0 | 0 |
| Media | 3 (D01, D02, D03) | 1 (D11) |
| Baja | 6 (D04–D09) | 1 (D12) |
| Info | 1 (D10) | 2 (D13, D14) |

**Riesgo del rol docente tras las correcciones: Bajo-Medio.** La autorización del módulo es sólida (ver A.4); lo que quedaba eran fugas de columnas internas por consultas `SELECT p.*` de los endpoints públicos, un bloqueo de fuerza bruta que se esquivaba con peticiones en paralelo y exposición de las credenciales demo/correos de acceso, que son decisiones de despliegue.

| ID | Sev. | Origen | Título | Estado |
|---|---|---|---|---|
| SEC-D01 | Media | NUEVO | `/api/proyectos`, `/api/proyectos/:id` y `/api/difusion/perfil/:id` exponen `comentario_revision`, `revisado_por`, `revisado_en`, `enviado_en`, `creado_por_usuario_id` (y el perfil, `snii_elegible`: SEC-N02 quedó incompleto) | **Corregido** |
| SEC-D02 | Media | NUEVO | El correo público de la ficha (`/api/investigadores`, perfil público) es el usuario de acceso del docente: lista pública de nombres de usuario válidos | Pendiente (decisión) |
| SEC-D03 | Media | NUEVO | `investigador@buap.mx / lector123` pasa a ser un acceso docente funcional (antes se rechazaba); en MySQL `seed.sql`/`deploy_mysql.sql` siguen sembrando esa cuenta con el hash de `admin123` (inerte: sin ficha); el respaldo SQLite la reactiva | Pendiente (infraestructura) |
| SEC-D04 | Baja | NUEVO | Carrera en «enviar»: un `PUT` que vacía resumen/línea entre la validación y el `UPDATE` deja el proyecto `enviado` incompleto | **Corregido** |
| SEC-D05 | Baja | NUEVO | `database is locked` (500) en `PUT`/`DELETE`/enviar simultáneos del docente en SQLite (`BEGIN` diferido + cursor abierto) | **Corregido** (rutas docente) |
| SEC-D06 | Baja | NUEVO | Sin tope de proyectos por docente (altas masivas: hasta ≈ 6,5 MB cada una) | **Corregido** (300) |
| SEC-D07 | Baja | NUEVO | Oráculo de eventos privados: «no existe» vs «solo eventos públicos» | **Corregido** |
| SEC-D08 | Baja | NUEVO | Costo bcrypt dependiente de la versión de PHP (10 en el Docker `php:8.2`, 12 en 8.4+): el tiempo de login delata qué correos existen | **Corregido** (costo 12 fijo en contraseñas nuevas) |
| SEC-D09 | Baja | NUEVO | Respuestas con sesión (resumen del docente, `me`, listados con token) sin `Cache-Control: no-store` | **Corregido** |
| SEC-D10 | Info | NUEVO | La cuenta de un docente sigue operando si su ficha se marca `activo=0` en `investigadores` | Pendiente |
| SEC-D11 | Media | PREEXISTENTE (login) / NUEVO (`cambiar-password`) | Bloqueo de 5 intentos eludible con peticiones en paralelo: contador leer-sumar-escribir + cursor abierto → `500 database is locked` y el intento NO se cuenta | **Corregido** |
| SEC-D12 | Baja | PREEXISTENTE | Sin tope de sesiones por usuario; las expiradas solo se purgan en el login | Pendiente |
| SEC-D13 | Info | PREEXISTENTE | `extractToken` sin ancla: `Authorization: Basic x Bearer <token>` se aceptaba | **Corregido** |
| SEC-D14 | Info | PREEXISTENTE | `guia.md` aún dice que «se admite `Admin2026*`» (puerta trasera ya eliminada) y `LoginScreen` precarga también la contraseña `admin123` (no solo el correo) | Pendiente (documentación / SEC-P01) |
| SEC-P03 | Media | PREEXISTENTE | Enumeración de cuentas por mensajes de login | **Mitigado** (ver A.3, residual documentado) |

## A.2 Detalle de hallazgos

### SEC-D01 — Columnas internas del flujo de revisión en endpoints públicos (Media, NUEVO, corregido)
- **Archivos:** `Projects/ProjectRepository.php` (`SELECT p.*`, ahora con `INTERNAL_FIELDS`/`stripInternal`), `Projects/ProjectController.php:39,58`, `Dissemination/DisseminationController.php:~50` (perfil público; `DisseminationRepository.php:115,129` usan `SELECT *`/`p.*`).
- **Escenario:** el administrador aprueba un proyecto con una nota opcional («revisar presupuesto…»); cualquier visitante la lee en `GET /api/proyectos/:id`, junto con el id interno del revisor y el del usuario docente. El perfil público además devolvía `snii_elegible` (la corrección SEC-N02 solo cubrió `/api/investigadores`).
- **Evidencia (antes):** `curl /api/proyectos/14` → `"comentario_revision":"NOTA INTERNA ADMIN: revisar presupuesto","revisado_por":1,"creado_por_usuario_id":2,"enviado_en":…`; `curl /api/difusion/perfil/1` → `"snii_elegible":1`. Después: claves ausentes; el administrador (token) sigue viéndolas.
- **Remediación aplicada:** `stripInternal()` para quien no es administrador en lista, detalle y perfil; `snii_elegible` se quita del perfil. Los proyectos siguen limitados a `registro_estado='aprobado'`.

### SEC-D02 — El correo de la ficha es el usuario de acceso y es público (Media, NUEVO, pendiente)
- **Archivos:** `Researchers/ResearcherController.php` (índice/detalle públicos con `correo`), `PublicProfileModal.jsx:47`, `Eje3/TeacherAccountService.php` (el correo de la cuenta es por defecto `investigadores.correo`).
- **Escenario:** `GET /api/investigadores` entrega el listado completo de usuarios válidos del sistema. Combinado con SEC-P03/P11, un tercero puede bloquear el acceso de todos los docentes (5 intentos por cuenta cada 15 min) o hacer *password spraying* dirigido; el docente con contraseña temporal no puede ni cambiarla si lo bloquean.
- **Remediación recomendada (no aplicada: cambia comportamiento visible):** (a) no publicar `correo` (ni `identificacion`) en los endpoints públicos o publicar un alias distinto; (b) cuenta de acceso con un correo institucional distinto del público (el admin ya puede indicarlo al crear la cuenta); (c) límite por IP/ventana y retardo progresivo en vez de bloqueo duro (SEC-P03/P11).

### SEC-D03 — Cuenta demo convertida en acceso docente; semillas y respaldo (Media, NUEVO, pendiente)
- **Archivos:** `Database/DocenteSeed.php` (liga `investigador@buap.mx` al docente #1, sin cambio obligatorio), `SqliteInitializer.php:241-242`, `seed.sql:64` y `deploy_mysql.sql:372` (la fila `investigador@buap.mx`, rol `investigador`, **con el mismo hash de `admin123`**, `investigador_id` NULL).
- **Escenario:** antes esa cuenta se rechazaba en el login; ahora, con `lector123`, entra a `/api/docente/*` (crear borradores, enviarlos y llenar la bandeja de revisión; sus proyectos aprobados son públicos). En SQLite como respaldo de MySQL (SEC-P02) o con la BD tracked en un despliegue, la cuenta y sus 4 proyectos demo reaparecen. En MySQL la fila sembrada queda inerte (sin ficha → 403) pero es una credencial conocida «dormida»: bastaría un `UPDATE usuarios SET investigador_id=…`.
- **Verificado:** `schema.sql`, `seed.sql`, `deploy_mysql.sql` y `002_docentes.sql` no contienen cuenta ni proyectos demo del docente (solo las columnas); la migración v2→v3 es idempotente (reinicializar no duplica) y no escribe en MySQL; el camino rápido de `SqliteInitializer` (`user_version >= 3`) no ejecuta DDL ni escrituras por petición (mtime de la BD y el WAL sin cambios tras 60 GET) y la conexión usa WAL con `busy_timeout` de 5 s.
- **Remediación recomendada (no aplicada):** interruptor `SI3_ALLOW_SQLITE_FALLBACK=0` y `SI3_SEED_DEMO=0` en producción (sin semilla demo ni respaldo), eliminar `investigador@buap.mx` de `seed.sql`/`deploy_mysql.sql`, no versionar `database.sqlite` y quitar la precarga de `admin@buap.mx`/`admin123` en `LoginScreen`.

### SEC-D04 — Carrera entre «enviar» y la edición (Baja, NUEVO, corregido)
- **Archivos:** `Docente/DocenteProjectService.php::submitFor`, `Eje3/Eje3ProjectRepository.php::transition` (parámetro `$requireFilled`).
- **Escenario:** `submitFor` validaba título/resumen/línea con una lectura previa y luego hacía el `UPDATE`; un `PUT` simultáneo del mismo docente que vacía esos campos se colaba entre ambos pasos.
- **Evidencia (antes):** 40 rondas de `PUT {"resumen":"","linea_investigacion":""}` + `POST …/enviar` en paralelo: 6 terminaron en `enviado|NULL|''`. Después: 0 de 60.
- **Remediación:** los campos obligatorios se exigen dentro del mismo `UPDATE … WHERE registro_estado IN (…) AND TRIM(COALESCE(col,'')) <> ''` (lista blanca de columnas); si no se aplica se distingue 400 (campos vacíos) de 409 (estado).

### SEC-D05 — 500 «database is locked» bajo concurrencia en SQLite (Baja, NUEVO, corregido en rutas docente)
- **Archivos:** `Eje3/Eje3ProjectRepository.php::updateOwned/deleteOwned/findById/lockState` (ahora `BEGIN IMMEDIATE` en SQLite, `commit/rollback` con `exec`, y `closeCursor()`).
- **Escenario:** `beginTransaction()` es diferido: lectura del estado y `UPDATE` con otra escritura en medio → `SQLITE_BUSY` inmediato (sin esperar `busy_timeout`). Fallaba cerrado (no hubo ediciones tras el envío) pero respondía 500; un docente podía tumbar sus propias operaciones y las de otros.
- **Evidencia (antes):** 3 peticiones simultáneas (2 `PUT` + enviar): 15/60 rondas con 500. Después: 0.
- **Pendiente:** el resto de repositorios clásicos conserva `beginTransaction()` diferido (solo afecta al respaldo SQLite; en MySQL `lockState` usa `FOR UPDATE`).

### SEC-D06 — Sin tope de proyectos por docente (Baja, NUEVO, corregido)
- **Archivo:** `Docente/DocenteProjectService.php:29,85` (`MAX_PROYECTOS = 300`, 409 `limite_proyectos` con mensaje en español), `Eje3ProjectRepository::countOwned`.
- **Escenario:** una cuenta (o la demo conocida) puede crear proyectos sin límite, cada uno hasta 100 apartados × 64 KB, y `GET /api/docente/proyectos` los devuelve sin paginar.
- **Nota:** el límite cuenta todos los estados; el admin puede subirlo editando la constante.

### SEC-D07 — Evento privado distinguible de uno inexistente (Baja, NUEVO, corregido)
- **Archivo:** `Docente/DocenteProjectService.php::checkPublicEvent`. `evento_id=6` (privado) respondía «Solo puedes ligar … evento público existente» y `evento_id=999` «El evento indicado no existe». Ahora ambos: «El evento indicado no existe.».

### SEC-D08 — Costo bcrypt variable (Baja, NUEVO, corregido)
- **Archivos:** `Auth/AuthController.php:40` (`PASSWORD_OPTIONS = ['cost'=>12]`, usado en `changePassword`), `Eje3/TeacherAccountService.php:83,103`.
- **Escenario:** el login compara con un hash ficticio de costo 12 cuando el correo no existe; con `PASSWORD_BCRYPT` por defecto en el Docker `php:8.2` (costo 10) las cuentas reales tardan ≈ 4 veces menos que las inexistentes. Medido en PHP 8.5: 201 ms vs 201 ms (iguales, sin oráculo); el riesgo aparece al desplegar con 8.2. Los hashes ya existentes no se tocan (la semilla SQLite del admin usa el costo por defecto).

### SEC-D09 — Respuestas autenticadas cacheables (Baja, NUEVO, corregido)
- **Archivo:** `Core/Response.php::json` — si la petición trae `Authorization` y el controlador no fijó `Cache-Control`, se envía `no-store` + `Pragma: no-cache` (las respuestas con contraseña temporal ya lo hacían).

### SEC-D10 — Ficha inactiva con cuenta activa (Info, NUEVO, pendiente)
`resolveAny()` y `checkDocente()` validan `usuarios.activo` pero no `investigadores.activo`. Si el administrador desactiva la ficha, el docente sigue entrando, editando y enviando. **Recomendación:** desactivar la cuenta al desactivar la ficha, o añadir `AND i.activo = 1` en el JOIN de sesión para docentes.

### SEC-D11 — Bloqueo por fuerza bruta eludible con paralelismo (Media, PREEXISTENTE en login; NUEVO en `cambiar-password`, corregido)
- **Archivo:** `Auth/AuthController.php` (`registerFailedAttempt()`, `closeCursor()` en `login`, `changePassword` y `resolveAny`).
- **Escenario:** el contador se calculaba con el valor leído antes de `password_verify` (≈ 200 ms) y se escribía después; N peticiones simultáneas contaban como una. Además el `SELECT` quedaba con el cursor abierto y el `UPDATE` posterior fallaba con `database is locked` (500) **después** de verificar la contraseña: ese intento no se contaba y el atacante no ve el resultado de la verificación en el error.
- **Evidencia (antes):** 16 logins fallidos simultáneos contra un docente: 13 respuestas 500, `intentos_fallidos=3`, sin bloqueo; con la mutación del arreglo la prueba muestra además que la contraseña correcta entra tras la ráfaga. Después: 16 → 401/403 sin 500, `intentos_fallidos=12`, cuenta bloqueada.
- **Remediación:** incremento atómico en SQL (`intentos_fallidos = COALESCE(intentos_fallidos,0)+1`) y bloqueo al llegar a 5 (misma política: 5 intentos, 15 min), mismo helper para `cambiar-password`. Residual: peticiones que ya pasaron el chequeo inicial de bloqueo cuando se alcanza el límite (acotadas por la concurrencia del servidor).

### SEC-D12 — Sesiones sin tope por usuario (Baja, PREEXISTENTE, pendiente)
Cada login válido inserta una fila; solo se purgan las expiradas al iniciar sesión. Una cuenta con credenciales válidas puede inflar la tabla (limitada por el costo de bcrypt ≈ 5 logins/s/núcleo). **Recomendación:** conservar las N (p. ej. 10) sesiones más recientes por usuario y purgar expiradas con una probabilidad por petición.

### SEC-D13 — `Authorization` sin ancla (Info, PREEXISTENTE, corregido)
`/Bearer\s+(\S+)/i` aceptaba el token en cualquier parte de la cabecera (`Basic x Bearer <token>` → 200). Ahora `^\s*Bearer\s+(\S+)\s*$`; `Token <t>`, el token en query, en cuerpo o en `X-Authorization` siguen dando 401.

### SEC-D14 — Documentación y precarga (Info, PREEXISTENTE, pendiente)
`guia.md:216` («también se admite `Admin2026*`») es falso desde que se eliminó la puerta trasera. `LoginScreen.jsx:17-18` precarga `admin@buap.mx` **y `admin123`** (la auditoría previa solo mencionó el correo): cualquiera que abra el login ve y puede enviar la credencial semilla. Es parte de SEC-P01.

### SEC-P03 (actualización) — Enumeración de cuentas (mitigada)
- **Cambio mínimo aplicado:** correo desconocido y contraseña errónea responden **401 «Credenciales de acceso incorrectas.»** (antes: «…o usuario no registrado» vs «Te quedan N intento(s)…»). Una cuenta inactiva solo se revela si la contraseña es correcta (antes se revelaba con cualquier contraseña); el flujo de bloqueo (5 intentos → 403 con aviso, 15 min) no cambia. `LoginScreen` muestra el mensaje del servidor tal cual (probado con Vitest: 401 uniforme, 403 de bloqueo y 403 de cuenta inactiva).
- **Residual:** (1) el 403 de bloqueo solo existe para cuentas reales: tras 5 intentos un tercero distingue «existe» (habría que aplicar el bloqueo también a correos inexistentes, con una tabla de intentos); (2) el bloqueo-DoS de cuentas (SEC-D02) y SEC-P11 siguen vigentes; (3) los 403 «lector»/«sin ficha» solo se obtienen con la contraseña correcta (es inevitable informar al usuario legítimo).

## A.3 Correcciones aplicadas con su prueba

Las pruebas nuevas están en `backend/tests/run.php`, suite `suiteDocenteAudit` (se ejecuta en los dos escenarios: BD copiada y BD desde cero; usa un segundo servidor con `PHP_CLI_SERVER_WORKERS=8` y `curl_multi` para la concurrencia) y `frontend/src/modules/prototype/LoginScreen.test.jsx` (4 casos). Se actualizó 1 caso previo que fijaba el mensaje «intentos restantes» (`Mensaje de intentos restantes se mantiene` → «Contraseña incorrecta: mensaje genérico»).

| Hallazgo | Archivos modificados | Pruebas (38 casos nuevos por escenario; total 1922 en dos escenarios) |
|---|---|---|
| D01 | `Projects/ProjectRepository.php`, `ProjectController.php`, `Dissemination/DisseminationController.php` | anónimo sin campos internos en detalle, lista y perfil; sin el texto del comentario; sin `snii_elegible` en el perfil; admin conserva ambos |
| D04, D05 | `Docente/DocenteProjectService.php`, `Eje3/Eje3ProjectRepository.php` | 30 rondas PUT(vaciar)+enviar en paralelo: 0 `enviado` incompletos y 0 respuestas 5xx; 10 revisiones dobles simultáneas: siempre 200+409 y estado coherente |
| D06 | `DocenteProjectService.php`, `Eje3ProjectRepository::countOwned` | 300 proyectos → 409 `limite_proyectos` (mensaje legible); liberar un cupo → 201 |
| D07 | `DocenteProjectService.php` | evento privado e inexistente: ambos 400 con el mismo mensaje |
| D08 | `AuthController.php`, `TeacherAccountService.php` | hash de la temporal y de la contraseña cambiada con costo 12 |
| D09 | `Core/Response.php` | `no-store` en `docente/resumen`, `auth/me`, `docente/proyectos` y en el restablecimiento; el log no contiene contraseñas |
| D11, P03 | `AuthController.php` | mismo código y mensaje para desconocido/errónea/inactiva+errónea; 403 con inactiva+correcta; 16 intentos paralelos: sin 500, cuenta bloqueada, contador ≥ 5, la contraseña correcta ya no entra |
| D13 | `AuthController.php` | `Basic x Bearer <t>` y `Token <t>` → 401; `Bearer <t>` → 200 |

**Verificación «falla antes / pasa después» (mutación en copia del backend):** con todos los arreglos neutralizados a la vez (mensajes antiguos, contador no atómico sin `closeCursor`, regex sin ancla, sin `no-store`, sin `requireFilled`, `BEGIN` diferido, sin tope, sin `stripInternal`, costo 10) la suite pasó de 0 a **44 fallos (22 por escenario)**, incluidos «la contraseña correcta entra tras 16 intentos paralelos» (`{"401":2,"500":14}`, `intentos=2`), «`enviado` con campos vacíos en 10 y 14 de 30 rondas» y «500 en 6 y 2 rondas». Con el código corregido pasan. (El costo 12 coincide con el valor por defecto de PHP 8.5, por lo que esa prueba solo falla en la mutación con costo 10: es una guarda para PHP 8.2.)

## A.4 Lo que está bien (verificado con peticiones reales)

- **Matriz de autorización:** 85 rutas × 8 credenciales (sin token, token inventado, token expirado, sesión de un `lector`, docente A, docente B, docente con contraseña temporal pendiente, administrador): todas las rutas [A] responden 401 sin credenciales válidas y 403 a docente/lector/temporal; `/api/docente/*` responde 401 sin token, 403 a administrador y a lector, 403 `cambio_password_obligatorio` a la temporal y 200 a los docentes; un `lector` con sesión insertada a mano recibe 401 en `/auth/me` y 403 en `cambiar-password` (rol re-validado en cada petición).
- **IDOR:** docente A sobre proyectos de B (`GET/PUT/DELETE/enviar`) y sobre ids negativos, `0`, `abc`, `1e3`, `02`, `+2`, `9999999999999999999`: siempre 404 con el mismo mensaje que un id inexistente; tiempos iguales (≈ 41 ms vs 42 ms en 150 peticiones). Los ids sucios (`1 OR 1=1`) se castean a `1` y siguen sujetos a la propiedad (SEC-N07). Los listados `?search=%`, `search[]=`, `registro_estado[]=`, comillas y 5 000 caracteres: solo devuelven proyectos propios, sin SQL injection.
- **Mass assignment:** `investigador_principal_id`, `codigo`, `registro_estado`, `comentario_revision`, `revisado_*`, `creado_por_*`, `enviado_en`, `id`, `activo`, `snii_nivel` en `POST`/`PUT` docente se ignoran (la fila queda con el docente de la sesión, `INV-2026-004`, `borrador`, `creado_por`=sesión); `articulado_civ` se fuerza a 0 salvo titulación; `estado` fuera de `propuesta|en_ejecucion|completado` → 400; `evento_id` inexistente, privado, negativo, `0`, arreglo → 400.
- **Máquina de estados:** aprobar/devolver desde `borrador`, `devuelto` o `aprobado` → 409 `transicion_invalida`; la revisión usa `UPDATE … WHERE registro_estado='enviado'`: en 10 rondas de `aprobar` y `devolver` simultáneos siempre una sola se aplica (200+409) y el estado/comentario son coherentes; la edición/borrado concurrentes con «enviar» fallan cerrados (nunca se edita un `enviado`).
- **Contraseña temporal:** 12 caracteres de un alfabeto de 57 símbolos sin ambiguos, muestreo por rechazo con `random_bytes` (≈ 70 bits; 20 000 muestras: 20 000 únicas, χ² = 52,1 con 56 g.l., uniforme); en BD solo el hash; se devuelve únicamente en la creación/restablecimiento con `Cache-Control: no-store`; no aparece en el log del servidor, en `GET usuarios-docentes` ni en respuestas posteriores. En el frontend vive solo en el estado del modal (`PasswordTemporalModal`), se descarta al cerrar y no pasa por `localStorage`, URL ni `console`.
- **Gate de contraseña temporal:** `/api/docente/*` → 403 con `errors={codigo:['cambio_password_obligatorio']}`; `/auth/me`, `/auth/logout` y `/auth/cambiar-password` accesibles; `/api/eje3/*` sigue prohibido (403) y los endpoints públicos solo devuelven datos públicos con esa sesión: el gate no se esquiva.
- **Cambiar contraseña:** exige actual y nueva ≥ 8 (máx. 72 bytes), nueva ≠ actual, tipos no cadena → 400; actual errónea cuenta como intento y aplica el mismo bloqueo (también bloquea probar contraseñas con la cuenta bloqueada); invalida **todas las demás sesiones** (la de otro dispositivo → 401) y conserva la actual; el token solo se acepta por cabecera.
- **Restablecer/desactivar:** cortan todas las sesiones y (restablecer) limpian intentos y bloqueo; el login con la contraseña vieja → 401; las cuentas administrativas no son accesibles por los endpoints de docentes (404); `activo` malformado → 400.
- **Datos públicos:** con proyectos en `borrador`, `enviado`, `devuelto` y `aprobado`, ningún endpoint público (`/api/proyectos`, `/api/difusion/*`, `/api/investigadores`, `/api/publicaciones`, `/api/metricas/dashboard`, `/api/eje3/eventos*`, `/api/eje3/difusion*`) filtró títulos, códigos, presupuesto, financiadora ni comentarios de los no aprobados; los totales del dashboard y de investigadores cuentan solo aprobados. El resumen del docente solo contiene su ficha y sus datos.
- **Frontend:** sin `dangerouslySetInnerHTML`/`innerHTML`/`eval` (los textos de docentes se renderizan con React); guards por rol en `App.jsx` (`handleNavigate` y render condicionado a `isAuthenticated`/`isDocente`) y, sobre todo, autoridad en el servidor: manipular `buap_auth_user` (rol/`debe_cambiar_password`) solo muestra pantallas vacías que fallan con 403 (el 403 de un docente en rutas admin no cierra la sesión ni provoca bucles); `buap:session-expired` se emite una sola vez por token (compara con el token almacenado) y no se dispara en el login fallido; el 403 `cambio_password_obligatorio` lleva a `docente-cuenta`; `npm audit` 0 vulnerabilidades.
- **Semillas/migraciones:** ver SEC-D03 (sin cuenta ni proyectos demo en SQL de MySQL, migración idempotente, camino rápido sin escrituras).

## A.5 Pendientes (no se cambiaron)

| Pendiente | Por qué no se tocó | Recomendación |
|---|---|---|
| SEC-D02 correo de ficha = usuario de acceso, público | cambia datos visibles del portal público | quitar `correo`/`identificacion` de los endpoints públicos o usar correo de acceso distinto; límite por IP |
| SEC-D03 cuenta demo, `investigador@buap.mx` en `seed.sql`/`deploy_mysql.sql`, respaldo SQLite | credenciales demo e infraestructura | interruptores de entorno para sembrado y respaldo, quitar la fila del SQL de MySQL, no versionar `database.sqlite` |
| SEC-D10 ficha inactiva con cuenta activa | decisión de negocio | cascada ficha→cuenta o validar `investigadores.activo` |
| SEC-D12 tope de sesiones por usuario | cambia el comportamiento multi-dispositivo | conservar las N más recientes y purgar expiradas |
| SEC-D14 `guia.md` y precarga de `admin123` en `LoginScreen` | documentación (orquestador) y credenciales demo | quitar la contraseña precargada y la mención de `Admin2026*` |
| Resto de SEC-P01…P14 | ver secciones anteriores | sin cambios; P03 mitigado, P11 vigente |

**No se pudo probar:** MySQL real (solo SQLite; la compatibilidad de `FOR UPDATE`, el `UNIQUE` sobre `investigador_id` con NULL múltiples y `002_docentes.sql` se revisó por lectura), Apache/Docker (la cabecera `Authorization` depende de la regla de reescritura), ni el rendimiento bajo carga real.
