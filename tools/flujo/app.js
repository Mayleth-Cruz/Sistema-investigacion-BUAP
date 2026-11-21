/* ---------- utilidades ---------- */
const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
function store(key, value) {
  try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); } catch (e) {}
  return null;
}
function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in (attrs || {})) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ICON = {
  play: '<svg class="i" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg><span>Reproducir</span>',
  pause: '<svg class="i" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg><span>Pausar</span>',
  sun: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg class="i" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  copy: '<svg class="i" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  ok: '<svg class="i" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
};

let toastTimer = null;
function toast(msg, bad) {
  const t = $("toast");
  t.textContent = msg; t.classList.toggle("bad", !!bad); t.classList.add("on");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), bad ? 3600 : 2000);
}
function copyText(text) {
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    ta.remove();
    return ok;
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true, () => fallback());
  }
  return Promise.resolve(fallback());
}
/* Botones con data-copy: copian y avisan. */
function enlazarCopiar(root) {
  root.querySelectorAll("[data-copy]").forEach((b) => {
    b.onclick = async (e) => {
      e.stopPropagation();
      const ok = await copyText(b.dataset.copy);
      toast(ok ? "Copiado: " + b.dataset.copy.split("\n")[0].slice(0, 70) : "No se pudo copiar", !ok);
      if (b.classList.contains("cp") || b.classList.contains("cpc")) {
        b.innerHTML = ok ? ICON.ok : "×";
        setTimeout(() => (b.innerHTML = ICON.copy), 1400);
      }
    };
  });
}
/* Filas de archivo / prueba: clic o Enter copian ruta:línea. */
function enlazarFilas(root) {
  root.querySelectorAll(".fa[data-copy]").forEach((a) => {
    a.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); a.click(); } });
  });
}

$("eEstrategia").textContent = EJE.estrategia;
$("eObjetivo").textContent = "Objetivo: " + EJE.objetivo;

/* ---------- tema ---------- */
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  store("si3-theme", t);
  $("btnTheme").innerHTML = t === "dark" ? ICON.sun : ICON.moon;
  $("btnTheme").setAttribute("aria-label", t === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
}
$("btnTheme").onclick = () => applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
applyTheme(document.documentElement.getAttribute("data-theme"));

/* ---------- geometría del diagrama ---------- */
const W = 890, NODE_W = 150, NODE_H = 32, TOP = 58, PITCH = STEPS.length > 24 ? 38 : STEPS.length > 17 ? 42 : 46;
const LANE_X = [88, 254, 420, 586];
const STORE_X = 800, STORE_W = 170, STORE_H = 30;
const H = TOP + (STEPS.length - 1) * PITCH + 44;
const nodePos = STEPS.map((s, i) => ({ x: LANE_X[s.lane], y: TOP + i * PITCH }));
const storeY = (k) => TOP + k * ((H - TOP - 52) / (STORES.length - 1));
const storePos = Object.fromEntries(STORES.map((s, k) => [s.id, { x: STORE_X, y: storeY(k) }]));

const svg = $("svg");
svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
const defs = el("defs", {}, svg);
const marker = el("marker", { id: "arr", viewBox: "0 0 8 8", refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: "auto" }, defs);
el("path", { d: "M0 0 L8 4 L0 8 z", fill: "context-stroke" }, marker);

LANES.forEach((name, k) => {
  el("rect", { class: "lane", x: LANE_X[k] - 80, y: 4, width: 160, height: H - 8, rx: 12 }, svg);
  el("text", { class: "lane-h", x: LANE_X[k], y: 28 }, svg).textContent = name.split(" · ")[0];
});
el("text", { class: "lane-h", x: STORE_X, y: 28 }, svg).textContent = "Datos";

const edgeEls = STEPS.map((s, i) => {
  if (i === STEPS.length - 1 || STEPS[i + 1].error) return null;
  const a = nodePos[i], b = nodePos[i + 1];
  const y1 = a.y + NODE_H / 2, y2 = b.y - NODE_H / 2 - 2, ym = (y1 + y2) / 2;
  const d = a.x === b.x ? `M${a.x} ${y1} V${y2}` : `M${a.x} ${y1} V${ym} H${b.x} V${y2}`;
  return el("path", { class: "edge", d, "marker-end": "url(#arr)" }, svg);
});

