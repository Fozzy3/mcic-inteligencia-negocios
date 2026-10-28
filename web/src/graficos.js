// 2D charts and diagrams (SVG + GSAP). Every number is read from datos.json (exported from salidas/).
import gsap from "gsap";
import datos from "./datos.json";

const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const D = (s) => (reducido ? 0 : s);
const miles = (n) => Math.round(n).toLocaleString("de-DE");
const eur = (n) => (n < 0 ? "−" : "") + "€" + miles(Math.abs(n));
const eurK = (n) => (n < 0 ? "−" : "") + "€" + miles(Math.abs(n) / 1000) + " mil";
const pct = (v, d = 1) => (v * 100).toFixed(d).replace(".", ",") + " %";
const VAR = { funnel: "var(--funnel)", product: "var(--product)", webinar: "var(--webinar)", ads: "var(--ads)" };
const NOMBRE = { product: "Producto nuevo", funnel: "Página mejorada", webinar: "Webinars", ads: "Duplicar publicidad" };

const tooltip = document.createElement("div");
tooltip.className = "tooltip";
document.body.appendChild(tooltip);
function conTooltip(raiz) {
  raiz.addEventListener("pointermove", (e) => {
    const t = e.target.closest("[data-tip]");
    if (!t) return (tooltip.style.opacity = 0);
    tooltip.innerHTML = t.dataset.tip;
    tooltip.style.opacity = 1;
    tooltip.style.left = e.clientX + 14 + "px";
    tooltip.style.top = e.clientY + 14 + "px";
  });
  raiz.addEventListener("pointerleave", () => (tooltip.style.opacity = 0));
}
const lienzo = (el, sel = "[data-svg]") => el.querySelector(sel);
const svg = (w, h, cuerpo) => `<svg viewBox="0 0 ${w} ${h}" role="img">${cuerpo}</svg>`;
const escala = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

// ---------------- 28 columns -> 6 questions ----------------
const COLS = "transaction_id,date,month,quarter,channel,campaign_objective,customer_segment,lifecycle_stage,device,geo_region,ad_budget_level,campaign_daily_spend_eur,cost_attributed_eur,landing_variant,cta_variant,lead_magnet,checkout_simplified,webinar_invited,webinar_attended,new_product_offer,lead_score,converted_to_sale,days_to_close,aov_eur,revenue_eur,gross_margin_pct,gross_profit_eur,contribution_profit_eur".split(",");
const FUTURO = new Set(["cost_attributed_eur", "days_to_close", "aov_eur", "revenue_eur", "gross_margin_pct", "gross_profit_eur", "contribution_profit_eur"]);
const GRUPOS = [
  ["¿Cuándo?", ["transaction_id", "date", "month", "quarter"]],
  ["¿Quién es?", ["customer_segment", "lifecycle_stage", "geo_region", "device", "lead_score"]],
  ["¿Por dónde llegó?", ["channel", "campaign_objective", "ad_budget_level", "campaign_daily_spend_eur", "cost_attributed_eur"]],
  ["¿Qué vio en la web?", ["landing_variant", "cta_variant", "lead_magnet", "checkout_simplified", "webinar_invited", "webinar_attended", "new_product_offer"]],
  ["¿Compró?", ["converted_to_sale", "days_to_close"]],
  ["¿Cuánto dejó?", ["aov_eur", "revenue_eur", "gross_margin_pct", "gross_profit_eur", "contribution_profit_eur"]],
];
const columnas = {
  montar(el) {
    const zona = el.querySelector("[data-columnas]");
    zona.innerHTML = GRUPOS.map(([t], i) => `<div class="grupo-col" data-g="${i}"><h4>${t}</h4></div>`).join("") + COLS.map((c) => `<span class="chip${FUTURO.has(c) ? " futuro" : ""}" data-c="${c}">${c}</span>`).join("");
    this.zona = zona;
  },
  posiciones(agrupado) {
    const zona = this.zona;
    const W = zona.clientWidth, H = zona.clientHeight;
    const chips = Object.fromEntries([...zona.querySelectorAll(".chip")].map((c) => [c.dataset.c, c]));
    const pos = {};
    if (!agrupado) {
      // As they come in the CSV: rows, left to right.
      let x = 0, y = 10;
      for (const c of COLS) {
        const w = chips[c].offsetWidth;
        if (x + w > W) { x = 0; y += 52; }
        pos[c] = [x, y];
        x += w + 12;
      }
      return { pos, cajas: [] };
    }
    const gw = (W - 40) / 3, gh = (H - 20) / 2;
    const cajas = [];
    GRUPOS.forEach(([, cols], g) => {
      const gx = (g % 3) * (gw + 20), gy = Math.floor(g / 3) * (gh + 20);
      cajas.push([gx, gy, gw, gh]);
      let x = gx + 16, y = gy + 50;
      for (const c of cols) {
        const w = chips[c].offsetWidth;
        if (x + w > gx + gw - 12) { x = gx + 16; y += 44; }
        pos[c] = [x, y];
        x += w + 10;
      }
    });
    return { pos, cajas };
  },
  aplicar(agrupado, animar) {
    const { pos, cajas } = this.posiciones(agrupado);
    this.zona.querySelectorAll(".chip").forEach((c, i) => {
      const [x, y] = pos[c.dataset.c];
      gsap.to(c, { left: x, top: y, duration: animar ? D(1.1) : 0, delay: animar ? D(i * 0.02) : 0, ease: "expo.inOut" });
    });
    this.zona.querySelectorAll(".grupo-col").forEach((g, i) => {
      if (cajas[i]) gsap.set(g, { left: cajas[i][0], top: cajas[i][1], width: cajas[i][2], height: cajas[i][3] });
      gsap.to(g, { opacity: agrupado ? 1 : 0, duration: D(0.6), delay: agrupado ? D(0.6) : 0 });
    });
  },
  entrar(el, paso) { this.aplicar(paso >= 1, false); },
  paso(el, n) {
    if (!this.zona) return;
    this.aplicar(n >= 1, true);
    this.zona.querySelectorAll(".chip.futuro").forEach((c) => c.classList.toggle("marcado", n >= 2));
  },
};

