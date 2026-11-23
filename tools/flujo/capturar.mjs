#!/usr/bin/env node
/**
 * Captura las respuestas REALES de la API que flujo.html muestra como ejemplos (carpeta ex/).
 *
 *   node tools/flujo/capturar.mjs        (desde la raíz del repositorio)
 *
 * Qué hace:
 *  1. Copia backend/src/Database/database.sqlite a una carpeta temporal (la BD versionada NO se toca).
 *  2. Levanta `php -S` en un puerto libre con SI3_SQLITE_PATH apuntando a la copia
 *     (DB_DRIVER=sqlite, así que no intenta MySQL). La copia se migra sola al esquema actual.
 *  3. Ejecuta el recorrido completo: portal, login, cuentas de docentes, cambio de contraseña,
 *     proyectos del docente, revisión y los paneles que solo cuentan lo aprobado.
 *  4. Guarda cada respuesta en tools/flujo/ex/<nombre>.json, con el token y la contraseña
 *     temporal enmascarados, y mata el servidor.
 *
 * Las contraseñas demo se leen de guia.md (o de FLUJO_ADMIN_PASS / FLUJO_DOCENTE_PASS);
 * nunca se escriben en los ejemplos.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { ROOT, EX } from './lib.mjs';

const guia = fs.readFileSync(path.join(ROOT, 'guia.md'), 'utf8');
const fromGuia = (correo) => (new RegExp('`' + correo.replace('.', '\\.') + '`\\s*/\\s*`([^`]+)`').exec(guia) || [])[1];
const ADMIN_PASS = process.env.FLUJO_ADMIN_PASS || fromGuia('admin@buap.mx');
const DOCENTE_PASS = process.env.FLUJO_DOCENTE_PASS || fromGuia('investigador@buap.mx');
if (!ADMIN_PASS || !DOCENTE_PASS) { console.error('No se encontraron las contraseñas demo en guia.md (ni en FLUJO_*_PASS).'); process.exit(1); }
const NUEVA = 'Clave-Nueva-2026';

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  s.on('error', reject);
});

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'si3-flujo-'));
const dbCopy = path.join(tmp, 'copia.sqlite');
fs.copyFileSync(path.join(ROOT, 'backend/src/Database/database.sqlite'), dbCopy);
const port = await freePort();
const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', 'backend/public', 'backend/public/router.php'], {
  cwd: ROOT, stdio: 'ignore',
  env: { ...process.env, SI3_SQLITE_PATH: dbCopy, DB_DRIVER: 'sqlite', DB_HOST: '127.0.0.1', DB_PORT: '1', APP_DEBUG: '' },
});
const cleanup = () => { try { php.kill('SIGKILL'); } catch { /* ya terminó */ } fs.rmSync(tmp, { recursive: true, force: true }); };
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));

const BASE = `http://127.0.0.1:${port}/api`;
async function call(method, url, { token, body } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* sin cuerpo JSON */ }
  return { status: res.status, json };
}
for (let i = 0; ; i++) {
  try { await fetch(`${BASE}/publicaciones`); break; } catch { if (i > 50) throw new Error('php -S no arrancó'); await new Promise((r) => setTimeout(r, 200)); }
}

const out = {};
/** Guarda la respuesta (enmascarada) y comprueba el código HTTP esperado. */
function keep(name, r, expected) {
  if (r.status !== expected) throw new Error(`${name}: se esperaba HTTP ${expected} y llegó ${r.status}: ${JSON.stringify(r.json).slice(0, 300)}`);
  const masked = JSON.parse(JSON.stringify(r.json, (k, v) => {
    if (k === 'token' && typeof v === 'string') return '<64 caracteres hex>';
    if (k === 'password_temporal' && typeof v === 'string') return '•'.repeat(v.length);
    return v;
  }));
  out[name] = masked;
  return r.json;
}

// ---- portal público
let r = await call('GET', '/publicaciones?search=transformer&estado=publicado');
keep('busqueda', r, 200);
r = await call('POST', '/publicaciones/1/vista'); keep('vista', r, 200);
r = await call('POST', '/publicaciones/1/descarga'); keep('descarga', r, 200);

// ---- administrador
r = await call('POST', '/auth/login', { body: { correo: 'admin@buap.mx', password: ADMIN_PASS } });
const admin = keep('login', r, 200).data.token;
keep('err401', await call('GET', '/eje3/catalogos'), 401);
keep('err400', await call('POST', '/eje3/proyectos', { token: admin, body: {} }), 400);
keep('catalogos', await call('GET', '/eje3/catalogos', { token: admin }), 200);

// ---- cuentas de docentes (admin)
const cuentas = (await call('GET', '/eje3/usuarios-docentes', { token: admin })).json.data;
const docentes = (await call('GET', '/eje3/docentes', { token: admin })).json.data;
const libre = docentes.find((d) => !cuentas.some((c) => c.investigador_id === d.id));
if (!libre) throw new Error('No hay un docente sin cuenta en la copia de la BD.');
const creada = keep('cuenta_crear', await call('POST', '/eje3/usuarios-docentes', { token: admin, body: { investigador_id: libre.id } }), 201).data;
keep('cuenta_duplicada', await call('POST', '/eje3/usuarios-docentes', { token: admin, body: { investigador_id: libre.id } }), 409);
keep('cuentas_lista', await call('GET', '/eje3/usuarios-docentes', { token: admin }), 200);

