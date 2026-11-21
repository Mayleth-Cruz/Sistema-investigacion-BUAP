import { S, T, ex } from './lib.mjs';

const BE = 'backend/', FE = 'frontend/src/';
const E3 = BE + 'src/Modules/Eje3/';
const RUN = BE + 'tests/run.php';
const FEM = FE + 'modules/eje3/';
const idx = BE + 'public/index.php';
const DOC = BE + 'src/Modules/Docente/';
const FED = FE + 'modules/docente/';
const auth = BE + 'src/Modules/Auth/AuthController.php';
const api = FE + 'services/api.js';
const docC = DOC + 'DocenteController.php';
const docS = DOC + 'DocenteProjectService.php';
const acctC = E3 + 'TeacherAccountController.php';
const acctS = E3 + 'TeacherAccountService.php';
const acctR = E3 + 'TeacherAccountRepository.php';
const projR = E3 + 'Eje3ProjectRepository.php';
const projS = E3 + 'Eje3ProjectService.php';

// Cifras de la base de demostración: salen de los ejemplos capturados con la API real (ex/*.json)
const MON = ex('monitoreo').data, VIZ = ex('visualizar').data, DIF = ex('difusion').data;

export const EJE = {
  nombre: 'Eje 3 · Investigación Aplicada con Impacto Social',
  estrategia: 'Estrategia 3: Fortalecimiento de Posgrado e Investigación',
  objetivo: 'Sistema integral de información que permita registrar, monitorear, visualizar y difundir la producción académica y científica de la Facultad.',
};

export const GRUPOS = [
  { id: 'Registro', cls: 'db', nota: '10 temas + 1 de apoyo', color: 'var(--db)' },
  { id: 'Monitoreo', cls: 'http', nota: '4 indicadores', color: 'var(--http)' },
  { id: 'Visualizar', cls: 'ia', nota: '2 temas', color: 'var(--ia)' },
  { id: 'Difundir', cls: '', nota: '2 temas', color: 'var(--ink2)' },
  { id: 'Rol docente', cls: 'doc', nota: '5 temas · extensión acordada', color: 'var(--ink)' },
];

export const LOGIN_CMD = `BASE=http://127.0.0.1:8000/api
TOKEN=$(curl -s -X POST $BASE/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"correo":"admin@buap.mx","password":"<contraseña del admin demo>"}' \\
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["token"])')`;

export const LOGIN_DOC_CMD = `BASE=http://127.0.0.1:8000/api
DOC=$(curl -s -X POST $BASE/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"correo":"investigador@buap.mx","password":"<contraseña del docente demo>"}' \\
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["token"])')`;

const AUTH = `-H "Authorization: Bearer $TOKEN"`;
const AUTHD = `-H "Authorization: Bearer $DOC"`;
const JSONH = `-H 'Content-Type: application/json'`;

/** Interpretación acordada para los catálogos que dependen de participantes_evento. */
const interpPart = (rol) => `Se interpretó como un catálogo de personas ligadas a eventos, guardado en <code>participantes_evento</code> con <code>rol = '${rol}'</code>. El evento es opcional.`;
const interpRetri = (p) => `Se interpretó como registros en <code>retribucion_social</code> con <code>programa = '${p}'</code>, donde cada fila indica si participó un estudiante o un profesor.`;

const participantFiles = [
  S(E3 + 'RegistryConfig.php', "'participantes' => [", 'participantes', 'Tabla, campos y roles válidos'),
  S(E3 + 'RegistryConfig.php', "public const ROLES", 'RegistryConfig::ROLES', 'dictaminador, moderador, relator, dictaminador_pyad'),
  S(E3 + 'ParticipantController.php', 'class ParticipantController', 'ParticipantController', 'Controlador del catálogo'),
  S(E3 + 'Eje3Fields.php', 'public static function process', 'Eje3Fields::process', 'Valida enum, correo y evento_id'),
];

const participantTopic = (id, titulo, rol, countKey, catalogoNeedle, labelOf, extraTest) => ({
  id, grupo: 'Registro', acceso: 'A', titulo,
  pide: `Registro · «${titulo}».`,
  interp: interpPart(rol),
  endpoints: ['GET /api/eje3/participantes', 'POST /api/eje3/participantes', 'PUT /api/eje3/participantes/:id', 'DELETE /api/eje3/participantes/:id'],
  tablas: ['participantes_evento', 'eventos_investigacion'],
  regla: [
    `Se filtra con <code>?rol=${rol}</code>; el hub cuenta con <code>SELECT COUNT(*) FROM participantes_evento WHERE rol = '${rol}'</code> (<code>${countKey}</code> en <code>/api/eje3/catalogos</code>).`,
    '<code>nombre_completo</code> y <code>rol</code> son obligatorios; <code>correo</code> debe tener formato válido; <code>evento_id</code>, si viene, debe existir (400 con mensaje en español).',
    'La lista incluye <code>evento_nombre</code> (LEFT JOIN) y se ordena por nombre.',
  ],
  pantalla: [
    `Admin → «Eje 3 · Registro» → tarjeta «${titulo}» (<code>catalogoParticipante('${rol}', …)</code> en <code>registroConfig.js</code>).`,
    'Tabla con buscador (debounce 300 ms), filtro por evento, modal de alta/edición y confirmación de borrado.',
  ],
  files: [...participantFiles, S(FEM + 'registroConfig.js', catalogoNeedle, labelOf, `Tarjeta «${titulo}» (catalogoParticipante en registroConfig.js)`)],
  curl: `curl -s "$BASE/eje3/participantes?rol=${rol}" ${AUTH}

curl -s -X POST $BASE/eje3/participantes ${AUTH} ${JSONH} \\
  -d '{"rol":"${rol}","nombre_completo":"Dra. Ana Torres","correo":"ana.torres@correo.mx","evento_id":2}'`,
  esperado: 'La lista llega con <code>success: true</code>; el POST responde 201 con el registro (<code>id</code>, <code>evento_nombre</code>). Sin token: 401.',
  tests: [
    T(RUN, "registryCrud($c, 'Participantes de evento'", 'CRUD completo de participantes: 401, 400, 201, filtro, PUT parcial, 404 y borrado'),
    T(RUN, 'Semilla: al menos 3 participantes con rol', 'La semilla trae ≥ 3 participantes por cada uno de los 4 roles'),
    T(RUN, "Rol '{$rol}' se acepta", "Los 4 roles válidos se aceptan en POST"),
    T(FEM + 'Eje3RegistroScreen.test.jsx', 'da de alta un registro: valida obligatorios y envía POST con el rol fijo', 'Pantalla: alta con rol fijo (Vitest)'),
    T(FEM + 'registroConfig.test.js', 'aplica los filtros fijos del contrato (tipo, rol, programa)', 'Configuración: filtros fijos por rol (Vitest)'),
    ...(extraTest || []),
  ],
});

const retriFiles = [
  S(E3 + 'RegistryConfig.php', "'retribucion-social' => [", 'retribucion-social', 'Programa, tipo de participante, horas, fecha'),
  S(E3 + 'RegistryConfig.php', 'public const PROGRAMAS_RETRIBUCION', 'PROGRAMAS_RETRIBUCION', 'MPYMES, MGT, MDGE'),
  S(E3 + 'SocialReturnController.php', 'class SocialReturnController', 'SocialReturnController', 'Controlador del catálogo'),
  S(FEM + 'registroConfig.js', 'const catalogoRetribucion', 'catalogoRetribucion', 'Genera las 3 tarjetas por programa'),
];
const retriTopic = (p, countKey) => ({
  id: 'retri-' + p.toLowerCase(), grupo: 'Registro', acceso: 'A',
  titulo: `Retribución social de estudiantes y profesores de la ${p}`,
  pide: `Registro · «Retribución social de estudiantes y profesores de la ${p}».`,
  interp: interpRetri(p) + ' Las siglas se usan tal cual aparecen en la tabla.',
  endpoints: ['GET /api/eje3/retribucion-social', 'POST /api/eje3/retribucion-social', 'PUT /api/eje3/retribucion-social/:id', 'DELETE /api/eje3/retribucion-social/:id'],
  tablas: ['retribucion_social'],
  regla: [
    `Se filtra con <code>?programa=${p}</code>; el hub cuenta <code>SELECT COUNT(*) FROM retribucion_social WHERE programa = '${p}'</code> (<code>${countKey}</code>).`,
    'Obligatorios: <code>programa</code> (MPYMES, MGT o MDGE), <code>tipo_participante</code> (estudiante o profesor), <code>nombre_participante</code> y <code>actividad</code>.',
    '<code>horas</code> es entero ≥ 0 (por defecto 0); <code>fecha</code> debe ser una fecha real AAAA-MM-DD; se ordena por fecha descendente.',
  ],
  pantalla: [
    `Admin → «Eje 3 · Registro» → tarjeta «Retribución social ${p}» (programa fijo <code>${p}</code>).`,
    'Filtro adicional por tipo de participante (estudiante / profesor).',
  ],
  files: retriFiles,
  curl: `curl -s "$BASE/eje3/retribucion-social?programa=${p}" ${AUTH}

curl -s -X POST $BASE/eje3/retribucion-social ${AUTH} ${JSONH} \\
  -d '{"programa":"${p}","tipo_participante":"estudiante","nombre_participante":"Luis Pérez","actividad":"Asesoría a pequeñas empresas","horas":20,"fecha":"2026-05-10"}'`,
  esperado: 'POST → 201 con el registro y <code>horas</code> entero. Un programa fuera de MPYMES/MGT/MDGE → 400 con <code>errors.programa</code>.',
  tests: [
    T(RUN, "registryCrud($c, 'Retribución social'", 'CRUD completo de retribución social'),
    T(RUN, 'Semilla: al menos 2 registros de retribución social en', 'La semilla trae ≥ 2 registros por programa'),
    T(RUN, 'Filtro tipo_participante=profesor', 'Filtro por tipo de participante'),
    T(FEM + 'Eje3RegistroScreen.test.jsx', 'usa los filtros fijos de retribución social (programa)', 'Pantalla: filtro fijo de programa (Vitest)'),
  ],
});