// ---------------- Waterfall of row TX-000104 ----------------
const cascada = {
  montar(el) {
    const pasos = [
      { t: "Venta", v: 1554.86, tipo: "total" },
      { t: "Costo del producto", v: -447.8 },
      { t: "Publicidad", v: -9.05 },
      { t: "Costo fijo (envío)", v: -22, trampa: true },
      { t: "Ganancia", v: 1076.01, tipo: "total", final: true },
    ];
    const w = 760, h = 560, x0 = 60, base = 470;
    const y = escala(0, 1700, base, 40);
    let acum = 0, cuerpo = `<line class="eje-linea" x1="${x0}" x2="${w - 10}" y1="${base}" y2="${base}"/>`;
    const bw = 104, paso = (w - x0 - 20) / pasos.length;
    pasos.forEach((p, i) => {
      const x = x0 + i * paso + (paso - bw) / 2;
      let top, bot;
      if (p.tipo === "total") { top = y(p.v); bot = base; acum = p.v; }
      else { top = y(acum); bot = y(acum + p.v); acum += p.v; }
      const color = p.final ? "var(--funnel)" : p.tipo === "total" ? "#5b6678" : p.trampa ? "var(--ads)" : "rgba(229,72,77,.55)";
      const hgt = Math.max(2, bot - top);
      cuerpo += `<rect class="barra" data-tip="${p.t}: <b>${eur(p.v).replace(".", ",")}</b>" x="${x}" y="${top}" width="${bw}" height="${hgt}" rx="4" fill="${color}"/>`;
      cuerpo += `<text class="t-fuerte t-mono valor" x="${x + bw / 2}" y="${top - 12}" text-anchor="middle" font-size="19">${p.v < 0 ? "−" : ""}€${Math.abs(p.v).toLocaleString("de-DE", { minimumFractionDigits: 2 })}</text>`;
      cuerpo += `<text x="${x + bw / 2}" y="${base + 30}" text-anchor="middle" font-size="16">${p.t}</text>`;
    });
    lienzo(el).innerHTML = svg(w, h, cuerpo);
    conTooltip(lienzo(el));
  },
  entrar(el) {
    const s = lienzo(el);
    gsap.fromTo(s.querySelectorAll(".barra"), { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: D(0.7), stagger: D(0.35), ease: "power3.out" });
    gsap.fromTo(s.querySelectorAll(".valor"), { opacity: 0 }, { opacity: 1, duration: D(0.4), stagger: D(0.35), delay: D(0.4) });
  },
};

// ---------------- 15 validation rules ----------------
const REGLAS = {
  id_duplicado: ["ID repetido", "Filas repetidas"],
  nulos_en_campos_clave: ["Vacíos en campos clave", "Datos vacíos"],
  nulos_en_atributos: ["Vacíos en atributos", "Datos vacíos"],
  mes_distinto_a_fecha: ["Mes ≠ fecha", "Fechas que no coinciden"],
  trimestre_distinto_a_fecha: ["Trimestre ≠ fecha", "Fechas que no coinciden"],
  binarios_fuera_de_0_1: ["Binarios fuera de 0/1", "Valores imposibles"],
  lead_score_fuera_de_1_99: ["Puntaje fuera de 1–99", "Valores imposibles"],
  margen_fuera_de_0_1: ["Margen fuera de 0–1", "Valores imposibles"],
  asistio_sin_invitacion: ["Asistió sin invitación", "Datos que se contradicen"],
  dias_cierre_solo_si_hay_venta: ["Días de cierre sin venta", "Datos que se contradicen"],
  ingreso_igual_ticket_por_venta: ["Ingreso = ticket × venta", "Cuentas que no cuadran"],
  utilidad_bruta_igual_ingreso_por_margen: ["Bruta = ingreso × margen", "Cuentas que no cuadran"],
  contribucion_igual_bruta_menos_costo_menos_22: ["Ganancia = bruta − costo − €22", "Cuentas que no cuadran"],
  canal_organico_con_presupuesto_ads: ["Orgánico con presupuesto de Ads", "Datos que se contradicen"],
  canal_pagado_sin_presupuesto_ads: ["Pagado sin presupuesto de Ads", "Datos que se contradicen"],
};
const reglas = {
  montar(el) {
    el.querySelector("[data-reglas]").innerHTML = datos.validacion
      .map((r, i) => `<div class="regla"><span class="barrido"></span><span class="n">${String(i + 1).padStart(2, "0")}</span><span>${REGLAS[r.regla][0]}<span class="cat">${REGLAS[r.regla][1]} · <code>${r.regla}</code></span></span><span class="f" data-fallas="${r.fallas}">…</span></div>`)
      .join("");
  },
  entrar(el) {
    const filas = el.querySelectorAll(".regla");
    filas.forEach((f) => { f.classList.remove("ok"); f.querySelector(".f").textContent = "revisando…"; });
    const tl = gsap.timeline({ delay: D(0.4) });
    filas.forEach((f, i) => {
      tl.fromTo(f.querySelector(".barrido"), { xPercent: -100, opacity: 1 }, { xPercent: 100, opacity: 0, duration: D(0.45), ease: "none" }, D(i * 0.16));
      tl.call(() => { f.classList.add("ok"); f.querySelector(".f").textContent = `${f.querySelector(".f").dataset.fallas} fallas ✓`; }, null, D(i * 0.16 + 0.3));
    });
  },
};

// ---------------- Trap 1 ----------------
const trampa1 = {
  entrar(el) {
    gsap.fromTo(el.querySelectorAll(".fila-c:not(.falta)"), { x: 40, opacity: 0 }, { x: 0, opacity: 1, stagger: D(0.25), duration: D(0.5), ease: "power3.out", delay: D(0.3) });
  },
  paso(el, n) {
    if (n === 1) gsap.fromTo(el.querySelector(".fila-c.falta"), { scale: 0.85 }, { scale: 1, duration: D(0.8), ease: "elastic.out(1, 0.5)" });
  },
};