const storeEls = {};
STORES.forEach((s) => {
  const p = storePos[s.id];
  const g = el("g", { class: "store" }, svg);
  el("rect", { x: p.x - STORE_W / 2, y: p.y - STORE_H / 2, width: STORE_W, height: STORE_H, rx: 9 }, g);
  el("text", { x: p.x, y: p.y }, g).textContent = s.label;
  storeEls[s.id] = g;
});

const linkLayer = el("g", {}, svg);
const nodeEls = STEPS.map((s, i) => {
  const p = nodePos[i];
  const g = el("g", { class: "node" + (s.error ? " err" : ""), tabindex: 0, role: "button", "aria-label": `Paso ${i + 1}: ${s.title}` }, svg);
  el("title", {}, g).textContent = s.title;
  el("rect", { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2, width: NODE_W, height: NODE_H, rx: 10 }, g);
  el("text", { class: "num", x: p.x - NODE_W / 2 + 12, y: p.y }, g).textContent = i + 1;
  el("text", { x: p.x + 8, y: p.y }, g).textContent = s.short;
  const right = p.x + NODE_W / 2 - 4;
  if (s.ia) el("circle", { class: "badge-ia", cx: right, cy: p.y - NODE_H / 2 + 3, r: 5.5 }, g);
  if (s.http) el("circle", { class: "badge-http", cx: right - (s.ia ? 14 : 0), cy: p.y - NODE_H / 2 + 3, r: 5.5 }, g);
  g.addEventListener("click", () => go(i, true));
  g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(i, true); } });
  return g;
});

const halo = el("rect", { class: "halo", rx: 12, width: NODE_W + 8, height: NODE_H + 8 }, svg);
const token = el("circle", { class: "token", r: 5, cx: 0, cy: 0 }, svg);

/* ---------- barra de pasos ---------- */
const track = $("track");
STEPS.forEach((s, i) => {
  const b = document.createElement("button");
  b.title = `${i + 1}. ${s.title}`; b.setAttribute("role", "tab"); b.setAttribute("aria-label", `Paso ${i + 1}: ${s.title}`);
  if (s.error) b.classList.add("err");
  b.onclick = () => go(i, true);
  track.appendChild(b);
});

/* ---------- panel del flujo ---------- */
const TABS = [["resumen", "Resumen"], ["datos", "Datos"], ["codigo", "Código"]];
let tab = store("si3-tab") || "resumen";
if (!TABS.some((t) => t[0] === tab)) tab = "resumen";
let cur = -1, prevCaso = null, timer = null, view = "flujo";

const GRUPOS_ARCH = [["Frontend", (p) => p.startsWith("frontend/")], ["Backend", (p) => p.startsWith("backend/")]];
const storeLabel = (id) => (STORES.find((x) => x.id === id) || { label: id }).label;

/* Fila de archivo citado: clic copia ruta:línea. */
const fileRow = (f) => `
  <div class="f"><div class="fa" role="button" tabindex="0" data-copy="${esc(f.path)}:${f.line}" title="${esc(f.path)}:${f.line} — copiar ruta">
    <span class="fn mono">${esc(f.symbol)}<span class="ln">L${f.line}</span></span><span class="fd">${esc(f.desc)}</span><span class="fd mono">${esc(f.path)}</span></div>
    <button class="cp" data-copy="${esc(f.path)}:${f.line}" aria-label="Copiar ruta de ${esc(f.symbol)}" title="Copiar ruta">${ICON.copy}</button></div>`;
function filesByGroup(list) {
  return GRUPOS_ARCH.map(([name, test]) => {
    const l = list.filter((f) => test(f.path));
    return l.length ? `<p class="group">${name}</p><div class="files">${l.map(fileRow).join("")}</div>` : "";
  }).join("");
}
const codeBox = (text) => `<div class="codebox"><pre>${esc(text)}</pre><button class="cpc" data-copy="${esc(text)}" aria-label="Copiar" title="Copiar">${ICON.copy}</button></div>`;