const projFiles = (tipoLabel) => [
  S(E3 + 'Eje3ProjectService.php', 'protected function spec', 'Eje3ProjectService::spec', 'Campos y enums del proyecto'),
  S(E3 + 'Eje3ProjectService.php', 'protected function generateCode', 'Eje3ProjectService::generateCode', 'INV-/SEM-/TIT-AAAA-NNN'),
  S(E3 + 'Eje3ProjectService.php', 'protected function parseSections', 'Eje3ProjectService::parseSections', 'Valida los apartados anexos'),
  S(E3 + 'Eje3ProjectRepository.php', 'private function replaceSections', 'replaceSections', 'Reemplaza el conjunto de apartados'),
  S(E3 + 'Eje3ProjectRepository.php', 'public function findAll', 'Eje3ProjectRepository::findAll', `Filtros tipo = ${tipoLabel}, registro_estado y búsqueda`),
  S(DOC + 'DocenteProjectService.php', 'public function createFor', 'DocenteProjectService::createFor', 'El docente también captura estos proyectos (nacen en borrador)'),
];

const regReg = (tipoTxt) => [
  `Estado de registro: lo que captura el administrador nace <code>aprobado</code>; los ${tipoTxt} que registra un docente nacen en <code>borrador</code> y pasan por revisión (grupo «Rol docente»). Este catálogo los lista <strong>todos</strong> y filtra con <code>?registro_estado=</code>; el hub cuenta todos los estados.`,
];
const regTests = [
  T(RUN, "POST admin: 201 y registro_estado = 'aprobado'", "El admin crea en 'aprobado'; el valor del cuerpo se ignora"),
  T(RUN, 'Filtro registro_estado={$st} = SQL', 'Filtro registro_estado = SQL (los 4 estados)'),
  T(FEM + 'Eje3RegistroScreen.test.jsx', 'muestra un tag con el estado de registro en la tabla de proyectos', 'Pantalla: tag con el estado de registro (Vitest)'),
  T(FEM + 'Eje3RegistroScreen.test.jsx', 'filtra por estado de registro enviando registro_estado', 'Pantalla: filtro por estado de registro (Vitest)'),
];