// ---------------- Trap 2: 14 rows stacked ----------------
const GASTOS_FB = [1153.02, 1070.23, 1035.71, 1063.26, 994.24, 1040.76, 992.85, 1125.99, 1113.71, 1033.96, 1064.39, 1163.78, 1137.36, 1081.55];
const trampa2 = {
  montar(el) {
    const w = 640, h = 640, base = 590, x = 250, bw = 150;
    const y = escala(0, 16000, base, 30);
    let acum = 0, cuerpo = "";
    [0, 4000, 8000, 12000, 16000].forEach((v) => (cuerpo += `<line class="rejilla" x1="80" x2="${w}" y1="${y(v)}" y2="${y(v)}"/><text x="70" y="${y(v) + 5}" text-anchor="end" font-size="15">€${miles(v)}</text>`));
    GASTOS_FB.forEach((g, i) => {
      cuerpo += `<rect class="pila" data-tip="Fila ${i + 1}: gasto diario de campaña <b>€${g.toFixed(2).replace(".", ",")}</b>" x="${x}" y="${y(acum + g)}" width="${bw}" height="${y(acum) - y(acum + g) - 2}" rx="3" fill="rgba(229,72,77,${0.45 + (i % 2) * 0.2})"/>`;
      acum += g;
    });
    cuerpo += `<text class="t-fuerte t-mono suma" x="${x + bw + 16}" y="${y(acum) + 6}" font-size="22">Σ = €15.071 ✗</text>`;
    cuerpo += `<line class="promedio" x1="${x - 40}" x2="${x + bw + 40}" y1="${y(1076.5)}" y2="${y(1076.5)}" stroke="var(--product)" stroke-width="2" stroke-dasharray="6 5"/>`;
    cuerpo += `<text class="promedio t-mono" x="${x - 48}" y="${y(1076.5) + 5}" text-anchor="end" font-size="15" style="fill:var(--product)">promedio €1.076</text>`;
    cuerpo += `<rect class="real" data-tip="Costo real del día: <b>€328,22</b>" x="${x + bw + 60}" y="${y(328.22)}" width="${bw * 0.6}" height="${base - y(328.22)}" rx="3" fill="var(--bien)"/>`;
    cuerpo += `<text class="real t-fuerte t-mono" x="${x + bw + 60 + bw * 0.3}" y="${y(328.22) - 12}" text-anchor="middle" font-size="20">€328 ✓</text>`;
    cuerpo += `<line class="eje-linea" x1="80" x2="${w}" y1="${base}" y2="${base}"/>`;
    cuerpo += `<text x="${x + bw / 2}" y="${base + 30}" text-anchor="middle" font-size="15">14 filas de Facebook · 23 jun 2025</text>`;
    lienzo(el).innerHTML = svg(w, h + 20, cuerpo);
    conTooltip(lienzo(el));
  },
  entrar(el) {
    const s = lienzo(el);
    gsap.set(s.querySelectorAll(".suma, .promedio, .real"), { opacity: 0 });
    gsap.fromTo(s.querySelectorAll(".pila"), { y: -400, opacity: 0 }, { y: 0, opacity: 1, duration: D(0.6), stagger: D(0.08), ease: "bounce.out", delay: D(0.3) });
  },
  paso(el, n) {
    const s = lienzo(el);
    gsap.to(s.querySelectorAll(".suma"), { opacity: n >= 1 ? 1 : 0, duration: D(0.4) });
    gsap.to(s.querySelectorAll(".promedio, .real"), { opacity: n >= 2 ? 1 : 0, duration: D(0.6) });
    gsap.to(s.querySelectorAll(".pila"), { opacity: n >= 2 ? 0.18 : 1, duration: D(0.6) });
  },
};

// ---------------- Trap 3: averages with and without zeros ----------------
const trampa3 = {
  montar(el) {
    const total = datos.kpi.filter((k) => k.dimension === "canal");
    const ingresos = total.reduce((a, k) => a + k.ingresos_eur, 0);
    const n = total.reduce((a, k) => a + k.oportunidades, 0);
    const ventas = total.reduce((a, k) => a + k.ventas, 0);
    this.barras = [
      { t: "Con todas las filas (mal)", v: ingresos / n, c: "var(--ads)" },
      { t: "Solo con las ventas (bien)", v: ingresos / ventas, c: "var(--funnel)" },
    ];
    el.querySelector("[data-ceros]").innerHTML = this.barras.map((b) => `<div class="bc"><span>${b.t}</span><div class="barra" style="background:${b.c}">${eur(b.v)}</div></div>`).join("");
  },
  entrar(el) {
    el.querySelectorAll(".bc .barra").forEach((b, i) => gsap.fromTo(b, { width: 0 }, { width: `${Math.max(14, (this.barras[i].v / this.barras[1].v) * 100)}%`, duration: D(1.2), delay: D(0.4 + i * 0.4), ease: "power3.out" }));
    gsap.fromTo(el.querySelectorAll("[data-tiempo] > div"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, stagger: D(0.3), duration: D(0.5), delay: D(0.6) });
  },
};