function renderHead(i) {
  const s = STEPS[i];
  const pills = [`<span class="stepno">Paso ${i + 1} de ${STEPS.length}</span>`, `<span class="pill">${esc(LANES[s.lane].split(" · ")[0])}</span>`];
  if (s.http) pills.push(`<span class="pill http mono">${esc(s.http)}</span>`);
  if (s.ia) pills.push(`<span class="pill ia">IA</span>`);
  if (s.error) pills.push(`<span class="pill err">error</span>`);
  $("head").innerHTML = `<div class="meta">${pills.join("")}</div><h2>${esc(s.title)}</h2>`;
  $("tabs").innerHTML = TABS.map(([id, label]) =>
    `<button role="tab" data-tab="${id}" aria-selected="${id === tab}">${label}${id === "codigo" ? `<span class="n">${s.files.length}</span>` : ""}</button>`).join("");
  $("tabs").querySelectorAll("button").forEach((b) => (b.onclick = () => setTab(b.dataset.tab)));
}
function bodyResumen(s) {
  const ia = s.ia ? `<div class="iabox"><b>Con modelo real</b><p>${esc(s.ia.real)}</p><b>En modo demo</b><p>${esc(s.ia.demo)}</p></div>` : "";
  return `<p class="lead">${esc(s.what)}</p><ul class="b">${s.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>${ia}`;
}
function bodyDatos(s, c) {
  const rows = CASO_FIELDS.map(([k, label]) => {
    const v = c[k], changed = prevCaso && prevCaso[k] !== v;
    return `<div class="r"><span class="k mono">${esc(label)}</span><span class="v ${v == null ? "null" : ""} ${changed ? "flash" : ""}">${v == null ? "—" : esc(v)}</span></div>`;
  }).join("");
  const pct = c.progreso < 0 ? 100 : c.progreso;
  const touches = s.touches.length
    ? `<div class="chips">${s.touches.map((t) => `<span class="chip mono">${esc(storeLabel(t.store))}<b>${t.mode}</b></span>`).join("")}</div>`
    : `<p class="none">Este paso no lee ni escribe tablas.</p>`;
  const cols = s.touches.map((t) => STORES.find((x) => x.id === t.store)).filter((x) => x && x.cols)
    .map((x) => `<li><code>${esc(x.label)}</code>: ${esc(x.cols)}</li>`).join("");
  const colsHtml = cols ? `<p class="hint" style="margin-top:8px">Columnas relevantes</p><ul class="b">${cols}</ul>` : "";
  return `
    <div class="sec"><h3>Qué viaja</h3><pre>${esc(s.data)}</pre></div>
    <div class="sec"><h3>Datos que toca</h3>${touches}${colsHtml}</div>
    <div class="sec"><h3>Estado de la sesión y del artículo en este momento</h3>
      <div class="meter" role="progressbar" aria-label="Avance del recorrido" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="${c.progreso < 0 ? "err" : ""}" style="width:${pct}%"></div></div>
      <div class="caso"><div class="r"><span class="k mono">progreso</span><span class="v">${c.progreso < 0 ? "error" : c.progreso + " %"}</span></div>${rows}</div>
      <p class="hint" style="margin-top:8px">Ejemplo con la base demo (administrador y docente). Los números salen de ejecutar la API real.</p></div>`;
}
function bodyCodigo(s) {
  return filesByGroup(s.files);
}
function renderBody(i, animate) {
  const s = STEPS[i];
  const html = tab === "resumen" ? bodyResumen(s) : tab === "datos" ? bodyDatos(s, s.caso) : bodyCodigo(s);
  const b = $("body");
  b.innerHTML = `<div class="${animate ? "fade" : ""}">${html}</div>`;
  b.scrollTop = 0;
  enlazarCopiar(b); enlazarFilas(b);
}
function setTab(t) {
  tab = t; store("si3-tab", t);
  $("tabs").querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === t));
  renderBody(cur, true);
}

