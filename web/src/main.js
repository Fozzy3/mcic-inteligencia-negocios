// Prezi-style engine: every .frame lives on one big canvas (#world) and the camera flies between them.
import "./style.css";
import gsap from "gsap";
import { iniciarFondo } from "./fondo.js";
import { graficos } from "./graficos.js";
import { escenas } from "./tres.js";

const W = 1600, H = 900;
const CAPITULOS = ["Inicio", "Los datos", "Limpieza", "KPI", "Decisión", "A la nube", "Cierre"];
const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

const stage = document.getElementById("stage");
const world = document.getElementById("world");
const parallax = document.getElementById("parallax");

const frames = [...document.querySelectorAll(".frame")].map((el) => ({
  el,
  id: el.id,
  x: +el.dataset.x,
  y: +el.dataset.y,
  s: +(el.dataset.s || 1),
  r: +(el.dataset.r || 0),
  cap: +el.dataset.cap,
  titulo: el.dataset.titulo,
  pasos: Math.max(0, ...[...el.querySelectorAll("[data-paso]")].map((p) => +p.dataset.paso), (graficos[el.dataset.grafico] || {}).pasos || 0),
  modulo: graficos[el.dataset.grafico] || escenas[el.dataset.tres] || null,
}));

for (const f of frames) {
  f.el.style.transformOrigin = "50% 50%";
  f.el.style.transform = `translate(${f.x - W / 2}px, ${f.y - H / 2}px) rotate(${f.r}deg) scale(${f.s})`;
}

// ---------- camera ----------
const cam = { x: 0, y: 0, z: 1, r: 0 };
const fondo = iniciarFondo(document.getElementById("fondo"));

function vista() {
  return { w: innerWidth, h: innerHeight - 120 }; // room for the HUD bars
}

function encuadre(f) {
  const v = vista();
  const z = Math.min(v.w / (W * f.s), v.h / (H * f.s)) * 0.96;
  return { x: f.x, y: f.y + 6 / z, z, r: f.r };
}

function encuadreGeneral() {
  const xs = frames.flatMap((f) => [f.x - (W * f.s) / 2, f.x + (W * f.s) / 2]);
  const ys = frames.flatMap((f) => [f.y - (H * f.s) / 2, f.y + (H * f.s) / 2]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const v = vista();
  const z = Math.min(v.w / (x1 - x0 + 600), v.h / (y1 - y0 + 600));
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z, r: 0 };
}

function aplicar() {
  const { x, y, z, r } = cam;
  world.style.transform = `translate(${innerWidth / 2}px, ${innerHeight / 2}px) scale(${z}) rotate(${-r}deg) translate(${-x}px, ${-y}px)`;
  const d = 0.45; // parallax depth of the chapter numerals
  parallax.firstElementChild.style.transform = `translate(${innerWidth / 2}px, ${innerHeight / 2}px) scale(${z * d}) rotate(${-r * d}deg) translate(${-x}px, ${-y}px)`;
  fondo.camara(cam);
}

let vuelo = null;
function volar(dest, duracion) {
  vuelo?.kill();
  const a = { ...cam };
  const dist = Math.hypot(dest.x - a.x, dest.y - a.y);
  const medio = Math.sqrt(a.z * dest.z);
  // Prezi move: if both frames don't fit at the geometric mid-zoom, zoom out on the way.
  const ambos = innerWidth / (dist + W * 1.4);
  const caida = Math.min(1, ambos / medio);
  let dr = dest.r - a.r;
  dr = ((dr + 540) % 360) - 180;
  const p = { t: 0 };
  const dur = reducido ? 0.01 : duracion ?? Math.min(2.2, 0.9 + dist / 5000 + Math.abs(Math.log(a.z / dest.z)) * 0.25);
  world.classList.add("moviendo");
  vuelo = gsap.to(p, {
    t: 1,
    duration: dur,
    ease: "power2.inOut",
    onUpdate() {
      const t = p.t;
      cam.x = a.x + (dest.x - a.x) * t;
      cam.y = a.y + (dest.y - a.y) * t;
      cam.r = a.r + dr * t;
      cam.z = Math.exp(Math.log(a.z) + (Math.log(dest.z) - Math.log(a.z)) * t) * Math.pow(caida, Math.sin(Math.PI * t));
      aplicar();
    },
    onComplete() {
      world.classList.remove("moviendo");
    },
  });
}