export const TOPICS = [
  // ---------------------------------------------------------------- Registro
  {
    id: 'proy-inv', grupo: 'Registro', acceso: 'A', titulo: 'Proyectos de investigación (Anexo apartados)',
    pide: 'Registro · «Proyectos de investigación (Anexo apartados)».',
    interp: 'Acordado con el usuario: los proyectos se presentan en eventos (por ejemplo el Encuentro de Semilleros de Investigación). Cada proyecto puede ligarse a un evento (<code>evento_id</code>) y lleva apartados anexos: secciones con título y contenido.',
    endpoints: ['GET /api/eje3/proyectos', 'POST /api/eje3/proyectos', 'PUT /api/eje3/proyectos/:id', 'DELETE /api/eje3/proyectos/:id'],
    tablas: ['proyectos', 'proyecto_apartados', 'eventos_investigacion', 'investigadores'],
    regla: [
      "Filtro <code>?tipo=investigacion</code> sobre la tabla <code>proyectos</code> (<code>tipo = 'investigacion'</code>); el hub cuenta esos mismos proyectos (<code>proyectos_investigacion</code>).",
      'Obligatorios: <code>titulo</code>, <code>tipo</code> e <code>investigador_principal_id</code> (debe existir). Defaults: estado <code>en_ejecucion</code>, <code>fecha_inicio</code> = hoy, línea <code>General</code>, presupuesto 0.',
      'Sin <code>codigo</code>, se genera <code>INV-AAAA-NNN</code> único; un código repetido → 400, no 500.',
      '<code>apartados: [{apartado, contenido}]</code> reemplaza todo el conjunto en POST y PUT (transacción); sin la clave no se tocan.',
      ...regReg('proyectos'),
    ],
    pantalla: [
      'Admin → «Eje 3 · Registro» → «Proyectos de investigación»; la columna «Registro» muestra el estado de revisión y hay un filtro por estado.',
      'El modal elige docente principal, evento y permite agregar/quitar apartados; la columna «Apartados» muestra <code>total_apartados</code>.',
    ],
    files: [
      ...projFiles('investigacion'),
      S(FEM + 'registroConfig.js', "key: 'proyectos-investigacion'", 'proyectos-investigacion', 'Tarjeta «Proyectos de investigación»'),
    ],
    curl: `curl -s -X POST $BASE/eje3/proyectos ${AUTH} ${JSONH} \\
  -d '{"titulo":"Modelos de riesgo crediticio","tipo":"investigacion","investigador_principal_id":1,"evento_id":2,"apartados":[{"apartado":"Introducción","contenido":"..."},{"apartado":"Método","contenido":"..."}]}'

curl -s "$BASE/eje3/proyectos?tipo=investigacion" ${AUTH}`,
    esperado: 'POST → 201 con <code>codigo</code> autogenerado <code>INV-AAAA-NNN</code>, <code>registro_estado: "aprobado"</code>, <code>total_apartados: 2</code> y los apartados con <code>orden</code> 0 y 1. El GET con <code>?registro_estado=enviado</code> lista solo los que esperan revisión.',
    tests: [
      T(RUN, 'Código INV-AAAA-NNN', 'Código autogenerado INV-AAAA-NNN'),
      T(RUN, 'POST con apartados: 201', 'Alta con apartados'),
      T(RUN, 'PUT reemplaza TODO el conjunto de apartados', 'PUT reemplaza apartados; sin la clave no los toca'),
      T(RUN, 'Código duplicado: 400 (no 500)', 'Código repetido → 400'),
      T(FEM + 'Eje3RegistroScreen.test.jsx', 'crea un proyecto con docente, evento y apartados', 'Pantalla: alta con apartados (Vitest)'),
      ...regTests,
    ],
  },
  {
    id: 'proy-sem', grupo: 'Registro', acceso: 'A', titulo: 'Proyectos de semilleros (Anexo apartados)',
    pide: 'Registro · «Proyectos de semilleros (Anexo apartados)».',
    interp: 'Igual que los de investigación, pero con <code>tipo = \'semillero\'</code>: son los proyectos que se muestran en el Encuentro de Semilleros de Investigación, con sus apartados.',
    endpoints: ['GET /api/eje3/proyectos', 'POST /api/eje3/proyectos', 'PUT /api/eje3/proyectos/:id', 'DELETE /api/eje3/proyectos/:id'],
    tablas: ['proyectos', 'proyecto_apartados', 'eventos_investigacion', 'investigadores'],
    regla: [
      "Filtro <code>?tipo=semillero</code>; el hub cuenta <code>proyectos WHERE tipo = 'semillero'</code> (<code>proyectos_semilleros</code>).",
      'El código autogenerado es <code>SEM-AAAA-NNN</code> (año de <code>fecha_inicio</code>).',
      'La semilla demo liga cada semillero a un evento y le pone 2 o 3 apartados; los proyectos de semilleros de eventos públicos aparecen en Difundir con sus apartados, pero solo si están <strong>aprobados</strong>.',
      ...regReg('semilleros'),
    ],
    pantalla: [
      'Admin → «Eje 3 · Registro» → «Proyectos de semilleros».',
      'Pública: «Eventos» muestra el semillero con sus proyectos y apartados (solo si el evento tiene <code>publico = 1</code>).',
    ],
    files: [
      ...projFiles('semillero'),
      S(FEM + 'registroConfig.js', "key: 'proyectos-semilleros'", 'proyectos-semilleros', 'Tarjeta «Proyectos de semilleros»'),
    ],
    curl: `curl -s -X POST $BASE/eje3/proyectos ${AUTH} ${JSONH} \\
  -d '{"titulo":"Semillero de economía circular","tipo":"semillero","investigador_principal_id":3,"evento_id":1,"apartados":[{"apartado":"Planteamiento del problema","contenido":"..."},{"apartado":"Metodología","contenido":"..."}]}'

curl -s "$BASE/eje3/proyectos?tipo=semillero&evento_id=1" ${AUTH}`,
    esperado: 'POST → 201 con <code>codigo</code> <code>SEM-AAAA-NNN</code>, <code>evento_nombre</code> resuelto, <code>registro_estado: "aprobado"</code> y los 2 apartados.',
    tests: [
      T(RUN, 'Código autogenerado SEM-AAAA-NNN', 'Código autogenerado SEM-AAAA-NNN'),
      T(RUN, 'Semilla: cada proyecto de semillero tiene evento y 2-3 apartados', 'La semilla liga cada semillero a un evento con 2-3 apartados'),
      T(RUN, "Filtro tipo=semillero", 'Filtro por tipo semillero'),
      T(FEM + 'Eje3RegistroScreen.test.jsx', 'lista proyectos de semilleros filtrando por tipo', 'Pantalla: lista de semilleros (Vitest)'),
      ...regTests,
    ],
  },
  participantTopic('dictaminadores', 'Base de datos dictaminadores', 'dictaminador', 'dictaminadores', "'Dictaminadores',", 'Dictaminadores'),
  participantTopic('moderadores', 'Base de datos moderadores', 'moderador', 'moderadores', "'Moderadores',", 'Moderadores'),
  participantTopic('relatores', 'Base de relatores', 'relator', 'relatores', "'Relatores',", 'Relatores'),
  participantTopic('dict-pyad', 'Base de datos de dictaminadores revista PYAD', 'dictaminador_pyad', 'dictaminadores_pyad', "'Dictaminadores revista PYAD',", 'Dictaminadores revista PYAD'),
  retriTopic('MPYMES', 'retribucion_mpymes'),
  retriTopic('MGT', 'retribucion_mgt'),
  retriTopic('MDGE', 'retribucion_mdge'),
  {
    id: 'egresados', grupo: 'Registro', acceso: 'A', titulo: 'Actividades Egresados posgrado',
    pide: 'Registro · «Actividades Egresados posgrado».',
    interp: 'Se interpretó como un catálogo de actividades de egresados de los programas de posgrado (<code>actividades_egresados</code>): empleo, emprendimiento, publicación, posgrado u otro.',
    endpoints: ['GET /api/eje3/egresados', 'POST /api/eje3/egresados', 'PUT /api/eje3/egresados/:id', 'DELETE /api/eje3/egresados/:id'],
    tablas: ['actividades_egresados'],
    regla: [
      'Obligatorios: <code>nombre_egresado</code>, <code>actividad</code> y <code>tipo</code> (<code>empleo</code>, <code>emprendimiento</code>, <code>publicacion</code>, <code>posgrado</code>, <code>otro</code>).',
      'Filtros <code>programa</code>, <code>tipo</code> y búsqueda libre en nombre, actividad, institución, descripción y generación.',
      'El hub cuenta <code>SELECT COUNT(*) FROM actividades_egresados</code> (<code>egresados</code>).',
    ],
    pantalla: ['Admin → «Eje 3 · Registro» → «Actividades de egresados de posgrado».'],
    files: [
      S(E3 + 'RegistryConfig.php', "'egresados' => [", 'egresados', 'Campos y enum de tipos'),
      S(E3 + 'RegistryConfig.php', 'public const TIPOS_EGRESADO', 'TIPOS_EGRESADO', 'Valores válidos de tipo'),
      S(E3 + 'GraduateController.php', 'class GraduateController', 'GraduateController', 'Controlador del catálogo'),
      S(FEM + 'registroConfig.js', "key: 'egresados'", 'egresados', 'Tarjeta «Actividades de egresados»'),
    ],
    curl: `curl -s "$BASE/eje3/egresados" ${AUTH}

curl -s -X POST $BASE/eje3/egresados ${AUTH} ${JSONH} \\
  -d '{"programa":"MGT","nombre_egresado":"María López","generacion":"2024","actividad":"Fundó una consultoría","tipo":"emprendimiento"}'`,
    esperado: 'POST → 201 con el registro; un <code>tipo</code> fuera del catálogo → 400 con <code>errors.tipo</code>.',
    tests: [
      T(RUN, "registryCrud($c, 'Actividades de egresados'", 'CRUD completo de egresados'),
      T(RUN, 'Semilla: al menos 4 actividades de egresados', 'La semilla trae ≥ 4 actividades'),
      T(RUN, 'Filtro programa en egresados', 'Filtro por programa'),
    ],
  },
  {
    id: 'titulacion', grupo: 'Registro', acceso: 'A', titulo: 'Proyectos de titulación articulados al CIV (apoyo)',
    pide: 'No es un renglón de la tabla: es el catálogo de apoyo para el indicador de Monitoreo «Número de docentes con proyectos de titulación articulados al CIV».',
    interp: 'Proyectos con <code>tipo = \'titulacion\'</code> y la marca <code>articulado_civ</code>. Sin este catálogo no habría de dónde calcular el indicador.',
    endpoints: ['GET /api/eje3/proyectos', 'POST /api/eje3/proyectos', 'PUT /api/eje3/proyectos/:id'],
    tablas: ['proyectos', 'investigadores'],
    regla: [
      "Filtro <code>?tipo=titulacion</code>; el hub cuenta <code>proyectos WHERE tipo = 'titulacion'</code> (<code>proyectos_titulacion</code>).",
      '<code>articulado_civ</code> es booleano (1/0, true/false); el formulario lo marca por defecto en este catálogo.',
      'Código autogenerado <code>TIT-AAAA-NNN</code>. El docente la puede capturar desde «Mis proyectos»: <code>articulado_civ</code> solo se respeta si el tipo es titulación (si no, se fuerza a 0).',
      ...regReg('proyectos de titulación'),
    ],
    pantalla: ['Admin → «Eje 3 · Registro» → «Proyectos de titulación» (casilla «Articulado al CIV»).'],
    files: [
      ...projFiles('titulacion'),
      S(FEM + 'registroConfig.js', "key: 'proyectos-titulacion'", 'proyectos-titulacion', 'Tarjeta de titulación con casilla CIV'),
    ],
    curl: `curl -s -X POST $BASE/eje3/proyectos ${AUTH} ${JSONH} \\
  -d '{"titulo":"Tesis sobre cadenas de suministro","tipo":"titulacion","investigador_principal_id":2,"articulado_civ":true}'`,
    esperado: 'POST → 201 con <code>codigo</code> <code>TIT-AAAA-NNN</code> y <code>articulado_civ: 1</code>.',
    tests: [
      T(RUN, 'Código TIT-AAAA-NNN', 'Código autogenerado TIT-AAAA-NNN'),
      T(RUN, 'articulado_civ=true se guarda como 1', 'Booleano → 1'),
      T(RUN, 'Semilla: al menos 2 proyectos de titulación articulados al CIV', 'La semilla trae ≥ 2 titulaciones articuladas'),
      T(FEM + 'Eje3RegistroScreen.test.jsx', 'los proyectos de titulación incluyen la casilla Articulado al CIV marcada por defecto', 'Pantalla: casilla CIV (Vitest)'),
      ...regTests,
    ],
  },
  // --------------------------------------------------------------- Monitoreo
  {
    id: 'mon-proy', grupo: 'Monitoreo', acceso: 'A', titulo: 'Número de docentes con proyectos de investigación registrados',
    pide: 'Monitoreo · «Número de docentes con proyectos de investigación registrados».',
    interp: 'Cuenta docentes distintos (no proyectos): un docente con dos proyectos cuenta una vez, y el detalle muestra cuántos tiene. Solo cuentan los proyectos <strong>aprobados</strong>: los que un docente captura y aún no pasan la revisión no suman.',
    endpoints: ['GET /api/eje3/monitoreo'],
    tablas: ['proyectos', 'investigadores'],
    regla: [
      "<code>docentes_con_proyectos</code> = investigadores distintos como <code>investigador_principal_id</code> de proyectos con <code>tipo = 'investigacion'</code> (<code>GROUP BY i.id</code> en <code>teachersWithProjects</code>).",
      'La cifra es <code>count(detalle.con_proyectos)</code>: nunca contradice la lista.',
      'Semilleros y titulación no suman aquí; los semilleros tienen su propia cifra, <code>docentes_con_semilleros</code>.',
      "Regla «solo aprobados»: la consulta lleva <code>p.registro_estado = 'aprobado'</code>. Un proyecto en borrador, enviado o devuelto no cambia la cifra; al aprobarlo, el docente entra en el siguiente GET.",
    ],
    pantalla: ['Admin → «Eje 3 · Monitoreo» → primera tarjeta; «Ver detalle» despliega el docente y su cantidad de proyectos.'],
    files: [
      S(E3 + 'MonitoringRepository.php', 'public function teachersWithProjects', 'MonitoringRepository::teachersWithProjects', 'JOIN + GROUP BY docente'),
      S(E3 + 'MonitoringService.php', "$conProyectos = $this->repository->teachersWithProjects('investigacion')", 'teachersWithProjects', 'Cifra = count(detalle)'),
      S(E3 + 'MonitoringRepository.php', "p.registro_estado = 'aprobado'", "registro_estado = 'aprobado'", 'La regla «solo aprobados»'),
      S(FEM + 'Eje3MonitoreoScreen.jsx', "key: 'docentes_con_proyectos'", 'docentes_con_proyectos', 'Primera tarjeta de indicadores'),
    ],
    curl: `curl -s $BASE/eje3/monitoreo ${AUTH} | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print(d["docentes_con_proyectos"], len(d["detalle"]["con_proyectos"]))'`,
    esperado: `Dos números iguales (la cifra y la longitud del detalle). Con la base demo: <code>${MON.docentes_con_proyectos} ${MON.detalle.con_proyectos.length}</code>. Un proyecto de un docente en estado enviado no la mueve; aprobado, sí.`,
    tests: [
      T(RUN, 'coincide con el SQL independiente', 'Cada cifra coincide con un SQL independiente'),
      T(RUN, 'Segundo proyecto del mismo docente: no suma (distinct)', 'Dos proyectos del mismo docente cuentan una vez'),
      T(RUN, 'Longitud de detalle.con_proyectos = docentes_con_proyectos', 'Cifra y detalle coinciden'),
      T(RUN, 'BORRADOR: monitoreo, visualizar, difusión y docentes no cambian', 'Un borrador del docente no cambia ninguna cifra'),
      T(RUN, 'ENVIADO: ninguna cifra cambia', 'Un proyecto enviado tampoco'),
      T(RUN, 'Aprobar investigación: docentes_con_proyectos +1 y detalle lo incluye', 'Al aprobarlo, docentes_con_proyectos sube 1'),
      T(FEM + 'Eje3MonitoreoScreen.test.jsx', 'muestra los 4 indicadores con sus valores', 'Pantalla: 4 indicadores (Vitest)'),
    ],
  },
  {
    id: 'mon-civ', grupo: 'Monitoreo', acceso: 'A', titulo: 'Número de docentes con proyectos de titulación articulados al CIV',
    pide: 'Monitoreo · «Número de docentes con proyectos de titulación articulados al CIV».',
    interp: 'Solo cuentan titulaciones marcadas como articuladas; las no articuladas no suman.',
    endpoints: ['GET /api/eje3/monitoreo'],
    tablas: ['proyectos', 'investigadores'],
    regla: [
      "<code>docentes_titulacion_civ</code> = docentes distintos con proyectos <code>tipo = 'titulacion' AND articulado_civ = 1</code> (<code>teachersWithProjects('titulacion', true)</code>).",
      'Marcar otra titulación del mismo docente al CIV no suma: el detalle sube su <code>total</code>, no la cifra.',
      "Solo proyectos aprobados (<code>registro_estado = 'aprobado'</code>): una titulación articulada que el docente aún no ve aprobada no cuenta.",
    ],
    pantalla: ['Admin → «Eje 3 · Monitoreo» → segunda tarjeta; el catálogo de titulación se captura en Registro.'],
    files: [
      S(E3 + 'MonitoringRepository.php', 'AND p.articulado_civ = 1', 'articulado_civ = 1', 'Condición adicional del indicador CIV'),
      S(E3 + 'MonitoringService.php', "teachersWithProjects('titulacion', true)", 'teachersWithProjects', 'Indicador de titulación articulada'),
      S(FEM + 'Eje3MonitoreoScreen.jsx', "key: 'docentes_titulacion_civ'", 'docentes_titulacion_civ', 'Segunda tarjeta de indicadores'),
    ],
    curl: `curl -s $BASE/eje3/monitoreo ${AUTH} | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print(d["docentes_titulacion_civ"], d["detalle"]["titulacion_civ"])'`,
    esperado: `Con la base demo: <code>${MON.docentes_titulacion_civ}</code> y ${MON.detalle.titulacion_civ.length} docentes con <code>total: 1</code>.`,
    tests: [
      T(RUN, 'Titulación NO articulada al CIV: docentes_titulacion_civ igual', 'Una titulación no articulada no suma'),
      T(RUN, 'Titulación articulada al CIV: docentes_titulacion_civ +1', 'Una titulación articulada suma 1'),
      T(RUN, 'Marcar otra titulación del mismo docente al CIV: no suma', 'Un segundo proyecto del mismo docente no suma'),
      T(RUN, 'Aprobar titulación CIV: docentes_titulacion_civ +1 y detalle', 'Una titulación CIV del docente suma solo al aprobarse'),
    ],
  },
  {
    id: 'mon-snii', grupo: 'Monitoreo', acceso: 'A', titulo: 'Número de profesores en el SNII',
    pide: 'Monitoreo · «Número de profesores en el SNII».',
    interp: 'Un profesor está «en el SNII» si tiene un nivel asignado (Candidato, I, II o III). Solo cuentan docentes activos.',
    endpoints: ['GET /api/eje3/monitoreo', 'PUT /api/eje3/docentes/:id/snii'],
    tablas: ['investigadores'],
    regla: [
      "<code>profesores_snii</code> = <code>activo = 1 AND snii_nivel IS NOT NULL AND snii_nivel &lt;&gt; ''</code> (<code>teachersInSnii</code>); <code>snii_por_nivel</code> los desglosa.",
      'El nivel se edita con <code>PUT /api/eje3/docentes/:id/snii</code>; un nivel fuera de {Candidato, I, II, III} → 400 y un docente inexistente → 404.',
      'Un docente dado de baja (<code>activo = 0</code>) deja de contar.',
    ],
    pantalla: ['Admin → «Eje 3 · Monitoreo» → tercera tarjeta y tabla de docentes con filtro SNII; el lápiz abre el modal de nivel.'],
    files: [
      S(E3 + 'MonitoringRepository.php', 'public function teachersInSnii', 'MonitoringRepository::teachersInSnii', 'Activos con nivel, de mayor a menor'),
      S(E3 + 'FacultyService.php', 'public const NIVELES', 'FacultyService::NIVELES', 'Candidato, I, II, III'),
      S(E3 + 'FacultyService.php', 'public function updateSnii', 'FacultyService::updateSnii', 'Valida nivel y elegibilidad'),
      S(E3 + 'FacultyController.php', 'public function updateSnii', 'FacultyController::updateSnii', 'PUT [A] /docentes/:id/snii'),
      S(FEM + 'Eje3MonitoreoScreen.jsx', 'function SniiModal', 'SniiModal', 'Edita nivel y elegibilidad'),
    ],
    curl: `curl -s -X PUT $BASE/eje3/docentes/4/snii ${AUTH} ${JSONH} -d '{"snii_nivel":"I"}'

curl -s $BASE/eje3/monitoreo ${AUTH} | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print(d["profesores_snii"], d["snii_por_nivel"])'`,
    esperado: `El PUT responde 200 con el docente; después <code>profesores_snii</code> y <code>snii_por_nivel</code> reflejan el cambio. Con la base demo, antes del PUT: <code>${MON.profesores_snii}</code> con un docente por nivel.`,
    tests: [
      T(RUN, 'Asignar nivel I: profesores_snii +1', 'Asignar nivel suma al indicador'),
      T(RUN, 'Docente inactivo: no cuenta en profesores_snii', 'Un docente inactivo no cuenta'),
      T(RUN, 'Nivel inválido: 400', 'Nivel fuera del catálogo → 400'),
      T(FEM + 'Eje3MonitoreoScreen.test.jsx', 'edita snii_nivel y snii_elegible con PUT', 'Pantalla: edición con PUT (Vitest)'),
    ],
  },
  {
    id: 'mon-eleg', grupo: 'Monitoreo', acceso: 'A', titulo: 'Número de profesores elegibles en SNII',
    pide: 'Monitoreo · «Número de profesores elegibles en SNII».',
    interp: 'La elegibilidad es una marca manual del administrador (<code>snii_elegible</code>). Un profesor que ya tiene nivel deja de aparecer como elegible.',
    endpoints: ['GET /api/eje3/monitoreo', 'GET /api/eje3/docentes', 'PUT /api/eje3/docentes/:id/snii'],
    tablas: ['investigadores'],
    regla: [
      "<code>profesores_elegibles_snii</code> = activos con <code>snii_elegible = 1</code> y sin nivel (<code>eligibleTeachers</code>).",
      'La lista de docentes admite <code>?snii=todos|en_snii|elegibles|sin</code>; cualquier otro valor se trata como «todos».',
      'El PUT acepta cuerpos parciales, pero exige al menos <code>snii_nivel</code> o <code>snii_elegible</code>.',
    ],
    pantalla: ['Admin → «Eje 3 · Monitoreo» → cuarta tarjeta; en la tabla de docentes el modal permite marcar «Elegible».'],
    files: [
      S(E3 + 'MonitoringRepository.php', 'public function eligibleTeachers', 'MonitoringRepository::eligibleTeachers', 'snii_elegible = 1 y sin nivel'),
      S(E3 + 'FacultyRepository.php', 'public function findAll', 'FacultyRepository::findAll', 'Filtros todos / en_snii / elegibles / sin'),
      S(E3 + 'FacultyService.php', 'public const FILTROS_SNII', 'FacultyService::FILTROS_SNII', 'Valores válidos del filtro'),
      S(E3 + 'FacultyController.php', 'public function index', 'FacultyController::index', 'GET [A] /docentes'),
    ],
    curl: `curl -s -X PUT $BASE/eje3/docentes/5/snii ${AUTH} ${JSONH} -d '{"snii_elegible":true}'

curl -s "$BASE/eje3/docentes?snii=elegibles" ${AUTH}`,
    esperado: 'El PUT devuelve el docente con <code>snii_elegible: 1</code>; la lista <code>elegibles</code> lo incluye mientras no tenga nivel.',
    tests: [
      T(RUN, 'Con nivel asignado, marcar elegible NO suma a elegibles', 'Con nivel, la marca no suma'),
      T(RUN, 'Sin nivel y elegible: profesores_elegibles_snii +1', 'Sin nivel y elegible suma 1'),
      T(RUN, 'Filtro elegibles: elegibles sin nivel', 'Filtro de docentes elegibles'),
      T(FEM + 'Eje3MonitoreoScreen.test.jsx', 'filtra docentes por situación SNII y búsqueda', 'Pantalla: filtro SNII (Vitest)'),
    ],
  },
  // -------------------------------------------------------------- Visualizar
  {
    id: 'viz-pub', grupo: 'Visualizar', acceso: 'A', titulo: 'Número de publicaciones de docentes resultados de eventos y revista PYAD',
    pide: 'Visualizar · «Número de publicaciones de docentes resultados de eventos y revista PYAD».',
    interp: 'Se cuentan publicaciones <em>publicadas</em> cuyo <code>origen</code> es <code>evento</code> o <code>revista_pyad</code>. Este panel es solo para administración (exige sesión).',
    endpoints: ['GET /api/eje3/visualizar'],
    tablas: ['publicaciones'],
    regla: [
      "<code>publicaciones_evento_pyad</code> = <code>por_origen.evento + por_origen.revista_pyad</code>, con <code>WHERE estado = 'publicado'</code> (<code>publicationsByOrigin</code>): un borrador no cuenta.",
      '<code>por_anio</code> trae, por año ascendente, los conteos por origen y el total.',
      'El origen se captura al crear o editar un artículo (<code>origen</code>, <code>evento_id</code>); un valor inválido se ignora y conserva el actual.',
      'Requiere administrador: sin token → 401 y con rol no admin → 403.',
    ],
    pantalla: ['Admin → «Eje 3 · Visualizar» → tarjetas de KPI, desglose por origen y por año (<code>Eje3VisualizarPanel</code>).'],
    files: [
      S(E3 + 'VisualizationService.php', "'publicaciones_evento_pyad' =>", 'publicaciones_evento_pyad', 'evento + revista_pyad'),
      S(E3 + 'VisualizationRepository.php', 'public function publicationsByOrigin', 'VisualizationRepository::publicationsByOrigin', "GROUP BY origen con estado = 'publicado'"),
      S(E3 + 'VisualizationRepository.php', 'public function publicationsByYear', 'VisualizationRepository::publicationsByYear', 'Conteo por año y origen'),
      S(FEM + 'Eje3VisualizarScreen.jsx', 'export function Eje3VisualizarPanel', 'Eje3VisualizarPanel', 'Panel con KPI, origen y años'),
    ],
    curl: `curl -s $BASE/eje3/visualizar ${AUTH} | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print(d["publicaciones_evento_pyad"], d["por_origen"])'`,
    esperado: `Con la base demo: <code>${VIZ.publicaciones_evento_pyad} {evento: ${VIZ.por_origen.evento}, revista_pyad: ${VIZ.por_origen.revista_pyad}, otra: ${VIZ.por_origen.otra}}</code>. Sin el encabezado Authorization: 401; con token de docente: 403.`,
    tests: [
      T(RUN, 'publicaciones_evento_pyad = SQL', 'La cifra coincide con un SQL independiente'),
      T(RUN, 'por_origen.revista_pyad = SQL', 'Desglose por origen = SQL'),
      T(RUN, 'Un borrador no cuenta en publicaciones_evento_pyad', 'Un borrador no cuenta'),
      T(FEM + 'Eje3VisualizarScreen.test.jsx', 'presenta KPI, origen, años y ranking', 'Panel: KPI, origen, años y ranking (Vitest)'),
    ],
  },
  {
    id: 'viz-prod', grupo: 'Visualizar', acceso: 'A', titulo: 'Producción académica de docente investigadores',
    pide: 'Visualizar · «Producción académica de docente investigadores».',
    interp: 'Un ranking de docentes activos con tres columnas: publicaciones, proyectos como investigador principal y producción técnica.',
    endpoints: ['GET /api/eje3/visualizar'],
    tablas: ['investigadores', 'publicaciones', 'proyectos', 'produccion_tecnica'],
    regla: [
      "Por docente activo (<code>activo = 1</code>): <code>publicaciones</code> publicadas + <code>proyectos</code> (como principal) + <code>produccion_tecnica</code> = <code>total</code> (<code>productionByTeacher</code>).",
      'El servicio descarta total 0, ordena por total descendente (empate: por nombre) y corta en 20 (<code>MAX_DOCENTES</code>).',
      '<code>totales</code> da los números globales: publicaciones publicadas, proyectos, producción técnica y docentes activos.',
      "Los proyectos cuentan solo si están <strong>aprobados</strong> (<code>registro_estado = 'aprobado'</code>), tanto en cada docente como en <code>totales.proyectos</code>: un proyecto enviado por un docente entra al ranking cuando se aprueba.",
    ],
    pantalla: ['Admin → «Eje 3 · Visualizar» → tabla de producción por docente.'],
    files: [
      S(E3 + 'VisualizationRepository.php', 'public function productionByTeacher', 'VisualizationRepository::productionByTeacher', 'Tres subconsultas COUNT por docente'),
      S(E3 + 'VisualizationService.php', 'private const MAX_DOCENTES', 'MAX_DOCENTES', 'Límite de 20 filas'),
      S(E3 + 'VisualizationService.php', 'usort($teachers', 'usort', 'Orden por total descendente'),
      S(E3 + 'VisualizationRepository.php', 'public function totals', 'VisualizationRepository::totals', 'Totales globales (proyectos: solo aprobados)'),
      S(E3 + 'VisualizationRepository.php', "pr.registro_estado = 'aprobado'", "registro_estado = 'aprobado'", 'Proyectos del docente: solo aprobados'),
    ],
    curl: `curl -s $BASE/eje3/visualizar ${AUTH} | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print([(x["nombre_completo"], x["total"]) for x in d["produccion_docentes"]])'`,
    esperado: `Lista ordenada de mayor a menor <code>total</code>; con la base demo la primera es ${VIZ.produccion_docentes[0].nombre_completo} con ${VIZ.produccion_docentes[0].total}. <code>totales.proyectos</code> = ${VIZ.totales.proyectos}: sube en uno cada vez que se aprueba un proyecto.`,
    tests: [
      T(RUN, 'produccion_docentes ordenado por total descendente', 'Orden por total descendente'),
      T(RUN, 'Publicaciones del primer docente = SQL', 'Publicaciones del primer docente = SQL'),
      T(RUN, 'Aprobar investigación: visualizar.totales.proyectos +1 y el docente entra al ranking', 'Aprobar un proyecto suma 1 y mete al docente al ranking'),
      T(RUN, 'produccion_docentes.proyectos del docente = 3 (solo aprobados)', 'El ranking cuenta solo proyectos aprobados'),
      T(RUN, 'produccion_docentes se limita a 20 filas', 'Máximo 20 docentes'),
      T(FEM + 'Eje3VisualizarScreen.test.jsx', 'tolera datos vacíos', 'Panel tolera datos vacíos (Vitest)'),
    ],
  },
  // ---------------------------------------------------------------- Difundir
  {
    id: 'dif-sem', grupo: 'Difundir', acceso: 'P', titulo: 'Eventos de semilleros de investigación',
    pide: 'Difundir · «Eventos de semilleros de investigación».',
    interp: 'Parte pública del Eje 3: cada evento de semilleros con sus proyectos y apartados. El administrador decide qué eventos se publican.',
    endpoints: ['GET /api/eje3/difusion', 'GET /api/eje3/difusion/eventos/:id', 'GET /api/eje3/eventos', 'POST /api/eje3/eventos'],
    tablas: ['eventos_investigacion', 'proyectos', 'proyecto_apartados', 'investigadores'],
    regla: [
      "<code>semilleros</code> = eventos con <code>tipo = 'semilleros'</code> y <code>publico = 1</code>, cada uno con <code>proyectos[]</code> (<code>id, codigo, titulo, investigador_principal_nombre, apartados[]</code>).",
      'Un evento no público no aparece en la lista pública ni en su detalle (404 para anónimos); un admin sí lo ve en <code>GET /api/eje3/eventos</code>.',
      '<code>proximos</code> trae hasta 5 eventos públicos con <code>fecha_inicio</code> ≥ hoy, en orden ascendente.',
      'Crear o editar eventos exige admin; el interruptor <code>publico</code> publica u oculta.',
      "Regla «solo aprobados»: los <code>proyectos[]</code> de cada evento y su <code>total_proyectos</code> llevan <code>registro_estado = 'aprobado'</code>. El semillero que un docente liga a un evento público aparece aquí solo cuando el administrador lo aprueba.",
    ],
    pantalla: [
      'Pública: encabezado → «Eventos» (<code>eje3-difusion</code>), sin sesión.',
      'Admin: «Eje 3 · Difundir» (<code>Eje3DifundirScreen</code>): lista de eventos, CRUD, interruptor de publicación y vista previa.',
    ],
    files: [
      S(E3 + 'PublicDisseminationService.php', 'public function overview', 'PublicDisseminationService::overview', 'Reparte eventos públicos y calcula próximos'),
      S(E3 + 'PublicDisseminationService.php', 'private function projectsOf', 'projectsOf', 'Proyectos del evento con apartados'),
      S(E3 + 'EventService.php', 'public const TIPOS', 'EventService::TIPOS', 'semilleros, congreso, revista_pyad, otro'),
      S(E3 + 'EventRepository.php', "p.evento_id = :id AND p.registro_estado = 'aprobado'", "registro_estado = 'aprobado'", 'Proyectos del evento: solo aprobados'),
      S(E3 + 'EventController.php', 'public function index', 'EventController::index', '[P*] un admin ve también los no públicos'),
      S(FEM + 'Eje3DifusionPublicScreen.jsx', 'function ProyectoSemillero', 'ProyectoSemillero', 'Proyecto con sus apartados'),
      S(FEM + 'Eje3DifundirScreen.jsx', 'export default function Eje3DifundirScreen', 'Eje3DifundirScreen', 'Admin: CRUD de eventos'),
    ],
    curl: `curl -s $BASE/eje3/difusion | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print([(e["nombre"], len(e["proyectos"])) for e in d["semilleros"]])'

curl -s -X POST $BASE/eje3/eventos ${AUTH} ${JSONH} \\
  -d '{"nombre":"Encuentro de Semilleros 2027","tipo":"semilleros","fecha_inicio":"2027-03-10","fecha_fin":"2027-03-12","publico":1}'`,
    esperado: `El GET no necesita token y lista solo eventos públicos (con la base demo, ${DIF.semilleros.length} de semilleros: ${DIF.semilleros.map((e) => e.total_proyectos).join(' y ')} proyectos aprobados). El POST → 201 con <code>estado: "programado"</code> y <code>publico: 1</code> por defecto.`,
    tests: [
      T(RUN, 'semilleros: solo eventos tipo semilleros con proyectos[]', 'Estructura de semilleros[]'),
      T(RUN, 'Ningún evento no público aparece en difusión', 'Los eventos no públicos no se difunden'),
      T(RUN, 'proximos: máximo 5, públicos y con fecha_inicio >= hoy', 'Próximos: máximo 5 y ordenados'),
      T(RUN, 'Aprobar semillero: aparece en la difusión pública del evento (lista y total_proyectos)', 'Un semillero del docente aparece en el evento solo al aprobarse'),
      T(RUN, 'Si el evento se oculta, su semillero aprobado desaparece de la difusión pública', 'Evento oculto: su semillero deja de difundirse'),
      T(FEM + 'Eje3DifusionPublicScreen.test.jsx', 'muestra semilleros con proyectos y apartados, congreso, próximos y otros', 'Pantalla pública (Vitest)'),
    ],
  },
  {
    id: 'dif-cong', grupo: 'Difundir', acceso: 'P', titulo: 'Congreso Internacional de Investigación en Ciencias Económico Administrativas',
    pide: 'Difundir · «Congreso Internacional de Investigación en Ciencias Económico Administrativas».',
    interp: 'Los eventos con <code>tipo = \'congreso\'</code> y <code>publico = 1</code> se difunden aparte, con el total de proyectos y de publicaciones ligadas.',
    endpoints: ['GET /api/eje3/difusion', 'GET /api/eje3/difusion/eventos/:id'],
    tablas: ['eventos_investigacion', 'proyectos', 'publicaciones'],
    regla: [
      '<code>congreso[]</code> trae cada evento con <code>total_proyectos</code>, <code>total_participantes</code> y <code>total_publicaciones</code> (solo publicaciones <code>publicado</code>).',
      '<code>GET /api/eje3/difusion/eventos/:id</code> agrega <code>proyectos[]</code> y <code>publicaciones[]</code> (<code>id, titulo, autores, anio</code>); 404 si no existe o no es público.',
      'El nombre del congreso se fija en la interfaz con <code>CONGRESO_TITULO</code>.',
      "<code>total_proyectos</code> y los <code>proyectos[]</code> del detalle cuentan solo proyectos aprobados.",
    ],
    pantalla: ['Pública: «Eventos» → tarjeta del congreso → detalle del evento; admin: «Eje 3 · Difundir».'],
    files: [
      S(E3 + 'PublicDisseminationService.php', "elseif ($event['tipo'] === 'congreso')", 'congreso', 'Reparte el congreso aparte'),
      S(E3 + 'PublicDisseminationService.php', 'public function eventDetail', 'PublicDisseminationService::eventDetail', 'Detalle público con proyectos y publicaciones'),
      S(E3 + 'PublicDisseminationController.php', 'public function showEvent', 'PublicDisseminationController::showEvent', 'GET /difusion/eventos/:id'),
      S(FEM + 'registroConfig.js', 'export const CONGRESO_TITULO', 'CONGRESO_TITULO', 'Nombre del congreso en la interfaz'),
      S(FEM + 'Eje3DifusionPublicScreen.jsx', 'function EventoDetalle', 'EventoDetalle', 'Detalle de un evento público'),
    ],
    curl: `curl -s $BASE/eje3/difusion | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print([(e["id"], e["total_proyectos"], e["total_publicaciones"]) for e in d["congreso"]])'

curl -s $BASE/eje3/difusion/eventos/2`,
    esperado: 'Sin token. El detalle del evento 2 trae <code>proyectos</code> y <code>publicaciones</code>; un id no público o inexistente → 404.',
    tests: [
      T(RUN, 'congreso: solo eventos tipo congreso con totales', 'Estructura de congreso[]'),
      T(RUN, 'GET /api/eje3/difusion/eventos/:id público: 200', 'Detalle público de un evento'),
      T(RUN, 'Detalle de evento no público: 404', 'Evento oculto → 404'),
      T(RUN, 'Aprobar semillero: detalle público del evento y total del admin coinciden', 'Al aprobar un semillero, el detalle público coincide con el total del admin'),
      T(FEM + 'Eje3DifusionPublicScreen.test.jsx', 'abre el detalle de un evento y vuelve', 'Pantalla: abre y cierra el detalle (Vitest)'),
    ],
  },
  // -------------------------------------------------------------- Rol docente
  {
    id: 'doc-cuentas', grupo: 'Rol docente', acceso: 'A', titulo: 'Cuentas de docentes',
    pide: 'Rol docente · «Cuentas de docentes». Extensión acordada con el usuario (no es un renglón de la tabla del Eje 3): los maestros registran sus propios proyectos, y para eso el administrador les crea una cuenta.',
    interp: 'Decisiones tomadas con el usuario: una cuenta por docente, ligada a su ficha de <code>investigadores</code> (<code>usuarios.investigador_id</code>); sin auto-registro ni recuperación por correo (si la olvida, el administrador genera otra temporal); la temporal se muestra <strong>una sola vez</strong> y el docente debe cambiarla en su primer ingreso.',
    endpoints: ['GET /api/eje3/usuarios-docentes', 'POST /api/eje3/usuarios-docentes', 'POST /api/eje3/usuarios-docentes/:id/restablecer', 'PUT /api/eje3/usuarios-docentes/:id'],
    tablas: ['usuarios', 'investigadores', 'sesiones', 'proyectos'],
    regla: [
      'La lista trae solo cuentas con <code>rol = \'investigador\'</code> (<code>?search</code> busca en nombre, correo y nombre de la ficha) y <code>total_proyectos</code> con todos los estados. Nunca selecciona <code>password_hash</code>.',
      'Alta: <code>{investigador_id, correo?}</code>; el correo por defecto es el de la ficha y debe ser válido y único sin distinguir mayúsculas (409 <code>correo_duplicado</code>); un docente que ya tiene cuenta → 409 <code>docente_con_cuenta</code> (índice único <code>uq_usuario_investigador</code>).',
      'La contraseña temporal: 12 caracteres con <code>random_bytes</code> (alfabeto sin 0, O, 1, l, I). En la base va solo el hash bcrypt; la respuesta lleva <code>password_temporal</code> con <code>Cache-Control: no-store</code> y no vuelve a mostrarse.',
      'Restablecer: nueva temporal, <code>debe_cambiar_password = 1</code>, intentos y bloqueo en cero y <strong>todas las sesiones del docente borradas</strong>. Desactivar (<code>{activo: 0}</code>) también las borra; reactivar las deja sin sesión.',
      'Solo opera sobre cuentas <code>investigador</code>: restablecer o desactivar a un administrador o lector → 404. Si se borra la ficha, la cuenta queda sin docente (<code>ON DELETE SET NULL</code>) y su login se rechaza.',
    ],
    pantalla: [
      'Admin → «Docentes» → «Usuarios docentes» (<code>admin-docentes-usuarios</code>): tabla con estado, tipo de contraseña, último acceso y proyectos.',
      '«Crear cuenta» abre un modal con el selector de docentes sin cuenta; al crear o restablecer aparece la contraseña temporal en un cuadro copiable con el aviso «no se volverá a mostrar».',
      'Activar/desactivar y restablecer piden confirmación cuando corresponde.',
    ],
    files: [
      S(acctC, 'class TeacherAccountController', 'TeacherAccountController', 'CRUD [A] de cuentas de docentes'),
      S(acctC, 'public function store', 'TeacherAccountController::store', 'Alta con Cache-Control: no-store'),
      S(acctS, 'public function create', 'TeacherAccountService::create', 'Valida ficha y correo; 409 si ya hay cuenta o correo'),
      S(acctS, 'public function reset', 'TeacherAccountService::reset', 'Nueva temporal y sesiones cerradas'),
      S(acctS, 'private function generatePassword', 'TeacherAccountService::generatePassword', '12 caracteres, random_bytes, sin sesgo'),
      S(acctR, 'public function create', 'TeacherAccountRepository::create', "Rol 'investigador' + debe_cambiar_password = 1"),
      S(acctR, 'public function setActive', 'TeacherAccountRepository::setActive', 'Activa/desactiva y borra sesiones al desactivar'),
      S(BE + 'src/Database/SqliteInitializer.php', 'uq_usuario_investigador', 'uq_usuario_investigador', 'UNIQUE parcial: una cuenta por docente'),
      S(FEM + 'AdminDocentesUsuariosScreen.jsx', 'export default function AdminDocentesUsuariosScreen', 'AdminDocentesUsuariosScreen', 'Tabla de cuentas, crear, restablecer y activar'),
      S(FEM + 'AdminDocentesUsuariosScreen.jsx', 'function PasswordTemporalModal', 'PasswordTemporalModal', 'La temporal se muestra una sola vez'),
    ],
    curl: `curl -s "$BASE/eje3/usuarios-docentes" ${AUTH}

curl -s -X POST $BASE/eje3/usuarios-docentes ${AUTH} ${JSONH} \\
  -d '{"investigador_id":6}'

curl -s -X POST $BASE/eje3/usuarios-docentes/3/restablecer ${AUTH}

curl -s -X PUT $BASE/eje3/usuarios-docentes/3 ${AUTH} ${JSONH} -d '{"activo":0}'`,
    esperado: 'El POST responde 201 con la fila (<code>debe_cambiar_password: 1</code>) y <code>password_temporal</code> de 12 caracteres, solo esta vez: la lista ya no la trae. Repetirlo para el mismo docente → 409 <code>docente_con_cuenta</code>. Con token de docente → 403; sin token → 401.',
    tests: [
      T(RUN, 'function suiteTeacherAccounts', 'Suite de usuarios docentes (alta, restablecer, activar/desactivar)'),
      T(RUN, "La temporal tiene 12 caracteres sin ambiguos (sin 0, O, 1, l, I)", 'La temporal: 12 caracteres sin ambiguos'),
      T(RUN, 'BD: solo se guarda el hash bcrypt de la temporal (nunca la temporal)', 'En la base solo queda el hash bcrypt'),
      T(RUN, 'La contraseña temporal NO vuelve a mostrarse (ni en la lista)', 'La temporal no vuelve a mostrarse'),
      T(RUN, 'Segunda cuenta para el mismo docente: 409 docente_con_cuenta (una cuenta por docente)', 'Una cuenta por docente (409)'),
      T(RUN, 'Restablecer borra TODAS las sesiones del docente', 'Restablecer cierra todas las sesiones'),
      T(RUN, 'Restablecer al ADMINISTRADOR: 404 (solo docentes)', 'No se puede restablecer a un administrador'),
      T(FEM + 'AdminDocentesUsuariosScreen.test.jsx', 'solo ofrece docentes sin cuenta, precarga el correo y muestra la contraseña temporal una sola vez', 'Pantalla: crear y mostrar la temporal una sola vez (Vitest)'),
      T(FEM + 'AdminDocentesUsuariosScreen.test.jsx', 'restablecer pide confirmación y muestra la nueva contraseña temporal', 'Pantalla: restablecer (Vitest)'),
    ],
  },
  {
    id: 'doc-espacio', grupo: 'Rol docente', acceso: 'D', titulo: 'Mi espacio del docente',
    pide: 'Rol docente · «Mi espacio». Extensión acordada: el maestro ve sus proyectos con estado y comentarios, y un resumen personal de solo lectura (nivel SNII, publicaciones y producción técnica).',
    interp: 'El maestro entra por el mismo login y llega a su propio espacio, con un menú corto (Mi espacio, Mis proyectos, Mi cuenta). Solo ve lo suyo: nunca proyectos de otros ni nada de administración. Las publicaciones y la producción técnica las sigue capturando el administrador.',
    endpoints: ['GET /api/docente/resumen', 'POST /api/auth/login', 'GET /api/auth/me'],
    tablas: ['investigadores', 'proyectos', 'publicaciones', 'produccion_tecnica', 'usuarios'],
    regla: [
      'Login por rol: <code>administrador</code>/<code>admin</code> → panel; <code>investigador</code> con <code>investigador_id</code> → Mi espacio. Un docente sin ficha, un lector o un inactivo → 403; cinco fallos seguidos bloquean 15 minutos, también a docentes.',
      '<code>checkDocente</code> valida sesión vigente (8 h), usuario activo, rol y ficha; un token de admin en <code>/api/docente/*</code> → 403, sin token o inventado → 401. Todo se resuelve con el <code>investigador_id</code> de la sesión.',
      '<code>proyectos_por_estado</code> = conteo de SUS proyectos por <code>registro_estado</code> (las 4 claves siempre presentes); <code>total_proyectos</code> es la suma. Aquí sí cuentan todos los estados: es su espacio.',
      '<code>publicaciones</code> solo con <code>estado = \'publicado\'</code> y <code>produccion_tecnica</code> del docente; listas de hasta 100 y totales completos. <code>GET /api/auth/me</code> devuelve el usuario de la sesión para admin o docente.',
    ],
    pantalla: [
      'Docente → «Mi espacio» (<code>docente-mi-espacio</code>): ficha y SNII, tarjetas por estado, hasta 5 proyectos recientes (con el comentario del admin en los devueltos), publicaciones y producción de solo lectura.',
      'Menú propio (<code>DocenteSidebar</code>, también como drawer móvil con «Ver portal público»). En el encabezado, «Iniciar sesión» pasa a «Mi espacio» y «Cerrar sesión».',
      'Si el backend no responde, la pantalla muestra un aviso visible y ningún dato inventado.',
    ],
    files: [
      S(auth, 'public static function checkDocente', 'AuthController::checkDocente', '401/403/gate; devuelve el usuario con investigador_id'),
      S(auth, 'public function me', 'AuthController::me', 'Usuario de la sesión (admin o docente)'),
      S(docC, 'public function summary', 'DocenteController::summary', 'Resumen de la ficha de la sesión'),
      S(DOC + 'DocenteSummaryRepository.php', 'public function build', 'DocenteSummaryRepository::build', 'Ficha, SNII, estados, publicaciones y producción'),
      S(FED + 'DocenteMiEspacioScreen.jsx', 'export default function DocenteMiEspacioScreen', 'DocenteMiEspacioScreen', 'Pantalla de resumen del docente'),
      S(FE + 'components/DocenteSidebar.jsx', 'export default function DocenteSidebar', 'DocenteSidebar', 'Menú corto del docente (escritorio y drawer)'),
      S(FE + 'services/docenteService.js', 'export const docenteService', 'docenteService', 'Cliente de /api/docente/* (null si falla)'),
    ],
    curl: `curl -s $BASE/docente/resumen ${AUTHD}

curl -s $BASE/auth/me ${AUTHD}

curl -s -o /dev/null -w '%{http_code}\\n' $BASE/docente/resumen ${AUTH}`,
    esperado: 'El resumen llega con <code>success: true</code>, la ficha del docente, <code>proyectos_por_estado</code> con las 4 claves y los totales. La tercera llamada (token de administrador en una ruta del docente) imprime <code>403</code>; sin token, 401.',
    tests: [
      T(RUN, 'function suiteDocenteAuth', 'Suite de login por rol, me, gate y cambio de contraseña'),
      T(RUN, 'Login del docente demo (rol investigador ligado a ficha): 200', 'El docente demo entra por el mismo login'),
      T(RUN, 'me con sesión de investigador sin ficha: 401', 'Un investigador sin ficha no tiene sesión válida'),
      T(RUN, 'Resumen: claves del contrato', 'GET /api/docente/resumen trae las claves del contrato'),
      T(RUN, 'Resumen: solo cuenta publicaciones PUBLICADAS y propias', 'El resumen solo cuenta lo publicado y lo propio'),
      T(RUN, 'function suiteDocentePermissions', 'Matriz: docente → 403 en [A]; admin → 403 en /api/docente/*'),
      T(FED + 'DocenteMiEspacioScreen.test.jsx', 'muestra datos personales, SNII, conteos por estado y producción de solo lectura', 'Pantalla: datos, SNII, conteos y producción (Vitest)'),
      T(FED + 'DocenteMiEspacioScreen.test.jsx', 'si el backend no responde muestra un aviso visible y ningún dato inventado', 'Pantalla: aviso sin datos inventados (Vitest)'),
      T(FE + 'App.docente.test.jsx', "describe('App · login enruta por rol'", 'App: el login enruta por rol (Vitest)'),
    ],
  },
  {
    id: 'doc-proyectos', grupo: 'Rol docente', acceso: 'D', titulo: 'Registro de proyectos del docente',
    pide: 'Rol docente · «Registro de proyectos». Extensión acordada: el maestro registra sus proyectos de investigación, semilleros y titulación (con apartados y evento) y los envía a revisión.',
    interp: 'Es el mismo registro de proyectos del Eje 3 (misma tabla <code>proyectos</code>) pero capturado por el docente, con flujo de revisión: <code>borrador</code> → <code>enviado</code> → <code>aprobado</code> | <code>devuelto</code>. Solo liga eventos públicos; los coinvestigadores son texto libre; no hay archivos adjuntos.',
    endpoints: ['GET /api/docente/proyectos', 'GET /api/docente/proyectos/:id', 'POST /api/docente/proyectos', 'PUT /api/docente/proyectos/:id', 'DELETE /api/docente/proyectos/:id', 'POST /api/docente/proyectos/:id/enviar'],
    tablas: ['proyectos', 'proyecto_apartados', 'eventos_investigacion', 'investigadores'],
    regla: [
      'Lista blanca de campos (<code>docenteSpec</code>): título y tipo obligatorios; resumen, línea, fechas, estado (propuesta | en_ejecucion | completado), evento, coinvestigadores, apartados, <code>articulado_civ</code> (solo titulación), presupuesto y financiadora. <code>investigador_principal_id</code>, <code>codigo</code>, <code>registro_estado</code>, <code>comentario_revision</code>, <code>revisado_*</code> y <code>creado_por_*</code> del cuerpo se ignoran.',
      'Alta → 201, siempre <code>borrador</code>, principal = ficha de la sesión, código <code>INV-/SEM-/TIT-AAAA-NNN</code> autogenerado. El <code>evento_id</code> debe existir y ser <strong>público</strong> (si no, 400, con el mismo mensaje que un evento inexistente: no se revela que un evento privado existe); puede quedar vacío.',
      'Aislamiento: un proyecto ajeno responde 404 (nunca 403) en GET, PUT, DELETE y enviar; las listas traen solo lo propio (filtros <code>registro_estado</code>, <code>tipo</code>, <code>search</code> parametrizado).',
      'Edición y borrado solo en borrador o devuelto; después → 409 <code>proyecto_bloqueado</code> (el estado se lee dentro de la transacción, con <code>FOR UPDATE</code> en MySQL).',
      'Enviar: solo desde borrador o devuelto (si no, 409 <code>transicion_invalida</code>) y exige <code>titulo</code>, <code>resumen</code> y <code>linea_investigacion</code> (si no, 400 por campo). Fija <code>enviado_en</code> y limpia el comentario del revisor.',
    ],
    pantalla: [
      'Docente → «Mis proyectos» (<code>docente-proyectos</code>): lista con filtros por estado y tipo y buscador; el comentario del administrador se ve en los devueltos.',
      'Alta y edición en un modal dirigido por configuración (<code>DOCENTE_PROYECTO_FORM</code>, el mismo motor del Registro admin). «Articulado al CIV» solo aparece en titulación.',
      'Borrador y devuelto ofrecen Enviar, Editar y Eliminar (con confirmación); enviado y aprobado quedan en solo lectura con el motivo.',
    ],
    files: [
      S(docC, 'class DocenteController', 'DocenteController', 'Rutas /api/docente/* con checkDocente'),
      S(docS, 'class DocenteProjectService', 'DocenteProjectService', 'Servicio del docente: extiende Eje3ProjectService'),
      S(docS, 'private function docenteSpec', 'DocenteProjectService::docenteSpec', 'Lista blanca de campos del docente'),
      S(docS, 'public function createFor', 'DocenteProjectService::createFor', 'Alta en borrador con el principal de la sesión'),
      S(docS, 'public function updateFor', 'DocenteProjectService::updateFor', 'Edición: 404 ajeno, 409 bloqueado'),
      S(docS, 'public function submitFor', 'DocenteProjectService::submitFor', 'Envío: exige título, resumen y línea'),
      S(docS, 'private function checkPublicEvent', 'DocenteProjectService::checkPublicEvent', 'El evento debe ser público'),
      S(projR, 'public function findOwned', 'Eje3ProjectRepository::findOwned', 'Proyecto propio o null'),
      S(projR, 'public function transition', 'Eje3ProjectRepository::transition', 'UPDATE atómico condicionado al estado de origen'),
      S(FED + 'DocenteProyectosScreen.jsx', 'export default function DocenteProyectosScreen', 'DocenteProyectosScreen', 'Lista, filtros, alta/edición, borrado y envío'),
      S(FED + 'docenteConfig.js', 'export const DOCENTE_PROYECTO_FORM', 'DOCENTE_PROYECTO_FORM', 'Formulario del docente (sin investigador ni código)'),
    ],
    curl: `ID=$(curl -s -X POST $BASE/docente/proyectos ${AUTHD} ${JSONH} \\
  -d '{"titulo":"Semillero de finanzas personales","tipo":"semillero","linea_investigacion":"Educación financiera","resumen":"Talleres para jóvenes.","apartados":[{"apartado":"Metodología","contenido":"Talleres y encuestas."}]}' \\
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')

curl -s "$BASE/docente/proyectos?registro_estado=borrador" ${AUTHD}

curl -s -X POST $BASE/docente/proyectos/$ID/enviar ${AUTHD}`,
    esperado: 'El primer POST responde 201 con <code>registro_estado: "borrador"</code>, <code>codigo</code> <code>SEM-AAAA-NNN</code> y los apartados. El envío (<code>$ID</code> es el id devuelto) responde 200 con <code>"enviado"</code>; repetirlo, o editar después, → 409 (<code>transicion_invalida</code> / <code>proyecto_bloqueado</code>). El proyecto de otro docente → 404.',
    tests: [
      T(RUN, 'function suiteDocenteProjects', 'Suite de proyectos del docente (CRUD, aislamiento, estados)'),
      T(RUN, 'POST /api/docente/proyectos válido: 201', 'Alta válida: 201'),
      T(RUN, "Se crea en 'borrador' sin comentario ni fechas de revisión", "Nace en 'borrador'"),
      T(RUN, 'Mass-assignment POST: principal de la sesión, código autogenerado, borrador, sin revisión ni envío, creador = sesión', 'Asignación masiva ignorada (POST)'),
      T(RUN, 'A no puede ver un proyecto de B: 404', 'Un docente no ve proyectos ajenos (404)'),
      T(RUN, "PUT en 'aprobado': 409 proyecto_bloqueado", 'Editar un aprobado → 409 proyecto_bloqueado'),
      T(RUN, "Enviar un 'aprobado': 409 transicion_invalida", 'Reenviar un aprobado → 409 transicion_invalida'),
      T(RUN, "Reenviar un devuelto: 200, 'enviado' y el comentario del revisor se limpia", 'Devuelto → editar → reenviar'),
      T(RUN, 'PUT con evento NO público: 400', 'Un evento no público → 400'),
      T(FED + 'DocenteProyectosScreen.test.jsx', 'crea un proyecto: envía solo campos del docente (sin investigador, código ni estado de registro)', 'Pantalla: crea enviando solo campos del docente (Vitest)'),
      T(FED + 'DocenteProyectosScreen.test.jsx', 'borrador y devuelto ofrecen Enviar, Editar y Eliminar; enviado y aprobado quedan bloqueados', 'Pantalla: bloqueo por estado (Vitest)'),
      T(FED + 'DocenteProyectosScreen.test.jsx', 'si el backend responde 409 proyecto_bloqueado muestra el mensaje y no el código interno', 'Pantalla: 409 con mensaje legible (Vitest)'),
      T(FE + 'services/docenteService.test.js', 'remove usa DELETE estricto: no simula éxito si el proyecto está bloqueado', 'Servicio: DELETE estricto (Vitest)'),
    ],
  },
  {
    id: 'doc-revision', grupo: 'Rol docente', acceso: 'A', titulo: 'Revisión de proyectos por el administrador',
    pide: 'Rol docente · «Revisión del administrador». Extensión acordada: el administrador aprueba o devuelve (con comentario obligatorio) los proyectos que los docentes envían; solo lo aprobado cuenta en Monitoreo, Visualizar y Difundir.',
    interp: 'La bandeja de «enviados» lleva un contador en el menú «Docentes». Aprobar deja el proyecto bloqueado para el docente y lo hace contar en los indicadores; devolver exige un comentario y lo deja editable. El administrador puede además editar cualquier proyecto sin cambiar su estado de registro.',
    endpoints: ['GET /api/eje3/revision', 'POST /api/eje3/proyectos/:id/revision', 'GET /api/eje3/proyectos', 'GET /api/eje3/catalogos'],
    tablas: ['proyectos', 'proyecto_apartados', 'investigadores', 'usuarios'],
    regla: [
      "<code>GET /api/eje3/revision</code> → <code>{pendientes, proyectos}</code>: solo <code>registro_estado = 'enviado'</code>, orden <code>enviado_en</code> ascendente (el más antiguo primero), con <code>investigador_principal_nombre</code> y <code>total_apartados</code>. <code>catalogos.proyectos_pendientes</code> cuenta lo mismo.",
      "<code>POST …/revision {accion, comentario}</code>: <code>accion</code> ∈ aprobar | devolver. Orden: 404 → 400 → 409. Devolver exige comentario de 3 a 2000 caracteres tras <code>trim</code>; aprobar lo acepta opcional. Solo desde «enviado»: de otro estado → 409 <code>transicion_invalida</code>.",
      'Guarda <code>revisado_en</code>, <code>revisado_por</code> (el admin de la sesión) y el comentario, y devuelve el proyecto con sus apartados. La transición es un UPDATE condicionado: no hay doble revisión.',
      "Regla «solo aprobados»: Monitoreo, Visualizar, Difundir, los endpoints públicos clásicos y <code>/api/eje3/docentes</code> filtran <code>registro_estado = 'aprobado'</code>; el Registro admin, el resumen del docente y el hub cuentan todos los estados.",
      'Un token de docente → 403 y sin token → 401 en ambas rutas.',
    ],
    pantalla: [
      'Admin → «Docentes» → «Revisión de proyectos» (<code>admin-docentes-revision</code>): bandeja con docente, fecha y apartados; el menú muestra el contador de pendientes (si el fetch falla, sin distintivo).',
      'Detalle con apartados; «Aprobar» (comentario opcional) y «Devolver» (comentario obligatorio: sin él no se llama al backend). Si la transición ya no es válida, muestra el 409.',
    ],
    files: [
      S(E3 + 'Eje3ProjectController.php', 'public function pending', 'Eje3ProjectController::pending', 'GET /eje3/revision [A]'),
      S(E3 + 'Eje3ProjectController.php', 'public function review', 'Eje3ProjectController::review', 'POST /eje3/proyectos/:id/revision [A]'),
      S(projS, 'public function review', 'Eje3ProjectService::review', 'aprobar | devolver; 404 → 400 → 409'),
      S(projR, 'public function findPending', 'Eje3ProjectRepository::findPending', "Solo 'enviado', el más antiguo primero"),
      S(projR, 'public function transition', 'Eje3ProjectRepository::transition', 'Transición atómica enviado → aprobado | devuelto'),
      S(E3 + 'CatalogController.php', "'proyectos_pendientes'", 'proyectos_pendientes', 'Pendientes para el hub y el contador'),
      S(FEM + 'AdminDocentesRevisionScreen.jsx', 'export default function AdminDocentesRevisionScreen', 'AdminDocentesRevisionScreen', 'Bandeja, detalle y revisión'),
      S(FEM + 'AdminDocentesRevisionScreen.jsx', 'function RevisionModal', 'RevisionModal', 'Comentario obligatorio al devolver'),
      S(FE + 'components/AdminSidebar.jsx', 'const DOCENTES_ITEMS', 'DOCENTES_ITEMS', 'Grupo «Docentes» con contador de pendientes'),
    ],
    curl: `curl -s $BASE/eje3/revision ${AUTH}

ID=$(curl -s $BASE/eje3/revision ${AUTH} | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["proyectos"][0]["id"])')

curl -s -X POST $BASE/eje3/proyectos/$ID/revision ${AUTH} ${JSONH} -d '{"accion":"devolver"}'

curl -s -X POST $BASE/eje3/proyectos/$ID/revision ${AUTH} ${JSONH} \\
  -d '{"accion":"aprobar","comentario":"Aprobado: cumple con los apartados."}'`,
    esperado: 'La bandeja trae <code>pendientes</code> y la lista de enviados. «devolver» sin comentario → 400 (<code>errors.comentario</code>); «aprobar» → 200 con <code>registro_estado: "aprobado"</code> y <code>revisado_en</code>. Repetir la revisión → 409 <code>transicion_invalida</code>. Tras aprobar, <code>/eje3/monitoreo</code> y <code>/eje3/visualizar</code> reflejan el proyecto.',
    tests: [
      T(RUN, 'function suiteDocenteReview', 'Suite de revisión (aprobar, devolver, 400 y 409)'),
      T(RUN, 'Orden por enviado_en ascendente (el más antiguo primero)', 'La bandeja va del más antiguo al más reciente'),
      T(RUN, 'Devolver sin comentario: 400 (errors.comentario)', 'Devolver sin comentario → 400'),
      T(RUN, 'Devolver con comentario de menos de 3 caracteres (tras trim): 400', 'Comentario de menos de 3 caracteres → 400'),
      T(RUN, 'Aprobar: 200', 'Aprobar → 200'),
      T(RUN, 'Aprobar dos veces: 409', 'Aprobar dos veces → 409'),
      T(RUN, 'Revisión con token de docente: 403', 'Un docente no puede revisar (403)'),
      T(RUN, 'function suiteApprovedOnly', 'Suite «solo aprobados» (cifras antes y después de aprobar)'),
      T(FEM + 'AdminDocentesRevisionScreen.test.jsx', 'devolver exige comentario: sin él no llama al backend', 'Pantalla: devolver exige comentario (Vitest)'),
      T(FEM + 'AdminDocentesRevisionScreen.test.jsx', 'aprueba con comentario opcional (POST accion aprobar)', 'Pantalla: aprobar (Vitest)'),
      T(FE + 'components/AdminSidebar.test.jsx', 'consulta GET /eje3/revision con sesión admin y muestra el contador', 'Menú: contador de pendientes (Vitest)'),
    ],
  },
  {
    id: 'doc-password', grupo: 'Rol docente', acceso: 'D', titulo: 'Cambio de contraseña (obligatorio al primer ingreso)',
    pide: 'Rol docente · «Cambio de contraseña». Extensión acordada: el docente cambia su contraseña dentro de la app; la temporal que le dio el administrador debe cambiarla antes de usar cualquier otra cosa. También lo puede usar el administrador.',
    interp: 'Sin correo ni enlaces de recuperación: la contraseña temporal es de un solo uso lógico. Mientras <code>usuarios.debe_cambiar_password = 1</code>, toda la zona <code>/api/docente/*</code> responde 403 <code>cambio_password_obligatorio</code> y la interfaz solo deja abierta «Mi cuenta».',
    endpoints: ['POST /api/auth/cambiar-password', 'GET /api/auth/me', 'POST /api/auth/logout', 'GET /api/docente/resumen'],
    tablas: ['usuarios', 'sesiones'],
    regla: [
      "Gate: <code>checkDocente</code> responde 403 con <code>errors: {codigo: ['cambio_password_obligatorio']}</code> y el mensaje «Debes cambiar tu contraseña temporal antes de continuar.» en todas las rutas <code>/api/docente/*</code>. <code>/api/auth/me</code>, <code>/logout</code> y <code>/cambiar-password</code> siguen alcanzables.",
      '<code>{actual, nueva}</code>: <code>nueva</code> de 8 a 72 caracteres (límite de bcrypt) y distinta de la actual → si no, 400 con <code>errors</code> por campo (sin contar como intento fallido).',
      'Una <code>actual</code> incorrecta cuenta como intento fallido con el mismo bloqueo que el login (5 intentos, 15 minutos) y responde 400, no 401. Cuenta bloqueada → 403.',
      'Al cambiarla: hash bcrypt nuevo, <code>debe_cambiar_password = 0</code>, <code>intentos_fallidos = 0</code> y <strong>se borran las demás sesiones</strong> del usuario; la actual se conserva. La temporal anterior ya no inicia sesión.',
      'Sin token → 401; token inventado → 401; sesión de un lector → 403.',
    ],
    pantalla: [
      'Docente → «Mi cuenta» (<code>docente-cuenta</code>): datos de la cuenta y formulario con actual, nueva y confirmación (valida longitud, distinta de la actual y confirmación igual; «Mostrar contraseñas»).',
      'Con contraseña temporal aparece el aviso de cambio obligatorio y el resto del menú queda deshabilitado; al cambiarla, la app lleva a Mi espacio. Un 403 <code>cambio_password_obligatorio</code> del backend lleva a esta pantalla.',
    ],
    files: [
      S(auth, 'public function changePassword', 'AuthController::changePassword', 'Valida, cuenta fallos, cambia hash y cierra otras sesiones'),
      S(auth, 'public static function checkDocente', 'AuthController::checkDocente', 'Gate: 403 cambio_password_obligatorio'),
      S(auth, 'DELETE FROM sesiones WHERE usuario_id = :id AND token_hash <> :hash', 'DELETE FROM sesiones', 'Conserva solo la sesión actual'),
      S(FED + 'DocenteCuentaScreen.jsx', 'export default function DocenteCuentaScreen', 'DocenteCuentaScreen', 'Formulario; aviso y menú limitado si es obligatorio'),
      S(FE + 'services/authService.js', 'async changePassword', 'authService.changePassword', 'POST /auth/cambiar-password y limpia la obligación'),
      S(api, 'export const PASSWORD_CHANGE_EVENT', 'PASSWORD_CHANGE_EVENT', 'Evento al recibir el 403 del gate'),
      S(FE + 'App.jsx', 'const handlePasswordChanged', 'handlePasswordChanged', 'Libera el acceso y abre Mi espacio'),
    ],
    curl: `curl -s -X POST $BASE/auth/cambiar-password ${AUTHD} ${JSONH} \\
  -d '{"actual":"<contraseña actual>","nueva":"<nueva, de 8 a 72 caracteres>"}'

curl -s -X POST $BASE/auth/cambiar-password ${AUTHD} ${JSONH} -d '{}'`,
    esperado: 'Con la contraseña correcta → 200 y <code>debe_cambiar_password: 0</code>; las demás sesiones del usuario dejan de servir (401). Con el cuerpo vacío → 400 con <code>errors.actual</code> y <code>errors.nueva</code>. Con una sesión que aún tiene la temporal, <code>GET /docente/resumen</code> → 403 <code>cambio_password_obligatorio</code> hasta que se cambie.',
    tests: [
      T(RUN, 'Con contraseña temporal: TODAS las rutas /api/docente/* responden 403 cambio_password_obligatorio', 'Gate sobre TODAS las rutas /api/docente/*'),
      T(RUN, 'Con temporal: /api/auth/cambiar-password es alcanzable (400 por cuerpo vacío, no 403)', '/cambiar-password sigue alcanzable con la temporal'),
      T(RUN, 'Cambio de contraseña correcto: 200', 'Cambio correcto → 200'),
      T(RUN, 'Las demás sesiones se invalidan (401)', 'Las demás sesiones se invalidan'),
      T(RUN, 'Nueva de más de 72 caracteres (límite de bcrypt): 400', 'Nueva de más de 72 caracteres → 400'),
      T(RUN, 'Contraseña actual incorrecta: 400 con errors.actual (no 401, para no cerrar la sesión del cliente)', 'Actual incorrecta → 400 (no 401)'),
      T(RUN, 'cambiar-password: cinco actuales incorrectas -> 400,400,400,400 y el quinto bloquea (403)', 'Cinco fallos bloquean (403)'),
      T(FED + 'DocenteCuentaScreen.test.jsx', 'cambia la contraseña: POST /auth/cambiar-password, quita la obligación y avisa', 'Pantalla: cambia la contraseña (Vitest)'),
      T(FED + 'DocenteCuentaScreen.test.jsx', 'cambio obligatorio: muestra el aviso y deshabilita el resto del menú', 'Pantalla: cambio obligatorio (Vitest)'),
      T(FE + 'services/api.test.js', "describe('api · cambio de contraseña obligatorio (403 con código)'", 'api.js: el 403 emite el evento (Vitest)'),
    ],
  },
];
