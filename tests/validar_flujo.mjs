#!/usr/bin/env node
/**
 * Valida flujo.html contra el código real del repositorio (Node 20, sin dependencias).
 *
 * Uso:  node tests/validar_flujo.mjs        (desde la raíz del proyecto)
 *
 * Comprueba:
 *  - sintaxis de cada <script> inline y extracción de los datos (STEPS, LANES, STORES, NOTES, TOPICS, ARCHIVOS)
 *  - ids únicos, carriles válidos, touches que apuntan a almacenes existentes
 *  - que cada archivo citado exista, que la línea esté dentro del archivo y que el símbolo aparezca en esa línea
 *  - que cada endpoint citado (en pasos, temas y comandos curl) exista en backend/public/index.php
 *  - que estén los temas de la tabla del Eje 3 (Registro, Monitoreo, Visualizar, Difundir) con su acceso correcto
 *    y los 5 temas del grupo «Rol docente» ([D] / [A])
 *  - que estén los pasos del rol docente (cuenta, contraseña temporal, Mi espacio, proyecto, edición, envío y
 *    revisión) en orden lógico, con sus endpoints, almacenes y estado acumulado
 *  - que el árbol de archivos tenga líneas reales y cubra el código del repositorio (incluido tools/flujo)
 *  - afirmaciones concretas que el HTML hace sobre el código (TTL de sesión, SCHEMA_VERSION 3, checkDocente, gate de
 *    contraseña temporal, 409 proyecto_bloqueado / transicion_invalida, regla «solo aprobados», esquema y migraciones…)
 *  - que no haya recursos externos, contraseñas demo ni contraseñas temporales en claro, y que existan los bloques
 *    de tema claro y oscuro
 * Variable FLUJO_HTML: valida otro archivo (lo usa tools/flujo/mutaciones.mjs). Sale con código 1 si algo falla.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML_PATH = process.env.FLUJO_HTML ? path.resolve(process.env.FLUJO_HTML) : path.join(ROOT, 'flujo.html');
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const stats = {};

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p)) && fs.statSync(path.join(ROOT, p)).isFile();
const lineCache = new Map();
const linesOf = (p) => {
  if (!lineCache.has(p)) lineCache.set(p, read(p).split('\n'));
  return lineCache.get(p);
};
const countLines = (p) => {
  const t = read(p);
  return t === '' ? 0 : t.split('\n').length - (t.endsWith('\n') ? 1 : 0);
};

if (!fs.existsSync(HTML_PATH)) { console.error('No existe flujo.html en la raíz del proyecto.'); process.exit(1); }
const html = fs.readFileSync(HTML_PATH, 'utf8');

// ---------------------------------------------------------------- 1. scripts y datos
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
stats.scripts = scripts.length;
if (scripts.length < 3) err(`Se esperaban al menos 3 <script> inline (tema, datos, aplicación) y hay ${scripts.length}.`);
scripts.forEach((src, i) => {
  try { new vm.Script(src, { filename: `flujo.html#script${i + 1}` }); }
  catch (e) { err(`Error de sintaxis en el <script> #${i + 1}: ${e.message}`); }
});
if (/<script[^>]*\ssrc=/i.test(html)) err('Hay un <script src=…>: la página debe ser autocontenida.');

const dataScript = scripts.find((s) => s.includes('const STEPS')) || '';
let D = {};
try {
  D = vm.runInNewContext(`${dataScript}\n;({STEPS, LANES, STORES, CASO_FIELDS, NOTES, EJE, GRUPOS, TOPICS, LOGIN_CMD, LOGIN_DOC_CMD, ARCHIVOS})`, {}, { timeout: 5000 });
} catch (e) { err(`No se pudieron evaluar los datos: ${e.message}`); }
const { STEPS = [], LANES = [], STORES = [], CASO_FIELDS = [], NOTES = [], TOPICS = [], GRUPOS = [], ARCHIVOS = [], LOGIN_DOC_CMD = '' } = D;
stats.pasos = STEPS.length; stats.temas = TOPICS.length; stats.archivos = ARCHIVOS.length; stats.notas = NOTES.length; stats.almacenes = STORES.length;

// ---------------------------------------------------------------- 2. estructura de pasos
const unique = (arr, what) => {
  const seen = new Set();
  arr.forEach((x) => { if (seen.has(x)) err(`${what} repetido: ${x}`); seen.add(x); });
};
if (STEPS.length < 24 || STEPS.length > 32) err(`Se esperaban entre 24 y 32 pasos (19 del flujo original + los del rol docente) y hay ${STEPS.length}.`);
if (LANES.length !== 4) err(`Se esperaban 4 carriles y hay ${LANES.length}.`);
unique(STEPS.map((s) => s.id), 'Id de paso');
const storeIds = new Set(STORES.map((s) => s.id));
unique(STORES.map((s) => s.id), 'Id de almacén');
const casoKeys = new Set(CASO_FIELDS.map(([k]) => k));
STEPS.forEach((s, i) => {
  const w = `Paso ${i + 1} («${s.id}»)`;
  for (const k of ['id', 'title', 'short', 'what', 'data']) if (typeof s[k] !== 'string' || !s[k]) err(`${w}: falta «${k}».`);
  if (typeof s.http !== 'string') err(`${w}: «http» debe ser texto (vacío si no aplica).`);
  if (!Number.isInteger(s.lane) || s.lane < 0 || s.lane >= LANES.length) err(`${w}: carril inválido (${s.lane}).`);
  if (!Array.isArray(s.bullets) || s.bullets.length < 3) err(`${w}: necesita al menos 3 viñetas.`);
  if (s.ia !== null) err(`${w}: este proyecto no usa IA (ia debe ser null).`);
  if (s.short && s.short.length > 17) err(`${w}: «short» (${s.short.length} caracteres) no cabe en el nodo del diagrama.`);
  if (!Array.isArray(s.touches)) err(`${w}: touches debe ser un arreglo.`);
  (s.touches || []).forEach((t) => {
    if (!storeIds.has(t.store)) err(`${w}: touches referencia el almacén inexistente «${t.store}».`);
    if (!['R', 'W', 'RW'].includes(t.mode)) err(`${w}: modo inválido «${t.mode}».`);
  });
  if (!s.caso || typeof s.caso.progreso !== 'number') err(`${w}: falta caso.progreso.`);
  else for (const k of casoKeys) if (!(k in s.caso)) err(`${w}: caso sin el campo «${k}».`);
  if (!Array.isArray(s.files) || s.files.length < 2) err(`${w}: necesita al menos 2 archivos citados.`);
});
if (!STEPS.some((s) => s.error)) err('Debe haber un paso final de error («Si algo falla»).');
if (STEPS.length && !STEPS[STEPS.length - 1].error) err('El paso de error («Si algo falla») debe ser el último.');

// Pasos del rol docente: deben existir, en este orden lógico, con su endpoint y su carril
const DOCENTE_STEPS = [
  ['login', 'POST /api/auth/login'],
  ['sesion', 'POST /api/auth/login'],
  ['guard', ''],
  ['checkadmin', 'GET /api/eje3/catalogos'],
  ['proyectos', 'POST /api/eje3/proyectos'],
  ['cuentas', 'POST /api/eje3/usuarios-docentes'],
  ['password', 'POST /api/auth/cambiar-password'],
  ['miespacio', 'GET /api/docente/resumen'],
  ['docproy', 'POST /api/docente/proyectos'],
  ['docedit', 'PUT /api/docente/proyectos/:id'],
  ['enviar', 'POST /api/docente/proyectos/:id/enviar'],
  ['revision', 'POST /api/eje3/proyectos/:id/revision'],
  ['monitoreo', 'GET /api/eje3/monitoreo'],
  ['visualizar', 'GET /api/eje3/visualizar'],
  ['difundir', 'GET /api/eje3/difusion'],
  ['fallos', ''],
];
let lastIdx = -1;
DOCENTE_STEPS.forEach(([id, http]) => {
  const i = STEPS.findIndex((s) => s.id === id);
  if (i < 0) { err(`Falta el paso «${id}» del recorrido (rol docente).`); return; }
  if (i < lastIdx) err(`El paso «${id}» está fuera del orden lógico del recorrido (debe ir después del anterior de la lista).`);
  lastIdx = Math.max(lastIdx, i);
  if (STEPS[i].http !== http) err(`El paso «${id}» debería tener http «${http}» y tiene «${STEPS[i].http}».`);
});
const stepOf = (id) => STEPS.find((s) => s.id === id) || {};
const touchesOf = (id) => (stepOf(id).touches || []).map((t) => t.store);
for (const [id, stores] of Object.entries({
  cuentas: ['usuarios', 'sesiones'], password: ['usuarios', 'sesiones'], miespacio: ['proyectos', 'investigadores'],
  docproy: ['proyectos', 'apartados', 'eventos'], docedit: ['proyectos'], enviar: ['proyectos'], revision: ['proyectos'],
})) stores.forEach((st) => { if (!touchesOf(id).includes(st)) err(`El paso «${id}» debería tocar el almacén «${st}».`); });
// Estado acumulado: el recorrido del docente cambia el rol de la sesión, la contraseña y el estado de registro
['rol', 'password', 'registro'].forEach((k) => { if (!casoKeys.has(k)) err(`CASO_FIELDS debe incluir «${k}».`); });
const casoOf = (id) => stepOf(id).caso || {};
if (casoOf('sesion').rol !== 'administrador') err('Tras el login, caso.rol debe ser «administrador».');
if (casoOf('password').rol !== 'investigador') err('En el paso de cambio de contraseña, caso.rol debe ser «investigador».');
[['docproy', /^borrador/], ['enviar', /^enviado/], ['revision', /^aprobado/]].forEach(([id, re]) => {
  if (!re.test(String(casoOf(id).registro))) err(`caso.registro del paso «${id}» debería coincidir con ${re} y es «${casoOf(id).registro}».`);
});
if (casoOf('revision').rol !== 'administrador') err('En el paso de revisión el token vuelve a ser del administrador (caso.rol).');
// Almacenes: columnas relevantes de usuarios, proyectos y sesiones
const storeCols = (id) => (STORES.find((x) => x.id === id) || {}).cols || '';
[['usuarios', ['investigador_id', 'debe_cambiar_password', 'rol']], ['proyectos', ['registro_estado', 'comentario_revision', 'revisado_por']], ['sesiones', ['token_hash', 'expira_en']]]
  .forEach(([id, cols]) => cols.forEach((c) => { if (!storeCols(id).includes(c)) err(`El almacén «${id}» debe documentar la columna ${c}.`); }));
// El paso «Si algo falla» documenta el mapa de errores del rol docente
{
  const f = JSON.stringify(stepOf('fallos'));
  for (const k of ['cambio_password_obligatorio', 'proyecto_bloqueado', 'transicion_invalida', 'buap:session-expired', '401', '403', '404', '409']) {
    if (!f.includes(k)) err(`El paso «Si algo falla» debe mencionar «${k}».`);
  }
}

// ---------------------------------------------------------------- 3. archivos, líneas y símbolos
const refStats = { archivos: 0, notas: 0, pruebas: 0 };
function symbolKeys(sym) {
  const m = /^(GET|POST|PUT|DELETE)\s+(\S+)/.exec(sym);
  if (m) return [m[2]];
  const keys = new Set([sym]);
  if (sym.includes('::')) keys.add(sym.split('::').pop());
  if (sym.includes('.')) keys.add(sym.split('.').pop());
  return [...keys];
}
function checkRef(where, r, { needSymbol = true } = {}) {
  if (!r || typeof r.path !== 'string') { err(`${where}: referencia sin ruta.`); return; }
  if (!exists(r.path)) { err(`${where}: el archivo no existe: ${r.path}`); return; }
  const total = linesOf(r.path).length;
  if (!Number.isInteger(r.line) || r.line < 1 || r.line > total) {
    err(`${where}: la línea ${r.line} está fuera de ${r.path} (${total} líneas).`); return;
  }
  if (needSymbol && r.symbol) {
    const window = linesOf(r.path).slice(r.line - 1, r.line + 3).join('\n');
    if (!symbolKeys(r.symbol).some((k) => window.includes(k))) {
      err(`${where}: el símbolo «${r.symbol}» no aparece en ${r.path}:${r.line} (¿cambió el archivo?).`);
    }
  }
}
STEPS.forEach((s, i) => (s.files || []).forEach((f) => { refStats.archivos++; checkRef(`Paso ${i + 1} · ${f.symbol}`, f); if (!f.desc) err(`Paso ${i + 1} · ${f.symbol}: falta la descripción.`); }));
NOTES.forEach((n) => { refStats.notas++; checkRef(`Nota «${n.title.slice(0, 40)}»`, n); });
if (NOTES.length < 6 || NOTES.length > 9) err(`Se esperaban 6 a 9 notas y hay ${NOTES.length}.`);
{
  const nt = JSON.stringify(NOTES);
  for (const k of ['SCHEMA_VERSION', 'apiDeleteStrict', 'Pantallas huérfanas', 'backend/.env', 'proyectos aprobados', 'Mapa de errores', '409', 'una sola vez', 'DB_DRIVER', '002_docentes']) {
    if (!nt.toLowerCase().includes(k.toLowerCase())) err(`Las notas deben mencionar «${k}».`);
  }
}
const TEST_LINE = /\b(ok|eq|it|describe|test|registryCrud|section|function|suite\w*)\b/;
TOPICS.forEach((t) => {
  (t.files || []).forEach((f) => { refStats.archivos++; checkRef(`Tema «${t.id}» · ${f.symbol}`, f); });
  (t.tests || []).forEach((x) => {
    refStats.pruebas++;
    checkRef(`Tema «${t.id}» · prueba «${x.name.slice(0, 40)}»`, x, { needSymbol: false });
    if (exists(x.path) && x.line >= 1 && x.line <= linesOf(x.path).length && !TEST_LINE.test(linesOf(x.path)[x.line - 1])) {
      err(`Tema «${t.id}»: ${x.path}:${x.line} no parece un caso de prueba (${linesOf(x.path)[x.line - 1].trim().slice(0, 60)}).`);
    }
  });
});
stats.referencias = refStats;

// ---------------------------------------------------------------- 4. endpoints contra index.php
const routes = [];
read('backend/public/index.php').split('\n').forEach((l) => {
  const m = /^\$router->(get|post|put|delete)\(\s*'([^']+)'/.exec(l);
  if (m) routes.push([m[1].toUpperCase(), m[2]]);
});
const norm = (p) => p.replace(/\$\{?[A-Za-z_]\w*\}?/g, ':p').replace(/\{[^}]*\}/g, ':p').replace(/:[A-Za-z_]\w*/g, ':p').replace(/\/\d+(?=\/|$)/g, '/:p').replace(/\/+$/, '') || '/';
const routeSet = new Set(routes.map(([m, p]) => `${m} ${norm(p)}`));
stats.rutas = routes.length;
const endpointHits = new Map();
function addEndpoint(method, p, where) {
  p = p.replace(/[?#].*$/, '').replace(/[.,;:)]+$/, '');
  const key = `${method} ${norm(p)}`;
  if (!endpointHits.has(key)) endpointHits.set(key, where);
}
const corpus = JSON.stringify({ STEPS, NOTES, TOPICS });
for (const m of corpus.matchAll(/\b(GET|POST|PUT|DELETE)\s+(\/api[A-Za-z0-9_\-/:{}.?=&%*$]*)/g)) addEndpoint(m[1], m[2], 'texto');
const curlText = TOPICS.map((t) => t.curl).concat(STEPS.map((s) => s.data), [LOGIN_DOC_CMD]).join('\n').replace(/\\\r?\n/g, ' ');
curlText.split(/\bcurl\b/).slice(1).forEach((cmd) => {
  const verb = (/-X\s+([A-Z]+)/.exec(cmd) || [])[1] || 'GET';
  const u = /(?:\$BASE|https?:\/\/[^/\s"']+\/api)(\/[^\s"']*)/.exec(cmd);
  if (u) addEndpoint(verb, '/api' + u[1], 'curl');
});
TOPICS.forEach((t) => (t.endpoints || []).forEach((e) => {
  const m = /^(GET|POST|PUT|DELETE)\s+(\/api\S*)$/.exec(e);
  if (!m) err(`Tema «${t.id}»: endpoint con formato inválido «${e}».`); else addEndpoint(m[1], m[2], `tema ${t.id}`);
}));
STEPS.forEach((s, i) => { if (s.http) { const m = /^(GET|POST|PUT|DELETE)\s+(\/api\S*)$/.exec(s.http); if (!m) err(`Paso ${i + 1}: http inválido «${s.http}».`); else addEndpoint(m[1], m[2], `paso ${i + 1}`); } });
for (const [key, where] of endpointHits) if (!routeSet.has(key)) err(`Endpoint citado que no existe en index.php: ${key} (${where}).`);
stats.endpoints = endpointHits.size;

// ---------------------------------------------------------------- 5. temas del Eje 3
const REQUIRED = {
  Registro: [
    'Proyectos de investigación (Anexo apartados)', 'Proyectos de semilleros (Anexo apartados)', 'Base de datos dictaminadores',
    'Base de datos moderadores', 'Base de relatores', 'Base de datos de dictaminadores revista PYAD',
    'Retribución social de estudiantes y profesores de la MPYMES', 'Retribución social de estudiantes y profesores de la MGT',
    'Retribución social de estudiantes y profesores de la MDGE', 'Actividades Egresados posgrado',
  ],
  Monitoreo: [
    'Número de docentes con proyectos de investigación registrados', 'Número de docentes con proyectos de titulación articulados al CIV',
    'Número de profesores en el SNII', 'Número de profesores elegibles en SNII',
  ],
  Visualizar: ['Número de publicaciones de docentes resultados de eventos y revista PYAD', 'Producción académica de docente investigadores'],
  Difundir: ['Eventos de semilleros de investigación', 'Congreso Internacional de Investigación en Ciencias Económico Administrativas'],
};
unique(TOPICS.map((t) => t.id), 'Id de tema');
let requiredCount = 0;
for (const [g, titles] of Object.entries(REQUIRED)) {
  titles.forEach((title) => {
    requiredCount++;
    const t = TOPICS.find((x) => x.titulo === title);
    if (!t) err(`Falta el tema de la tabla: «${title}».`);
    else if (t.grupo !== g) err(`El tema «${title}» debería estar en ${g} y está en ${t.grupo}.`);
  });
  const n = TOPICS.filter((x) => x.grupo === g).length;
  const expected = g === 'Registro' ? 11 : titles.length;
  if (n !== expected) err(`${g}: se esperaban ${expected} temas (${g === 'Registro' ? '10 + titulación CIV de apoyo' : 'los de la tabla'}) y hay ${n}.`);
}
if (!TOPICS.some((t) => t.grupo === 'Registro' && /titulación articulados al CIV/.test(t.titulo))) err('Falta el tema de apoyo «Proyectos de titulación articulados al CIV».');
stats.temasRequeridos = requiredCount;
// Grupo «Rol docente»: extensión acordada (no es parte de la tabla del Eje 3). Los 19 temas anteriores no se tocan.
const DOC_TOPICS = [
  ['doc-cuentas', 'Cuentas de docentes', 'A'],
  ['doc-espacio', 'Mi espacio del docente', 'D'],
  ['doc-proyectos', 'Registro de proyectos del docente', 'D'],
  ['doc-revision', 'Revisión de proyectos por el administrador', 'A'],
  ['doc-password', 'Cambio de contraseña (obligatorio al primer ingreso)', 'D'],
];
DOC_TOPICS.forEach(([id, title, acc]) => {
  const t = TOPICS.find((x) => x.id === id);
  if (!t) { err(`Falta el tema del rol docente «${title}» (${id}).`); return; }
  if (t.titulo !== title) err(`El tema ${id} debería llamarse «${title}» y se llama «${t.titulo}».`);
  if (t.grupo !== 'Rol docente') err(`El tema ${id} debería estar en «Rol docente» y está en «${t.grupo}».`);
  if (t.acceso !== acc) err(`El tema «${title}» debería marcarse [${acc}] y está [${t.acceso}].`);
  if (!(t.tests || []).some((x) => x.path.startsWith('frontend/'))) err(`El tema «${title}» necesita al menos un caso de prueba de Vitest.`);
  if (t.acceso === 'D' && !/\$DOC\b/.test(t.curl || '')) err(`El tema «${title}» ([D]) debe usar el token del docente ($DOC) en su curl.`);
});
if (TOPICS.filter((t) => t.grupo === 'Rol docente').length !== DOC_TOPICS.length) err(`«Rol docente» debe tener exactamente ${DOC_TOPICS.length} temas.`);
if (TOPICS.slice(0, 19).some((t) => t.grupo === 'Rol docente')) err('Los 19 temas originales deben ir primero; el grupo «Rol docente» va después.');
if (TOPICS.length !== 19 + DOC_TOPICS.length) err(`Se esperaban ${19 + DOC_TOPICS.length} temas (19 + ${DOC_TOPICS.length}) y hay ${TOPICS.length}.`);
if (!/^DOC=/m.test(LOGIN_DOC_CMD) || !/auth\/login/.test(LOGIN_DOC_CMD)) err('Falta LOGIN_DOC_CMD con el login del docente (variable DOC).');
// Los temas que cambian con el rol docente lo mencionan (Cómo está hecho / Cómo probarlo)
['proy-inv', 'proy-sem', 'titulacion', 'mon-proy', 'mon-civ', 'viz-prod', 'dif-sem', 'dif-cong'].forEach((id) => {
  const t = TOPICS.find((x) => x.id === id);
  if (!t) return;
  const txt = JSON.stringify([t.regla, t.pantalla, t.esperado]);
  if (!/aprobad/.test(txt)) err(`El tema «${id}» debe explicar que ahora solo cuentan los proyectos aprobados.`);
  if (!(t.tests || []).some((x) => /run\.php$/.test(x.path) && /Aprobar|registro_estado|BORRADOR|ENVIADO|aprobad|solo aprobados/i.test(x.name))) err(`El tema «${id}» debe citar un caso de run.php de la revisión o de «solo aprobados».`);
});
GRUPOS.forEach((g) => { if (!TOPICS.some((t) => t.grupo === g.id)) err(`Grupo sin temas: ${g.id}.`); });
TOPICS.forEach((t) => {
  const w = `Tema «${t.id}»`;
  for (const k of ['titulo', 'pide', 'interp', 'curl', 'esperado']) if (typeof t[k] !== 'string' || !t[k]) err(`${w}: falta «${k}».`);
  for (const k of ['endpoints', 'tablas', 'regla', 'pantalla', 'files', 'tests']) if (!Array.isArray(t[k]) || !t[k].length) err(`${w}: «${k}» vacío.`);
  if (!['A', 'P', 'D'].includes(t.acceso)) err(`${w}: acceso inválido.`);
  if (!GRUPOS.some((g) => g.id === t.grupo)) err(`${w}: grupo inválido.`);
  if (!(t.tests || []).some((x) => x.path.startsWith('backend/'))) err(`${w}: sin caso de prueba de backend.`);
});
TOPICS.filter((t) => t.grupo === 'Visualizar').forEach((t) => { if (t.acceso !== 'A') err(`«${t.titulo}» debe marcarse [A]: Visualizar ya no es público.`); });
TOPICS.filter((t) => t.grupo === 'Difundir').forEach((t) => { if (t.acceso !== 'P') err(`«${t.titulo}» debe marcarse [P]: Difundir es la parte pública.`); });
TOPICS.filter((t) => t.grupo === 'Registro' || t.grupo === 'Monitoreo').forEach((t) => { if (t.acceso !== 'A') err(`«${t.titulo}» debe marcarse [A].`); });
TOPICS.filter((t) => t.grupo === 'Rol docente').forEach((t) => { if (!['A', 'D'].includes(t.acceso)) err(`«${t.titulo}» debe marcarse [A] o [D].`); });

// ---------------------------------------------------------------- 6. árbol de archivos
const seenPaths = new Set();
ARCHIVOS.forEach((a) => {
  if (seenPaths.has(a.path)) err(`Archivo repetido en el árbol: ${a.path}`); seenPaths.add(a.path);
  if (!exists(a.path)) { err(`Archivo del árbol que no existe: ${a.path}`); return; }
  const n = countLines(a.path);
  const selfRef = a.path === 'flujo.html' || a.path === 'tests/validar_flujo.mjs' || a.path.startsWith('tools/flujo/'); // se describen a sí mismos: el conteo se desfasa al editarlos
  if (a.lines !== n && !selfRef) err(`Líneas desactualizadas en ${a.path}: el árbol dice ${a.lines} y el archivo tiene ${n}.`);
  if (!a.desc || a.desc === 'Sin descripción') err(`Archivo sin descripción: ${a.path}`);
});
const CODE_EXT = /\.(php|sql|js|jsx|mjs|css|sh|md|json|html)$/;
const SKIP = /node_modules|\/assets\/|\/uploads\/|package-lock|\.DS_Store|exams-preparation|^backend\/public\/index\.html$/;
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) { if (!['node_modules', 'dist', 'uploads', 'assets'].includes(e.name) && rel !== 'tools/flujo/ex') walk(rel, out); }
    else if (CODE_EXT.test(e.name) && !SKIP.test(rel)) out.push(rel);
  }
  return out;
};
['backend/src', 'backend/tests', 'backend/config', 'frontend/src', 'tools/flujo'].forEach((d) => {
  walk(d).forEach((p) => { if (!/\.(png|jpg|svg)$/.test(p) && !seenPaths.has(p)) err(`Archivo del repositorio sin anotar en el árbol: ${p}`); });
});
for (const p of ['backend/public/index.php', 'backend/public/router.php', 'run.sh', 'run_tests.sh', 'preparar_despliegue.sh', 'flujo.html', 'tests/validar_flujo.mjs',
  'tools/flujo/build.mjs', 'tools/flujo/capturar.mjs', 'tools/flujo/README.md', 'tools/flujo/steps.mjs', 'tools/flujo/topics.mjs',
  'backend/src/Modules/Docente/DocenteController.php', 'backend/src/Modules/Docente/DocenteProjectService.php', 'backend/src/Modules/Docente/DocenteSummaryRepository.php',
  'backend/src/Modules/Eje3/TeacherAccountController.php', 'backend/src/Modules/Eje3/TeacherAccountService.php', 'backend/src/Modules/Eje3/TeacherAccountRepository.php',
  'backend/src/Database/DocenteSeed.php', 'backend/src/Database/migrations/002_docentes.sql',
  'frontend/src/modules/docente/DocenteMiEspacioScreen.jsx', 'frontend/src/modules/docente/DocenteProyectosScreen.jsx', 'frontend/src/modules/docente/DocenteCuentaScreen.jsx',
  'frontend/src/modules/eje3/AdminDocentesUsuariosScreen.jsx', 'frontend/src/modules/eje3/AdminDocentesRevisionScreen.jsx', 'frontend/src/components/DocenteSidebar.jsx', 'frontend/src/services/docenteService.js']) {
  if (!seenPaths.has(p)) err(`Falta en el árbol: ${p}`);
}
stats.lineasTotales = ARCHIVOS.reduce((s, a) => s + a.lines, 0);

// ---------------------------------------------------------------- 7. afirmaciones concretas sobre el código
const CLAIMS = [
  ['Sesión de 8 h (28 800 s)', 'backend/src/Modules/Auth/AuthController.php', /SESSION_TTL\s*=\s*28800/],
  ['Token de 32 bytes aleatorios y sha256', 'backend/src/Modules/Auth/AuthController.php', /bin2hex\(random_bytes\(32\)\)[\s\S]*hash\('sha256'/],
  ['Bloqueo tras 5 intentos', 'backend/src/Modules/Auth/AuthController.php', /\$intentos >= 5/],
  ['Bloqueo de 15 minutos', 'backend/src/Modules/Auth/AuthController.php', /time\(\) \+ 900/],
  ['MySQL con espera de 1 s', 'backend/src/Core/Database.php', /ATTR_TIMEOUT\s*=>\s*1/],
  ['SQLite: espera de 5 s por bloqueo', 'backend/src/Core/Database.php', /PDO::ATTR_TIMEOUT\s*=>\s*5/],
  ['El inicializador SQLite se salta el DDL si user_version ya alcanza SCHEMA_VERSION', 'backend/src/Database/SqliteInitializer.php', /user_version"\)->fetchColumn\(\)\s*>=\s*self::SCHEMA_VERSION/],
  ['SI3_SQLITE_PATH', 'backend/src/Core/Database.php', /getenv\('SI3_SQLITE_PATH'\)/],
  ['Subida de PDF: 25 MB', 'backend/src/Modules/Upload/UploadController.php', /25 \* 1024 \* 1024/],
  ['Subida de PDF: magic bytes %PDF-', 'backend/src/Modules/Upload/UploadController.php', /'%PDF-'/],
  ['Visualizar: máximo 20 docentes', 'backend/src/Modules/Eje3/VisualizationService.php', /MAX_DOCENTES\s*=\s*20/],
  ['Difundir: máximo 5 próximos', 'backend/src/Modules/Eje3/PublicDisseminationService.php', /MAX_PROXIMOS\s*=\s*5/],
  ['Visualizar exige administrador', 'backend/src/Modules/Eje3/VisualizationController.php', /requireAdmin\(\$request\)/],
  ['Difundir sin sesión (no llama a requireAdmin)', 'backend/src/Modules/Eje3/PublicDisseminationController.php', /^(?![\s\S]*requireAdmin)/],
  ['Debounce de 320 ms en el portal', 'frontend/src/modules/prototype/HomeSearchScreen.jsx', /\}, 320\)/],
  ['Guard por rol: vistas admin sin sesión admin van a login (o al espacio docente)', 'frontend/src/App.jsx', /view\.startsWith\('admin'\)[\s\S]{0,260}setCurrentView\('login'\)/],
  ['Guard por rol: vistas docente-* exigen docente (el admin va a admin-panel)', 'frontend/src/App.jsx', /view\.startsWith\('docente-'\)[\s\S]{0,260}setCurrentView\('admin-panel'\)/],
  ['Con contraseña temporal pendiente, las vistas docente caen en docente-cuenta', 'frontend/src/App.jsx', /mustChangePassword \? 'docente-cuenta' : view/],
  ['Pie oculto en vistas admin, docente y login', 'frontend/src/App.jsx', /!currentView\.startsWith\('admin'\) && !currentView\.startsWith\('docente'\) && currentView !== 'login'/],
  ['El login enruta por rol (admin-panel / Mi espacio / Mi cuenta)', 'frontend/src/App.jsx', /setCurrentView\(docenteHome\(mustChange\)\)[\s\S]{0,400}setCurrentView\('admin-panel'\)/],
  ['api.js: evento buap:session-expired', 'frontend/src/services/api.js', /SESSION_EXPIRED_EVENT = 'buap:session-expired'/],
  ['api.js: evento buap:password-change-required', 'frontend/src/services/api.js', /PASSWORD_CHANGE_EVENT = 'buap:password-change-required'/],
  ['api.js: un 401 con token limpia token y usuario', 'frontend/src/services/api.js', /localStorage\.removeItem\(TOKEN_KEY\);[\s\S]{0,60}localStorage\.removeItem\(USER_KEY\);[\s\S]{0,60}dispatchEvent\(new Event\(SESSION_EXPIRED_EVENT\)\)/],
  ['authService: isAdmin, isDocente, isLoggedIn y changePassword', 'frontend/src/services/authService.js', /isAdmin\(\)[\s\S]*isDocente\(\)[\s\S]*isLoggedIn\(\)[\s\S]*async changePassword/],
  ['El botón del encabezado dice «Iniciar sesión» (no «Acceso administrador»)', 'frontend/src/components/BUAPHeader.jsx', /'Ir al panel' : 'Iniciar sesión'/],
  ['Encabezado: ya no existe «Acceso administrador»', 'frontend/src/components/BUAPHeader.jsx', /^(?![\s\S]*Acceso administrador)/],
  ['Encabezado: «Mi espacio» para el docente', 'frontend/src/components/BUAPHeader.jsx', /Mi espacio/],
  ['docenteService borra con apiDeleteStrict (no simula éxito)', 'frontend/src/services/docenteService.js', /apiDeleteStrict\(`\/docente\/proyectos\/\$\{id\}`\)/],
  ['AdminSidebar: grupo Docentes con contador desde GET /eje3/revision', 'frontend/src/components/AdminSidebar.jsx', /DOCENTES_ITEMS[\s\S]*eje3Service\.revision\(\)/],
  ['DocenteSidebar: modo soloCuenta', 'frontend/src/components/DocenteSidebar.jsx', /soloCuenta/],
  ['El docente no tiene archivos adjuntos (apartados de texto)', 'frontend/src/modules/docente/docenteConfig.js', /^(?![\s\S]*type: 'file')/],
  ['isAuthenticated solo mira localStorage', 'frontend/src/services/authService.js', /isAuthenticated\(\)[\s\S]{0,200}getCurrentUser\(\)[\s\S]{0,80}getToken\(\)/],
  ['apiDelete simula éxito', 'frontend/src/services/api.js', /isMock:\s*true/],
  ['No hay vista pública eje3-visualizar en App.jsx', 'frontend/src/App.jsx', /^(?![\s\S]*currentView === 'eje3-visualizar')/],
  ['No hay enlace público a Visualizar en el encabezado', 'frontend/src/components/BUAPHeader.jsx', /^(?![\s\S]*eje3-visualizar)/],
  ['Existe la vista admin-eje3-visualizar', 'frontend/src/App.jsx', /currentView === 'admin-eje3-visualizar'/],
  ['Ruta de Visualizar sin etiqueta [P]', 'backend/public/index.php', /\/api\/eje3\/visualizar[^\n]*\[A\]/],
  ['Migración 001 idempotente', 'backend/src/Database/migrations/001_eje3.sql', /CREATE TABLE IF NOT EXISTS `eventos_investigacion`/],
  // --- rol docente: base de datos
  ['SCHEMA_VERSION = 3', 'backend/src/Database/SqliteInitializer.php', /public const SCHEMA_VERSION = 3;/],
  ['SQLite: migrateDocentes agrega registro_estado con DEFAULT \'aprobado\'', 'backend/src/Database/SqliteInitializer.php', /ADD COLUMN registro_estado TEXT NOT NULL DEFAULT 'aprobado'/],
  ['SQLite: usuarios.investigador_id y debe_cambiar_password', 'backend/src/Database/SqliteInitializer.php', /ADD COLUMN investigador_id INTEGER[\s\S]*ADD COLUMN debe_cambiar_password INTEGER NOT NULL DEFAULT 0/],
  ['SQLite: UNIQUE parcial, una cuenta por docente', 'backend/src/Database/SqliteInitializer.php', /CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_investigador ON usuarios\(investigador_id\) WHERE investigador_id IS NOT NULL/],
  ['SQLite: WAL activado', 'backend/src/Database/SqliteInitializer.php', /PRAGMA journal_mode = WAL/],
  ['La semilla del docente corre solo si user_version < 3', 'backend/src/Database/SqliteInitializer.php', /user_version"\)->fetchColumn\(\) < 3[\s\S]*DocenteSeed::seed/],
  ['DocenteSeed liga la cuenta demo investigador@buap.mx', 'backend/src/Database/DocenteSeed.php', /CORREO_DEMO = 'investigador@buap\.mx'/],
  ['Semilla docente: un proyecto en cada estado de registro', 'backend/src/Database/DocenteSeed.php', /'borrador'[\s\S]*'enviado'[\s\S]*'aprobado'[\s\S]*'devuelto'/],
  ['MySQL: ATTR_EMULATE_PREPARES = false (no se repiten nombres de parámetro)', 'backend/config/database.php', /ATTR_EMULATE_PREPARES\s*=>\s*false/],
  ['Búsquedas con :s1…:sN (un parámetro por columna)', 'backend/src/Modules/Eje3/Eje3ProjectRepository.php', /\[':s1', ':s2', ':s3', ':s4', ':s5'\]/],
  ['DB_DRIVER=sqlite omite MySQL', 'backend/src/Core/Database.php', /getenv\('DB_DRIVER'\)/],
  // --- rol docente: autenticación
  ['checkDocente existe', 'backend/src/Modules/Auth/AuthController.php', /public static function checkDocente\(Request \$request\): \?array/],
  ['Gate: 403 con errors.codigo = cambio_password_obligatorio', 'backend/src/Modules/Auth/AuthController.php', /debe_cambiar_password'\] === 1\)[\s\S]{0,260}\['codigo' => \['cambio_password_obligatorio'\]\]/],
  ['Un docente sin investigador_id no entra (403)', 'backend/src/Modules/Auth/AuthController.php', /Tu cuenta aún no está ligada a un docente\. Contacta al administrador\./],
  ['checkAdmin rechaza roles no admin con 403', 'backend/src/Modules/Auth/AuthController.php', /!self::isAdminRole\(\$resolved\['user'\]\['rol'\]\)\) \{\s*return \['status' => 'forbidden'\]/],
  ['cambiar-password: nueva de 8 a 72 caracteres', 'backend/src/Modules/Auth/AuthController.php', /mb_strlen\(\$nueva\) < 8[\s\S]*strlen\(\$nueva\) > 72/],
  ['cambiar-password: borra las demás sesiones (conserva la actual)', 'backend/src/Modules/Auth/AuthController.php', /DELETE FROM sesiones WHERE usuario_id = :id AND token_hash <> :hash/],
  ['cambiar-password: actual incorrecta cuenta como intento fallido y responde 400', 'backend/src/Modules/Auth/AuthController.php', /Response::badRequest\('La contraseña actual es incorrecta\.'/],
  ['Ruta POST /api/auth/cambiar-password', 'backend/public/index.php', /\$router->post\('\/api\/auth\/cambiar-password'/],
  // --- rol docente: proyectos, revisión y cuentas
  ['Response::conflict responde 409', 'backend/src/Core/Response.php', /public static function conflict[\s\S]*?self::json\(409/],
  ['409 proyecto_bloqueado (docente)', 'backend/src/Modules/Docente/DocenteProjectService.php', /conflict\('proyecto_bloqueado'/],
  ['409 transicion_invalida al enviar (docente)', 'backend/src/Modules/Docente/DocenteProjectService.php', /conflict\('transicion_invalida'/],
  ['409 transicion_invalida al revisar (admin)', 'backend/src/Modules/Eje3/Eje3ProjectService.php', /conflict\('transicion_invalida'/],
  ['El docente edita y borra solo en borrador o devuelto', 'backend/src/Modules/Docente/DocenteProjectService.php', /EDITABLES = \['borrador', 'devuelto'\]/],
  ['El docente solo liga eventos públicos', 'backend/src/Modules/Docente/DocenteProjectService.php', /private function checkPublicEvent[\s\S]*SELECT publico FROM eventos_investigacion[\s\S]*\(int\)\$public !== 1/],
  ['El docente crea en borrador', 'backend/src/Modules/Docente/DocenteProjectService.php', /->create\(\$clean, \$sections, 'borrador'/],
  ['Enviar exige título, resumen y línea de investigación', 'backend/src/Modules/Docente/DocenteProjectService.php', /'titulo' => 'título', 'resumen' => 'resumen', 'linea_investigacion' => 'línea de investigación'/],
  ['Un proyecto ajeno responde 404 (findOwned)', 'backend/src/Modules/Docente/DocenteProjectService.php', /findOwned\(\$id, \$teacherId\)[\s\S]{0,80}notFound/],
  ['Asignación masiva: el principal es el de la sesión', 'backend/src/Modules/Docente/DocenteProjectService.php', /\$clean\['investigador_principal_id'\] = \$teacherId/],
  ['El admin crea proyectos aprobados por defecto', 'backend/src/Modules/Eje3/Eje3ProjectRepository.php', /\$registroEstado = 'aprobado'/],
  ['Estado y propiedad se leen dentro de la transacción (FOR UPDATE en MySQL)', 'backend/src/Modules/Eje3/Eje3ProjectRepository.php', /FOR UPDATE/],
  ['Revisión: devolver exige comentario de al menos 3 caracteres', 'backend/src/Modules/Eje3/Eje3ProjectService.php', /\$accion === 'devolver' && mb_strlen\(\$comment\) < 3/],
  ['Revisión: comentario de hasta 2000 caracteres', 'backend/src/Modules/Eje3/Eje3ProjectService.php', /mb_strlen\(\$comment\) > 2000/],
  ['Apartados: máximo 100', 'backend/src/Modules/Eje3/Eje3ProjectService.php', /MAX_APARTADOS = 100/],
  ['Bandeja de revisión: solo enviados, del más antiguo al más reciente', 'backend/src/Modules/Eje3/Eje3ProjectRepository.php', /registro_estado = :estado\s*ORDER BY p\.enviado_en ASC/],
  ['Rutas de revisión [A]', 'backend/public/index.php', /\/api\/eje3\/proyectos\/:id\/revision[\s\S]*\/api\/eje3\/revision/],
  ['Cuenta de docente: contraseña de 12 caracteres', 'backend/src/Modules/Eje3/TeacherAccountService.php', /PASSWORD_LENGTH = 12/],
  ['Cuenta de docente: random_bytes', 'backend/src/Modules/Eje3/TeacherAccountService.php', /random_bytes\(32\)/],
  ['Cuenta de docente: solo se guarda el hash bcrypt', 'backend/src/Modules/Eje3/TeacherAccountService.php', /password_hash\(\$password, PASSWORD_BCRYPT/],
  ['Cuenta de docente: respuesta no cacheable', 'backend/src/Modules/Eje3/TeacherAccountController.php', /Cache-Control: no-store/],
  ['Cuenta de docente: nace con debe_cambiar_password = 1', 'backend/src/Modules/Eje3/TeacherAccountRepository.php', /'investigador', :cargo, 1, :inv, 1\)/],
  ['409 docente_con_cuenta y correo_duplicado', 'backend/src/Modules/Eje3/TeacherAccountService.php', /'docente_con_cuenta'[\s\S]*'correo_duplicado'/],
  ['Resumen del docente: listas de hasta 100', 'backend/src/Modules/Docente/DocenteSummaryRepository.php', /MAX_ITEMS = 100/],
  ['Resumen del docente: solo publicaciones publicadas', 'backend/src/Modules/Docente/DocenteSummaryRepository.php', /estado = 'publicado'/],
  ['Hub: proyectos_pendientes = enviados', 'backend/src/Modules/Eje3/CatalogController.php', /'proyectos_pendientes'\s*=> \$count\("SELECT COUNT\(\*\) FROM proyectos WHERE registro_estado = 'enviado'"\)/],
  // --- regla «solo aprobados»
  ['Solo aprobados · Monitoreo', 'backend/src/Modules/Eje3/MonitoringRepository.php', /p\.registro_estado = 'aprobado'/],
  ['Solo aprobados · Visualizar (por docente)', 'backend/src/Modules/Eje3/VisualizationRepository.php', /pr\.registro_estado = 'aprobado'/],
  ['Solo aprobados · Visualizar (totales)', 'backend/src/Modules/Eje3/VisualizationRepository.php', /FROM proyectos WHERE registro_estado = 'aprobado'/],
  ['Solo aprobados · Difundir (total_proyectos del evento)', 'backend/src/Modules/Eje3/EventRepository.php', /p\.evento_id = e\.id AND p\.registro_estado = 'aprobado'/],
  ['Solo aprobados · Difundir (proyectos del evento)', 'backend/src/Modules/Eje3/EventRepository.php', /p\.evento_id = :id AND p\.registro_estado = 'aprobado'/],
  ['Solo aprobados · /api/eje3/docentes', 'backend/src/Modules/Eje3/FacultyRepository.php', /p\.registro_estado = 'aprobado'/],
  ['Solo aprobados · filtro público de proyectos clásicos', 'backend/src/Modules/Projects/ProjectRepository.php', /PUBLIC_FILTER = "p\.tipo = 'investigacion' AND p\.registro_estado = 'aprobado'/],
  ['Solo aprobados · búsqueda y perfil públicos usan PUBLIC_FILTER', 'backend/src/Modules/Dissemination/DisseminationRepository.php', /PUBLIC_FILTER[\s\S]*PUBLIC_FILTER/],
  ['Solo aprobados · publicaciones (JOIN a proyectos)', 'backend/src/Modules/Publications/PublicationRepository.php', /pro\.registro_estado = 'aprobado'/],
  ['Solo aprobados · tablero de métricas', 'backend/src/Modules/Metrics/MetricsRepository.php', /registro_estado = 'aprobado'/],
  ['Solo aprobados · conteos de investigadores', 'backend/src/Modules/Researchers/ResearcherRepository.php', /pro\.registro_estado = 'aprobado'/],
  ['El resumen del docente cuenta TODOS sus estados (no filtra por aprobado)', 'backend/src/Modules/Docente/DocenteSummaryRepository.php', /^(?![\s\S]*registro_estado = 'aprobado')/],
  ['Ningún código lee .env', 'backend/public/index.php', /^(?![\s\S]*parse_ini_file)/],
];
CLAIMS.forEach(([name, file, re]) => {
  if (!exists(file)) { err(`Afirmación «${name}»: no existe ${file}.`); return; }
  if (!re.test(read(file))) err(`Afirmación del HTML no se cumple en el código: «${name}» (${file}).`);
});
// El HTML dice que hay N rutas: debe coincidir con index.php
const rc = /Registra (\d+) rutas/.exec(corpus);
if (rc && Number(rc[1]) !== routes.length) err(`El HTML dice ${rc[1]} rutas y index.php registra ${routes.length}.`);
// Tablas citadas: deben existir en schema.sql
const schema = read('backend/src/Database/schema.sql');
new Set(TOPICS.flatMap((t) => t.tablas).concat(STORES.filter((s) => s.id !== 'uploads').map((s) => s.label))).forEach((tb) => {
  if (!new RegExp('CREATE TABLE `' + tb + '`').test(schema)) err(`Tabla citada que no está en schema.sql: ${tb}`);
});

// SCHEMA_VERSION citada en el texto = la del código
{
  const code = /public const SCHEMA_VERSION = (\d+);/.exec(read('backend/src/Database/SqliteInitializer.php'));
  const said = /SCHEMA_VERSION<\/code> \(hoy <strong>(\d+)<\/strong>\)/.exec(corpus);
  if (!said) err('El texto debe decir cuál es la SCHEMA_VERSION actual.');
  else if (!code || Number(said[1]) !== Number(code[1])) err(`El HTML dice SCHEMA_VERSION ${said[1]} y el código tiene ${code && code[1]}.`);
}
// El alfabeto de las contraseñas temporales no tiene caracteres ambiguos
{
  const m = /ALPHABET = '([^']+)'/.exec(read('backend/src/Modules/Eje3/TeacherAccountService.php'));
  if (!m || /[0O1lI]/.test(m[1])) err('El alfabeto de la contraseña temporal no debe tener 0, O, 1, l ni I.');
}
// Nada de contraseñas en el HTML: ni las demo de guia.md ni una temporal en claro
{
  const guia = exists('guia.md') ? read('guia.md') : '';
  const demo = new Set([...guia.matchAll(/`[^`\s]+@[^`\s]+`\s*\/\s*`([^`]+)`/g)].map((m) => m[1]));
  for (const m of guia.matchAll(/contraseña \(`([^`]+)`\)/g)) demo.add(m[1]);
  demo.forEach((pw) => { if (pw.length >= 6 && html.includes(pw)) err(`El HTML contiene una contraseña demo de guia.md («${pw.slice(0, 2)}…»): debe remitir a la guía.`); });
  const clear = [...html.matchAll(/"password_temporal":\s*\\?"([^"\\]+)\\?"/g)].filter((m) => !/^[•*x]+$/.test(m[1]));
  if (clear.length) err(`El HTML muestra ${clear.length} password_temporal en claro.`);
}
// Los ejemplos de la API del rol docente vienen de las respuestas capturadas (tools/flujo/ex)
{
  const need = ['cuenta_crear', 'login_temporal', 'gate', 'cambiar_password', 'resumen', 'proy_crear', 'proy_bloqueado', 'revision_lista', 'revision_aprobar', 'revision_repetida', 'monitoreo_antes'];
  need.forEach((n) => { if (!exists(`tools/flujo/ex/${n}.json`)) err(`Falta el ejemplo capturado tools/flujo/ex/${n}.json (node tools/flujo/capturar.mjs).`); });
  const shown = JSON.stringify(STEPS.map((x) => x.data));
  for (const k of ['cambio_password_obligatorio', 'proyecto_bloqueado', 'transicion_invalida', 'docente_con_cuenta', '"registro_estado": "borrador"', '"registro_estado": "enviado"', '"registro_estado": "aprobado"']) {
    if (!shown.replace(/\\"/g, '"').includes(k)) err(`Los ejemplos de los pasos deben mostrar ${k}.`);
  }
}

// ---------------------------------------------------------------- 8. autocontenido y temas
const loopback = /^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)(:\d+)?(\/|$)/;
const external = [...html.matchAll(/https?:\/\/[^\s"'<>)\\]+/g)].map((m) => m[0])
  .filter((u) => u !== 'http://www.w3.org/2000/svg' && !loopback.test(u));
if (external.length) err(`Recursos o URL externas (${external.length}): ${[...new Set(external)].slice(0, 5).join(', ')}`);
if (/<link\b/i.test(html)) err('Hay una etiqueta <link>.');
if (/@import|url\(\s*['"]?(https?:|\/\/)/i.test(html)) err('Hay @import o url() externos.');
if (/<img\b[^>]*\ssrc=|<iframe\b/i.test(html)) err('Hay <img src> o <iframe>.');
if (!/color-scheme:\s*light/.test(html) || !/:root\s*\{/.test(html)) err('Falta el bloque de tema claro (:root).');
if (!/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)/.test(html)) err('Falta el bloque de tema oscuro automático (prefers-color-scheme).');
if (!/:root\[data-theme="dark"\]\s*\{/.test(html)) err('Falta el bloque de tema oscuro manual (:root[data-theme="dark"]).');
if (!/localStorage\.getItem\("si3-theme"\)[\s\S]{0,300}setAttribute\("data-theme"/.test(html.split('</head>')[0])) err('Falta el script anti-parpadeo del tema en el <head>.');
if (!/<dialog id="dlgNotes"/.test(html)) err('Falta el diálogo de notas.');
['vFlujo', 'vEje', 'vArch'].forEach((id) => { if (!html.includes(`id="${id}"`)) err(`Falta el botón de vista #${id}.`); });
if (/prefers-reduced-motion/.test(html) === false) err('Falta el soporte de prefers-reduced-motion.');
const bytes = Buffer.byteLength(html);
stats.kb = Math.round(bytes / 1024);

// ---------------------------------------------------------------- resumen
const line = '-'.repeat(60);
console.log(line);
console.log('Validación de flujo.html');
console.log(line);
console.log(`Pasos: ${stats.pasos} · carriles: ${LANES.length} · almacenes: ${stats.almacenes} · notas: ${stats.notas}`);
console.log(`Temas: ${stats.temas} (${stats.temasRequeridos} de la tabla + apoyo CIV + 5 del rol docente)`);
console.log(`Archivos en el árbol: ${stats.archivos} · ${stats.lineasTotales.toLocaleString('es-MX')} líneas`);
console.log(`Referencias verificadas: ${refStats.archivos} archivos/símbolos, ${refStats.notas} notas, ${refStats.pruebas} casos de prueba`);
console.log(`Endpoints verificados contra index.php: ${stats.endpoints} (de ${stats.rutas} rutas registradas)`);
console.log(`Scripts inline: ${stats.scripts} · tamaño: ${stats.kb} KB`);
console.log(line);
if (errors.length) {
  console.log(`FALLÓ: ${errors.length} problema(s)`);
  errors.slice(0, 80).forEach((e) => console.log('  ✘ ' + e));
  if (errors.length > 80) console.log(`  … y ${errors.length - 80} más`);
  process.exit(1);
}
console.log('OK: flujo.html es coherente con el código.');