// ---------- state ----------
let actual = -1;
let paso = 0;
let general = false;

function mostrarPasos(f, n, animar = true) {
  for (const el of f.el.querySelectorAll("[data-paso]")) {
    const ver = +el.dataset.paso <= n;
    gsap.to(el, { autoAlpha: ver ? 1 : 0, y: ver ? 0 : 18, duration: animar && !reducido ? 0.55 : 0, ease: "power3.out", overwrite: true });
  }
  f.modulo?.paso?.(f.el, n);
}

function ir(i, { pasoInicial = 0 } = {}) {
  i = Math.max(0, Math.min(frames.length - 1, i));
  salirGeneral(false);
  const f = frames[i];
  if (i !== actual) {
    const prev = frames[actual];
    if (prev) {
      prev.el.classList.remove("activo");
      prev.modulo?.salir?.(prev.el);
    }
    actual = i;
    f.el.classList.add("activo");
    paso = Math.min(pasoInicial, f.pasos);
    mostrarPasos(f, paso, false);
    f.modulo?.entrar?.(f.el, paso);
    contar(f.el);
    history.replaceState(null, "", "#" + f.id);
  }
  volar(encuadre(f));
  actualizarHud();
}

function siguiente() {
  if (general) return ir(Math.max(actual, 0));
  const f = frames[actual];
  if (paso < f.pasos) {
    paso += 1;
    mostrarPasos(f, paso);
    actualizarHud();
  } else ir(actual + 1);
}

function anterior() {
  if (general) return ir(Math.max(actual, 0));
  if (actual === 0) return;
  ir(actual - 1, { pasoInicial: 99 });
}

function entrarGeneral() {
  general = true;
  document.body.classList.add("vista-general");
  volar(encuadreGeneral(), 1.6);
  actualizarHud();
}
function salirGeneral(volver = true) {
  if (!general) return;
  general = false;
  document.body.classList.remove("vista-general");
  if (volver) ir(actual);
}

// ---------- HUD ----------
const pista = document.querySelector("[data-pista]");
const porCap = CAPITULOS.map((_, c) => frames.filter((f) => f.cap === c));
pista.innerHTML = porCap.map((fs, c) => `<button class="seg" style="--n:${fs.length}" data-cap="${c}" aria-label="${CAPITULOS[c]}"><i></i><span>${CAPITULOS[c]}</span></button>`).join("");
pista.addEventListener("click", (e) => {
  const seg = e.target.closest(".seg");
  if (seg) ir(frames.indexOf(porCap[+seg.dataset.cap][0]));
});

function actualizarHud() {
  const f = frames[actual];
  document.querySelector("[data-hud-cap]").textContent = general ? "Vista general" : f.cap > 0 && f.cap < 6 ? `Paso ${f.cap} · ${CAPITULOS[f.cap]}` : CAPITULOS[f.cap];
  document.querySelector("[data-hud-titulo]").textContent = general ? "Haz clic en un marco" : f.titulo + (f.pasos ? `  ·  ${paso}/${f.pasos}` : "");
  document.querySelector("[data-contador]").textContent = `${String(actual + 1).padStart(2, "0")} / ${frames.length}`;
  document.querySelector("[data-nota]").textContent = f.el.querySelector(".nota")?.textContent ?? "";
  pista.querySelectorAll(".seg").forEach((seg, c) => {
    const fs = porCap[c];
    const hechos = fs.filter((x) => frames.indexOf(x) <= actual).length;
    seg.querySelector("i").style.transform = `scaleX(${hechos / fs.length})`;
    seg.classList.toggle("actual", c === f.cap);
  });
}