// ---------------- Pipeline diagram ----------------
const flujo = {
  montar(el) {
    const w = 1420, h = 470;
    const nodos = [
      { id: "csv", x: 10, y: 40, w: 200, t: "CSV original", s: "20.000 × 28 · solo lectura", c: "#5b6678" },
      { id: "s1", x: 290, y: 40, w: 250, t: "01_preparacion.sql", s: "vista ventas + 15 reglas", c: "var(--ud-rojo)" },
      { id: "g", x: 610, y: 52, w: 120, t: "¿0 fallas?", s: "check_zero", c: "var(--product)", rombo: true },
      { id: "s2", x: 800, y: 40, w: 270, t: "02_indicadores.sql", s: "cubo de KPI · crecimiento · Ads", c: "var(--ud-rojo)" },
      { id: "s3", x: 1120, y: 40, w: 296, t: "03_modelo_dimensional.sql", s: "2 hechos · 5 dimensiones", c: "var(--ud-rojo)" },
      { id: "py", x: 800, y: 290, w: 270, t: "model.py", s: "logística · bootstrap · Monte Carlo", c: "var(--funnel)" },
      { id: "out", x: 470, y: 290, w: 240, t: "salidas/*.csv", s: "tablas citadas en el informe", c: "var(--bien)" },
      { id: "ent", x: 10, y: 260, w: 380, t: "Informe · presentación · Power BI · sitio", s: "", c: "var(--webinar)", alto: 140 },
    ];
    const por = Object.fromEntries(nodos.map((n) => [n.id, n]));
    const der = (n) => [n.x + n.w, n.y + 50], izq = (n) => [n.x, n.y + 50];
    const rutas = [
      `M${der(por.csv)} L${izq(por.s1)}`,
      `M${der(por.s1)} L${izq(por.g)}`,
      `M${der(por.g)} L${izq(por.s2)}`,
      `M${der(por.s2)} L${izq(por.s3)}`,
      `M${por.s3.x + 135},${por.s3.y + 100} L${por.s3.x + 135},${por.py.y + 50} L${der(por.py)}`,
      `M${izq(por.py)} L${der(por.out)}`,
      `M${izq(por.out)} L${der(por.ent)}`,
    ];
    let cuerpo = `<defs><marker id="pf" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--ud-rojo)"/></marker></defs>`;
    rutas.forEach((d, i) => {
      cuerpo += `<path class="ruta" d="${d}" fill="none" stroke="rgba(237,50,55,.7)" stroke-width="2.5" marker-end="url(#pf)"/>`;
      cuerpo += `<circle r="6" fill="#f4d27a"><animateMotion dur="${2 + (i % 3) * 0.4}s" repeatCount="indefinite" path="${d}" begin="${i * 0.3}s"/></circle>`;
    });
    cuerpo += `<path d="M${por.g.x + 60},${por.g.y + 88} L${por.g.x + 60},${por.g.y + 160}" stroke="var(--ads)" stroke-width="2" stroke-dasharray="5 5" fill="none"/><text x="${por.g.x + 60}" y="${por.g.y + 182}" text-anchor="middle" font-size="16" style="fill:var(--ads)">si falla: se detiene</text>`;
    for (const n of nodos) {
      const alto = n.alto ?? 100;
      if (n.rombo) {
        const cx = n.x + n.w / 2, cy = n.y + 38;
        cuerpo += `<g class="nodo"><path d="M${cx},${cy - 50} L${cx + 60},${cy + 0} L${cx},${cy + 50} L${cx - 60},${cy} Z" transform="translate(0,12)" fill="rgba(184,138,34,.15)" stroke="${n.c}" stroke-width="2"/><text class="t-fuerte" x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="16">${n.t}</text></g>`;
        continue;
      }
      cuerpo += `<g class="nodo"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${alto}" rx="14" fill="rgba(20,25,34,.95)" stroke="${n.c}" stroke-width="2"/><text class="t-fuerte ${n.t.includes(".") ? "t-mono" : ""}" x="${n.x + n.w / 2}" y="${n.y + (n.s ? 44 : alto / 2 + 6)}" text-anchor="middle" font-size="18">${n.t}</text>${n.s ? `<text x="${n.x + n.w / 2}" y="${n.y + 72}" text-anchor="middle" font-size="15">${n.s}</text>` : ""}</g>`;
    }
    cuerpo += `<text x="${por.ent.x + 190}" y="${por.ent.y + 95}" text-anchor="middle" font-size="15">las figuras y estas cifras salen de aquí</text>`;
    lienzo(el).innerHTML = svg(w, h, cuerpo);
  },
  entrar(el) {
    const s = lienzo(el);
    gsap.fromTo(s.querySelectorAll(".nodo"), { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: D(0.15), duration: D(0.5), ease: "power3.out" });
    s.querySelectorAll(".ruta").forEach((p, i) => {
      const L = p.getTotalLength();
      gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: D(0.6), delay: D(0.3 + i * 0.18), ease: "power2.inOut" });
    });
  },
};

// ---------------- Growth: small multiples ----------------
const crecimiento = {
  montar(el) {
    const c = Object.fromEntries(datos.crecimiento.map((r) => [r.indicador, r]));
    const filas = [
      ["Interesados", c.oportunidades, miles],
      ["Ventas", c.ventas, miles],
      ["Conversión", c.conversion, (v) => pct(v)],
      ["Costo por venta", c.cac_eur, eur],
      ["Ganancia", c.contribucion_eur, eurK],
    ];
    const w = 760, fh = 104, x0 = 190, ancho = 400;
    let cuerpo = `<g font-size="15"><rect x="${x0}" y="0" width="14" height="14" rx="3" fill="#5b6678"/><text x="${x0 + 22}" y="12">may 2024 – abr 2025</text><rect x="${x0 + 220}" y="0" width="14" height="14" rx="3" fill="var(--funnel)"/><text x="${x0 + 242}" y="12">may 2025 – abr 2026</text></g>`;
    filas.forEach(([t, r, f], i) => {
      const y0 = 40 + i * fh, max = Math.max(r.anterior, r.actual);
      const bueno = t === "Costo por venta" ? r.variacion < 0 : r.variacion > 0;
      const cambio = t === "Conversión" ? `+${((r.actual - r.anterior) * 100).toFixed(1).replace(".", ",")} pts` : `${r.variacion > 0 ? "+" : "−"}${Math.round(Math.abs(r.variacion) * 100)} %`;
      cuerpo += `<text class="t-fuerte" x="0" y="${y0 + 36}" font-size="19">${t}</text>`;
      cuerpo += `<rect class="b" data-tip="${t}, año anterior: <b>${f(r.anterior)}</b>" x="${x0}" y="${y0 + 8}" height="30" width="${(r.anterior / max) * ancho}" rx="4" fill="#5b6678"/>`;
      cuerpo += `<rect class="b" data-tip="${t}, último año: <b>${f(r.actual)}</b>" x="${x0}" y="${y0 + 42}" height="30" width="${(r.actual / max) * ancho}" rx="4" fill="var(--funnel)"/>`;
      cuerpo += `<text x="${x0 + (r.anterior / max) * ancho + 8}" y="${y0 + 29}" font-size="15" class="t-mono">${f(r.anterior)}</text>`;
      cuerpo += `<text x="${x0 + (r.actual / max) * ancho + 8}" y="${y0 + 63}" font-size="15" class="t-mono t-fuerte">${f(r.actual)}</text>`;
      cuerpo += `<text x="${w}" y="${y0 + 48}" text-anchor="end" font-size="22" class="t-mono" style="fill:${bueno ? "var(--bien)" : "var(--ads)"};font-weight:600">${cambio}</text>`;
    });
    lienzo(el).innerHTML = svg(w, 40 + filas.length * fh, cuerpo);
    conTooltip(lienzo(el));
  },
  entrar(el) {
    gsap.fromTo(lienzo(el).querySelectorAll(".b"), { scaleX: 0, transformOrigin: "0 50%" }, { scaleX: 1, duration: D(0.9), stagger: D(0.1), ease: "power3.out", delay: D(0.3) });
  },
};

