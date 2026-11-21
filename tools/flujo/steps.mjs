import fs from 'node:fs';
import { S, ex, J, pick, trim, ROOT } from './lib.mjs';

const TOKEN_SHORT = '2ea892…230a';   // token del administrador (ejemplo; en la API real es aleatorio)
const TOKEN_DOC = '7c1f5e…a90b';     // token del docente
const BE = 'backend/', FE = 'frontend/src/';
const idx = BE + 'public/index.php';
const auth = BE + 'src/Modules/Auth/AuthController.php';
const pubC = BE + 'src/Modules/Publications/PublicationController.php';
const pubS = BE + 'src/Modules/Publications/PublicationService.php';
const pubR = BE + 'src/Modules/Publications/PublicationRepository.php';
const E3 = BE + 'src/Modules/Eje3/';
const api = FE + 'services/api.js';
const e3svc = FE + 'services/eje3Service.js';
const DOC = BE + 'src/Modules/Docente/';
const docC = DOC + 'DocenteController.php';
const docS = DOC + 'DocenteProjectService.php';
const acctC = E3 + 'TeacherAccountController.php';
const acctS = E3 + 'TeacherAccountService.php';
const acctR = E3 + 'TeacherAccountRepository.php';
const projR = E3 + 'Eje3ProjectRepository.php';
const projS = E3 + 'Eje3ProjectService.php';
const FEM = FE + 'modules/eje3/';
const FED = FE + 'modules/docente/';
const RUN = BE + 'tests/run.php';

export const LANES = ['Navegador · React', 'API · PHP', 'Servicios · Auth y módulos', 'Base de datos · MySQL / SQLite'];

export const STORES = [
  { id: 'investigadores', label: 'investigadores' },
  { id: 'proyectos', label: 'proyectos', cols: 'tipo, evento_id, articulado_civ, registro_estado (borrador | enviado | aprobado | devuelto), comentario_revision, enviado_en, revisado_en, revisado_por, creado_por_usuario_id' },
  { id: 'publicaciones', label: 'publicaciones' },
  { id: 'produccion', label: 'produccion_tecnica' },
  { id: 'categorias', label: 'categorias' },
  { id: 'usuarios', label: 'usuarios', cols: 'rol (administrador | investigador | lector), investigador_id (ficha del docente; una cuenta por docente), debe_cambiar_password, intentos_fallidos, bloqueado_hasta' },
  { id: 'sesiones', label: 'sesiones', cols: 'usuario_id, token_hash (sha256), expira_en (8 h)' },
  { id: 'eventos', label: 'eventos_investigacion' },
  { id: 'apartados', label: 'proyecto_apartados' },
  { id: 'participantes', label: 'participantes_evento' },
  { id: 'retribucion', label: 'retribucion_social' },
  { id: 'egresados', label: 'actividades_egresados' },
  { id: 'uploads', label: 'uploads/ (PDF)' },
];

export const CASO_FIELDS = [
  ['driver', 'BD activa'],
  ['token', 'localStorage.buap_auth_token'],
  ['sesion', 'sesiones.expira_en'],
  ['rol', 'usuarios.rol (sesión)'],
  ['intentos', 'usuarios.intentos_fallidos'],
  ['password', 'usuarios.debe_cambiar_password'],
  ['registro', 'proyectos.registro_estado'],
  ['vistas', 'publicaciones.vistas (id 1)'],
  ['url', 'publicaciones.url_documento'],
  ['codigo', 'proyectos.codigo (nuevo)'],
];

const R = (store) => ({ store, mode: 'R' });
const W = (store) => ({ store, mode: 'W' });
const RW = (store) => ({ store, mode: 'RW' });

const busqueda = ex('busqueda').data[0];
const pubRow = pick(busqueda, ['id', 'titulo', 'autores', 'revista_editorial', 'anio', 'cuartil', 'estado', 'vistas', 'descargas', 'origen', 'evento_id', 'investigador_nombre']);
const vista = ex('vista'), descarga = ex('descarga');
const vistasN = vista.data.vistas;
const cat = ex('catalogos');
const mon = ex('monitoreo').data;
const viz = ex('visualizar').data;
const dif = ex('difusion').data;