function drawLinks(i) {
  linkLayer.innerHTML = "";
  Object.values(storeEls).forEach((g) => g.classList.remove("lit"));
  const p = nodePos[i];
  STEPS[i].touches.forEach((t) => {
    const sp = storePos[t.store];
    storeEls[t.store].classList.add("lit");
    const x1 = p.x + NODE_W / 2, x2 = sp.x - STORE_W / 2, xm = (x1 + x2) / 2;
    el("path", { class: "link", d: `M${x1} ${p.y} C${xm} ${p.y} ${xm} ${sp.y} ${x2} ${sp.y}` }, linkLayer);
    el("text", { class: "mode", x: x2 - 7, y: sp.y - 11 }, linkLayer).textContent = t.mode;
  });
}

function go(i, user) {
  i = Math.max(0, Math.min(STEPS.length - 1, i));
  if (user === true && timer) stop();
  const prev = cur; cur = i;
  nodeEls.forEach((g, k) => { g.classList.toggle("cur", k === i); g.classList.toggle("done", k < i && !STEPS[k].error); });
  edgeEls.forEach((p, k) => { if (p) p.classList.toggle("done", k < i); });
  if (!reduced && prev === i - 1 && edgeEls[prev] && edgeEls[prev].animate) {
    const p = edgeEls[prev], len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 550, easing: "ease-out" }).onfinish = () => (p.style.strokeDasharray = "");
  }
  [...track.children].forEach((b, k) => {
    b.classList.toggle("cur", k === i); b.classList.toggle("done", k < i && !STEPS[k].error);
    b.setAttribute("aria-selected", k === i);
  });
  const p = nodePos[i];
  token.style.transform = `translate(${p.x - NODE_W / 2 - 12}px, ${p.y}px)`;
  token.classList.toggle("err", !!STEPS[i].error);
  halo.setAttribute("x", p.x - NODE_W / 2 - 4); halo.setAttribute("y", p.y - NODE_H / 2 - 4);
  halo.style.stroke = STEPS[i].error ? "var(--err)" : "var(--ink)";
  drawLinks(i);
  renderHead(i); renderBody(i, user !== "init");
  prevCaso = STEPS[i].caso;
  $("counter").textContent = `${i + 1} / ${STEPS.length}`;
  $("prev").disabled = i === 0; $("next").disabled = i === STEPS.length - 1;
  if (view === "flujo") { try { history.replaceState(null, "", "#paso=" + (i + 1)); } catch (e) {} }
}

function play() {
  if (timer) return stop();
  if (cur >= STEPS.length - 1) go(0);
  $("play").innerHTML = ICON.pause;
  const tick = () => {
    if (cur >= STEPS.length - 1) return stop();
    go(cur + 1);
    timer = setTimeout(tick, 5200 / parseFloat($("speed").value));
  };
  timer = setTimeout(tick, 2400 / parseFloat($("speed").value));
}
function stop() { clearTimeout(timer); timer = null; $("play").innerHTML = ICON.play; }

$("prev").onclick = () => go(cur - 1, true);
$("next").onclick = () => go(cur + 1, true);
$("play").onclick = play;
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = document.activeElement.tagName;
  if (["INPUT", "SELECT", "TEXTAREA"].includes(tag) || document.querySelector("dialog[open]")) return;
  if (view === "archivos") return;
  if (view === "eje3") {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); selTema(eCur + 1, true); }
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); selTema(eCur - 1, true); }
    else if (["1", "2", "3"].includes(e.key)) setETab(ETABS[Number(e.key) - 1][0]);
    return;
  }
  if (e.key === "ArrowRight") { e.preventDefault(); go(cur + 1, true); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); go(cur - 1, true); }
  else if (e.key === " " && tag !== "BUTTON" && !document.activeElement.classList.contains("node")) { e.preventDefault(); play(); }
  else if (["1", "2", "3"].includes(e.key)) setTab(TABS[Number(e.key) - 1][0]);
});

/* ---------- diálogo de notas ---------- */
$("notesN").textContent = NOTES.length;
$("notes").innerHTML = NOTES.map((n) => `<details><summary>${n.title}</summary><p>${n.body}</p>
  <p><button class="cbtn mono" data-copy="${esc(n.path)}:${n.line}" title="Copiar ruta">${esc(n.symbol)} · L${n.line}</button></p></details>`).join("");