// ---------------- Ads saturation: two charts, one axis each ----------------
const NIVEL = { low: "bajo", medium: "medio", high: "alto", saturated: "saturado" };
function barrasVerticales(filas, campo, fmt, { min = 0 } = {}) {
  const w = 680, h = 420, x0 = 70, base = 360, top = 30;
  const max = Math.max(...filas.map((f) => f[campo]));
  const y = escala(min, max * 1.12, base, top);
  const cero = y(0);
  let cuerpo = "";
  const bw = 90, paso = (w - x0) / filas.length;
  filas.forEach((f, i) => {
    const v = f[campo], x = x0 + i * paso + (paso - bw) / 2;
    const satur = f.nivel_ads === "saturated";
    const y1 = Math.min(y(v), cero), alto = Math.abs(y(v) - cero);
    cuerpo += `<rect class="b" data-tip="Gasto ${NIVEL[f.nivel_ads]}: <b>${fmt(v)}</b>" x="${x}" y="${y1}" width="${bw}" height="${Math.max(alto, 2)}" rx="4" fill="${satur ? "var(--ads)" : "var(--funnel)"}" style="transform-origin:${x + bw / 2}px ${cero}px"/>`;
    cuerpo += `<text class="t-fuerte t-mono" x="${x + bw / 2}" y="${v >= 0 ? y(v) - 10 : y(v) + 24}" text-anchor="middle" font-size="19">${fmt(v)}</text>`;
    cuerpo += `<text x="${x + bw / 2}" y="${base + 32}" text-anchor="middle" font-size="16">${NIVEL[f.nivel_ads]}</text>`;
  });
  cuerpo += `<line class="eje-linea" x1="${x0}" x2="${w}" y1="${cero}" y2="${cero}"/>`;
  return svg(w, h, cuerpo);
}
const saturacion = {
  montar(el) {
    const f = datos.ads;
    lienzo(el, '[data-svg="cac"]').innerHTML = barrasVerticales(f, "cac_eur", eur);
    lienzo(el, '[data-svg="cpo"]').innerHTML = barrasVerticales(f, "contribucion_por_oportunidad", (v) => (v < 0 ? "−€" : "€") + Math.abs(v).toFixed(1).replace(".", ","), { min: -8 });
    conTooltip(el);
  },
  entrar(el) {
    gsap.fromTo(el.querySelectorAll(".b"), { scaleY: 0 }, { scaleY: 1, duration: D(0.9), stagger: D(0.1), ease: "power3.out", delay: D(0.3) });
  },
};

// ---------------- Monthly conversion ----------------
const tendencia = {
  montar(el) {
    const meses = datos.kpi.filter((k) => k.dimension === "mes");
    const w = 1420, h = 360, x0 = 60, base = 320, top = 20;
    const x = escala(0, meses.length - 1, x0, w - 20);
    const y = escala(0, 0.16, base, top);
    let cuerpo = "";
    [0, 0.04, 0.08, 0.12, 0.16].forEach((v) => (cuerpo += `<line class="rejilla" x1="${x0}" x2="${w}" y1="${y(v)}" y2="${y(v)}"/><text x="${x0 - 10}" y="${y(v) + 5}" text-anchor="end" font-size="14">${v * 100} %</text>`));
    const i7 = meses.findIndex((m) => m.valor === "2025-07");
    cuerpo += `<rect x="${x(i7) - 8}" y="${top}" width="${w - 20 - x(i7) + 8}" height="${base - top}" fill="rgba(59,143,217,.07)"/>`;
    cuerpo += `<line x1="${x(i7) - 8}" x2="${x(i7) - 8}" y1="${top}" y2="${base}" stroke="var(--funnel)" stroke-dasharray="5 5"/>`;
    cuerpo += `<text x="${x(i7)}" y="${top + 22}" font-size="16" class="t-fuerte">jul 2025: página de compra mejorada</text>`;
    const d = meses.map((m, i) => `${i ? "L" : "M"}${x(i)},${y(m.conversion)}`).join(" ");
    cuerpo += `<path class="area" d="${d} L${x(meses.length - 1)},${base} L${x(0)},${base} Z" fill="rgba(237,50,55,.08)"/>`;
    cuerpo += `<path class="linea" d="${d}" fill="none" stroke="var(--ud-rojo)" stroke-width="3" stroke-linejoin="round"/>`;
    meses.forEach((m, i) => {
      if (i % 3 === 0) cuerpo += `<text x="${x(i)}" y="${base + 26}" text-anchor="middle" font-size="14">${m.valor}</text>`;
      cuerpo += `<circle class="pt" cx="${x(i)}" cy="${y(m.conversion)}" r="5" fill="var(--ud-rojo)" stroke="var(--panel-solid)" stroke-width="2"/>`;
      cuerpo += `<rect data-tip="${m.valor}: conversión <b>${pct(m.conversion)}</b> · ${miles(m.oportunidades)} interesados" x="${x(i) - 22}" y="${top}" width="44" height="${base - top}" fill="transparent"/>`;
    });
    cuerpo += `<line class="eje-linea" x1="${x0}" x2="${w}" y1="${base}" y2="${base}"/>`;
    lienzo(el).innerHTML = svg(w, h, cuerpo);
    conTooltip(lienzo(el));
  },
  entrar(el) {
    const s = lienzo(el), p = s.querySelector(".linea"), L = p.getTotalLength();
    gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: D(2), ease: "power2.inOut", delay: D(0.3) });
    gsap.fromTo(s.querySelectorAll(".pt"), { scale: 0, transformOrigin: "center", transformBox: "fill-box" }, { scale: 1, stagger: D(0.06), duration: D(0.3), delay: D(0.4) });
    gsap.fromTo(s.querySelector(".area"), { opacity: 0 }, { opacity: 1, duration: D(1), delay: D(1.8) });
  },
};