// ---------- number counters ----------
const fmtMiles = (n) => Math.round(n).toLocaleString("de-DE");
const FORMATOS = {
  pct1: (v) => v.toFixed(1).replace(".", ",") + " %",
  pct0: (v) => Math.round(v) + " %",
  eur: (v) => "€" + fmtMiles(v),
  dec3: (v) => v.toFixed(3).replace(".", ","),
};
function contar(raiz) {
  for (const el of raiz.querySelectorAll("[data-cuenta], [data-valor]")) {
    const fin = +(el.dataset.cuenta ?? el.dataset.valor);
    const fmt = el.dataset.cuenta ? fmtMiles : FORMATOS[el.dataset.fmt];
    const o = { v: 0 };
    gsap.to(o, { v: fin, duration: reducido ? 0 : 1.6, ease: "power2.out", delay: 0.3, onUpdate: () => (el.textContent = fmt(o.v)) });
  }
}

// ---------- world decorations: islands, route, parallax numerals ----------
function decorar() {
  const svg = document.getElementById("ruta");
  const NS = "http://www.w3.org/2000/svg";
  let html = "";
  const numerales = [];
  porCap.forEach((fs, c) => {
    if (c === 0 || c === 6 || !fs.length) return;
    const pad = 260;
    const x0 = Math.min(...fs.map((f) => f.x - (W * f.s) / 2)) - pad;
    const x1 = Math.max(...fs.map((f) => f.x + (W * f.s) / 2)) + pad;
    const y0 = Math.min(...fs.map((f) => f.y - (H * f.s) / 2)) - pad - 200;
    const y1 = Math.max(...fs.map((f) => f.y + (H * f.s) / 2)) + pad;
    html += `<rect class="isla" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="120"/>`;
    html += `<text class="isla-nombre" x="${x0 + 120}" y="${y0 + 260}">${c} · ${CAPITULOS[c]}</text>`;
    numerales.push({ c, x: (x0 + x1) / 2, y: (y0 + y1) / 2 });
  });
  // Smooth route through frame centres (Catmull-Rom as cubic Béziers).
  const pts = frames.map((f) => [f.x, f.y]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1} ${c2} ${p2}`;
  }
  html += `<path class="camino" d="${d}"/>`;
  svg.innerHTML = html;
  svg.setAttribute("xmlns", NS);

  const capa = document.createElement("div");
  capa.style.cssText = "position:absolute;left:0;top:0;transform-origin:0 0";
  capa.innerHTML = numerales.map((n) => `<div class="numeral" style="left:${n.x - 1100}px;top:${n.y - 1300}px;font-size:2600px">0${n.c}</div>`).join("");
  parallax.appendChild(capa);
}

// ---------- glossary ----------
const GLOSARIO = [
  ["Inteligencia de negocios", "dato → decisión", "pregunta"],
  ["OLTP vs OLAP", "registrar vs analizar", "grano"],
  ["Grano", "qué es una fila", "grano"],
  ["Calidad de datos", "15 reglas", "reglas"],
  ["Linaje / auditoría", "el original no se toca", "c2"],
  ["Medidas aditivas", "qué se puede sumar", "trampa2"],
  ["Fuga de información", "datos del futuro", "trampa3"],
  ["Esquema estrella", "hechos y dimensiones", "estrella"],
  ["Dimensión basura", "dim_perfil", "estrella"],
  ["Dimensión compartida", "fecha y canal", "estrella"],
  ["ELT", "SQL dentro del motor", "flujo"],
  ["KPI", "métrica con objetivo", "c3"],
  ["Cubo OLAP", "slice · dice · drill", "cubo"],
  ["Rendimientos decrecientes", "saturación de Ads", "saturacion"],
  ["Regresión logística", "curva en S", "modelo"],
  ["Razón de odds", "efecto de cada palanca", "modelo"],
  ["Validación temporal", "probar con el futuro", "validacion"],
  ["Lift / AUC", "¿ordena bien?", "validacion"],
  ["Contrafactual", "¿y si hubiéramos…?", "montecarlo"],
  ["Bootstrap", "200 re-entrenos", "montecarlo"],
  ["Monte Carlo", "10.000 escenarios", "montecarlo"],
  ["Sensibilidad", "umbral de €84 mil", "sensibilidad"],
  ["Data lake / warehouse", "raw, curado, estrella", "c5"],
  ["Orquestación", "Step Functions", "aws"],
];
document.querySelector("[data-glosario]").innerHTML = GLOSARIO.map(([t, s, id]) => `<button data-ir="${id}"><b>${t}</b><span>${s}</span></button>`).join("");

// ---------- input ----------
function porId(id) {
  return frames.findIndex((f) => f.id === id);
}

document.addEventListener("click", (e) => {
  const boton = e.target.closest("[data-accion], [data-ir]");
  if (boton) {
    e.stopPropagation();
    const a = boton.dataset.accion;
    if (boton.dataset.ir === "mapa" || a === "mapa") return general ? salirGeneral() : entrarGeneral();
    if (boton.dataset.ir) return ir(porId(boton.dataset.ir));
    if (a === "siguiente") siguiente();
    if (a === "anterior") anterior();
    if (a === "notas") document.getElementById("notas").hidden ^= true;
    if (a === "ayuda") document.getElementById("ayuda").hidden ^= true;
    if (a === "pantalla") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
    return;
  }
  const frame = e.target.closest(".frame");
  if (frame && (general || !frame.classList.contains("activo"))) ir(frames.findIndex((f) => f.el === frame));
});

document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea")) return;
  const k = e.key;
  if (["ArrowRight", "PageDown", " ", "Enter"].includes(k)) { e.preventDefault(); siguiente(); }
  else if (["ArrowLeft", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); anterior(); }
  else if (k === "ArrowDown") { e.preventDefault(); siguiente(); }
  else if (k === "ArrowUp") { e.preventDefault(); anterior(); }
  else if (k === "o" || k === "O" || k === "Escape") general ? salirGeneral() : k !== "Escape" && entrarGeneral();
  else if (k === "n" || k === "N") document.getElementById("notas").hidden ^= true;
  else if (k === "f" || k === "F") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
  else if (k === "?") document.getElementById("ayuda").hidden ^= true;
  else if (k === "Home") ir(0);
  else if (k === "End") ir(frames.length - 1);
  else if (/^[1-5]$/.test(k)) ir(frames.findIndex((f) => f.cap === +k));
});

// Wheel / trackpad: one gesture = one step.
let acumulado = 0, bloqueo = 0;
stage.addEventListener("wheel", (e) => {
  if (e.target.closest(".lienzo")) return; // 3D canvases zoom themselves
  e.preventDefault();
  const ahora = performance.now();
  if (ahora < bloqueo) return;
  acumulado += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  if (Math.abs(acumulado) > 50) {
    acumulado > 0 ? siguiente() : anterior();
    acumulado = 0;
    bloqueo = ahora + 750;
  }
}, { passive: false });

let toque = null;
stage.addEventListener("touchstart", (e) => {
  toque = e.target.closest(".lienzo, input") ? null : [e.touches[0].clientX, e.touches[0].clientY];
}, { passive: true });
stage.addEventListener("touchend", (e) => {
  if (!toque) return;
  const dx = e.changedTouches[0].clientX - toque[0], dy = e.changedTouches[0].clientY - toque[1];
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 50) (Math.abs(dx) > Math.abs(dy) ? dx : dy) < 0 ? siguiente() : anterior();
  toque = null;
});

addEventListener("resize", () => {
  if (general) {
    Object.assign(cam, encuadreGeneral());
  } else Object.assign(cam, encuadre(frames[actual]));
  aplicar();
});

// ---------- boot ----------
decorar();
for (const f of frames) f.modulo?.montar?.(f.el);
for (const f of frames) mostrarPasos(f, 0, false);
const inicio = Math.max(0, porId(location.hash.slice(1)));
Object.assign(cam, encuadreGeneral());
aplicar();
setTimeout(() => ir(inicio), reducido ? 0 : 400);

// Handy from the console while presenting: presentacion.ir("matriz"), presentacion.ir("aws", 3).
window.presentacion = { ir: (id, n = 0) => ir(porId(id), { pasoInicial: n }), siguiente, anterior, marcos: frames.map((f) => f.id) };

// Intro: title lines rise in.
gsap.from(".portada .linea", { yPercent: 110, opacity: 0, duration: 1.2, stagger: 0.12, ease: "expo.out", delay: 0.8 });

