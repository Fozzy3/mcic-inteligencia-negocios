// Comparador de opciones: un reloj comparador (dial indicator) que mide cada opción contra un bloque patrón.
// Adaptado del ejemplo dial-indicator de la skill Anatomy (https://github.com/wheresryan22/anatomy, MIT).
// La altura de cada bloque sale de salidas/montecarlo_resumen.csv vía web/src/datos.json.
// Run: node anatomy/build.mjs  ->  public/anatomy/comparador.html
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "public", "anatomy");
const kitScript = () => readFileSync(join(HERE, "kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");
const datos = JSON.parse(readFileSync(join(HERE, "..", "src", "datos.json"), "utf8"));

const NOMBRES = { product: "Producto nuevo", funnel: "Mejorar la página de compra", webinar: "Webinars", ads: "Duplicar publicidad" };
const OPCIONES = [
  { clave: "ref", nombre: "Bloque patrón: no hacer nada", utilidad: 0, riesgo: null },
  ...datos.montecarlo.map((m) => ({ clave: m.clave, nombre: NOMBRES[m.clave], utilidad: m.utilidad_esperada_eur, riesgo: m.prob_perdida })),
];

const WIDTH = 600;
const HEIGHT = 380;

const EUR_PER_UNIT = 25000; // 1 unidad de altura = €25 mil de ganancia extra esperada
const H0 = 10; // altura del bloque patrón (ganancia extra = 0)
const PER_TURN = 16; // una vuelta de la aguja = 16 unidades = €400 mil
const BLOCKS = OPCIONES.map((o) => H0 + o.utilidad / EUR_PER_UNIT);

const PLATE = { x: -80, y: -64, w: 262, d: 128, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const MAG = { x: -66, y: -20, w: 44, d: 40, r: 3 };
const MAG_H = 24;
const POST = [-52, 0];
const POST_TOP = 122;
const CLAMP_Z = 100;

const DIAL = [70, 0];
const DIAL_R = 20;
const DIAL_Z = 82;
const DIAL_H = 10;
const DIAL_TOP = DIAL_Z + DIAL_H;

const RAIL_FROM = -12;
const RAIL_TO = 158;
const CARRIAGE = { x: -28, y: -24, w: 88, d: 48, r: 3 };
const CARRIAGE_Z = 3;
const CARRIAGE_TOP = 8;
const BLOCK_W = 15.6;
const STEP = 16;
const TIP_R = 2.6;
const CENTRE = -24 + BLOCK_W / 2;
const STOPS = BLOCKS.map((_, index) => DIAL[0] - CENTRE - STEP * index);
const REACH = [STOPS[STOPS.length - 1] - 3, STOPS[0] + 3];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [POST[0], POST[1], POST_TOP + 2], [DIAL[0] + DIAL_R, 0, DIAL_TOP]],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 42 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -62, y: PLATE.y + PLATE.d - 15, w: 226, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  return out.join("");
}