enlazarCopiar($("notes"));
const openDlg = (id) => { const d = $(id); if (d.showModal) d.showModal(); else d.setAttribute("open", ""); };
$("btnNotes").onclick = () => openDlg("dlgNotes");
document.querySelectorAll("dialog").forEach((d) => {
  d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
  d.querySelector("[data-close]").onclick = () => d.close();
});

/* ==================== vista Archivos: árbol anotado ==================== */
let archSel = null;
function usosDe(path) {
  const pasos = [], temas = [], notas = [];
  STEPS.forEach((s, i) => s.files.filter((f) => f.path === path).forEach((f) => pasos.push({ i, f })));
  TOPICS.forEach((t, i) => {
    t.files.filter((f) => f.path === path).forEach((f) => temas.push({ i, f, kind: "código" }));
    t.tests.filter((x) => x.path === path).forEach((x) => temas.push({ i, f: { symbol: x.name, line: x.line }, kind: "prueba" }));
  });
  NOTES.forEach((n) => { if (n.path === path) notas.push(n); });
  return { pasos, temas, notas };
}
function renderArbol() {
  const q = $("aFilter").value.trim().toLowerCase();
  const lista = ARCHIVOS.filter((a) => !q || a.path.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q));
  const raiz = { dirs: {}, files: [] };
  lista.forEach((a) => {
    let n = raiz;
    a.path.split("/").slice(0, -1).forEach((d) => (n = n.dirs[d] || (n.dirs[d] = { dirs: {}, files: [] })));
    n.files.push(a);
  });
  const cuenta = (n) => n.files.length + Object.values(n.dirs).reduce((s, d) => s + cuenta(d), 0);
  const nombre = (a) => a.path.split("/").pop();
  const fila = (a) => `<div class="tf${archSel === a.path ? " on" : ""}" role="button" tabindex="0" data-path="${esc(a.path)}" title="${esc(a.path)}">
      <span class="tfm"><span class="mono">${esc(nombre(a))}</span><span class="tfd">${esc(a.desc)}</span></span>
      <span class="n">${a.lines}</span>
      <button class="cpb" data-copy="${esc(a.path)}" aria-label="Copiar ruta de ${esc(nombre(a))}" title="Copiar ruta">${ICON.copy}</button></div>`;
  const pinta = (n) => Object.keys(n.dirs).sort().map((d) =>
    `<details open><summary><span>${esc(d)}/</span><span class="n">${cuenta(n.dirs[d])}</span></summary>${pinta(n.dirs[d])}</details>`).join("") +
    n.files.sort((a, b) => nombre(a).localeCompare(nombre(b))).map(fila).join("");
  $("aTree").innerHTML = lista.length ? pinta(raiz) : `<div class="cempty"><p>Ningún archivo coincide con «${esc(q)}».</p></div>`;
  const total = lista.reduce((s, a) => s + a.lines, 0);
  $("aCount").textContent = `${lista.length} archivos · ${total.toLocaleString("es-MX")} líneas` + (q ? " (filtrado)" : " · backend y frontend");
  enlazarCopiar($("aTree"));
  $("aTree").querySelectorAll(".tf").forEach((r) => {
    r.onclick = () => selArchivo(r.dataset.path, true);
    r.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === r) { e.preventDefault(); selArchivo(r.dataset.path, true); } });
  });
}
function selArchivo(path, scroll) {
  archSel = path;
  $("aTree").querySelectorAll(".tf").forEach((r) => r.classList.toggle("on", r.dataset.path === path));
  const a = ARCHIVOS.find((x) => x.path === path);
  const u = usosDe(path);
  const lado = path.startsWith("frontend/") ? "frontend" : path.startsWith("backend/") ? "backend" : "raíz";
  const usos = [];
  u.pasos.forEach((x) => usos.push(`<button class="uso" data-go="paso" data-i="${x.i}"><span><b>Paso ${x.i + 1}</b> · ${esc(STEPS[x.i].short)}</span><span class="mono">${esc(x.f.symbol)} · L${x.f.line}</span></button>`));
  u.temas.forEach((x) => usos.push(`<button class="uso" data-go="tema" data-i="${x.i}"><span><b>Eje 3</b> · ${esc(TOPICS[x.i].titulo)}</span><span class="mono">${x.kind}: ${esc(x.f.symbol)} · L${x.f.line}</span></button>`));
  u.notas.forEach((n) => usos.push(`<button class="uso" data-go="notas"><span><b>Nota</b> · ${esc(n.title)}</span><span class="mono">${esc(n.symbol)} · L${n.line}</span></button>`));
  $("aDet").innerHTML = `<div class="head"><div class="meta"><span class="pill">${lado}</span><span class="pill mono">${a.lines} líneas</span>${usos.length ? `<span class="pill http">${usos.length} ${usos.length === 1 ? "cita" : "citas"}</span>` : ""}</div><h2 class="mono" style="font-size:18px;overflow-wrap:anywhere">${esc(path.split("/").pop())}</h2></div>
    <div class="body"><div class="fade">
      <p class="lead">${esc(a.desc)}</p>
      <div class="sec"><h3>Ruta</h3>${codeBox(path)}</div>
      <div class="sec"><h3>Dónde se cita en esta guía</h3>${usos.length ? `<div class="usos">${usos.join("")}</div>` : `<p class="none">Ningún paso, tema o nota cita este archivo.</p>`}</div>
    </div></div>`;
  enlazarCopiar($("aDet"));
  $("aDet").querySelectorAll(".uso").forEach((b) => (b.onclick = () => {
    if (b.dataset.go === "paso") { setView("flujo"); go(Number(b.dataset.i), true); setTab("codigo"); }
    else if (b.dataset.go === "tema") { setView("eje3"); selTema(Number(b.dataset.i), true); setETab("hecho"); }
    else openDlg("dlgNotes");
  }));
  if (scroll && matchMedia("(max-width: 999px)").matches) $("aDet").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}