// ---------------- Logistic model: sigmoid + odds ratios ----------------
const DRIVERS = [
  ["lead_score", "+1 desv. estándar", "tiene más puntaje (+1 desv.)"],
  ["webinar_attended", "1", "asiste al webinar"],
  ["cta_variant", "benefit_cta", "ve el botón que explica el beneficio"],
  ["landing_variant", "landing_v2", "ve la página nueva"],
  ["lead_magnet", "1", "recibe el regalo descargable"],
  ["new_product_offer", "1", "recibe la oferta del producto nuevo"],
  ["channel", "Facebook Ads", "llega por Facebook (vs. Email)"],
  ["ad_budget_level", "saturated", "llega con publicidad al máximo"],
];
const modelo = {
  montar(el) {
    // Sigmoid.
    const w = 640, h = 230, x = escala(-6, 6, 40, w - 10), y = escala(0, 1, h - 30, 10);
    let d = "";
    for (let z = -6; z <= 6.01; z += 0.1) d += `${d ? "L" : "M"}${x(z)},${y(1 / (1 + Math.exp(-z)))}`;
    lienzo(el, '[data-svg="sigmoide"]').innerHTML = svg(w, h, `<line class="eje-linea" x1="40" x2="${w}" y1="${y(0)}" y2="${y(0)}"/><line class="rejilla" x1="40" x2="${w}" y1="${y(0.5)}" y2="${y(0.5)}"/><text x="32" y="${y(1) + 5}" text-anchor="end" font-size="14">1</text><text x="32" y="${y(0.5) + 5}" text-anchor="end" font-size="14">0,5</text><text x="32" y="${y(0) + 5}" text-anchor="end" font-size="14">0</text><path class="sig" d="${d}" fill="none" stroke="var(--product)" stroke-width="3"/><circle class="bola" r="8" fill="var(--ud-rojo)"/><text x="${w - 10}" y="${h - 6}" text-anchor="end" font-size="14">puntaje z →</text><text class="lectura t-mono" x="60" y="30" font-size="16"></text>`);
    this.sig = { x, y };
    // Odds ratios, diverging around 0 %.
    const filas = DRIVERS.map(([v, n, t]) => {
      const r = datos.drivers.find((d) => d.variable === v && String(d.nivel) === n);
      return { t, e: r.odds_ratio - 1 };
    });
    const W = 720, fh = 58, xc = escala(-0.6, 0.9, 290, W - 70);
    let c = `<line class="eje-linea" x1="${xc(0)}" x2="${xc(0)}" y1="0" y2="${filas.length * fh}"/>`;
    filas.forEach((f, i) => {
      const y0 = i * fh + 10, x1 = Math.min(xc(0), xc(f.e)), ancho = Math.abs(xc(f.e) - xc(0));
      c += `<text x="${xc(-0.6) - 14}" y="${y0 + 26}" text-anchor="end" font-size="17">${f.t}</text>`;
      c += `<rect class="d" data-tip="${f.t}: odds × <b>${(1 + f.e).toFixed(2).replace(".", ",")}</b>" x="${x1}" y="${y0 + 6}" width="${ancho}" height="30" rx="4" fill="${f.e > 0 ? "var(--funnel)" : "var(--ads)"}" style="transform-origin:${xc(0)}px 0"/>`;
      c += `<text class="t-fuerte t-mono" x="${f.e > 0 ? xc(f.e) + 8 : xc(0) + 8}" y="${y0 + 27}" text-anchor="start" font-size="17">${f.e > 0 ? "+" : "−"}${Math.round(Math.abs(f.e) * 100)} %</text>`;
    });
    lienzo(el, '[data-svg="drivers"]').innerHTML = svg(W, filas.length * fh + 10, c);
    conTooltip(el);
  },
  entrar(el) {
    gsap.fromTo(el.querySelectorAll(".d"), { scaleX: 0 }, { scaleX: 1, stagger: D(0.1), duration: D(0.8), ease: "power3.out", delay: D(0.3) });
    const bola = el.querySelector(".bola"), lectura = el.querySelector(".lectura"), { x, y } = this.sig;
    const o = { z: -5 };
    this.tw?.kill();
    this.tw = gsap.to(o, {
      z: 5, duration: 4, ease: "sine.inOut", yoyo: true, repeat: reducido ? 0 : -1,
      onUpdate: () => {
        const p = 1 / (1 + Math.exp(-o.z));
        bola.setAttribute("cx", x(o.z));
        bola.setAttribute("cy", y(p));
        lectura.textContent = `z = ${o.z.toFixed(1).replace(".", ",")}  →  p = ${pct(p, 0)}`;
      },
    });
  },
  salir() { this.tw?.pause(); },
};

// ---------------- Lift by decile ----------------
const lift = {
  montar(el) {
    const L = datos.lift;
    const prom = L.reduce((a, d) => a + d.conversion * d.oportunidades, 0) / L.reduce((a, d) => a + d.oportunidades, 0);
    const w = 760, h = 500, x0 = 60, base = 440, top = 20;
    const y = escala(0, 0.36, base, top);
    const paso = (w - x0) / 10, bw = paso - 14;
    let c = "";
    [0, 0.1, 0.2, 0.3].forEach((v) => (c += `<line class="rejilla" x1="${x0}" x2="${w}" y1="${y(v)}" y2="${y(v)}"/><text x="${x0 - 8}" y="${y(v) + 5}" text-anchor="end" font-size="14">${v * 100} %</text>`));
    L.forEach((d, i) => {
      const x = x0 + i * paso + 7;
      c += `<rect class="b" data-tip="Décimo ${d.decil}: <b>${pct(d.conversion)}</b> de ${d.oportunidades} personas compró" x="${x}" y="${y(d.conversion)}" width="${bw}" height="${base - y(d.conversion)}" rx="4" fill="${d.decil <= 2 ? "var(--product)" : "#5b6678"}" style="transform-origin:0 ${base}px"/>`;
      c += `<text x="${x + bw / 2}" y="${base + 24}" text-anchor="middle" font-size="15">${d.decil}</text>`;
      if (d.decil <= 2 || d.decil === 10) c += `<text class="t-fuerte t-mono" x="${x + bw / 2}" y="${y(d.conversion) - 8}" text-anchor="middle" font-size="15">${pct(d.conversion)}</text>`;
    });
    c += `<line x1="${x0}" x2="${w}" y1="${y(prom)}" y2="${y(prom)}" stroke="var(--texto-2)" stroke-dasharray="6 5"/><text x="${w}" y="${y(prom) - 8}" text-anchor="end" font-size="15">promedio ${pct(prom)}</text>`;
    c += `<text x="${x0 + (w - x0) / 2}" y="${base + 52}" text-anchor="middle" font-size="15">décimo de puntaje (1 = el mejor puntuado)</text>`;
    lienzo(el).innerHTML = svg(w, h + 30, c);
    conTooltip(lienzo(el));
  },
  entrar(el) {
    gsap.fromTo(lienzo(el).querySelectorAll(".b"), { scaleY: 0 }, { scaleY: 1, stagger: D(0.07), duration: D(0.7), ease: "power3.out", delay: D(0.3) });
  },
};