function rails() {
  const out = [];
  for (const y of [-20, 15]) {
    out.push(S(k.slabOf({ x: RAIL_FROM, y, w: RAIL_TO - RAIL_FROM, d: 5, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(D([RAIL_FROM + 6, RAIL_TO - 6].map((x) => at([x, y + 2.5, 3])), { size: 0.4 }));
  }
  for (const x of [RAIL_FROM - 5, RAIL_TO]) {
    out.push(S(k.slabOf({ x, y: -23, w: 5, d: 46, r: 1.2 }, 0, 7, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2.5, -18, 7]), at([x + 2.5, 18, 7])], { size: 0.45 }));
  }
  return out.join("");
}

function fixture() {
  const out = [];
  out.push(S(k.slabOf(MAG, 0, 11, P, 6, 0.8), { tone: "mid" }));
  out.push(S(k.slabOf(k.insetPlan(MAG, 0.8), 11, MAG_H - 11, P, 6, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(MAG, 3), MAG_H, P), { tone: "faint" }));
  out.push(D([at([MAG.x + 5, MAG.y + 5, MAG_H]), at([MAG.x + 5, MAG.y + MAG.d - 5, MAG_H]), at([MAG.x + MAG.w - 5, MAG.y + 5, MAG_H])], { size: 0.45 }));
  const knob = [MAG.x + 32, MAG.y + 28];
  out.push(S(k.cylinder(knob[0], knob[1], 6, MAG_H, 4, P, 32), { tone: "mid" }));
  out.push(L(k.knurl(knob[0], knob[1], 6, MAG_H, MAG_H + 4, 36, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([knob[0], knob[1]], [knob[0] + 6, knob[1]], MAG_H + 4, P), { tone: "hi" }));
  out.push(D([at([knob[0], knob[1], MAG_H + 4])], { size: 0.5, tone: "hi" }));
  out.push(S(k.cylinder(POST[0], POST[1], 5, MAG_H, 4, P, 28), { tone: "mid" }));
  const clamp = { x: POST[0] - 7, y: POST[1] - 7, w: 14, d: 14, r: 2.5 };
  out.push(S(k.cylinder(POST[0], POST[1], 3.2, MAG_H + 4, CLAMP_Z - 4 - MAG_H - 4, P, 28), { tone: "mid", crease: "none" }));
  out.push(L([60, 80].map((z) => k.sideArc(POST[0], POST[1], 3.2, z, P, 16)).join(""), { tone: "faint" }));
  out.push(S(k.slabOf(clamp, CLAMP_Z - 4, 12, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(POST[0], POST[1], 3.2, CLAMP_Z + 8, POST_TOP - CLAMP_Z - 8, P, 28), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(POST[0], POST[1], 3.8, POST_TOP, 2, P, 28), { tone: "mid" }));
  const arm = { x: POST[0] + 7, y: -3, w: DIAL[0] - DIAL_R - POST[0] - 7 + 2, d: 6, r: 2 };
  out.push(S(k.slabOf(arm, CLAMP_Z, 4, P, 4, 0.5), { tone: "mid" }));
  out.push(D([at([arm.x + 4, 0, CLAMP_Z + 4]), at([arm.x + arm.w - 5, 0, CLAMP_Z + 4])], { size: 0.45 }));
  const thumb = [clamp.x + 7, clamp.y + clamp.d + 3];
  out.push(S(k.slabOf({ x: thumb[0] - 1.4, y: clamp.y + clamp.d, w: 2.8, d: 3, r: 0.8 }, CLAMP_Z + 1, 4, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(thumb[0], thumb[1] + 1.4, 2.6, CLAMP_Z, 6, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(thumb[0], thumb[1] + 1.4, 2.6, CLAMP_Z, CLAMP_Z + 6, 18, P), { tone: "lo" }));
  return out.join("");
}

function carriage() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(CARRIAGE, 3), CARRIAGE_Z, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(CARRIAGE, CARRIAGE_Z, CARRIAGE_TOP - CARRIAGE_Z, P, 5, 0.6), { tone: "mid" }));
  out.push(D([-22, -2, 18, 38, 54].map((x) => at([x, CARRIAGE.y + CARRIAGE.d - 2.6, CARRIAGE_TOP])), { size: 0.4, tone: "lo" }));
  out.push(L(k.lineOnTop([CARRIAGE.x, -15.5], [CARRIAGE.x + CARRIAGE.w, -15.5], CARRIAGE_TOP, P), { tone: "faint" }));
  out.push(L(k.lineOnTop([CARRIAGE.x, 15.5], [CARRIAGE.x + CARRIAGE.w, 15.5], CARRIAGE_TOP, P), { tone: "faint" }));
  BLOCKS.forEach((height, index) => {
    const plan = { x: -24 + STEP * index, y: -12, w: BLOCK_W, d: 24, r: 1 };
    // The reference block is the master: drawn in `mid`, the options in `hi`.
    out.push(S(k.slabOf(plan, CARRIAGE_TOP, height, P, 3, 0.5), { tone: index === 0 ? "mid" : "hi", crease: "lo" }));
    out.push(L(k.planOutline(k.insetPlan(plan, 2), CARRIAGE_TOP + height, P, 3), { tone: "faint" }));
  });
  const handle = [CARRIAGE.x + CARRIAGE.w - 8, CARRIAGE.y + CARRIAGE.d + 3];
  out.push(S(k.slabOf({ x: handle[0] - 2, y: CARRIAGE.y + CARRIAGE.d - 1, w: 4, d: 4, r: 1 }, CARRIAGE_Z + 1, 3, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(handle[0], handle[1] + 1, 3, CARRIAGE_Z, 5, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(handle[0], handle[1] + 1, 3, CARRIAGE_Z, CARRIAGE_Z + 5, 18, P), { tone: "lo" }));
  return out.join("");
}

function plunger() {
  const out = [];
  out.push(S(k.cylinder(DIAL[0], DIAL[1], TIP_R, 0, 2.4, P, 20), { tone: "hi", lit: true }));
  out.push(S(k.cylinder(DIAL[0], DIAL[1], 1.4, 2.4, 50, P, 16), { tone: "hi", crease: "none", lit: true }));
  return out.join("");
}

function dial() {
  const out = [];
  const [x, y] = DIAL;
  out.push(S(k.cylinder(x, y, 2.9, 54, DIAL_Z - 54, P, 20), { tone: "mid" }));
  out.push(L(k.sideArc(x, y, 2.9, 60, P, 12), { tone: "lo" }));
  out.push(S(k.slabOf({ x: x - DIAL_R - 6, y: -4, w: 8, d: 8, r: 1.5 }, DIAL_Z + 2, CLAMP_Z - DIAL_Z - 2, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3.4, DIAL_TOP, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3.4, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" }));
  // 40 ticks per turn: one tick = €10 mil, a major tick = €50 mil.
  const ticks = k.radialTicks(x, y, DIAL_R - 3, 40, 5, DIAL_TOP, [1.3, 2.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(S(k.slabOf({ x: x + DIAL_R - 1, y: -2.4, w: 5, d: 4.8, r: 1.2 }, DIAL_Z + 2, 5, P, 3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x + DIAL_R + 3.6, y: -3.2, w: 2.6, d: 6.4, r: 1.2 }, DIAL_Z + 1.2, 6.6, P, 3), { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.6, DIAL_TOP, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 9], DIAL_TOP, P, "x"), "€10k", { size: 2.4, tone: "lo", anchor: "middle" }));
  return out.join("");
}

const needleAt = (turn) => {
  const angle = turn * Math.PI * 2;
  const [x, y] = DIAL;
  return k.lineOnTop([x - Math.sin(angle) * 3.4, y + Math.cos(angle) * 3.4], [x + Math.sin(angle) * (DIAL_R - 4), y - Math.cos(angle) * (DIAL_R - 4)], DIAL_TOP + 0.2, P);
};

const startX = STOPS[0];
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Un reloj comparador sobre una placa. Un carro con cinco bloques se desliza bajo el palpador: el primero es el bloque patrón (no hacer nada) y cada uno de los otros mide tanto como la ganancia extra esperada de una opción. La aguja marca la diferencia con el patrón.",
  body: [
    plate(),
    rails(),
    fixture(),
    `<g data-part="carriage" transform="${k.translateAlong(P, [startX, 0, 0])}">${carriage()}</g>`,
    `<g data-part="plunger" transform="${k.translateAlong(P, [0, 0, CARRIAGE_TOP + BLOCKS[0]])}">${plunger()}</g>`,
    dial(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(0)}" style="stroke-width:1.1"/>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const BLOCKS = ${JSON.stringify(BLOCKS)};
const OPCIONES = ${JSON.stringify(OPCIONES)};
const DIAL = ${JSON.stringify(DIAL)};
const DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP}, PER_TURN = ${PER_TURN}, STEP = ${STEP}, BLOCK_W = ${BLOCK_W}, TIP_R = ${TIP_R}, BASE = ${CARRIAGE_TOP};
const H0 = ${H0}, EUR = ${EUR_PER_UNIT};
const REACH = ${JSON.stringify(REACH)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const carriage = svg.querySelector('[data-part="carriage"]');
const plunger = svg.querySelector('[data-part="plunger"]');
const needle = svg.querySelector('[data-part="needle"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const stops = ${JSON.stringify(STOPS)};
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const heightUnder = (cx) => {
  let top = BASE;
  BLOCKS.forEach((height, index) => {
    const from = cx - 24 + STEP * index, to = from + BLOCK_W;
    if (to > DIAL[0] - TIP_R && from < DIAL[0] + TIP_R) top = Math.max(top, BASE + height);
  });
  return top;
};
const blockUnder = (cx) => BLOCKS.findIndex((_, index) => { const from = cx - 24 + STEP * index; return DIAL[0] >= from && DIAL[0] <= from + BLOCK_W; });
const needleAt = ${needleAt.toString().replace("k.lineOnTop", "lineOnTop")};
const miles = (eur) => (eur < 0 ? "−" : "+") + "€" + Math.round(Math.abs(eur) / 1000) + " mil";
let x = ${startX}, target = x, tip = { at: BASE + BLOCKS[0], rate: 0 };
let frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0;
const tourAt = (t) => stops[Math.floor(t / 2.4) % stops.length];
function draw() {
  carriage.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  plunger.setAttribute("transform", translateAlong(P, [0, 0, tip.at]));
  const reading = tip.at - BASE - H0;
  needle.setAttribute("d", needleAt(reading / PER_TURN));
  const index = blockUnder(x);
  const o = OPCIONES[index];
  const text = index < 0 ? "entre bloques · " + miles(reading * EUR) : index === 0 ? "patrón · €0" : o.nombre + " · " + miles(reading * EUR) + " · riesgo " + (o.riesgo * 100).toFixed(1).replace(".", ",") + " %";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(reading * EUR)));
  stage.setAttribute("aria-valuetext", text);
  parent.postMessage({ comparador: index }, "*");
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; target = tourAt(clock); }
  x = calm ? target : x + (target - x) * (1 - Math.exp(-dt / 0.28));
  if (Math.abs(target - x) < 0.01) x = target;
  const want = heightUnder(x);
  const stiff = 420, drag = calm ? 2 * Math.sqrt(420) : 26;
  for (let i = 0; i < 4; i++) { tip.rate += ((want - tip.at) * stiff - tip.rate * drag) * dt / 4; tip.at += tip.rate * dt / 4; }
  if (Math.abs(want - tip.at) < 0.005 && Math.abs(tip.rate) < 0.005) { tip.at = want; tip.rate = 0; }
  draw();
  const settled = !touring && x === target && tip.rate === 0 && tip.at === want;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, REACH[0], REACH[1]); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.25) / 0.5, 0, 1);
  steer(REACH[0] + share * (REACH[1] - REACH[0]));
});
stage.addEventListener("pointerleave", () => steer(target));
addEventListener("message", (event) => { if (typeof event.data?.opcion === "number") steer(stops[event.data.opcion]); });
stage.addEventListener("keydown", (event) => {
  const here = stops.reduce((best, stop, index) => (Math.abs(stop - target) < Math.abs(stops[best] - target) ? index : best), 0);
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.max(0, here - 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.min(stops.length - 1, here + 1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = stops.length - 1;
  if (to === null) return;
  event.preventDefault();
  event.stopPropagation();
  steer(stops[to]);
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Comparador de opciones",
  hint: "Pasa el cursor para mover el carro",
  readout: "patrón · €0",
  keys: [
    { mark: "lit", label: "Palpador y aguja: lo que se mueve cuando cambia la ganancia" },
    { mark: "raised", label: "Cinco bloques: el patrón y las cuatro opciones" },
  ],
  caption:
    "Cada bloque mide lo que deja una opción frente a no hacer nada (el bloque patrón, más oscuro). Una vuelta de la aguja son €400 mil y cada marca, €10 mil; un bloque más bajo que el patrón pierde dinero. Alturas: ganancia extra esperada de 10.000 escenarios Monte Carlo (salidas/montecarlo_resumen.csv).",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Comparador: las flechas mueven el carro de bloque en bloque" aria-valuemin="-200000" aria-valuemax="200000" aria-valuenow="0">${svg}</div>`,
});

// Embedded in the site: transparent page and no outer margin.
const EMBED_CSS = `<style>html{color-scheme:light}body{background:transparent}.iso{--anatomy-page:transparent}.iso-page{margin:8px auto}</style>`;
mkdirSync(OUT, { recursive: true });
const page = k.pageHtml({ title: "Comparador de opciones", theme: "light", body, script: kitScript() + live, width: 760 }).replace('<html lang="en">', '<html lang="es">').replace("</head>", `${EMBED_CSS}</head>`);
writeFileSync(join(OUT, "comparador.html"), page);
console.log("wrote public/anatomy/comparador.html", BLOCKS.map((b) => b.toFixed(2)).join(" "));
