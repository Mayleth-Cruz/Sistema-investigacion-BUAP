import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { ROOT, MISSING } from './lib.mjs';
import { STEPS, LANES, STORES, CASO_FIELDS } from './steps.mjs';
import { TOPICS, EJE, GRUPOS, LOGIN_CMD, LOGIN_DOC_CMD } from './topics.mjs';
import { NOTES } from './notes.mjs';
import { archivos } from './archivos.mjs';

if (MISSING.length) {
  console.error(`No se pudieron resolver ${MISSING.length} referencias (el código cambió o el generador está desfasado):`);
  [...new Set(MISSING)].forEach((m) => console.error('  - ' + m));
  process.exit(1);
}
const HERE = new URL('.', import.meta.url).pathname;
const base = fs.readFileSync(HERE + 'base.css', 'utf8').split('\n');
// líneas (1-based, de base.css) que se eliminan: .set, .srv-note, visor de código, .cbtn.., wrap
const drop = new Set();
const rng = (a, b) => { for (let i = a; i <= b; i++) drop.add(i); };
rng(177, 179); rng(187, 189); rng(235, 280); rng(289, 291); rng(367 + 1, 368); // 368 = </style>
rng(328, 332); rng(335, 335); rng(362, 365);
rng(297, 297);
let css = base.filter((_, i) => !drop.has(i + 1)).join('\n');
css = css
  .replaceAll('body[data-view="entrevista"]', 'body[data-view="eje3"]')
  .replaceAll('body:not([data-view="entrevista"])', 'body:not([data-view="eje3"])')
  .replace('.f a {', '.f .fa {')
  .replace('/* ---------- vista entrevista ---------- */', '/* ---------- vista Eje 3 ---------- */')
  .replace('/* ---------- vista archivos: árbol de los .py del proyecto ---------- */', '/* ---------- vista archivos: árbol anotado ---------- */')
  .replace('main.arch, main.arch.split { grid-template-columns: clamp(280px, 26vw, 360px) minmax(0, 1fr); }', 'main.arch { grid-template-columns: clamp(320px, 32vw, 460px) minmax(0, 1fr); }')
  .replace('main.split, main.arch, main.arch.split { grid-template-columns: 1fr; }', 'main.arch { grid-template-columns: 1fr; }')
  .replace('    .archhint { display: none; }\n', '')
  .replace(/\.archhint \{[^}]*\}\n/, '');
css += `
  /* ---------- añadidos de esta página ---------- */
  .f .fa { text-align: left; background: transparent; border: 0; cursor: pointer; font: inherit; color: inherit; }
  .f .fa:focus-visible { outline-offset: -2px; border-radius: 10px; }
  .f .fd + .fd { margin-top: 2px; opacity: .85; }
  .cbtn { border: 1px solid var(--line2); background: var(--bg); border-radius: 10px; min-height: 34px; padding: 4px 12px; display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; }
  .cbtn:hover { background: var(--soft); }
  .arbol .tf { align-items: flex-start; cursor: pointer; padding-right: 4px; }
  .tf .tfm { flex: 1; min-width: 0; display: grid; gap: 1px; }
  .tf .tfm > .mono { overflow-wrap: anywhere; }
  .tf .tfd { color: var(--mute); font-size: 12px; font-weight: 400; line-height: 1.4; }
  .arbol .tf .n { margin-left: 0; padding-top: 2px; }
  .tf .cpb { flex: none; width: 30px; height: 30px; border: 0; background: transparent; color: var(--mute); border-radius: 8px; display: grid; place-items: center; }
  .tf .cpb:hover { color: var(--ink); background: var(--bg); }
  .archdet .head { padding: 18px 20px 0; }
  .archdet .body { flex: 1; min-height: 0; overflow: auto; padding: 16px 20px 20px; scrollbar-width: thin; }
  .usos { display: grid; gap: 6px; }
  .uso { text-align: left; border: 1px solid var(--line); border-radius: 10px; background: transparent; padding: 9px 12px; font-size: 13px; display: grid; gap: 1px; }
  .uso:hover { border-color: var(--ink); background: var(--soft); }
  .uso .mono { color: var(--mute); font-size: 12px; overflow-wrap: anywhere; }
  .codebox { position: relative; margin-top: 2px; }
  .codebox pre { white-space: pre; overflow-x: auto; word-break: normal; font-size: 12.3px; line-height: 1.55; padding-right: 46px; color: var(--ink); scrollbar-width: thin; }
  .codebox .cpc { position: absolute; top: 6px; right: 6px; width: 30px; height: 30px; border: 1px solid var(--line2); border-radius: 8px; background: var(--bg); color: var(--mute); display: grid; place-items: center; }
  .codebox .cpc:hover { color: var(--ink); }
  .paso-p { margin: 8px 0; color: var(--ink2); font-size: 13.5px; }
  .chip.mono { font-size: 12px; }
  .pill.doc { border-color: var(--ink); color: var(--ink); }
  .logo { letter-spacing: -.02em; }
  h3 code, .group code { text-transform: none; letter-spacing: 0; }
  @media (max-width: 999px), (max-height: 559px) { .archdet { min-height: 260px; } .arbol .lbody { overflow: visible; } }
</style>`;
css = css.replace(/<\/style>\s*<\/style>$/, '</style>').replace(/<\/style>$/, '');

let arch = archivos();
const data = {
  STEPS, LANES, STORES, CASO_FIELDS, NOTES, EJE, GRUPOS, TOPICS, LOGIN_CMD, LOGIN_DOC_CMD, ARCHIVOS: arch,
};
const dataJs = Object.entries(data).map(([k, v]) => `const ${k} = ${JSON.stringify(v, null, 1)};`).join('\n');
const app = fs.readFileSync(HERE + 'app.js', 'utf8');
let html = fs.readFileSync(HERE + 'template.html', 'utf8');
html = html.replace('/*@CSS@*/', () => css).replace('/*@DATA@*/', () => dataJs).replace('/*@APP@*/', () => app);
if (html.includes('</script>') && (dataJs.includes('</script') || app.includes('</script'))) throw new Error('</script> dentro de datos');
fs.writeFileSync(ROOT + '/flujo.html', html);
for (let pass = 0; pass < 3; pass++) {
  const again = archivos();
  if (JSON.stringify(again) === JSON.stringify(arch)) break;
  arch = again;
  const d2 = Object.entries({ STEPS, LANES, STORES, CASO_FIELDS, NOTES, EJE, GRUPOS, TOPICS, LOGIN_CMD, LOGIN_DOC_CMD, ARCHIVOS: arch }).map(([k, v]) => `const ${k} = ${JSON.stringify(v, null, 1)};`).join('\n');
  html = fs.readFileSync(HERE + 'template.html', 'utf8').replace('/*@CSS@*/', () => css).replace('/*@DATA@*/', () => d2).replace('/*@APP@*/', () => app);
  fs.writeFileSync(ROOT + '/flujo.html', html);
}
console.log('flujo.html', html.split('\n').length, 'líneas;', STEPS.length, 'pasos;', TOPICS.length, 'temas;', arch.length, 'archivos');