// ---------------- Decision: expected profit, p10–p90 range and risk ----------------
const ORDEN_PASOS = ["funnel", "product", "webinar", "ads"];
const matriz = {
  montar(el) {
    const filas = [...datos.montecarlo].sort((p, q) => q.utilidad_esperada_eur - p.utilidad_esperada_eur);
    const w = 780, fh = 120, top = 50, x0 = 20, x1 = 600;
    const h = top + filas.length * fh + 60;
    const x = escala(-200000, 320000, x0, x1);
    let c = `<text x="${x1 + 30}" y="24" font-size="14" class="t-mono">RIESGO</text>`;
    [-200000, -100000, 0, 100000, 200000, 300000].forEach((v) => (c += `<line class="${v === 0 ? "eje-linea" : "rejilla"}" x1="${x(v)}" x2="${x(v)}" y1="${top - 10}" y2="${h - 50}"/><text x="${x(v)}" y="${h - 24}" text-anchor="middle" font-size="14">${eurK(v)}</text>`));
    c += `<text x="${x(0) - 8}" y="${top - 18}" text-anchor="end" font-size="14" style="fill:var(--ads)">← pierde</text><text x="${x(0) + 8}" y="${top - 18}" font-size="14" style="fill:var(--bien)">gana →</text>`;
    filas.forEach((m, i) => {
      const y = top + i * fh + fh / 2;
      c += `<g class="op" data-k="${m.clave}" data-tip="${NOMBRE[m.clave]}: esperada <b>${eurK(m.utilidad_esperada_eur)}</b> · p10 ${eurK(m.p10_eur)} · p90 ${eurK(m.p90_eur)}">`;
      c += `<text class="t-fuerte" x="${x0}" y="${y - 30}" font-size="19">${NOMBRE[m.clave]}</text>`;
      c += `<line x1="${x(m.p10_eur)}" x2="${x(m.p90_eur)}" y1="${y}" y2="${y}" stroke="${VAR[m.clave]}" stroke-width="10" stroke-linecap="round" opacity=".45"/>`;
      c += `<circle cx="${x(m.utilidad_esperada_eur)}" cy="${y}" r="13" fill="${VAR[m.clave]}" stroke="var(--panel-solid)" stroke-width="3"/>`;
      c += `<text class="t-mono" x="${x(m.utilidad_esperada_eur)}" y="${y + 36}" text-anchor="middle" font-size="16">${eurK(m.utilidad_esperada_eur)}</text>`;
      c += `<text class="t-mono t-fuerte" x="${x1 + 30}" y="${y + 7}" font-size="22" style="fill:${m.prob_perdida > 0.5 ? "var(--ads)" : m.prob_perdida > 0.01 ? "var(--product)" : "var(--bien)"}">${pct(m.prob_perdida)}</text></g>`;
    });
    lienzo(el).innerHTML = svg(w, h, c);
    conTooltip(lienzo(el));
  },
  entrar(el, paso) {
    gsap.fromTo(lienzo(el).querySelectorAll(".op"), { opacity: 0, x: -30 }, { opacity: 1, x: 0, stagger: D(0.15), duration: D(0.7), ease: "power3.out", delay: D(0.3) });
    this.paso(el, paso);
  },
  paso(el, n) {
    lienzo(el).querySelectorAll(".op").forEach((g) => gsap.to(g, { opacity: n === 0 || g.dataset.k === ORDEN_PASOS[n - 1] ? 1 : 0.25, duration: D(0.4) }));
  },
};

// ---------------- Sensitivity: launch cost of the new product ----------------
const sensibilidad = {
  montar(el) {
    const mc = Object.fromEntries(datos.montecarlo.map((m) => [m.clave, m]));
    const bruto = mc.product.utilidad_esperada_eur + mc.product.costo_esperado_eur; // expected gain before its cost
    const pagina = mc.funnel.utilidad_esperada_eur;
    const umbral = bruto - pagina;
    const w = 760, h = 560, x0 = 90, base = 480, top = 30, x1 = w - 20;
    const x = escala(10000, 150000, x0, x1), y = escala(0, 220000, base, top);
    let c = "";
    [0, 50000, 100000, 150000, 200000].forEach((v) => (c += `<line class="rejilla" x1="${x0}" x2="${x1}" y1="${y(v)}" y2="${y(v)}"/><text x="${x0 - 10}" y="${y(v) + 5}" text-anchor="end" font-size="14">${eurK(v)}</text>`));
    [25000, 50000, 75000, 100000, 125000, 150000].forEach((v) => (c += `<text x="${x(v)}" y="${base + 26}" text-anchor="middle" font-size="14">€${v / 1000}k</text>`));
    c += `<text x="${(x0 + x1) / 2}" y="${base + 56}" text-anchor="middle" font-size="15">costo de lanzar el producto</text>`;
    c += `<line x1="${x(10000)}" x2="${x(150000)}" y1="${y(bruto - 10000)}" y2="${y(bruto - 150000)}" stroke="var(--product)" stroke-width="3"/>`;
    c += `<text x="${x(14000)}" y="${y(bruto - 14000) - 12}" font-size="16" class="t-fuerte">Producto nuevo</text>`;
    c += `<line x1="${x0}" x2="${x1}" y1="${y(pagina)}" y2="${y(pagina)}" stroke="var(--funnel)" stroke-width="3"/>`;
    c += `<text x="${x1}" y="${y(pagina) - 12}" text-anchor="end" font-size="16" class="t-fuerte">Página mejorada</text>`;
    c += `<line x1="${x(umbral)}" x2="${x(umbral)}" y1="${top}" y2="${base}" stroke="var(--texto-2)" stroke-dasharray="5 5"/><text x="${x(umbral) + 8}" y="${top + 16}" font-size="15">umbral ${eurK(umbral)}</text>`;
    c += `<line class="marca" y1="${top}" y2="${base}" stroke="var(--ud-rojo)" stroke-width="2"/><circle class="marca-pt" r="9" fill="var(--product)" stroke="var(--panel-solid)" stroke-width="3"/>`;
    c += `<line class="eje-linea" x1="${x0}" x2="${x1}" y1="${base}" y2="${base}"/>`;
    lienzo(el).innerHTML = svg(w, h + 20, c);
    const rango = el.querySelector("[data-rango]"), costoTxt = el.querySelector("[data-costo]"), veredicto = el.querySelector("[data-veredicto]");
    const s = lienzo(el);
    const actualizar = () => {
      const costo = +rango.value * 1000;
      const prod = bruto - costo;
      s.querySelector(".marca").setAttribute("x1", x(costo));
      s.querySelector(".marca").setAttribute("x2", x(costo));
      s.querySelector(".marca-pt").setAttribute("cx", x(costo));
      s.querySelector(".marca-pt").setAttribute("cy", y(prod));
      costoTxt.textContent = eurK(costo);
      veredicto.innerHTML = prod > pagina
        ? `<p>Con ese costo el producto deja <b>${eurK(prod)}</b>: más que la página mejorada (${eurK(pagina)}). Vale la pena el piloto.</p>`
        : `<p>Con ese costo el producto deja <b>${eurK(prod)}</b>: <b>menos</b> que la página mejorada (${eurK(pagina)}). La página pasa a ser la mejor opción.</p>`;
    };
    rango.addEventListener("input", actualizar);
    rango.addEventListener("click", (e) => e.stopPropagation());
    actualizar();
  },
  entrar(el) {
    const rango = el.querySelector("[data-rango]");
    const o = { v: 28 };
    gsap.to(o, { v: 110, duration: D(2.5), ease: "sine.inOut", yoyo: true, repeat: 1, delay: D(0.6), onUpdate: () => { rango.value = Math.round(o.v); rango.dispatchEvent(new Event("input")); } });
  },
};

