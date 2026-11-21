#!/usr/bin/env node
/**
 * Prueba de mutación del validador: rompe flujo.html de varias maneras (en una COPIA temporal, nunca en
 * el original) y comprueba que tests/validar_flujo.mjs lo detecta.
 *
 *   node tools/flujo/mutaciones.mjs        (desde la raíz; antes: node tools/flujo/build.mjs)
 *
 * Sale con código 1 si el HTML sin tocar no pasa (control) o si alguna mutación NO es detectada.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib.mjs';

const original = fs.readFileSync(path.join(ROOT, 'flujo.html'), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'si3-mut-'));
const file = path.join(tmp, 'flujo.html');

function validar(html) {
  fs.writeFileSync(file, html);
  const r = spawnSync('node', [path.join(ROOT, 'tests/validar_flujo.mjs')], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, FLUJO_HTML: file } });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}
/** Reemplaza con una regex y falla si la mutación no cambió nada (sería una prueba vacía). */
const sub = (re, repl) => (html) => {
  const out = html.replace(re, repl);
  if (out === html) throw new Error(`la mutación no encontró su objetivo: ${re}`);
  return out;
};
/** Reemplaza la primera coincidencia de `re` que aparece DESPUÉS del texto `after`. */
const subAfter = (after, re, repl) => (html) => {
  const i = html.indexOf(after);
  if (i < 0) throw new Error(`no se encontró ${after}`);
  const head = html.slice(0, i), tail = html.slice(i);
  const out = tail.replace(re, repl);
  if (out === tail) throw new Error(`la mutación no encontró su objetivo después de ${after}: ${re}`);
  return head + out;
};

const MUTACIONES = [
  ['carril inválido en un paso', sub(/("id": "cuentas",\s*"lane": )2/, '$19'), /carril inválido/],
  ['endpoint inexistente en un paso', sub(/"http": "POST \/api\/docente\/proyectos\/:id\/enviar"/, '"http": "POST /api/docente/proyectos/:id/enviarr"'), /no existe en index\.php|debería tener http/],
  ['endpoint inexistente en el texto de un tema', sub(/POST \/api\/eje3\/usuarios-docentes\/:id\/restablecer"/, 'POST /api/eje3/usuarios-docentes/:id/reiniciar"'), /no existe en index\.php/],
  ['línea fuera del archivo', sub(/("symbol": "AuthController::checkDocente",\s*"line": )\d+/, '$199999'), /está fuera de/],
  ['línea que ya no apunta al símbolo', sub(/("symbol": "AuthController::changePassword",\s*"line": )\d+/, '$11'), /no aparece en/],
  ['almacén inexistente en touches', sub(/"store": "apartados"/, '"store": "apartadosX"'), /almacén inexistente/],
  ['paso del rol docente eliminado', sub(/"id": "password"/, '"id": "passwordX"'), /Falta el paso «password»/],
  ['paso «enviar» eliminado', sub(/"id": "enviar"/, '"id": "enviarX"'), /Falta el paso «enviar»/],
  ['pasos fuera de orden lógico (docedit ↔ enviar)', (h) => h.replace('"id": "docedit"', '"id": "@@"').replace('"id": "enviar"', '"id": "docedit"').replace('"id": "@@"', '"id": "enviar"'), /fuera del orden lógico/],
  ['estado de registro acumulado incorrecto', subAfter('"id": "enviar"', /"registro": "enviado"/, '"registro": "aprobado"'), /caso\.registro del paso «enviar»/],
  ['acceso de un tema docente cambiado', sub(/("id": "doc-espacio",\s*"grupo": "Rol docente",\s*"acceso": )"D"/, '$1"P"'), /debería marcarse \[D\]/],
  ['tema del rol docente renombrado', sub(/"titulo": "Cuentas de docentes"/, '"titulo": "Cuentas"'), /debería llamarse/],
  ['conteo de rutas desactualizado', sub(/Registra \d+ rutas/, 'Registra 70 rutas'), /El HTML dice 70 rutas/],
  ['SCHEMA_VERSION desactualizada', sub(/(SCHEMA_VERSION<\/code> \(hoy <strong>)3/, '$12'), /SCHEMA_VERSION 2/],
  ['archivo del árbol inexistente', sub(/"path": "tools\/flujo\/build\.mjs"/, '"path": "tools/flujo/buildX.mjs"'), /no existe/],
  ['recurso externo', (h) => h.replace('</body>', '<a href="https://example.com/x">x</a></body>'), /externas/],
  ['contraseña temporal en claro', (h) => h.replace('</body>', '<pre>"password_temporal": "Abcdefgh2345"</pre></body>'), /password_temporal en claro/],
];
// Contraseña demo de guia.md filtrada al HTML (solo si guia.md las trae)
{
  const guia = fs.existsSync(path.join(ROOT, 'guia.md')) ? fs.readFileSync(path.join(ROOT, 'guia.md'), 'utf8') : '';
  const pw = (/`admin@buap\.mx`\s*\/\s*`([^`]+)`/.exec(guia) || [])[1];
  if (pw) MUTACIONES.push(['contraseña demo en el HTML', (h) => h.replace('</body>', `<pre>${pw}</pre></body>`), /contraseña demo/]);
}

let fallos = 0;
const control = validar(original);
console.log(`control (sin mutar): ${control.code === 0 ? 'OK, el validador pasa' : 'FALLA'}`);
if (control.code !== 0) { console.log(control.out.split('\n').filter((l) => l.includes('✘')).slice(0, 8).join('\n')); fallos++; }

for (const [nombre, mutar, esperado] of MUTACIONES) {
  let r;
  try { r = validar(mutar(original)); } catch (e) { console.log(`  ✘ ${nombre}: ${e.message}`); fallos++; continue; }
  const lineas = r.out.split('\n').filter((l) => l.includes('✘'));
  const detectada = r.code === 1 && lineas.some((l) => esperado.test(l));
  console.log(`  ${detectada ? '✔' : '✘'} ${nombre}${detectada ? `  →  ${lineas.find((l) => esperado.test(l)).trim().slice(0, 110)}` : `  (NO detectada; código ${r.code}; ${lineas[0] || 'sin errores'})`}`);
  if (!detectada) fallos++;
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fallos ? `\n${fallos} problema(s): el validador dejó pasar mutaciones.` : `\nOK: las ${MUTACIONES.length} mutaciones fueron detectadas.`);
process.exit(fallos ? 1 : 0);