$("aFilter").addEventListener("input", renderArbol);

/* ==================== vista Eje 3: requisito → implementación ==================== */
let eCur = 0;
const ETABS = [["pide", "Qué piden"], ["hecho", "Cómo está hecho"], ["probar", "Cómo probarlo"]];
let eTab = store("si3-etab") || "pide";
if (!ETABS.some((t) => t[0] === eTab)) eTab = "pide";
const grupoDe = (id) => GRUPOS.find((g) => g.id === id);
const ACCESO = { A: ["admin [A]", ""], P: ["público [P]", "http"], D: ["docente [D]", "doc"] };

function renderLista() {
  $("eList").innerHTML = GRUPOS.map((g) => {
    const items = TOPICS.map((t, i) => [t, i]).filter(([t]) => t.grupo === g.id);
    if (!items.length) return "";
    return `<div class="lgroup"><i style="background:${g.color}"></i>${g.id}<span>${esc(g.nota)}</span></div>` +
      items.map(([t, i]) => `<button class="cx" role="tab" data-i="${i}" aria-selected="false">
        <span class="cn">${i + 1}</span><span class="ct">${esc(t.titulo)}</span><span class="cm">${esc(t.endpoints[0])} · ${esc(t.tablas.slice(0, 2).join(", "))}</span></button>`).join("");
  }).join("");
  $("eList").querySelectorAll(".cx").forEach((b) => (b.onclick = () => selTema(Number(b.dataset.i), true)));
  $("eTrack").innerHTML = "";
  TOPICS.forEach((t, i) => {
    const b = document.createElement("button");
    b.title = `${i + 1}. ${t.titulo}`; b.setAttribute("role", "tab"); b.setAttribute("aria-label", `Tema ${i + 1}: ${t.titulo}`);
    b.onclick = () => selTema(i, true);
    $("eTrack").appendChild(b);
  });
}
function ePide(t) {
  const g = grupoDe(t.grupo), [aLabel] = ACCESO[t.acceso];
  return `<p class="lead">${t.pide}</p>
    <div class="nota db"><b>${esc(EJE.estrategia)}</b><p>Objetivo: ${esc(EJE.objetivo)}</p></div>
    <div class="sec"><h3>Cómo se interpretó</h3><div class="nota"><b>Decisión de implementación</b><p>${t.interp}</p></div></div>
    <div class="sec"><h3>En una mirada</h3><div class="caso">
      <div class="r"><span class="k">Función</span><span class="v">${esc(t.grupo)}</span></div>
      <div class="r"><span class="k">Acceso</span><span class="v">${esc(aLabel)}</span></div>
      <div class="r"><span class="k">Endpoints</span><span class="v">${t.endpoints.length}</span></div>
      <div class="r"><span class="k">Tablas</span><span class="v mono">${esc(t.tablas.join(", "))}</span></div>
      <div class="r"><span class="k">Pruebas</span><span class="v">${t.tests.length}</span></div></div></div>`;
}
function eHecho(t) {
  const ep = t.endpoints.map((e) => `<span class="chip mono">${esc(e)}</span>`).join("");
  const tb = t.tablas.map((x) => `<span class="chip mono">${esc(x)}</span>`).join("");
  return `<div class="sec"><h3>Endpoints</h3><div class="chips">${ep}</div></div>
    <div class="sec"><h3>Tablas</h3><div class="chips">${tb}</div></div>
    <div class="sec"><h3>Regla o consulta que calcula la cifra</h3><ul class="b">${t.regla.map((b) => `<li>${b}</li>`).join("")}</ul></div>
    <div class="sec"><h3>Pantalla</h3><ul class="b">${t.pantalla.map((b) => `<li>${b}</li>`).join("")}</ul></div>
    <div class="sec"><h3>Archivos</h3>${filesByGroup(t.files)}</div>`;
}
function eProbar(t) {
  const aviso = t.acceso === "A" ? "Este endpoint exige administrador." : t.acceso === "D" ? "Este endpoint exige un docente con sesión (sin contraseña temporal pendiente); los de administración usan el token de arriba." : "Lectura pública: no necesita token.";
  const docente = t.acceso === "D";
  const rows = (list) => `<div class="files">${list.map((x) => `
    <div class="f"><div class="fa" role="button" tabindex="0" data-copy="${esc(x.path)}:${x.line}" title="${esc(x.path)}:${x.line} — copiar ruta">
      <span class="fn">${esc(x.name)}<span class="ln">L${x.line}</span></span><span class="fd mono">${esc(x.path)}</span></div>
      <button class="cp" data-copy="${esc(x.path)}:${x.line}" aria-label="Copiar ruta de la prueba" title="Copiar ruta">${ICON.copy}</button></div>`).join("")}</div>`;
  const be = t.tests.filter((x) => x.path.startsWith("backend/")), fe = t.tests.filter((x) => x.path.startsWith("frontend/"));
  return `<div class="sec"><h3>1 · Con la API en marcha (<code>bash run.sh</code>), obtén un token</h3>${codeBox(docente ? LOGIN_DOC_CMD + "\n\n# y, si hace falta un endpoint de administración:\n" + LOGIN_CMD.split("\n").slice(1).join("\n") : LOGIN_CMD)}<p class="hint">${aviso} Las contraseñas demo (administrador y docente) están en <code>guia.md</code>.</p></div>
    <div class="sec"><h3>2 · Llama al endpoint</h3>${codeBox(t.curl)}</div>
    <div class="sec"><h3>Qué debe responder</h3><p class="paso-p">${t.esperado}</p></div>
    <div class="sec"><h3>Casos de prueba que lo cubren</h3>
      ${be.length ? `<p class="group">Backend · <code>php backend/tests/run.php</code></p>${rows(be)}` : ""}
      ${fe.length ? `<p class="group">Frontend · <code>cd frontend &amp;&amp; npm test</code></p>${rows(fe)}` : ""}</div>`;
}
function renderEBody(animate) {
  const t = TOPICS[eCur];
  const html = eTab === "pide" ? ePide(t) : eTab === "hecho" ? eHecho(t) : eProbar(t);
  const b = $("eBody");
  b.innerHTML = `<div class="${animate ? "fade" : ""}">${html}</div>`;
  b.scrollTop = 0;
  enlazarCopiar(b); enlazarFilas(b);
}
function renderEHead() {
  const t = TOPICS[eCur], g = grupoDe(t.grupo), [aLabel, aCls] = ACCESO[t.acceso];
  const pills = [`<span class="stepno">Tema ${eCur + 1} de ${TOPICS.length}</span>`, `<span class="pill ${g.cls}">${esc(t.grupo)}</span>`, `<span class="pill ${aCls}">${esc(aLabel)}</span>`];
  $("eHead").innerHTML = `<div class="meta">${pills.join("")}</div><h2>${esc(t.titulo)}</h2>`;
  $("eTabs").innerHTML = ETABS.map(([id, label]) =>
    `<button role="tab" data-tab="${id}" aria-selected="${id === eTab}">${label}${id === "hecho" ? `<span class="n">${t.files.length}</span>` : id === "probar" ? `<span class="n">${t.tests.length}</span>` : ""}</button>`).join("");
  $("eTabs").querySelectorAll("button").forEach((b) => (b.onclick = () => setETab(b.dataset.tab)));
}
function setETab(t) {
  eTab = t; store("si3-etab", t);
  $("eTabs").querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === t));
  renderEBody(true);
}
function selTema(i, user) {
  eCur = Math.max(0, Math.min(TOPICS.length - 1, i));
  const L = $("eList");
  L.querySelectorAll(".cx").forEach((b) => {
    const on = Number(b.dataset.i) === eCur;
    b.setAttribute("aria-selected", on);
    if (on && (b.offsetTop < L.scrollTop || b.offsetTop + b.offsetHeight > L.scrollTop + L.clientHeight)) {
      L.scrollTop = b.offsetTop - L.clientHeight / 3;
    }
  });
  [...$("eTrack").children].forEach((b, k) => { b.classList.toggle("cur", k === eCur); b.classList.toggle("done", k < eCur); b.setAttribute("aria-selected", k === eCur); });
  renderEHead(); renderEBody(!!user);
  $("eCounter").textContent = `${eCur + 1} / ${TOPICS.length}`;
  if (view === "eje3") { try { history.replaceState(null, "", "#tema=" + (eCur + 1)); } catch (e) {} }
}