// ---------------- AWS architecture walkthrough ----------------
const PASOS_AWS = [
  { celdas: ["src", "e1", "s3r"], t: "① Ingesta", d: "El CSV del sistema de ventas llega a la zona raw de S3, con versionado y Object Lock: la regla de oro (el original nunca se modifica) la garantiza el almacenamiento." },
  { celdas: ["s3r", "e2", "glue"], t: "② Validación", d: "Glue cataloga el archivo y Athena corre las mismas 15 reglas SQL de 01_preparacion.sql, sin servidores." },
  { celdas: ["glue", "e3", "s3c"], t: "③ Zona curada", d: "Solo con 0 fallas se escriben las vistas limpias en Parquet. Es el check_zero del pipeline." },
  { celdas: ["s3c", "e7", "sm"], t: "④ Modelo", d: "SageMaker corre model.py: regresión logística, 200 re-entrenos (bootstrap) y 10.000 escenarios Monte Carlo." },
  { celdas: ["s3c", "e4", "rs", "e8", "sm"], t: "⑤ Esquema estrella", d: "Redshift Serverless carga los 2 hechos y 5 dimensiones, junto con el puntaje de cada persona." },
  { celdas: ["rs", "e5", "qs", "e6", "client"], t: "⑥ Consumo", d: "QuickSight (o Power BI con conector a Redshift) muestra los KPI a la gerencia y se actualiza solo." },
  { celdas: ["evb", "e9", "sfn", "e10", "e11", "glue", "sm", "e12", "sns"], t: "Orquestación y alertas", d: "EventBridge lanza el flujo cada mes; Step Functions encadena los pasos. Si una regla falla, se detiene y SNS avisa al equipo (línea roja)." },
  { celdas: ["lf", "iam", "cw"], t: "Gobierno", d: "Lake Formation da permisos por columna (p. ej. ocultar ingresos a quien no los necesita), KMS cifra en reposo y CloudWatch registra cada corrida." },
];
const SIEMPRE = new Set(["0", "1", "bg", "title", "cloud"]);
const aws = {
  pasos: PASOS_AWS.length,
  async montar(el) {
    const caja = el.querySelector("[data-aws]");
    const txt = await fetch("/aws-arquitectura.svg").then((r) => r.text());
    caja.innerHTML = txt.slice(txt.indexOf("<svg"));
    const s = caja.querySelector("svg");
    s.removeAttribute("width");
    s.removeAttribute("height");
    s.removeAttribute("style");
    s.setAttribute("preserveAspectRatio", "xMidYMid meet");
    s.setAttribute("viewBox", "100 140 1830 920"); // crop to the cloud and the actors; the frame has its own title
    this.caja = caja;
  },
  paso(el, n) {
    const caja = this.caja;
    if (!caja) return;
    const texto = el.querySelector("[data-aws-texto]");
    const p = PASOS_AWS[n - 1];
    caja.classList.toggle("enfocado", !!p);
    caja.querySelectorAll("[data-cell-id]").forEach((g) => {
      const id = g.dataset.cellId;
      const on = !p || SIEMPRE.has(id) || p.celdas.includes(id);
      g.classList.toggle("apagado", !on);
      g.querySelectorAll("path").forEach((pt) => pt.classList.toggle("flujo", !!p && /^e\d+$/.test(id) && on && pt.getAttribute("fill") === "none"));
    });
    texto.innerHTML = p ? `<b>${p.t} · ${n}/${PASOS_AWS.length}</b><span>${p.d}</span>` : `<b>Pulsa → para recorrer el flujo</b><span>Cada paso enciende los servicios que intervienen. Las líneas punteadas son de control; la roja, la alerta.</span>`;
    gsap.fromTo(texto, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: D(0.4) });
  },
  entrar(el, n) { this.paso(el, n); },
};

// ---------------- Anatomy figure (iframe) ----------------
const comparador = {
  montar(el) {
    const marco = el.querySelector("iframe");
    const botones = el.querySelectorAll("[data-comparador-botones] button");
    el.querySelector("[data-comparador-botones]").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      e.stopPropagation();
      marco.contentWindow?.postMessage({ opcion: +b.dataset.i }, "*");
    });
    addEventListener("message", (e) => {
      if (e.source !== marco.contentWindow || typeof e.data?.comparador !== "number") return;
      botones.forEach((b) => b.classList.toggle("activo", +b.dataset.i === e.data.comparador));
    });
  },
  entrar(el) {
    const marco = el.querySelector("iframe");
    if (!marco.src) marco.src = marco.dataset.src;
  },
};

export const graficos = { columnas, cascada, reglas, trampa1, trampa2, trampa3, flujo, crecimiento, saturacion, tendencia, modelo, lift, matriz, sensibilidad, aws, comparador };