// ---- primer ingreso: contraseña temporal
const temp = creada.password_temporal; // en claro solo aquí; keep() la enmascara al guardar
r = await call('POST', '/auth/login', { body: { correo: creada.correo, password: temp } });
const tTemp = keep('login_temporal', r, 200).data.token;
keep('gate', await call('GET', '/docente/resumen', { token: tTemp }), 403);
keep('me_temporal', await call('GET', '/auth/me', { token: tTemp }), 200);
keep('cambiar_password', await call('POST', '/auth/cambiar-password', { token: tTemp, body: { actual: temp, nueva: NUEVA } }), 200);
keep('cambiar_password_mala', await call('POST', '/auth/cambiar-password', { token: tTemp, body: { actual: 'incorrecta', nueva: NUEVA + 'x' } }), 400);

// ---- docente demo: resumen con proyectos en los 4 estados
r = await call('POST', '/auth/login', { body: { correo: 'investigador@buap.mx', password: DOCENTE_PASS } });
const demo = keep('login_docente', r, 200).data.token;
keep('resumen', await call('GET', '/docente/resumen', { token: demo }), 200);
keep('docente_lista', await call('GET', '/docente/proyectos', { token: demo }), 200);
const demoList = out.docente_lista.data;
const ajeno = (await call('GET', '/eje3/proyectos', { token: admin })).json.data.find((p) => !demoList.some((d) => d.id === p.id));
keep('proy_ajeno', await call('GET', `/docente/proyectos/${ajeno.id}`, { token: demo }), 404);
keep('admin_en_docente', await call('GET', '/docente/resumen', { token: admin }), 403);
keep('docente_en_admin', await call('GET', '/eje3/catalogos', { token: demo }), 403);
keep('token_falso', await call('GET', '/docente/resumen', { token: 'f'.repeat(64) }), 401);

// ---- el docente nuevo registra un proyecto
const tNuevo = (await call('POST', '/auth/login', { body: { correo: creada.correo, password: NUEVA } })).json.data.token;
const dif = (await call('GET', '/eje3/difusion')).json.data;
const evento = dif.semilleros[0];
const antesViz = (await call('GET', '/eje3/visualizar', { token: admin })).json.data;
const antesDif = JSON.stringify(dif);
const nuevo = keep('proy_crear', await call('POST', '/docente/proyectos', { token: tNuevo, body: {
  titulo: 'Semillero de finanzas personales para jóvenes', tipo: 'semillero', evento_id: evento.id,
  resumen: 'Talleres para que estudiantes de licenciatura aprendan a planear su presupuesto.',
  linea_investigacion: 'Educación financiera',
  apartados: [{ apartado: 'Planteamiento del problema', contenido: 'Pocos jóvenes llevan un presupuesto.' }, { apartado: 'Metodología', contenido: 'Talleres y encuestas.' }],
} }), 201).data;
keep('proy_editar', await call('PUT', `/docente/proyectos/${nuevo.id}`, { token: tNuevo, body: { titulo: 'Semillero de finanzas personales para jóvenes universitarios' } }), 200);
// un borrador incompleto no se puede enviar
const incompleto = (await call('POST', '/docente/proyectos', { token: tNuevo, body: { titulo: 'Borrador sin resumen', tipo: 'investigacion' } })).json.data;
keep('enviar_incompleto', await call('POST', `/docente/proyectos/${incompleto.id}/enviar`, { token: tNuevo }), 400);
keep('proy_enviar', await call('POST', `/docente/proyectos/${nuevo.id}/enviar`, { token: tNuevo }), 200);
keep('proy_bloqueado', await call('PUT', `/docente/proyectos/${nuevo.id}`, { token: tNuevo, body: { titulo: 'Intento de cambio' } }), 409);
keep('enviar_otra_vez', await call('POST', `/docente/proyectos/${nuevo.id}/enviar`, { token: tNuevo }), 409);

// ---- revisión del administrador
keep('revision_lista', await call('GET', '/eje3/revision', { token: admin }), 200);
keep('revision_sin_comentario', await call('POST', `/eje3/proyectos/${nuevo.id}/revision`, { token: admin, body: { accion: 'devolver' } }), 400);
keep('monitoreo_antes', await call('GET', '/eje3/monitoreo', { token: admin }), 200);
keep('revision_aprobar', await call('POST', `/eje3/proyectos/${nuevo.id}/revision`, { token: admin, body: { accion: 'aprobar', comentario: 'Aprobado: cumple con los apartados.' } }), 200);
keep('revision_repetida', await call('POST', `/eje3/proyectos/${nuevo.id}/revision`, { token: admin, body: { accion: 'aprobar' } }), 409);

// ---- solo lo aprobado cuenta
keep('monitoreo', await call('GET', '/eje3/monitoreo', { token: admin }), 200);
keep('visualizar', await call('GET', '/eje3/visualizar', { token: admin }), 200);
keep('difusion', await call('GET', '/eje3/difusion'), 200);
out.meta = {
  evento_id: evento.id, proyecto_id: nuevo.id, docente_id: libre.id,
  visualizar_proyectos_antes: antesViz.totales.proyectos, visualizar_proyectos_despues: out.visualizar.data.totales.proyectos,
  difusion_cambio: antesDif !== JSON.stringify((await call('GET', '/eje3/difusion')).json.data),
  total_rutas_ok: true,
};

// ---- restablecer: nueva temporal, cierra sesiones y obliga a cambiarla
keep('cuenta_restablecer', await call('POST', `/eje3/usuarios-docentes/${creada.id}/restablecer`, { token: admin }), 200);
keep('sesion_cerrada', await call('GET', '/docente/resumen', { token: tNuevo }), 401);

fs.mkdirSync(EX, { recursive: true });
for (const [name, body] of Object.entries(out)) fs.writeFileSync(path.join(EX, name + '.json'), JSON.stringify(body, null, 2) + '\n');
console.log(`Guardados ${Object.keys(out).length} ejemplos en tools/flujo/ex/ (puerto ${port}, copia ${path.basename(dbCopy)}).`);
cleanup();