/* ---------- vistas ---------- */
const TITULOS = {
  flujo: ["SI3 · flujo del sistema", "Del portal al maestro que registra su proyecto, la revisión y los indicadores del Eje 3, paso a paso"],
  eje3: ["SI3 · Eje 3", "Qué pide la tabla del Eje 3, cómo está hecho y el rol docente que se le suma"],
  archivos: ["SI3 · archivos", "Backend y frontend por carpeta, con su propósito y tamaño"],
};
function setView(v) {
  view = v;
  document.body.dataset.view = v;
  store("si3-view", v);
  $("vFlujo").setAttribute("aria-pressed", v === "flujo");
  $("vEje").setAttribute("aria-pressed", v === "eje3");
  $("vArch").setAttribute("aria-pressed", v === "archivos");
  $("title").textContent = TITULOS[v][0];
  $("tagline").textContent = TITULOS[v][1];
  document.title = TITULOS[v][0];
  if (v !== "flujo") stop();
  try {
    history.replaceState(null, "", v === "archivos" ? "#archivos" : v === "eje3" ? "#tema=" + (eCur + 1) : "#paso=" + (cur + 1));
  } catch (e) {}
  if (v === "eje3") selTema(eCur, false);
  if (v === "archivos" && !archSel) selArchivo((ARCHIVOS.find((a) => a.path === "backend/public/index.php") || ARCHIVOS[0]).path, false);
}
$("vFlujo").onclick = () => setView("flujo");
$("vEje").onclick = () => setView("eje3");
$("vArch").onclick = () => setView("archivos");

renderLista();
renderArbol();

const hashInicial = location.hash;
stop();
const m = hashInicial.match(/paso=(\d+)/);
go(m ? Number(m[1]) - 1 : 0, "init");
const mc = hashInicial.match(/tema=(\d+)/);
if (mc) eCur = Math.max(0, Math.min(TOPICS.length - 1, Number(mc[1]) - 1));
const vistaGuardada = store("si3-view");
setView(hashInicial === "#archivos" ? "archivos" : mc ? "eje3" : m ? "flujo"
  : (["eje3", "archivos"].includes(vistaGuardada) ? vistaGuardada : "flujo"));
