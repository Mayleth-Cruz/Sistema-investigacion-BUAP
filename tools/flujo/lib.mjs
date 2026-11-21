import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** Raíz del repositorio (tools/flujo/../..). */
export const ROOT = path.resolve(HERE, '..', '..');
/** Respuestas reales de la API guardadas como ejemplos (ver README.md). */
export const EX = path.join(HERE, 'ex');

const cache = new Map();
export function lines(p) {
  if (!cache.has(p)) {
    const txt = fs.readFileSync(path.join(ROOT, p), 'utf8');
    cache.set(p, txt.split('\n'));
  }
  return cache.get(p);
}
export function countLines(p) {
  const txt = fs.readFileSync(path.join(ROOT, p), 'utf8');
  if (txt === '') return 0;
  return txt.split('\n').length - (txt.endsWith('\n') ? 1 : 0);
}

/** Línea (1-based) de la n-ésima línea que contiene `needle`. Falla si no existe. */
export function loc(p, needle, nth = 1) {
  const ls = lines(p);
  let seen = 0;
  for (let i = 0; i < ls.length; i++) {
    if (ls[i].includes(needle)) { seen++; if (seen === nth) return i + 1; }
  }
  // No se aborta en el primer fallo: se acumulan todos para que build.mjs los reporte juntos.
  MISSING.push(`${p} → «${needle}» (#${nth})`);
  return 1;
}
/** Símbolos que no se encontraron al resolver líneas (build.mjs falla si hay alguno). */
export const MISSING = [];

/** Entrada de archivo citado. */
export const S = (p, needle, symbol, desc, nth = 1) => ({ path: p, symbol, line: loc(p, needle, nth), desc });
/** Caso de prueba citado. */
export const T = (p, needle, name, nth = 1) => ({ path: p, line: loc(p, needle, nth), name });

export function ex(name) { return JSON.parse(fs.readFileSync(path.join(EX, name + '.json'), 'utf8')); }

/** Recorta un JSON para mostrarlo: n elementos por arreglo, cadenas largas con «…». */
export function trim(x, n = 1, len = 56) {
  if (Array.isArray(x)) {
    const out = x.slice(0, n).map((i) => trim(i, n, len));
    if (x.length > n) out.push('…');
    return out;
  }
  if (x && typeof x === 'object') {
    const o = {};
    for (const k of Object.keys(x)) o[k] = trim(x[k], n, len);
    return o;
  }
  if (typeof x === 'string' && x.length > len) return x.slice(0, len - 1) + '…';
  return x;
}
export const J = (x, n = 1, len = 56) => JSON.stringify(trim(x, n, len), null, 2);
export function pick(o, keys) { const r = {}; for (const k of keys) if (k in o) r[k] = o[k]; return r; }