const routeCount = fs.readFileSync(ROOT + '/' + idx, 'utf8').split('\n').filter((l) => /^\$router->(get|post|put|delete)\(/.test(l)).length;

const monCompact = {
  success: true,
  data: {
    docentes_con_proyectos: mon.docentes_con_proyectos,
    docentes_titulacion_civ: mon.docentes_titulacion_civ,
    profesores_snii: mon.profesores_snii,
    profesores_elegibles_snii: mon.profesores_elegibles_snii,
    total_docentes: mon.total_docentes,
    snii_por_nivel: mon.snii_por_nivel,
    detalle: { con_proyectos: mon.detalle.con_proyectos.slice(0, 2), en_snii: mon.detalle.en_snii.slice(0, 2), elegibles: mon.detalle.elegibles },
  },
};
const vizCompact = {
  success: true,
  data: {
    publicaciones_evento_pyad: viz.publicaciones_evento_pyad,
    por_origen: viz.por_origen,
    por_anio: viz.por_anio,
    produccion_docentes: viz.produccion_docentes.slice(0, 2).map((d) => ({ ...d, afiliacion: undefined })),
    totales: viz.totales,
  },
};
const ev0 = (e) => pick(e, ['id', 'nombre', 'tipo', 'fecha_inicio', 'sede', 'estado', 'publico', 'total_proyectos', 'total_publicaciones']);
const difCompact = {
  success: true,
  data: {
    semilleros: [{ ...ev0(dif.semilleros[0]), proyectos: [{ ...pick(dif.semilleros[0].proyectos[0], ['id', 'codigo', 'titulo', 'investigador_principal_nombre']), apartados: dif.semilleros[0].proyectos[0].apartados.slice(0, 1) }] }, '…'],
    congreso: [ev0(dif.congreso[0]), '…'],
    otros_eventos: [ev0(dif.otros_eventos[0])],
    proximos: ['… (máx. 5, fecha_inicio ≥ hoy, ascendente)'],
  },
};

const loginResp = ex('login');
const loginShown = { success: true, message: loginResp.message, data: { token: TOKEN_SHORT + ' (64 hex)', user: loginResp.data.user } };

export const STEPS = [
  {
    id: 'buscar', lane: 0, title: 'Abrir el portal y buscar artículos', short: 'Buscar artículos', http: 'GET /api/publicaciones',
    what: 'Cualquier persona, sin iniciar sesión, abre el portal y escribe en el buscador: la pantalla pide solo artículos publicados.',
    bullets: [
      '<code>App</code> arranca en la vista <code>home</code> y monta <code>HomeSearchScreen</code>. No hay router: las pantallas se eligen con el estado <code>currentView</code>.',
      'Al teclear, un <em>debounce</em> de 320 ms dispara <code>loadArticles</code>, que arma <code>search</code>, <code>anio</code>, <code>area_conocimiento</code>, <code>evento</code>, <code>autor</code> y siempre <code>estado=publicado</code>.',
      '<code>publicationService.getAll</code> llama a <code>apiGet</code>; si el servidor no responde devuelve datos de respaldo (<code>mockData</code>) <strong>sin avisar</strong>.',
      '<code>getApiBaseUrl</code> usa <code>http://127.0.0.1:8000/api</code> en localhost y <code>/api</code> en producción; <code>getAuthHeaders</code> agrega el Bearer solo si hay token (aquí no hace falta).',
    ],
    data: 'GET http://127.0.0.1:8000/api/publicaciones?search=transformer&estado=publicado\nAccept: application/json',
    touches: [],
    ia: null,
    caso: {},
    files: [
      S(FE + 'App.jsx', 'export default function App', 'App', 'Estado currentView: elige qué pantalla se muestra'),
      S(FE + 'modules/prototype/HomeSearchScreen.jsx', 'const loadArticles', 'loadArticles', 'Arma los filtros y siempre pide estado=publicado'),
      S(FE + 'modules/prototype/HomeSearchScreen.jsx', '}, 320);', '320', 'Búsqueda reactiva al escribir'),
      S(FE + 'services/publicationService.js', 'async getAll(', 'publicationService.getAll', 'Query string + respaldo mockData si falla la API'),
      S(api, 'export const getApiBaseUrl', 'getApiBaseUrl', 'Elige la URL base de la API'),
      S(api, 'export async function apiGet', 'apiGet', 'GET con Bearer opcional; devuelve el respaldo ante un fallo'),
    ],
  },
  {
    id: 'front', lane: 1, title: 'El front controller recibe y enruta', short: 'Front controller', http: 'GET /api/publicaciones',
    what: 'Todo lo que empieza con /api llega a un solo archivo que arma el enrutador y despacha al controlador.',
    bullets: [
      '<code>.htaccess</code> (Apache) o <code>router.php</code> (<code>php -S</code>) mandan cada <code>/api</code> a <code>index.php</code>; el <code>.htaccess</code> también copia el encabezado <code>Authorization</code>.',
      '<code>index.php</code> muestra errores solo con <code>APP_DEBUG=1</code>, registra el autoloader PSR-4 (<code>App\\</code> → <code>src/</code>) y contesta el preflight <code>OPTIONS</code> con 200.',
      `Registra ${routeCount} rutas con <code>$router-&gt;get/post/put/delete</code>; las estáticas (<code>/api/publicaciones/eventos</code>, <code>/carpetas</code>) van antes de <code>:id</code> para no chocar.`,
      '<code>Router::dispatch</code> convierte <code>:id</code> en una expresión regular con grupo nombrado, instancia el controlador y llama al método; <code>executeHandler</code> atrapa cualquier excepción.',
      '<code>Response::json</code> aplica CORS (<code>CORS_ALLOWED_ORIGINS</code> o <code>*</code>) y responde siempre <code>{success, message, data}</code>.',
    ],
    data: "ruta   GET /api/publicaciones → [PublicationController::class, 'index']\nquery  search=transformer  estado=publicado\nparams {}",
    touches: [],
    ia: null,
    caso: {},
    files: [
      S(idx, "$router->get('/api/publicaciones',", 'GET /api/publicaciones', 'Ruta registrada → PublicationController::index'),
      S(idx, '$router->dispatch($request);', 'dispatch', 'Última línea: despacha la petición'),
      S(BE + 'src/Core/Router.php', 'public function dispatch', 'Router::dispatch', ':id → (?P<id>[^/]+) y llamada al controlador'),
      S(BE + 'src/Core/Router.php', 'private function executeHandler', 'Router::executeHandler', 'try/catch: 500 genérico salvo APP_DEBUG'),
      S(BE + 'src/Core/Response.php', 'public static function applyCorsHeaders', 'Response::applyCorsHeaders', 'CORS sin Allow-Credentials'),
      S(BE + 'public/router.php', "require_once __DIR__ . '/index.php';", 'index.php', 'Enrutador del servidor embebido php -S'),
      S(BE + 'public/.htaccess', 'RewriteRule ^(.*)$ index.php [QSA,L]', 'RewriteRule', 'Hosting Apache: /api → index.php'),
    ],
  },
  {
    id: 'bd', lane: 3, title: '¿MySQL o SQLite? La conexión elige sola', short: 'Conexión a la BD', http: '',
    what: 'La primera vez que un repositorio pide la conexión, Database intenta MySQL con 1 segundo de espera y, si falla, cae en silencio a un archivo SQLite que se crea, se migra y se llena solo.',
    bullets: [
      '<code>Database::getConnection</code> lee <code>config/database.php</code> (<code>DB_HOST</code>, <code>DB_PORT</code>, <code>DB_NAME</code>, <code>DB_USER</code>, <code>DB_PASS</code>) y abre PDO MySQL con <code>ATTR_TIMEOUT = 1</code>. Con <code>DB_DRIVER=sqlite</code> ni siquiera lo intenta (pruebas y demos sin perder 1 s por proceso).',
      'Ante cualquier error usa <code>src/Database/database.sqlite</code> (o la ruta de <code>SI3_SQLITE_PATH</code>) con <code>PRAGMA foreign_keys</code>, <code>synchronous = NORMAL</code> y <code>ATTR_TIMEOUT = 5</code> (5 s de espera por bloqueo), y llama a <code>SqliteInitializer::initialize</code>.',
      '<code>initialize</code> lee <code>PRAGMA user_version</code>: si ya es ≥ <code>SCHEMA_VERSION</code> (hoy <strong>3</strong>) sale sin ejecutar DDL ni escrituras, así que solo la primera petición paga la migración. Si no, activa WAL, crea tablas con <code>CREATE TABLE IF NOT EXISTS</code>, agrega columnas que falten y siembra solo si la tabla está vacía.',
      'Dos migraciones idempotentes: <code>migrateEje3</code> (6 tablas y columnas del Eje 3) y <code>migrateDocentes</code> (rol docente: <code>usuarios.investigador_id</code> y <code>debe_cambiar_password</code>; <code>proyectos.registro_estado</code> con DEFAULT \'aprobado\' y cinco columnas de revisión; índices, con un UNIQUE parcial: una cuenta por docente).',
      'Las semillas demo corren una sola vez y en transacción: <code>Eje3Seed::seed</code> (eventos, proyectos, SNII…) y <code>DocenteSeed::seed</code>, que liga <code>investigador@buap.mx</code> al primer docente y le siembra 4 proyectos, uno por estado de registro. Una base en v2 sube a v3 sin tocar sus datos: lo que ya existía queda <code>aprobado</code>.',
      'Con MySQL nada de esto corre: ahí se importa <code>deploy_mysql.sql</code> (instalación nueva, con las columnas del rol docente pero sin docente ligado ni proyectos demo) o, en una base ya desplegada, <code>migrations/001_eje3.sql</code> y luego <code>002_docentes.sql</code>.',
    ],
    data: 'mysql:host=127.0.0.1;port=3306;dbname=investigacion_db\n  → PDOException (timeout 1 s)      (con DB_DRIVER=sqlite: ni se intenta)\nsqlite:backend/src/Database/database.sqlite   (o SI3_SQLITE_PATH)\n  → SqliteInitializer::initialize()\n  → PRAGMA user_version = 2   →  migrateDocentes()  →  user_version = 3\n  → siguientes peticiones: user_version ≥ 3, sin DDL',
    touches: [W('investigadores'), W('proyectos'), W('publicaciones'), W('usuarios'), W('categorias'), W('eventos')],
    ia: null,
    caso: { driver: 'sqlite' },
    files: [
      S(BE + 'src/Core/Database.php', 'public static function getConnection', 'Database::getConnection', 'MySQL primero; si falla, SQLite + inicializador'),
      S(BE + 'src/Core/Database.php', "getenv('DB_DRIVER')", 'DB_DRIVER', 'DB_DRIVER=sqlite omite el intento a MySQL'),
      S(BE + 'src/Core/Database.php', "getenv('SI3_SQLITE_PATH')", 'SI3_SQLITE_PATH', 'Ruta alternativa de la base SQLite (pruebas con copias)'),
      S(BE + 'src/Core/Database.php', 'public static function getDriver', 'Database::getDriver', "'mysql' o 'sqlite' para ramificar SQL"),
      S(BE + 'src/Database/SqliteInitializer.php', 'public static function initialize', 'SqliteInitializer::initialize', 'Camino rápido por user_version; si no, crea y migra'),
      S(BE + 'src/Database/SqliteInitializer.php', 'public const SCHEMA_VERSION', 'SCHEMA_VERSION', 'Versión del esquema (3): si user_version ya la alcanza, no se repite el DDL'),
      S(BE + 'src/Database/SqliteInitializer.php', 'private static function migrateEje3', 'migrateEje3', 'Tablas y columnas del Eje 3, idempotente'),
      S(BE + 'src/Database/SqliteInitializer.php', 'private static function migrateDocentes', 'migrateDocentes', 'Columnas, índices y semilla del rol docente (v3)'),
      S(BE + 'src/Database/Eje3Seed.php', 'public static function seed', 'Eje3Seed::seed', 'Eventos, proyectos, participantes, SNII…'),
      S(BE + 'src/Database/DocenteSeed.php', 'public static function seed', 'DocenteSeed::seed', 'Cuenta demo ligada al primer docente y 4 proyectos (uno por estado)'),
      S(BE + 'src/Database/migrations/001_eje3.sql', 'CREATE TABLE IF NOT EXISTS `eventos_investigacion`', 'eventos_investigacion', 'Migración idempotente del Eje 3 para MySQL ya desplegado'),
      S(BE + 'src/Database/migrations/002_docentes.sql', "ADD COLUMN `registro_estado`", 'registro_estado', 'Migración idempotente del rol docente para MySQL ya desplegado'),
      S(BE + 'src/Database/deploy_mysql.sql', 'CREATE TABLE `eventos_investigacion`', 'eventos_investigacion', 'Instalación nueva en MySQL'),
      S(BE + 'config/database.php', "'host' =>", 'host', 'Credenciales MySQL desde variables de entorno'),
    ],
  },
  {
    id: 'consulta', lane: 2, title: 'Consultar publicaciones con filtros', short: 'Filtrar y listar', http: 'GET /api/publicaciones',
    what: 'El repositorio arma un SELECT con JOIN a investigadores y proyectos y suma una condición por cada filtro recibido.',
    bullets: [
      '<code>PublicationController::index</code> recoge 12 filtros de la query string (<code>cuartil</code>, <code>anio</code>, <code>search</code>, <code>evento</code>, <code>autor</code>, <code>estado</code>…) y los pasa al servicio.',
      '<code>PublicationRepository::findAll</code> usa parámetros nombrados y busca con <code>LIKE</code> en título, autores, resumen, palabras clave, revista, DOI, área y evento. Cada columna lleva su propio parámetro (<code>:s1</code>…<code>:s8</code>): MySQL con <code>EMULATE_PREPARES = false</code> no admite repetir un mismo nombre en la sentencia.',
      'Si no se pide <code>estado</code> ni <code>include_drafts</code>, solo devuelve <code>estado = \'publicado\'</code>: los borradores no salen en el portal.',
      'Ordena por año descendente y citas; cada fila trae <code>investigador_nombre</code>, <code>proyecto_codigo</code> (solo si el proyecto ligado está <strong>aprobado</strong>) y las columnas del Eje 3 <code>origen</code> y <code>evento_id</code>.',
      'No hay paginación: responde la lista completa.',
    ],
    data: J({ success: true, message: ex('busqueda').message, data: [pubRow, '…'] }, 2, 70),
    touches: [R('publicaciones'), R('investigadores'), R('proyectos')],
    ia: null,
    caso: {},
    files: [
      S(pubC, 'public function index', 'PublicationController::index', 'Recoge los 12 filtros de la query string'),
      S(pubS, 'public function getAllPublications', 'PublicationService::getAllPublications', 'Pasa los filtros al repositorio'),
      S(pubR, 'public function findAll', 'PublicationRepository::findAll', 'SELECT con JOIN y WHERE dinámico (parámetros nombrados)'),
      S(pubR, "pub.estado = 'publicado'", "estado = 'publicado'", 'Por defecto, solo artículos publicados'),
      S(pubR, "pro.registro_estado = 'aprobado'", "registro_estado = 'aprobado'", 'El proyecto ligado solo se muestra si está aprobado'),
      S(BE + 'config/database.php', 'PDO::ATTR_EMULATE_PREPARES', 'EMULATE_PREPARES', 'Prepares nativos en MySQL: por eso no se repiten nombres de parámetro'),
    ],
  },
  {
    id: 'detalle', lane: 2, title: 'Abrir el detalle y contar la vista', short: 'Contar la vista', http: 'POST /api/publicaciones/:id/vista',
    what: 'Al abrir un artículo la pantalla pide su ficha y, aparte, registra la visita; descargar el PDF registra una descarga.',
    bullets: [
      '<code>ArticleDetailScreen</code> hace dos llamadas en su <code>useEffect</code>: <code>GET /api/publicaciones/:id</code> (lectura sin efectos) y <code>POST /api/publicaciones/:id/vista</code>.',
      'Un <code>useRef</code> (<code>recordedViewArticleId</code>) evita contar dos veces por el doble montaje de StrictMode.',
      '<code>PublicationController::recordView</code> verifica que exista (404 si no) y <code>incrementViews</code> ejecuta <code>UPDATE publicaciones SET vistas = COALESCE(vistas, 0) + 1</code>.',
      'La descarga sigue el mismo patrón: <code>POST /api/publicaciones/:id/descarga</code> → <code>incrementDownloads</code>.',
      'Ambos endpoints son públicos y no hay límite por IP ni por sesión: los contadores son orientativos.',
    ],
    data: J(vista) + '\n' + J(descarga),
    touches: [RW('publicaciones')],
    ia: null,
    caso: { vistas: `${vistasN} (antes ${vistasN - 1})` },
    files: [
      S(FE + 'modules/prototype/ArticleDetailScreen.jsx', 'publicationService.recordView', 'recordView', 'Registra la vista exactamente una vez por visita'),
      S(FE + 'services/publicationService.js', 'async recordView', 'publicationService.recordView', 'POST /publicaciones/:id/vista'),
      S(pubC, 'public function recordView', 'PublicationController::recordView', '404 si no existe; responde id y vistas nuevas'),
      S(pubR, 'public function incrementViews', 'PublicationRepository::incrementViews', 'UPDATE vistas = COALESCE(vistas, 0) + 1'),
      S(pubC, 'public function recordDownload', 'PublicationController::recordDownload', 'Cuenta descargas del PDF'),
      S(pubR, 'public function incrementDownloads', 'PublicationRepository::incrementDownloads', 'UPDATE descargas = COALESCE(descargas, 0) + 1'),
    ],
  },
  {
    id: 'login', lane: 0, title: 'Iniciar sesión: administrador o docente', short: 'Iniciar sesión', http: 'POST /api/auth/login',
    what: 'Quien administra y quien es docente entran por el mismo formulario («Iniciar sesión») con su correo institucional y contraseña; el rol decide a dónde llegan.',
    bullets: [
      '<code>LoginScreen</code> valida antes de enviar: correo con formato válido y contraseña de al menos 8 caracteres. El botón del encabezado ya no dice «Acceso administrador»: dice «Iniciar sesión» y, con sesión, «Ir al panel» (admin) o «Mi espacio» (docente).',
      '<code>authService.login</code> normaliza el correo (minúsculas) y llama a <code>apiPost(\'/auth/login\')</code> con <code>{correo, password}</code>.',
      'Acepta dos roles: <code>administrador</code>/<code>admin</code> y <code>investigador</code> (docente) con <code>investigador_id</code>. Un docente sin ficha ligada o cualquier otro rol (<code>lector</code>) se rechaza sin guardar nada.',
      'Si la respuesta trae <code>token</code>, guarda <code>buap_auth_token</code> y <code>buap_auth_user</code> (con <code>rol</code>, <code>investigador_id</code> y <code>debe_cambiar_password</code>) en <code>localStorage</code>.',
      '<code>App.handleLoginSuccess</code> enruta por rol: administrador → <code>admin-panel</code>; docente → <code>docente-mi-espacio</code>, o <code>docente-cuenta</code> si todavía tiene contraseña temporal. En otro caso muestra el mensaje del servidor: credenciales, intentos restantes, bloqueo o cuenta inactiva.',
    ],
    data: 'POST /api/auth/login\nContent-Type: application/json\n\n{ "correo": "admin@buap.mx", "password": "••••••••" }\n\n(el docente usa el mismo formulario; sus contraseñas demo están en guia.md)',
    touches: [],
    ia: null,
    caso: {},
    files: [
      S(FE + 'modules/prototype/LoginScreen.jsx', 'const handleSubmit', 'handleSubmit', 'Validaciones de formulario antes de llamar a la API'),
      S(FE + 'services/authService.js', 'async login(', 'authService.login', 'POST /auth/login; acepta admin y docente y guarda token y usuario'),
      S(api, 'export async function apiPost', 'apiPost', 'POST JSON; normaliza {success, message, errors}'),
      S(FE + 'App.jsx', 'const handleLoginSuccess', 'handleLoginSuccess', 'Admin → admin-panel; docente → Mi espacio o Mi cuenta'),
      S(FE + 'App.jsx', 'const docenteHome', 'docenteHome', 'Vista inicial del docente: Mi cuenta si debe cambiar la contraseña'),
      S(FE + 'components/BUAPHeader.jsx', "'Ir al panel' : 'Iniciar sesión'", 'Iniciar sesión', 'Botón del encabezado según el rol'),
      S(FE + 'services/authService.test.js', "describe('authService.login por rol'", 'login por rol', 'Pruebas: admin, docente, sin ficha y lector'),
    ],
  },
  {
    id: 'sesion', lane: 2, title: 'Verificar credenciales y abrir sesión', short: 'Crear sesión', http: 'POST /api/auth/login',
    what: 'El servidor comprueba usuario, bloqueo, contraseña y rol; si todo cuadra, crea una sesión de 8 horas y guarda solo el hash del token.',
    bullets: [
      '<code>AuthController::login</code> valida con <code>Validator</code> (400 con <code>errors</code>) y busca el usuario con sentencia preparada.',
      'Usuario inexistente: simula un <code>password_verify</code> para no revelar la diferencia por tiempo y responde 401 genérico.',
      'Cuenta inactiva → 403. Cinco contraseñas incorrectas seguidas → bloqueo de 15 minutos (<code>bloqueado_hasta</code>), también 403 y también para docentes. Un rol que no sea administrador ni docente recibe 403 aunque la contraseña sea correcta; un docente sin <code>investigador_id</code> también («Tu cuenta aún no está ligada a un docente»).',
      'Si todo va bien: reinicia <code>intentos_fallidos</code>, borra las sesiones vencidas y genera <code>bin2hex(random_bytes(32))</code> (64 hex).',
      'En <code>sesiones</code> se guarda solo <code>sha256(token)</code> con expiración a 8 h (<code>SESSION_TTL</code>); el token en claro viaja una vez en la respuesta. El usuario público es <code>{id, nombre, correo, cargo, rol, investigador_id, debe_cambiar_password}</code>: para el administrador <code>investigador_id</code> es <code>null</code> y <code>debe_cambiar_password</code> es 0.',
    ],
    data: J(loginShown),
    touches: [RW('usuarios'), W('sesiones')],
    ia: null,
    caso: { token: TOKEN_SHORT, sesion: 'ahora + 8 h', rol: 'administrador', intentos: '0', password: '0' },
    files: [
      S(auth, 'public function login', 'AuthController::login', 'Validación, bloqueo por fuerza bruta, rol y sesión'),
      S(auth, 'private const SESSION_TTL', 'SESSION_TTL', 'Duración de la sesión: 28 800 s (8 h)'),
      S(auth, '$intentos >= 5', 'intentos >= 5', 'Quinto fallo: bloqueo de 15 minutos'),
      S(auth, 'ligada a un docente. Contacta al administrador.', 'ligada a un docente', 'Docente sin ficha: 403'),
      S(auth, '$sessionToken = bin2hex(random_bytes(32))', 'random_bytes(32)', 'Token aleatorio; se guarda solo su sha256'),
      S(auth, 'private static function hashToken', 'AuthController::hashToken', 'sha256 del token'),
      S(auth, 'private static function publicUser', 'AuthController::publicUser', 'Forma pública del usuario (7 campos, sin hash)'),
      S(BE + 'src/Core/Validator.php', 'class Validator', 'Validator', 'required, email, minLength, numeric…'),
    ],
  },
  {
    id: 'guard', lane: 0, title: 'Guard por rol y token en cada petición', short: 'Guard por rol', http: '',
    what: 'Las vistas «admin…» exigen sesión de administrador y las «docente-…» sesión de docente; sin la sesión que toca, la interfaz redirige.',
    bullets: [
      '<code>App.handleNavigate</code>: <code>admin*</code> solo con sesión admin (un docente va a su espacio; sin sesión, a <code>login</code>); <code>docente-*</code> solo con sesión docente (un admin va a <code>admin-panel</code>). Con contraseña temporal pendiente, cualquier vista docente cae en <code>docente-cuenta</code>.',
      '<code>authService.isAuthenticated</code> (sesión admin), <code>isDocente</code>, <code>isAdmin</code> e <code>isLoggedIn</code> solo revisan <code>localStorage</code> (token + usuario con rol): no consultan al servidor.',
      '<code>getAuthHeaders</code> lee <code>buap_auth_token</code> y manda <code>Authorization: Bearer …</code> en cada llamada. Si una petición <strong>con token</strong> recibe 401, <code>api.js</code> borra token y usuario y emite el evento <code>buap:session-expired</code>: <code>App</code> cierra la sesión local, va a login y avisa «Tu sesión expiró». Un 403 <code>cambio_password_obligatorio</code> emite <code>buap:password-change-required</code>.',
      'El guard es comodidad de interfaz, no seguridad: la defensa real es <code>checkAdmin</code> y <code>checkDocente</code> en el servidor (pasos siguientes).',
      'Las vistas admin y docente ocultan el pie institucional.',
    ],
    data: "currentView = 'admin-eje3-monitoreo'   (sesión docente)\n  → handleNavigate: view.startsWith('admin') y no es admin\n  → setCurrentView('docente-mi-espacio')\n\ncurrentView = 'docente-proyectos'   (sesión admin)\n  → setCurrentView('admin-panel')\n\npetición con token → 401\n  → localStorage.clear(token, user) + window.dispatchEvent('buap:session-expired')\n  → toast «Tu sesión expiró. Inicia sesión de nuevo.» + vista login",
    touches: [],
    ia: null,
    caso: {},
    files: [
      S(FE + 'App.jsx', 'const handleNavigate', 'handleNavigate', 'Guard por rol: admin*, docente-* y contraseña temporal'),
      S(FE + 'services/authService.js', 'isAuthenticated()', 'authService.isAuthenticated', 'Sesión admin: solo mira localStorage (token y rol)'),
      S(FE + 'services/authService.js', 'isDocente()', 'authService.isDocente', 'Sesión docente: rol investigador con investigador_id'),
      S(api, 'function getAuthHeaders', 'getAuthHeaders', 'Agrega Authorization: Bearer si hay token'),
      S(api, 'export const SESSION_EXPIRED_EVENT', 'SESSION_EXPIRED_EVENT', 'buap:session-expired: 401 con token limpia la sesión'),
      S(FE + 'App.jsx', 'const onExpired', 'onExpired', 'Cierra la sesión local, avisa y va a login'),
      S(FE + 'components/AdminSidebar.jsx', 'const EJE3_ITEMS', 'EJE3_ITEMS', 'Grupo «Eje 3 · Investigación» del menú lateral'),
      S(FE + 'App.test.jsx', "describe('App · guard de vistas admin del Eje 3'", 'guard de vistas admin', 'Pruebas del guard con y sin sesión'),
      S(FE + 'App.docente.test.jsx', "describe('App · guard por rol'", 'guard por rol', 'Pruebas del guard por rol y de sesión expirada'),
    ],
  },
  {
    id: 'checkadmin', lane: 2, title: 'checkAdmin valida cada petición protegida', short: 'checkAdmin', http: 'GET /api/eje3/catalogos',
    what: 'Todo endpoint [A] llama a checkAdmin: compara el sha256 del token con la tabla sesiones y exige rol de administrador.',
    bullets: [
      '<code>AuthController::checkAdmin</code> → <code>resolveSession</code> → <code>resolveAny</code>: extrae <code>Bearer …</code> (también de <code>HTTP_AUTHORIZATION</code> o <code>apache_request_headers</code>), calcula <code>sha256</code> y busca en <code>sesiones</code> JOIN <code>usuarios</code>; en cada petición comprueba vigencia y que el usuario siga activo.',
      'Sin token → 401 «Acceso no autorizado»; token desconocido, vencido o usuario inactivo → 401 «inválido o expirado» (si venció, borra la fila); rol no admin → 403. Un token de <strong>docente</strong> en una ruta [A] siempre es 403, nunca pasa.',
      '<code>optionalAdmin</code> hace lo mismo sin responder: <code>GET /api/eje3/eventos</code> lo usa para mostrar también los eventos no públicos a un admin.',
      'Exigen admin todos los POST/PUT/DELETE (salvo login, logout, cambiar-password, los contadores vista/descarga y las rutas <code>/api/docente/*</code>), <code>/api/admin/stats</code> y las lecturas [A] del Eje 3: Visualizar, la bandeja de revisión y las cuentas de docentes.',
      '<code>Eje3Controller::requireAdmin</code> envuelve a <code>checkAdmin</code> para los controladores del Eje 3; el rol docente tiene su equivalente, <code>checkDocente</code> (paso del primer ingreso).',
    ],
    data: 'GET /api/eje3/catalogos\nAuthorization: Bearer ' + TOKEN_SHORT + '\n\nsha256(token) ∈ sesiones      ✓\nexpira_en > ahora             ✓\nusuarios.activo = 1           ✓\nusuarios.rol = administrador  ✓\n\nSin token:\n' + J(ex('err401')) + '\n\nCon token de docente:\n' + J(ex('docente_en_admin')),
    touches: [R('sesiones'), R('usuarios')],
    ia: null,
    caso: {},
    files: [
      S(auth, 'public static function checkAdmin', 'AuthController::checkAdmin', '401 sin/invalid token, 403 sin rol admin'),
      S(auth, 'private static function resolveSession', 'AuthController::resolveSession', 'Sesión de admin: resolveAny + rol administrador'),
      S(auth, 'private static function resolveAny', 'AuthController::resolveAny', 'sha256 → sesiones JOIN usuarios; borra la sesión vencida'),
      S(auth, 'public static function optionalAdmin', 'AuthController::optionalAdmin', 'Admin o null, sin enviar respuesta'),
      S(auth, 'private static function extractToken', 'AuthController::extractToken', 'Lee el Bearer de varios orígenes del encabezado'),
      S(E3 + 'Eje3Controller.php', 'protected function requireAdmin', 'Eje3Controller::requireAdmin', 'Base común de los controladores del Eje 3'),
      S(RUN, 'function suiteAuth', 'suiteAuth', 'Matriz 401/403, expirada, logout, bloqueo'),
      S(RUN, 'function suiteDocentePermissions', 'suiteDocentePermissions', 'Docente → 403 en TODAS las rutas [A]; admin → 403 en /api/docente/*'),
    ],
  },
  {
    id: 'subir', lane: 0, title: 'Subir un artículo con su PDF', short: 'Subir artículo', http: 'POST /api/upload/pdf',
    what: 'En «Subir artículo» el administrador llena el formulario y adjunta el PDF; el navegador hace dos peticiones en orden.',
    bullets: [
      '<code>AdminUploadScreen</code> exige título y autores y revisa en el navegador la extensión <code>.pdf</code> y el tamaño ≤ 25 MB (<code>handleFileChange</code>).',
      '<code>handleSave</code> primero llama a <code>apiUpload(\'/upload/pdf\')</code> con <code>FormData</code> (campo <code>pdf</code>) y, con la <code>url</code> devuelta, a <code>publicationService.create</code>.',
      '<code>apiUpload</code> no fija <code>Content-Type</code> para que el navegador ponga el <em>boundary</em> del multipart.',
      'Si la subida falla no se crea la publicación y se muestra el mensaje del servidor.',
    ],
    data: 'POST /api/upload/pdf   (multipart/form-data)\nAuthorization: Bearer ' + TOKEN_SHORT + '\npdf = articulo_investigacion_ia.pdf   (application/pdf, ≤ 25 MB)',
    touches: [],
    ia: null,
    caso: {},
    files: [
      S(FE + 'modules/prototype/AdminUploadScreen.jsx', 'const handleFileChange', 'handleFileChange', 'Valida extensión y 25 MB en el navegador'),
      S(FE + 'modules/prototype/AdminUploadScreen.jsx', 'const handleSave', 'handleSave', 'Sube el PDF y luego crea o actualiza la publicación'),
      S(api, 'export async function apiUpload', 'apiUpload', 'POST multipart sin Content-Type manual'),
    ],
  },
  {
    id: 'pdf', lane: 1, title: 'Verificar el PDF y guardarlo', short: 'Validar PDF', http: 'POST /api/upload/pdf',
    what: 'El servidor no se fía de la extensión: revisa permisos, tamaño, tipo MIME real y los primeros bytes del archivo.',
    bullets: [
      '<code>UploadController::uploadPdf</code> empieza con <code>checkAdmin</code> (401/403).',
      'Busca el archivo en <code>pdf</code>, <code>file</code>, <code>documento</code> o <code>archivo</code>; revisa errores de PHP, tamaño ≤ 25 MB y extensión <code>pdf</code>.',
      '<code>finfo_file</code> debe decir <code>application/pdf</code> y la cabecera debe empezar con <code>%PDF-</code> (<em>magic bytes</em>): un script renombrado a .pdf se rechaza con 400.',
      '<code>Storage::disk()</code> elige <code>LocalStorage</code> (o <code>S3Storage</code> si <code>STORAGE_DRIVER=s3</code>); <code>putFile</code> limpia el nombre y guarda en <code>public/uploads/documents/doc_AAAAMMDD_HHMMSS_aleatorio_nombre.pdf</code>.',
      'Responde 201 con la <code>url</code> pública; el frontend la guarda como <code>url_documento</code>.',
    ],
    data: J({
      success: true, message: 'Documento PDF subido, verificado y almacenado correctamente.',
      data: { url: 'http://127.0.0.1:8000/uploads/documents/doc_20261020_042051_4e6eb99a_articulo_investigacion_ia.pdf', filename: 'doc_20261020_042051_4e6eb99a_articulo_investigacion_ia.pdf', original_name: 'articulo_investigacion_ia.pdf', size: 66, storage_driver: 'local', mime: 'application/pdf', uploaded_at: '2026-10-20 04:20:51' },
    }, 1, 200) + '\n\nArchivo que no es PDF:\n' + J({ success: false, message: 'El contenido del archivo no corresponde a un documento PDF legítimo (MIME detectado: text/plain).', errors: null }, 1, 200),
    touches: [R('sesiones'), W('uploads')],
    ia: null,
    caso: { url: '…/uploads/documents/doc_20261020_…_articulo_investigacion_ia.pdf' },
    files: [
      S(BE + 'src/Modules/Upload/UploadController.php', 'public function uploadPdf', 'UploadController::uploadPdf', 'Admin, tamaño, extensión, MIME real y magic bytes'),
      S(BE + 'src/Modules/Upload/UploadController.php', "$extension !== 'pdf'", "extension !== 'pdf'", 'Rechaza otras extensiones con 400'),
      S(BE + 'src/Modules/Upload/UploadController.php', "strncmp($header, '%PDF-', 5)", '%PDF-', 'Firma binaria del PDF'),
      S(BE + 'src/Core/Storage/Storage.php', 'public static function disk', 'Storage::disk', 'Local por defecto; S3 con STORAGE_DRIVER=s3'),
      S(BE + 'src/Core/Storage/LocalStorage.php', 'public function putFile', 'LocalStorage::putFile', 'Sanitiza el nombre y mueve a uploads/documents'),
    ],
  },
  {
    id: 'publicar', lane: 2, title: 'Registrar la publicación', short: 'Guardar artículo', http: 'POST /api/publicaciones',
    what: 'Con la URL del PDF en mano, el formulario crea la publicación; el servicio completa valores por defecto y valida.',
    bullets: [
      '<code>PublicationController::store</code> exige admin y delega en <code>PublicationService::createPublication</code>.',
      'El servicio completa defaults (<code>investigador_id</code> = 1 si falta, revista «Repositorio Institucional BUAP», año actual) y valida título, autores, revista y año con <code>Validator</code> (400 con <code>errors</code>).',
      '<code>PublicationRepository::create</code> inserta con parámetros nombrados y acepta <code>origen</code> (<code>evento</code> | <code>revista_pyad</code> | <code>otra</code>) y <code>evento_id</code>, que alimentan las cifras de Visualizar del Eje 3.',
      'Un borrador (<code>estado = \'borrador\'</code>) se guarda igual pero no aparece en el portal ni en los conteos.',
    ],
    data: 'POST /api/publicaciones\n{ "titulo": "Ponencia de ejemplo…", "autores": "Ramos-Sandoval, E.", "investigador_id": 1,\n  "anio": 2026, "origen": "evento", "evento_id": 1, "estado": "publicado",\n  "url_documento": "http://127.0.0.1:8000/uploads/documents/doc_….pdf" }\n\n→ 201 { "success": true, "message": "Publicación registrada exitosamente.",\n        "data": { "id": 6, "revista_editorial": "Repositorio Institucional BUAP", "origen": "evento", … } }',
    touches: [W('publicaciones'), R('investigadores'), R('sesiones')],
    ia: null,
    caso: {},
    files: [
      S(pubC, 'public function store', 'PublicationController::store', 'checkAdmin + 201 al crear'),
      S(pubS, 'public function createPublication', 'PublicationService::createPublication', 'Defaults y validación (título, autores, revista, año)'),
      S(pubR, 'public function create', 'PublicationRepository::create', 'INSERT con origen y evento_id'),
      S(pubR, 'private static function normalizeOrigen', 'normalizeOrigen', "Acepta 'evento', 'revista_pyad' u 'otra'"),
    ],
  },
  {
    id: 'hub', lane: 0, title: 'Eje 3 · Registro: hub de 11 catálogos', short: 'Hub de Registro', http: 'GET /api/eje3/catalogos',
    what: 'El menú lateral lleva a Registro: tarjetas con el conteo de cada catálogo y, al elegir una, su tabla con alta, edición y borrado.',
    bullets: [
      '<code>AdminSidebar</code> (grupo «Eje 3 · Investigación») navega a <code>admin-eje3-registro</code>.',
      '<code>RegistroHub</code> pide los conteos con <code>eje3Service.getCatalogos</code> y pinta 11 tarjetas: los 10 catálogos del Eje 3 más proyectos de titulación (apoyo del indicador CIV).',
      'Si el servidor no responde o la sesión venció, muestra un aviso visible: <strong>no inventa cifras</strong> (<code>useEje3Data</code> recibe <code>null</code>).',
      'Al elegir una tarjeta, <code>CatalogView</code> arma tabla, buscador con debounce, filtros, modal de alta/edición y confirmación de borrado a partir de <code>CATALOGOS</code>, sin código propio por catálogo.',
      'En las tablas de proyectos aparece la columna «Registro» (un tag con borrador, enviado, aprobado o devuelto) y un filtro <code>registro_estado</code>: el Registro lista <strong>todos</strong> los estados. La respuesta del hub trae 14 claves: los 13 conteos de siempre (los de proyectos cuentan todos los estados) y <code>proyectos_pendientes</code> (los «enviado», para el contador de revisión).',
    ],
    data: J({ success: true, message: ex('catalogos').message, data: cat.data }),
    touches: [R('proyectos'), R('participantes'), R('retribucion'), R('egresados'), R('eventos'), R('investigadores')],
    ia: null,
    caso: {},
    files: [
      S(FEM + 'Eje3RegistroScreen.jsx', 'function RegistroHub', 'RegistroHub', 'Tarjetas con conteos desde /eje3/catalogos'),
      S(FEM + 'Eje3RegistroScreen.jsx', 'function CatalogView', 'CatalogView', 'Tabla, filtros, modal y borrado de un catálogo'),
      S(FEM + 'registroConfig.js', 'export const CATALOGOS', 'CATALOGOS', 'Configuración declarativa de los 11 catálogos'),
      S(FEM + 'registroConfig.js', 'export const REGISTRO_ESTADOS', 'REGISTRO_ESTADOS', 'Estados de registro: opciones del tag y del filtro'),
      S(e3svc, 'getCatalogos', 'eje3Service.getCatalogos', 'GET /eje3/catalogos'),
      S(FEM + 'eje3Hooks.js', 'export function useEje3Data', 'useEje3Data', 'Carga con estados loading/failed (null = aviso)'),
      S(E3 + 'CatalogController.php', 'public function index', 'CatalogController::index', '13 conteos + proyectos_pendientes'),
    ],
  },
  {
    id: 'registry', lane: 2, title: 'CRUD de catálogos dirigido por configuración', short: 'CRUD catálogos', http: 'POST /api/eje3/participantes',
    what: 'Dictaminadores, moderadores, relatores, dictaminadores PYAD, retribución social y egresados comparten un controlador, servicio y repositorio genéricos.',
    bullets: [
      '<code>ParticipantController</code>, <code>SocialReturnController</code> y <code>GraduateController</code> solo declaran su <code>resource()</code>; <code>RegistryController</code> implementa lista, detalle, alta, edición y borrado, y exige admin en todos.',
      '<code>RegistryConfig</code> describe tabla, campos, filtros permitidos y columnas de búsqueda: <code>participantes_evento</code> (4 roles), <code>retribucion_social</code> (MPYMES, MGT, MDGE × estudiante/profesor) y <code>actividades_egresados</code>.',
      '<code>Eje3Fields::process</code> valida y normaliza (string, email, enum, int, date, fk, bool) y devuelve errores <code>{campo:[mensajes]}</code> en español → 400.',
      'El alta usa defaults; la edición acepta cuerpos parciales y conserva lo no enviado; las llaves foráneas (<code>evento_id</code>) deben existir.',
      '<code>RegistryRepository</code> arma el SQL solo con tablas y columnas de la configuración; los valores van como parámetros nombrados.',
      '404 si el id no existe; borrar un evento deja <code>evento_id</code> en NULL en sus participantes.',
    ],
    data: 'POST /api/eje3/participantes\n{ "rol": "dictaminador", "nombre_completo": "Dra. Ana Torres",\n  "correo": "ana.torres@correo.mx", "evento_id": 2 }\n\n→ 201 ' + J({
      success: true, message: 'Registro creado exitosamente.',
      data: { id: 13, rol: 'dictaminador', nombre_completo: 'Dra. Ana Torres', correo: 'ana.torres@correo.mx', institucion: null, especialidad: null, evento_id: 2, activo: 1, evento_nombre: 'Congreso Internacional de Investigación en Ciencias Económico Administrativas' },
    }, 1, 90),
    touches: [RW('participantes'), RW('retribucion'), RW('egresados'), R('eventos')],
    ia: null,
    caso: {},
    files: [
      S(E3 + 'RegistryController.php', 'abstract class RegistryController', 'RegistryController', 'list/show/store/update/destroy con requireAdmin'),
      S(E3 + 'ParticipantController.php', 'class ParticipantController', 'ParticipantController', "Solo declara resource() = 'participantes'"),
      S(E3 + 'RegistryConfig.php', 'private static function all', 'RegistryConfig::all', 'Tablas, campos, enums y filtros de los 3 catálogos'),
      S(E3 + 'RegistryService.php', 'public function create', 'RegistryService::create', 'Valida con Eje3Fields y devuelve el registro creado'),
      S(E3 + 'Eje3Fields.php', 'public static function process', 'Eje3Fields::process', 'Tipos string, email, enum, int, date, fk, bool'),
      S(E3 + 'RegistryRepository.php', 'public function findAll', 'RegistryRepository::findAll', 'Filtros declarados + búsqueda LIKE parametrizada'),
      S(idx, "$router->get('/api/eje3/participantes',", 'GET /api/eje3/participantes', 'Rutas del CRUD de participantes'),
    ],
  },
  {
    id: 'proyectos', lane: 2, title: 'Proyectos con apartados anexos', short: 'Apartados anexos', http: 'POST /api/eje3/proyectos',
    what: 'Investigación, semilleros y titulación viven en la misma tabla proyectos; cada uno puede ligarse a un evento y llevar apartados (título + contenido). El administrador los captura ya aprobados.',
    bullets: [
      '<code>Eje3ProjectService::spec</code> valida el tipo (<code>investigacion</code>, <code>semillero</code>, <code>titulacion</code>), que el investigador principal exista, el evento y <code>articulado_civ</code>. La clase se heredó: el servicio del docente la extiende con su propia especificación (pasos siguientes).',
      'Si no se manda <code>codigo</code>, <code>generateCode</code> crea <code>INV-</code>, <code>SEM-</code> o <code>TIT-AAAA-NNN</code> único.',
      'El cuerpo puede traer <code>apartados: [{apartado, contenido}]</code>: <code>parseSections</code> los valida (máximo 100) y <code>replaceSections</code> reemplaza todo el conjunto (borra y reinserta con <code>orden</code>) dentro de una transacción.',
      'Lo que captura el administrador nace con <code>registro_estado = \'aprobado\'</code> (columna agregada con DEFAULT \'aprobado\': todo lo anterior también); el PUT del admin nunca cambia ese estado. El mismo registro lo puede capturar un docente, pero entonces pasa por revisión.',
      'Sin <code>apartados</code> en el PUT no se tocan; con lista vacía se eliminan. Borrar un proyecto borra sus apartados y deja <code>proyecto_id = NULL</code> en las publicaciones derivadas.',
    ],
    data: 'POST /api/eje3/proyectos\n{ "titulo": "Semillero de economía circular", "tipo": "semillero",\n  "investigador_principal_id": 3, "evento_id": 1,\n  "apartados": [ {"apartado":"Planteamiento del problema","contenido":"…"},\n                 {"apartado":"Metodología","contenido":"…"} ] }\n\n→ 201 { "data": { "id": 12, "codigo": "SEM-2026-003", "estado": "en_ejecucion",\n         "registro_estado": "aprobado", "tipo": "semillero",\n         "evento_nombre": "Encuentro de Semilleros de Investigación 2026",\n         "total_apartados": 2, "apartados": [ {"id":9,"orden":0,…}, {"id":10,"orden":1,…} ] } }',
    touches: [RW('proyectos'), RW('apartados'), R('investigadores'), R('eventos')],
    ia: null,
    caso: { codigo: 'SEM-2026-003', registro: 'aprobado (admin)' },
    files: [
      S(E3 + 'Eje3ProjectController.php', 'class Eje3ProjectController', 'Eje3ProjectController', 'CRUD [A] de /api/eje3/proyectos'),
      S(projS, 'protected function spec', 'Eje3ProjectService::spec', 'Campos, enums y llaves foráneas del proyecto'),
      S(projS, 'protected function generateCode', 'Eje3ProjectService::generateCode', 'INV-/SEM-/TIT-AAAA-NNN único'),
      S(projS, 'protected function parseSections', 'Eje3ProjectService::parseSections', 'Valida la lista de apartados (máx. 100)'),
      S(projR, 'public function create', 'Eje3ProjectRepository::create', "INSERT con registro_estado ('aprobado' por defecto) y apartados"),
      S(projR, 'private function replaceSections', 'replaceSections', 'Reemplaza todo el conjunto de apartados'),
      S(projR, 'public function delete', 'Eje3ProjectRepository::delete', 'Borra apartados y deja proyecto_id NULL en publicaciones'),
    ],
  },
  {
    id: 'cuentas', lane: 2, title: 'El administrador crea la cuenta de un docente', short: 'Cuenta docente', http: 'POST /api/eje3/usuarios-docentes',
    what: 'No hay auto-registro: desde «Docentes → Usuarios docentes» el administrador elige una ficha de docente y el sistema crea la cuenta con una contraseña temporal que se muestra una sola vez.',
    bullets: [
      '<code>AdminDocentesUsuariosScreen</code> lista las cuentas (<code>GET /api/eje3/usuarios-docentes</code>, con <code>?search</code>); su <code>CrearCuentaModal</code> solo ofrece docentes sin cuenta y precarga el correo de la ficha.',
      '<code>TeacherAccountController::store</code> exige admin y marca la respuesta <code>Cache-Control: no-store</code>. <code>TeacherAccountService::create</code> valida <code>investigador_id</code> (debe existir) y <code>correo</code> (formato, ≤ 120, único sin distinguir mayúsculas): un docente que ya tiene cuenta → 409 <code>docente_con_cuenta</code>; correo repetido → 409 <code>correo_duplicado</code>.',
      'La contraseña temporal son 12 caracteres sacados de <code>random_bytes</code> con un alfabeto sin ambiguos (sin 0, O, 1, l, I). En la base solo se guarda el hash bcrypt; la temporal viaja <strong>una sola vez</strong> en <code>password_temporal</code> y no vuelve a aparecer, ni en la lista (<code>PasswordTemporalModal</code>: «no se volverá a mostrar»).',
      'La cuenta nace con rol <code>investigador</code>, <code>activo = 1</code>, <code>investigador_id</code> de la ficha y <code>debe_cambiar_password = 1</code>. Un índice único (<code>uq_usuario_investigador</code>) garantiza una cuenta por docente.',
      '<code>POST …/:id/restablecer</code> genera otra temporal, obliga al cambio, limpia intentos y bloqueo y borra todas sus sesiones. <code>PUT …/:id {activo}</code> activa o desactiva (al desactivar borra sus sesiones). Solo actúan sobre cuentas de rol <code>investigador</code>: un administrador o un lector responde 404.',
    ],
    data: 'POST /api/eje3/usuarios-docentes\nAuthorization: Bearer ' + TOKEN_SHORT + '\n{ "investigador_id": ' + ex('meta').docente_id + ' }\n\n→ 201 ' + J(ex('cuenta_crear'), 1, 100) + '\n\nOtra vez con el mismo docente → 409 ' + J(ex('cuenta_duplicada'), 1, 70),
    touches: [RW('usuarios'), R('investigadores'), R('proyectos'), W('sesiones')],
    ia: null,
    caso: { rol: 'administrador', password: '1 (cuenta nueva)' },
    files: [
      S(acctC, 'public function store', 'TeacherAccountController::store', 'Admin + Cache-Control: no-store + 201'),
      S(acctS, 'public function create', 'TeacherAccountService::create', 'Valida ficha y correo; 409 si ya hay cuenta o correo'),
      S(acctS, 'private function generatePassword', 'TeacherAccountService::generatePassword', '12 caracteres con random_bytes, muestreo sin sesgo'),
      S(acctS, 'private const ALPHABET', 'ALPHABET', 'Alfabeto sin ambiguos: sin 0, O, 1, l, I'),
      S(acctR, 'public function create', 'TeacherAccountRepository::create', "INSERT rol 'investigador', debe_cambiar_password = 1 (solo el hash)"),
      S(acctR, 'public function resetPassword', 'TeacherAccountRepository::resetPassword', 'Nueva temporal, sin bloqueo y SIN sesiones'),
      S(acctR, 'public function setActive', 'TeacherAccountRepository::setActive', 'Activa/desactiva; al desactivar borra sesiones'),
      S(FEM + 'AdminDocentesUsuariosScreen.jsx', 'function PasswordTemporalModal', 'PasswordTemporalModal', 'Muestra la temporal una sola vez, copiable'),
      S(FEM + 'AdminDocentesUsuariosScreen.jsx', 'function CrearCuentaModal', 'CrearCuentaModal', 'Selector de docentes sin cuenta y correo'),
      S(idx, "$router->post('/api/eje3/usuarios-docentes',", 'POST /api/eje3/usuarios-docentes', 'Ruta [A] de alta de cuentas'),
    ],
  },
  {
    id: 'password', lane: 2, title: 'Primer ingreso: la contraseña temporal bloquea y se cambia', short: 'Cambio de clave', http: 'POST /api/auth/cambiar-password',
    what: 'El docente entra con la temporal, pero el servidor no le deja usar nada de su zona hasta que la cambie: toda /api/docente/* responde 403 «cambio_password_obligatorio».',
    bullets: [
      'El login con la temporal responde 200 con <code>debe_cambiar_password: 1</code>; <code>App</code> abre <code>docente-cuenta</code> y <code>DocenteSidebar</code> (con <code>soloCuenta</code>) deja habilitado únicamente «Mi cuenta».',
      '<code>AuthController::checkDocente</code> exige sesión vigente, rol <code>investigador</code> con <code>investigador_id</code> y, si <code>debe_cambiar_password = 1</code>, responde 403 con <code>errors.codigo = [\'cambio_password_obligatorio\']</code>. <code>/api/auth/me</code>, <code>/logout</code> y <code>/cambiar-password</code> no pasan por ese gate. <code>api.js</code> lo convierte en el evento <code>buap:password-change-required</code>.',
      '<code>POST /api/auth/cambiar-password {actual, nueva}</code>: <code>nueva</code> de 8 a 72 caracteres y distinta de la actual (400 con <code>errors</code> por campo). Una <code>actual</code> incorrecta cuenta como intento fallido (mismo bloqueo: 5 intentos, 15 min) y responde 400, no 401, para no cerrar la sesión del cliente.',
      'Si todo va bien guarda un hash bcrypt nuevo, pone <code>debe_cambiar_password = 0</code>, reinicia intentos y <strong>borra todas las demás sesiones</strong> del usuario (conserva la actual). También lo puede usar el administrador. Un lector → 403, sin token → 401.',
      '<code>App.handlePasswordChanged</code> libera el acceso y lleva a <code>docente-mi-espacio</code>.',
    ],
    data: 'POST /api/auth/login   (docente con contraseña temporal)\n→ data.user.debe_cambiar_password = 1\n\nGET /api/docente/resumen   (con esa sesión)\n→ 403 ' + J(ex('gate')) + '\n\nPOST /api/auth/cambiar-password\n{ "actual": "••••••••••••", "nueva": "••••••••••••" }\n→ 200 ' + J({ success: true, message: ex('cambiar_password').message, data: { id: ex('cambiar_password').data.id, rol: 'investigador', investigador_id: ex('cambiar_password').data.investigador_id, debe_cambiar_password: ex('cambiar_password').data.debe_cambiar_password } }, 1, 90) + '\n\nActual incorrecta → 400 ' + J(ex('cambiar_password_mala'), 1, 90),
    touches: [RW('usuarios'), RW('sesiones')],
    ia: null,
    caso: { token: TOKEN_DOC, sesion: 'ahora + 8 h', rol: 'investigador', password: '1 → 0' },
    files: [
      S(auth, 'public static function checkDocente', 'AuthController::checkDocente', '401/403 y gate de contraseña temporal'),
      S(auth, "['codigo' => ['cambio_password_obligatorio']]", 'cambio_password_obligatorio', '403 con errors.codigo del gate'),
      S(auth, 'public function changePassword', 'AuthController::changePassword', 'Valida, cuenta fallos, cambia hash y cierra otras sesiones'),
      S(auth, 'DELETE FROM sesiones WHERE usuario_id = :id AND token_hash <> :hash', 'DELETE FROM sesiones', 'Invalida todas las sesiones salvo la actual'),
      S(FED + 'DocenteCuentaScreen.jsx', 'export default function DocenteCuentaScreen', 'DocenteCuentaScreen', 'Formulario de cambio; obligatorio si hay temporal'),
      S(FE + 'services/authService.js', 'async changePassword', 'authService.changePassword', 'POST /auth/cambiar-password y quita la obligación guardada'),
      S(api, 'export const PASSWORD_CHANGE_EVENT', 'PASSWORD_CHANGE_EVENT', 'Evento del 403 cambio_password_obligatorio'),
      S(FE + 'components/DocenteSidebar.jsx', 'soloCuenta', 'soloCuenta', 'Solo «Mi cuenta» habilitada con contraseña temporal'),
      S(RUN, 'function suiteDocenteAuth', 'suiteDocenteAuth', 'Login por rol, me, gate y cambio de contraseña'),
    ],
  },
  {
    id: 'miespacio', lane: 0, title: 'Mi espacio: el resumen del docente', short: 'Mi espacio', http: 'GET /api/docente/resumen',
    what: 'Con la contraseña ya cambiada, el docente llega a Mi espacio: sus datos, el nivel SNII, cuántos proyectos tiene en cada estado de registro y su producción en solo lectura.',
    bullets: [
      '<code>DocenteSidebar</code> es un menú propio y corto: Mi espacio, Mis proyectos y Mi cuenta (en el drawer móvil, además «Ver portal público»). <code>DocenteMiEspacioScreen</code> pide <code>docenteService.resumen()</code> y, si el backend falla, muestra un aviso en vez de cifras inventadas.',
      '<code>DocenteController::summary</code> llama a <code>checkDocente</code> y a <code>DocenteSummaryRepository::build</code> con el <code>investigador_id</code> de la <strong>sesión</strong>: el cliente nunca manda de quién quiere el resumen.',
      '<code>proyectos_por_estado</code> cuenta SUS proyectos en los cuatro estados (borrador, enviado, aprobado, devuelto); la pantalla lista hasta 5 recientes y, en los devueltos, el comentario del administrador.',
      '<code>publicaciones</code> (solo <code>estado = \'publicado\'</code>) y <code>produccion_tecnica</code> son de solo lectura: las captura el administrador. Las listas se limitan a 100 y los totales son siempre el conteo completo.',
      'Un docente no ve proyectos ajenos ni ninguna pantalla de administración: en cualquier ruta [A] recibe 403.',
    ],
    data: 'GET /api/docente/resumen          (docente demo)\nAuthorization: Bearer ' + TOKEN_DOC + '\n\n' + J({ success: true, message: ex('resumen').message, data: { ...ex('resumen').data, docente: pick(ex('resumen').data.docente, ['id', 'nombre_completo', 'categoria', 'snii_nivel', 'snii_elegible']) } }, 1, 60),
    touches: [R('investigadores'), R('proyectos'), R('publicaciones'), R('produccion'), R('sesiones'), R('usuarios')],
    ia: null,
    caso: { token: TOKEN_DOC, rol: 'investigador', password: '0' },
    files: [
      S(FED + 'DocenteMiEspacioScreen.jsx', 'export default function DocenteMiEspacioScreen', 'DocenteMiEspacioScreen', 'Datos, SNII, conteos por estado y producción'),
      S(FE + 'components/DocenteSidebar.jsx', 'const DOCENTE_ITEMS', 'DOCENTE_ITEMS', 'Menú corto: Mi espacio, Mis proyectos, Mi cuenta'),
      S(FE + 'services/docenteService.js', 'resumen: ()', 'docenteService.resumen', 'GET /docente/resumen (null si falla)'),
      S(docC, 'public function summary', 'DocenteController::summary', 'checkDocente + resumen de la ficha de la sesión'),
      S(DOC + 'DocenteSummaryRepository.php', 'public function build', 'DocenteSummaryRepository::build', 'Ficha, SNII, proyectos por estado, publicaciones y producción'),
      S(projR, 'public function countByRegistroEstado', 'Eje3ProjectRepository::countByRegistroEstado', 'Los 4 estados siempre presentes'),
      S(idx, "$router->get('/api/docente/resumen',", 'GET /api/docente/resumen', 'Ruta del resumen del docente'),
    ],
  },
  {
    id: 'docproy', lane: 2, title: 'El docente registra su proyecto en borrador', short: 'Proyecto docente', http: 'POST /api/docente/proyectos',
    what: 'En «Mis proyectos» el docente llena el formulario (con apartados y un evento público opcional); el servidor lo guarda siempre como borrador y a nombre de quien tiene la sesión.',
    bullets: [
      '<code>DocenteProyectosScreen</code> reutiliza el modal dirigido por configuración (<code>DOCENTE_PROYECTO_FORM</code>): título y tipo obligatorios, estado del proyecto (propuesta, en ejecución, completado), evento, coinvestigadores (texto libre) y apartados; «Articulado al CIV» solo aparece si el tipo es titulación. Envía únicamente esos campos.',
      '<code>DocenteProjectService::createFor</code> valida con <code>Eje3Fields::process</code> y <code>docenteSpec</code>: el evento debe existir <strong>y ser público</strong> (<code>checkPublicEvent</code>), máximo 100 apartados, fechas coherentes; <code>articulado_civ</code> se fuerza a 0 si el tipo no es titulación.',
      'Asignación masiva bloqueada: <code>investigador_principal_id</code>, <code>codigo</code>, <code>registro_estado</code>, <code>comentario_revision</code>, <code>revisado_*</code> y <code>creado_por_*</code> del cuerpo se ignoran. El principal es el de la sesión, el código lo genera <code>generateCode</code> (con reintento si dos altas chocan) y se guarda <code>creado_por_usuario_id</code>.',
      'Se crea con <code>registro_estado = \'borrador\'</code> y sus apartados en una transacción (el administrador, en cambio, captura en <code>aprobado</code>).',
      'Aislamiento: lista, detalle, edición, borrado y envío se resuelven por el <code>investigador_principal_id</code> de la sesión; un proyecto ajeno responde 404, nunca 403, para no revelar que existe.',
    ],
    data: 'POST /api/docente/proyectos\nAuthorization: Bearer ' + TOKEN_DOC + '\n{ "titulo": "Semillero de finanzas personales para jóvenes", "tipo": "semillero",\n  "evento_id": ' + ex('meta').evento_id + ', "linea_investigacion": "Educación financiera",\n  "resumen": "Talleres para que estudiantes…",\n  "apartados": [ {"apartado":"Planteamiento del problema",…}, {"apartado":"Metodología",…} ] }\n\n→ 201 ' + J({ success: true, message: ex('proy_crear').message, data: pick(ex('proy_crear').data, ['id', 'codigo', 'titulo', 'tipo', 'estado', 'registro_estado', 'comentario_revision', 'evento_nombre', 'total_apartados', 'apartados']) }, 1, 60) + '\n\nProyecto de otro docente → 404 ' + J(ex('proy_ajeno'), 1, 70),
    touches: [RW('proyectos'), W('apartados'), R('eventos'), R('investigadores'), R('sesiones')],
    ia: null,
    caso: { codigo: ex('proy_crear').data.codigo, registro: 'borrador' },
    files: [
      S(FED + 'DocenteProyectosScreen.jsx', 'export default function DocenteProyectosScreen', 'DocenteProyectosScreen', 'Lista, filtros, alta/edición, borrado y envío'),
      S(FED + 'docenteConfig.js', 'export const DOCENTE_PROYECTO_FORM', 'DOCENTE_PROYECTO_FORM', 'Campos que llena el docente (sin investigador ni código)'),
      S(docC, 'public function store', 'DocenteController::store', 'checkDocente + 201 «guardado como borrador»'),
      S(docS, 'public function createFor', 'DocenteProjectService::createFor', 'Valida, fuerza el principal de la sesión y crea en borrador'),
      S(docS, 'private function docenteSpec', 'DocenteProjectService::docenteSpec', 'Lista blanca de campos del docente'),
      S(docS, 'private function checkPublicEvent', 'DocenteProjectService::checkPublicEvent', 'El evento debe existir y ser público'),
      S(projR, 'public function create', 'Eje3ProjectRepository::create', "registro_estado 'borrador' y creado_por_usuario_id"),
      S(projR, 'public function findOwned', 'Eje3ProjectRepository::findOwned', 'Proyecto propio o null (ajeno = 404)'),
      S(idx, "$router->post('/api/docente/proyectos',", 'POST /api/docente/proyectos', 'Ruta de alta de proyectos del docente'),
    ],
  },
  {
    id: 'docedit', lane: 2, title: 'Editar o borrar solo en borrador o devuelto', short: 'Editar o bloquear', http: 'PUT /api/docente/proyectos/:id',
    what: 'Mientras el proyecto sea un borrador o esté devuelto, el docente lo edita o lo borra; en cuanto está enviado o aprobado queda bloqueado.',
    bullets: [
      'El PUT es parcial (como en el resto del Eje 3): solo cambia lo enviado y <code>apartados</code>, si viene, reemplaza todo el conjunto. Nunca cambia <code>registro_estado</code> ni el código.',
      '<code>updateOwned</code> y <code>deleteOwned</code> leen estado y propiedad <strong>dentro de la transacción</strong> (con <code>FOR UPDATE</code> en MySQL): así un envío simultáneo no se cruza con la edición. Si el proyecto ya no es editable → 409 <code>proyecto_bloqueado</code>; si es ajeno o no existe → 404.',
      'En pantalla, <code>esEditable</code> habilita Editar, Eliminar y Enviar solo en borrador y devuelto; en enviado y aprobado el proyecto se consulta en solo lectura (<code>ProyectoDetalle</code>) y <code>motivoBloqueo</code> explica por qué. Un devuelto muestra el comentario del administrador.',
      'Si hay que cambiar algo ya aprobado, el administrador lo devuelve con comentario (el admin edita cualquier proyecto sin tocar su estado de registro).',
      '<code>Response::conflict</code> (409) lleva el motivo en <code>errors.codigo[0]</code> para que la interfaz muestre un mensaje legible y no el código.',
    ],
    data: 'PUT /api/docente/proyectos/' + ex('meta').proyecto_id + '\nAuthorization: Bearer ' + TOKEN_DOC + '\n{ "titulo": "Semillero de finanzas personales para jóvenes universitarios" }\n\n→ 200 ' + J({ success: true, message: ex('proy_editar').message, data: pick(ex('proy_editar').data, ['id', 'codigo', 'titulo', 'registro_estado', 'total_apartados']) }, 1, 80),
    touches: [RW('proyectos'), W('apartados'), R('sesiones')],
    ia: null,
    caso: { registro: 'borrador' },
    files: [
      S(docC, 'public function update', 'DocenteController::update', 'checkDocente + PUT parcial'),
      S(docS, 'public function updateFor', 'DocenteProjectService::updateFor', 'Solo propio y en borrador/devuelto; si no, 409'),
      S(docS, 'public const EDITABLES', 'EDITABLES', "['borrador', 'devuelto']: los únicos estados editables"),
      S(projR, 'public function updateOwned', 'Eje3ProjectRepository::updateOwned', 'UPDATE con estado y propiedad leídos en la transacción'),
      S(projR, 'private function lockState', 'lockState', 'FOR UPDATE en MySQL; null si es ajeno'),
      S(projR, 'public function deleteOwned', 'Eje3ProjectRepository::deleteOwned', 'DELETE con las mismas garantías'),
      S(FED + 'docenteConfig.js', 'export const esEditable', 'esEditable', 'Editar y borrar solo en borrador o devuelto'),
      S(FEM + 'ProyectoDetalle.jsx', 'export default function ProyectoDetalle', 'ProyectoDetalle', 'Detalle de solo lectura con apartados'),
      S(BE + 'src/Core/Response.php', 'public static function conflict', 'Response::conflict', '409 con errors.codigo'),
    ],
  },
  {
    id: 'enviar', lane: 2, title: 'Enviar el proyecto a revisión', short: 'Enviar a revisión', http: 'POST /api/docente/proyectos/:id/enviar',
    what: 'El docente confirma el envío: el proyecto pasa a «enviado», se limpia el comentario anterior del revisor y queda bloqueado hasta que el administrador responda.',
    bullets: [
      '<code>DocenteProjectService::submitFor</code>: solo propio y en borrador o devuelto (si no, 409 <code>transicion_invalida</code>); exige <code>titulo</code>, <code>resumen</code> y <code>linea_investigacion</code> no vacíos: si falta alguno, 400 con <code>errors</code> por campo y el diálogo de envío no se cierra.',
      '<code>Eje3ProjectRepository::transition</code> hace <code>UPDATE … WHERE registro_estado IN (origen)</code> en una sola sentencia: la transición es atómica aunque dos peticiones lleguen a la vez.',
      'Fija <code>registro_estado = \'enviado\'</code>, <code>enviado_en</code> = ahora y <code>comentario_revision = NULL</code>.',
      'Desde ese momento un PUT o DELETE responde 409 <code>proyecto_bloqueado</code> y volver a enviar responde 409 <code>transicion_invalida</code>.',
      'Máquina de estados completa: borrador → enviado → aprobado | devuelto; devuelto → (editar) → enviado. Aprobado es definitivo para el docente.',
    ],
    data: 'POST /api/docente/proyectos/' + ex('meta').proyecto_id + '/enviar\nAuthorization: Bearer ' + TOKEN_DOC + '\n→ 200 ' + J({ success: true, message: ex('proy_enviar').message, data: pick(ex('proy_enviar').data, ['id', 'codigo', 'registro_estado', 'enviado_en', 'comentario_revision']) }, 1, 80) + '\n\nUn borrador sin resumen ni línea → 400 ' + J(ex('enviar_incompleto'), 1, 80) + '\n\nEditar ya enviado → 409 ' + J(ex('proy_bloqueado'), 1, 60),
    touches: [RW('proyectos'), R('sesiones')],
    ia: null,
    caso: { registro: 'enviado' },
    files: [
      S(docC, 'public function submit', 'DocenteController::submit', 'checkDocente + POST …/enviar'),
      S(docS, 'public function submitFor', 'DocenteProjectService::submitFor', 'Exige título, resumen y línea; 409 si no es borrador/devuelto'),
      S(projR, 'public function transition', 'Eje3ProjectRepository::transition', 'UPDATE atómico condicionado al estado de origen'),
      S(FED + 'DocenteProyectosScreen.jsx', 'docenteService.proyectos.enviar', 'proyectos.enviar', 'Confirma y llama a enviar; muestra errores por campo'),
      S(FE + 'services/docenteService.js', 'enviar: (id)', 'docenteService.enviar', 'POST /docente/proyectos/:id/enviar'),
      S(idx, "$router->post('/api/docente/proyectos/:id/enviar',", 'POST /api/docente/proyectos/:id/enviar', 'Ruta de envío a revisión'),
      S(RUN, 'function suiteDocenteProjects', 'suiteDocenteProjects', 'CRUD, aislamiento y máquina de estados'),
    ],
  },
  {
    id: 'revision', lane: 2, title: 'El administrador revisa: aprobar o devolver', short: 'Revisión admin', http: 'POST /api/eje3/proyectos/:id/revision',
    what: 'Los proyectos enviados llegan a «Docentes → Revisión de proyectos» (con un contador en el menú); el administrador los aprueba o los devuelve con un comentario obligatorio.',
    bullets: [
      '<code>GET /api/eje3/revision</code> (<code>Eje3ProjectController::pending</code>) devuelve <code>{pendientes, proyectos}</code>: solo <code>registro_estado = \'enviado\'</code>, del más antiguo al más reciente (<code>enviado_en</code>). <code>AdminSidebar</code> pinta el contador con ese dato y <code>GET /api/eje3/catalogos</code> añade <code>proyectos_pendientes</code>.',
      '<code>POST /api/eje3/proyectos/:id/revision {accion, comentario}</code> con <code>accion</code> ∈ {aprobar, devolver}. Orden de comprobaciones: 404 (no existe), 400 (acción inválida, comentario de más de 2000 o, al devolver, de menos de 3 caracteres tras <code>trim</code>) y 409 <code>transicion_invalida</code> si el proyecto no está «enviado».',
      '<code>Eje3ProjectService::review</code> aplica <code>transition([\'enviado\'] → aprobado | devuelto)</code> y guarda <code>revisado_en</code>, <code>revisado_por</code> (el admin de la sesión) y el comentario (opcional al aprobar).',
      '<code>AdminDocentesRevisionScreen</code> muestra el detalle con apartados (<code>ProyectoDetalle</code>) y su <code>RevisionModal</code> no llama al backend si falta el comentario al devolver. Un token de docente recibe 403 en estas rutas.',
      'El docente ve el resultado en su lista: aprobado (bloqueado) o devuelto con el comentario, listo para editar y reenviar.',
    ],
    data: 'GET /api/eje3/revision\nAuthorization: Bearer ' + TOKEN_SHORT + '\n→ 200 ' + J({ success: true, message: ex('revision_lista').message, data: { pendientes: ex('revision_lista').data.pendientes, proyectos: ex('revision_lista').data.proyectos.map((p) => pick(p, ['id', 'codigo', 'titulo', 'investigador_principal_nombre', 'registro_estado', 'enviado_en', 'total_apartados'])) } }, 1, 60) + '\n\nPOST /api/eje3/proyectos/' + ex('meta').proyecto_id + '/revision   { "accion": "devolver" }\n→ 400 ' + J(ex('revision_sin_comentario'), 1, 80) + '\n\nPOST …/revision   { "accion": "aprobar", "comentario": "Aprobado: cumple con los apartados." }\n→ 200 ' + J({ success: true, message: ex('revision_aprobar').message, data: pick(ex('revision_aprobar').data, ['id', 'codigo', 'registro_estado', 'comentario_revision', 'revisado_en']) }, 1, 60) + '\n\nRepetir la revisión → 409 ' + J(ex('revision_repetida'), 1, 60),
    touches: [RW('proyectos'), R('investigadores'), R('sesiones')],
    ia: null,
    caso: { token: TOKEN_SHORT, rol: 'administrador', registro: 'aprobado' },
    files: [
      S(E3 + 'Eje3ProjectController.php', 'public function pending', 'Eje3ProjectController::pending', 'GET /eje3/revision [A]: la bandeja'),
      S(E3 + 'Eje3ProjectController.php', 'public function review', 'Eje3ProjectController::review', 'POST /eje3/proyectos/:id/revision [A]'),
      S(projS, 'public function review', 'Eje3ProjectService::review', 'aprobar | devolver con comentario; 404 → 400 → 409'),
      S(projR, 'public function findPending', 'Eje3ProjectRepository::findPending', "Solo 'enviado', del más antiguo al más reciente"),
      S(FEM + 'AdminDocentesRevisionScreen.jsx', 'export default function AdminDocentesRevisionScreen', 'AdminDocentesRevisionScreen', 'Bandeja, detalle, Aprobar y Devolver'),
      S(FEM + 'AdminDocentesRevisionScreen.jsx', 'function RevisionModal', 'RevisionModal', 'Comentario obligatorio al devolver'),
      S(e3svc, 'revisar: (id', 'eje3Service.revisar', 'POST /eje3/proyectos/:id/revision'),
      S(FE + 'components/AdminSidebar.jsx', 'const DOCENTES_ITEMS', 'DOCENTES_ITEMS', 'Grupo «Docentes»: Usuarios y Revisión con contador'),
      S(idx, "$router->post('/api/eje3/proyectos/:id/revision',", 'POST /api/eje3/proyectos/:id/revision', 'Ruta [A] de revisión'),
      S(RUN, 'function suiteDocenteReview', 'suiteDocenteReview', 'Aprobar, devolver, 400 y 409'),
    ],
  },
  {
    id: 'monitoreo', lane: 2, title: 'Monitoreo: los 4 indicadores (solo aprobados)', short: 'Monitoreo', http: 'GET /api/eje3/monitoreo',
    what: 'Cuatro cifras sobre docentes, cada una con la lista que la explica; solo cuentan proyectos aprobados, y la elegibilidad al SNII es una marca manual del administrador.',
    bullets: [
      '<code>MonitoringService::indicators</code>: cada cifra es la longitud de su lista de detalle, así que cifra y detalle nunca se contradicen.',
      'Regla «solo aprobados»: <code>teachersWithProjects</code> filtra <code>registro_estado = \'aprobado\'</code>. Un borrador, un enviado o un devuelto de un docente no suma hasta que el administrador lo aprueba; al aprobarlo, la cifra sube en el siguiente GET.',
      'Docentes con proyectos: investigadores distintos como <code>investigador_principal_id</code> de proyectos <code>tipo = \'investigacion\'</code>. Titulación CIV: igual con <code>tipo = \'titulacion\' AND articulado_civ = 1</code>. Los semilleros tienen su cifra aparte, <code>docentes_con_semilleros</code>.',
      'Profesores en el SNII: activos con <code>snii_nivel</code> no vacío (<code>teachersInSnii</code>), con desglose Candidato / I / II / III. Elegibles: activos con <code>snii_elegible = 1</code> y sin nivel (<code>eligibleTeachers</code>); se marcan con <code>PUT /api/eje3/docentes/:id/snii</code> (<code>FacultyService::updateSnii</code>). Estas dos no dependen de proyectos.',
      'Solo SQL estándar (sin <code>FIELD()</code> ni <code>YEAR()</code>) para correr igual en MySQL y SQLite.',
    ],
    data: J(monCompact, 2, 60) + '\n\nEl semillero del docente (paso anterior):\n  enviado   → docentes_con_semilleros = ' + ex('monitoreo_antes').data.docentes_con_semilleros + '\n  aprobado  → docentes_con_semilleros = ' + mon.docentes_con_semilleros,
    touches: [R('proyectos'), RW('investigadores'), R('sesiones')],
    ia: null,
    caso: {},
    files: [
      S(E3 + 'MonitoringController.php', 'public function index', 'MonitoringController::index', 'requireAdmin + indicators()'),
      S(E3 + 'MonitoringService.php', 'public function indicators', 'MonitoringService::indicators', 'Cifra = longitud del detalle; snii_por_nivel'),
      S(E3 + 'MonitoringRepository.php', 'public function teachersWithProjects', 'MonitoringRepository::teachersWithProjects', 'GROUP BY docente por tipo, solo aprobados'),
      S(E3 + 'MonitoringRepository.php', "p.registro_estado = 'aprobado'", "registro_estado = 'aprobado'", 'La regla «solo aprobados» de los indicadores de proyectos'),
      S(E3 + 'MonitoringRepository.php', 'public function teachersInSnii', 'MonitoringRepository::teachersInSnii', 'Activos con snii_nivel, de mayor a menor'),
      S(E3 + 'MonitoringRepository.php', 'public function eligibleTeachers', 'MonitoringRepository::eligibleTeachers', 'snii_elegible = 1 y sin nivel'),
      S(E3 + 'FacultyService.php', 'public function updateSnii', 'FacultyService::updateSnii', 'Valida nivel y marca de elegibilidad'),
      S(FEM + 'Eje3MonitoreoScreen.jsx', 'function IndicatorCard', 'IndicatorCard', 'Tarjeta con cifra y detalle desplegable'),
      S(RUN, 'function suiteApprovedOnly', 'suiteApprovedOnly', 'Cifras antes y después de aprobar'),
    ],
  },
  {
    id: 'visualizar', lane: 2, title: 'Visualizar: producción académica (admin)', short: 'Visualizar', http: 'GET /api/eje3/visualizar',
    what: 'Publicaciones resultado de eventos y revista PYAD, y producción por docente. Solo para administración: exige sesión; y los proyectos que cuenta son únicamente los aprobados.',
    bullets: [
      'El menú lateral «Eje 3 · Visualizar» abre <code>admin-eje3-visualizar</code>; no hay vista pública ni enlace en el encabezado: lo público del Eje 3 es solo Difundir.',
      '<code>VisualizationController::index</code> exige admin (<code>requireAdmin</code>): sin token responde 401 y con rol no admin (incluido un docente) 403.',
      '<code>publicaciones_evento_pyad</code> = publicaciones <code>estado = \'publicado\'</code> con <code>origen</code> <code>evento</code> + <code>revista_pyad</code>; <code>por_anio</code> las agrupa por año ascendente.',
      '<code>produccion_docentes</code>: por cada docente activo suma publicaciones publicadas + proyectos como principal <strong>aprobados</strong> + producción técnica; omite total 0, ordena descendente y corta en 20 (<code>MAX_DOCENTES</code>). <code>totales.proyectos</code> también cuenta solo aprobados: al aprobar un proyecto sube en uno.',
      '<code>Eje3VisualizarPanel</code> pinta KPI, origen, años y ranking.',
    ],
    data: J(vizCompact, 2, 60) + '\n\ntotales.proyectos: ' + ex('meta').visualizar_proyectos_antes + ' (proyecto enviado)  →  ' + ex('meta').visualizar_proyectos_despues + ' (tras aprobarlo)',
    touches: [R('publicaciones'), R('proyectos'), R('produccion'), R('investigadores'), R('sesiones')],
    ia: null,
    caso: {},
    files: [
      S(E3 + 'VisualizationController.php', 'public function index', 'VisualizationController::index', 'Entrega el panorama de producción académica'),
      S(E3 + 'VisualizationService.php', 'public function overview', 'VisualizationService::overview', 'Suma origen evento + revista_pyad; top 20 docentes'),
      S(E3 + 'VisualizationRepository.php', 'public function publicationsByOrigin', 'VisualizationRepository::publicationsByOrigin', "Solo estado = 'publicado'"),
      S(E3 + 'VisualizationRepository.php', 'public function productionByTeacher', 'VisualizationRepository::productionByTeacher', 'Subconsultas COUNT por docente activo (proyectos aprobados)'),
      S(E3 + 'VisualizationRepository.php', "WHERE registro_estado = 'aprobado'", "registro_estado = 'aprobado'", 'totales.proyectos cuenta solo aprobados'),
      S(FEM + 'Eje3VisualizarScreen.jsx', 'export function Eje3VisualizarPanel', 'Eje3VisualizarPanel', 'KPI, origen, años y ranking'),
      S(idx, "$router->get('/api/eje3/visualizar',", 'GET /api/eje3/visualizar', 'Ruta del panel de Visualizar'),
    ],
  },
  {
    id: 'difundir', lane: 1, title: 'Difundir: eventos y congreso (público)', short: 'Difundir', http: 'GET /api/eje3/difusion',
    what: 'La parte pública del Eje 3: eventos de semilleros con sus proyectos y apartados, el congreso internacional y los próximos eventos. Un proyecto del docente aparece aquí solo cuando está aprobado.',
    bullets: [
      '<code>PublicDisseminationService::overview</code> toma solo eventos con <code>publico = 1</code> y los reparte: <code>semilleros</code> (con proyectos y apartados), <code>congreso</code>, <code>otros_eventos</code> (incluye la revista PYAD) y <code>proximos</code> (<code>fecha_inicio ≥ hoy</code>, ascendente, máximo 5).',
      'Regla «solo aprobados»: los proyectos de cada evento y su <code>total_proyectos</code> se calculan con <code>registro_estado = \'aprobado\'</code> (<code>EventRepository</code>). El semillero que el docente envió no figura en el evento hasta que se aprueba; ocultar el evento lo quita de la difusión.',
      '<code>GET /api/eje3/difusion/eventos/:id</code> devuelve 404 si el evento no existe o no es público; trae proyectos aprobados y publicaciones publicadas ligadas.',
      'El administrador decide qué se publica: <code>Eje3DifundirScreen</code> hace CRUD de eventos y un interruptor <code>publico</code> (PUT con el evento completo). El docente solo puede ligar su proyecto a eventos públicos.',
      'En el encabezado, el enlace «Eventos» abre la vista pública <code>eje3-difusion</code> sin pedir sesión y mantiene el pie institucional.',
    ],
    data: J(difCompact, 2, 60),
    touches: [R('eventos'), R('proyectos'), R('apartados'), R('publicaciones'), R('investigadores')],
    ia: null,
    caso: {},
    files: [
      S(E3 + 'PublicDisseminationController.php', 'public function index', 'PublicDisseminationController::index', 'Sin sesión: responde overview()'),
      S(E3 + 'PublicDisseminationService.php', 'public function overview', 'PublicDisseminationService::overview', 'Reparte eventos públicos y calcula próximos'),
      S(E3 + 'PublicDisseminationService.php', 'public function eventDetail', 'PublicDisseminationService::eventDetail', '404 si no existe o no es público'),
      S(E3 + 'EventRepository.php', 'public function findAll', 'EventRepository::findAll', 'Totales por evento; onlyPublic para anónimos'),
      S(E3 + 'EventRepository.php', "p.evento_id = e.id AND p.registro_estado = 'aprobado'", "registro_estado = 'aprobado'", 'total_proyectos del evento: solo aprobados'),
      S(FEM + 'Eje3DifusionPublicScreen.jsx', 'export function Eje3DifusionContent', 'Eje3DifusionContent', 'Semilleros, congreso, próximos y otros'),
      S(FEM + 'Eje3DifundirScreen.jsx', 'export default function Eje3DifundirScreen', 'Eje3DifundirScreen', 'Admin: CRUD de eventos y vista previa'),
      S(FEM + 'registroConfig.js', 'export const CONGRESO_TITULO', 'CONGRESO_TITULO', 'Nombre del Congreso Internacional'),
    ],
  },
  {
    id: 'fallos', lane: 1, title: 'Si algo falla', short: 'Si algo falla', http: '', error: true,
    what: 'Todos los errores usan el mismo formato {success:false, message, errors}; la interfaz decide qué mostrar.',
    bullets: [
      '<strong>401</strong>: sin token o token inventado, vencido o de usuario inactivo (también si el administrador desactivó o restableció la cuenta: se borran sus sesiones). Si la petición llevaba token, <code>api.js</code> limpia la sesión y emite <code>buap:session-expired</code>: la app vuelve a login con «Tu sesión expiró». Los módulos del Eje 3 muestran un aviso (<code>EJE3_LOAD_ERROR</code>) porque <code>apiGet</code> devuelve <code>null</code>.',
      '<strong>403</strong>: rol equivocado (un docente en una ruta [A] o un admin en <code>/api/docente/*</code>), cuenta inactiva, bloqueo de 15 minutos tras 5 intentos fallidos o, para un docente con contraseña temporal, <code>errors.codigo = [\'cambio_password_obligatorio\']</code>: la app lo lleva a «Mi cuenta».',
      '<strong>400</strong>: validación, con <code>errors: {campo:[mensajes]}</code>; <code>formatApiErrors</code> los aplana y los muestra en el modal (tipo fuera de catálogo, evento no público, devolver sin comentario, enviar sin resumen, contraseña nueva corta).',
      '<strong>404</strong>: id inexistente, evento no público para un anónimo, ruta que no existe y, en el rol docente, el proyecto de <strong>otro</strong> docente (nunca 403, para no revelar que existe).',
      '<strong>409</strong> (<code>Response::conflict</code>): el estado del recurso no permite la operación; el motivo va en <code>errors.codigo[0]</code>: <code>proyecto_bloqueado</code>, <code>transicion_invalida</code>, <code>docente_con_cuenta</code>, <code>correo_duplicado</code>.',
      '<strong>500</strong>: excepción o error de BD → «Ocurrió un error interno en el servidor.»; el detalle va a <code>error_log</code> y solo con <code>APP_DEBUG=1</code> se incluye en el mensaje. Sin servidor: el portal público muestra datos de respaldo y el Eje 3 el aviso; <code>apiDeleteStrict</code> informa el fallo real, en cambio <code>apiDelete</code> simula éxito.',
    ],
    data: J(ex('err400')) + '\n\n401 → ' + J(ex('err401')) + '\n\n403 (contraseña temporal) → ' + J(ex('gate')) + '\n\n404 (proyecto ajeno) → ' + J(ex('proy_ajeno'), 1, 60) + '\n\n409 → ' + J(ex('revision_repetida'), 1, 60),
    touches: [],
    ia: null,
    caso: {},
    files: [
      S(BE + 'src/Core/Response.php', 'public static function badRequest', 'Response::badRequest', '400 con errors por campo'),
      S(BE + 'src/Core/Response.php', 'public static function unauthorized', 'Response::unauthorized', '401: sin sesión o sesión vencida'),
      S(BE + 'src/Core/Response.php', 'public static function forbidden', 'Response::forbidden', '403: rol insuficiente o contraseña temporal'),
      S(BE + 'src/Core/Response.php', 'public static function conflict', 'Response::conflict', '409: estado no permite la operación (errors.codigo)'),
      S(BE + 'src/Core/Response.php', 'public static function serverError', 'Response::serverError', '500 con mensaje genérico'),
      S(auth, "['codigo' => ['cambio_password_obligatorio']]", 'cambio_password_obligatorio', '403 del gate de contraseña temporal'),
      S(docS, 'private function locked', 'DocenteProjectService::locked', '409 proyecto_bloqueado'),
      S(api, 'export const SESSION_EXPIRED_EVENT', 'SESSION_EXPIRED_EVENT', '401 con token → buap:session-expired'),
      S(e3svc, 'export function formatApiErrors', 'formatApiErrors', 'Aplana {campo:[mensajes]} para el modal'),
      S(e3svc, 'export const EJE3_LOAD_ERROR', 'EJE3_LOAD_ERROR', 'Aviso visible cuando no hay datos (sin cifras falsas)'),
      S(api, 'export async function apiDeleteStrict', 'apiDeleteStrict', 'DELETE que informa el resultado real'),
      S(api, 'export async function apiDelete(', 'apiDelete', 'DELETE heredado: devuelve éxito simulado si falla'),
    ],
  },
];

// Estado acumulado ("caso") paso a paso
(() => {
  let acc = Object.fromEntries(CASO_FIELDS.map(([k]) => [k, null]));
  STEPS.forEach((s, i) => {
    acc = { ...acc, ...s.caso };
    s.caso = { ...acc, progreso: s.error ? -1 : Math.round(((i + 1) / STEPS.length) * 100) };
  });
})();
