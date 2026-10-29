// three.js scenes inside frames. Each renders only while its frame is the active one.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import gsap from "gsap";
import datos from "./datos.json";

const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const COLOR = { funnel: 0x3b8fd9, product: 0xb88a22, webinar: 0x9b6be0, ads: 0xe5484d, rojo: 0xed3237, oro: 0xb49739, gris: 0x5b6678 };
const fmt = (n) => Math.round(n).toLocaleString("de-DE");

// Shared scaffold: renderer, orbit controls, HTML labels projected from 3D points.
function escena(el, { posicion = [10, 8, 14], objetivo = [0, 0, 0], autoGiro = 0.6 } = {}) {
  const lienzo = el.querySelector(".lienzo");
  const canvas = lienzo.querySelector("canvas");
  const capa = lienzo.querySelector(".etiquetas-3d, .canal-etiquetas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
  camera.position.set(...posicion);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...objetivo);
  controls.enableDamping = true;
  controls.autoRotate = !reducido && autoGiro > 0;
  controls.autoRotateSpeed = autoGiro;
  controls.enablePan = false;
  controls.addEventListener("start", () => (controls.autoRotate = false));
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const luz = new THREE.DirectionalLight(0xffffff, 1.4);
  luz.position.set(8, 14, 10);
  scene.add(luz);

  const etiquetas = [];
  const v = new THREE.Vector3();
  const s = {
    scene, camera, controls, renderer, lienzo, activo: false, cada: null,
    etiqueta(texto, pos, clase = "") {
      const e = document.createElement("div");
      e.className = "etq-3d " + clase;
      e.innerHTML = texto;
      capa.appendChild(e);
      const item = { e, pos: new THREE.Vector3(...pos) };
      etiquetas.push(item);
      return item;
    },
  };
  function tamano() {
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(tamano).observe(lienzo);
  function cuadro(t) {
    if (!s.activo) return;
    controls.update();
    s.cada?.(t);
    renderer.render(scene, camera);
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    for (const { e, pos } of etiquetas) {
      v.copy(pos).project(camera);
      e.style.left = ((v.x + 1) / 2) * w + "px";
      e.style.top = ((1 - v.y) / 2) * h + "px";
      e.style.display = v.z > 1 ? "none" : "";
    }
    requestAnimationFrame(cuadro);
  }
  s.activar = () => {
    if (s.activo) return;
    s.activo = true;
    tamano();
    requestAnimationFrame(cuadro);
  };
  s.desactivar = () => (s.activo = false);
  return s;
}

// ---------------- 20.000 opportunities as a point cloud ----------------
function nube() {
  let s, posFinal, posInicio, geo, t0 = 0;
  return {
    montar(el) {
      s = escena(el, { posicion: [13, 7, 13], objetivo: [0, 2.5, 0], autoGiro: 0.4 });
      const filas = datos.nube.filas;
      const n = filas.length / 4;
      const maxDia = Math.max(...filas.filter((_, i) => i % 4 === 0));
      posFinal = new Float32Array(n * 3);
      posInicio = new Float32Array(n * 3);
      const col = new Float32Array(n * 3);
      const oro = new THREE.Color(0xd19a12), azul = new THREE.Color(0x9fb3cc);
      for (let i = 0; i < n; i++) {
        const [dia, score, canal, compro] = filas.slice(i * 4, i * 4 + 4);
        posFinal.set([(dia / maxDia) * 12 - 6, (score / 99) * 6, (canal - 3) * 1.1 + (Math.random() - 0.5) * 0.7], i * 3);
        const u = new THREE.Vector3().randomDirection().multiplyScalar(14 + Math.random() * 6);
        posInicio.set([u.x, u.y + 3, u.z], i * 3);
        const c = compro ? oro : azul;
        col.set([c.r, c.g, c.b], i * 3);
      }
      geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(posInicio.slice(), 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({ size: 0.075, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.NormalBlending });
      s.scene.add(new THREE.Points(geo, mat));
      // Axes and a floor grid.
      const grid = new THREE.GridHelper(14, 14, 0x94a3b8, 0xd5dbe3);
      grid.position.y = -0.05;
      s.scene.add(grid);
      const ejes = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-6, 0, 4.5), new THREE.Vector3(6.4, 0, 4.5), new THREE.Vector3(-6, 0, 4.5), new THREE.Vector3(-6, 6.4, 4.5)]);
      s.scene.add(new THREE.LineSegments(ejes, new THREE.LineBasicMaterial({ color: 0xed3237 })));
      s.etiqueta("ene 2024", [-6, -0.5, 4.8], "chica");
      s.etiqueta("abr 2026 →", [6, -0.5, 4.8], "chica");
      s.etiqueta("puntaje 99", [-6.6, 6.2, 4.5], "chica");
      datos.nube.canales.forEach((c, i) => s.etiqueta(c, [6.9, 0.2, (i - 3) * 1.1], "chica"));
    },
    entrar() {
      s.activar();
      t0 = performance.now();
      const attr = geo.attributes.position;
      attr.array.set(posInicio);
      s.cada = (t) => {
        const k = reducido ? 1 : Math.min(1, (t - t0) / 2200);
        if (k >= 1 && s.listo) return;
        const e = 1 - Math.pow(1 - k, 3);
        const a = attr.array;
        for (let i = 0; i < a.length; i++) a[i] = posInicio[i] + (posFinal[i] - posInicio[i]) * e;
        attr.needsUpdate = true;
        s.listo = k >= 1;
      };
      s.listo = false;
    },
    salir: () => s.desactivar(),
  };
}

// ---------------- Star schema ----------------
const TABLAS = {
  fact_oportunidad: { tipo: "hecho", grano: "una oportunidad (una persona interesada)", cols: "transaction_id, fecha, canal_id, campana_id, perfil_id, experiencia_id, lead_score, convertida, dias_cierre, ingresos_eur, margen_bruto_pct, utilidad_bruta_eur, costo_adquisicion_eur, costo_fijo_venta_eur, contribucion_eur" },
  fact_gasto_campana_dia: { tipo: "hecho", grano: "un día de campaña por canal y nivel de gasto", cols: "fecha, canal_id, nivel_presupuesto_ads, gasto_diario_referencia_eur (se promedia, nunca se suma), oportunidades" },
  dim_fecha: { tipo: "dim", grano: "un día", cols: "fecha, anio, mes, trimestre, dia_semana, es_fin_de_semana", nota: "Compartida por los dos hechos." },
  dim_canal: { tipo: "dim", grano: "un canal", cols: "canal_id, canal, tipo_canal (Ads pagados / propio)", nota: "Compartida por los dos hechos." },
  dim_campana: { tipo: "dim", grano: "objetivo × nivel de gasto", cols: "campana_id, objetivo_campana, nivel_presupuesto_ads" },
  dim_perfil: { tipo: "dim", grano: "combinación de atributos del cliente", cols: "perfil_id, segmento, etapa_cliente, region, dispositivo", nota: "Dimensión basura: cuatro atributos pequeños en una sola tabla." },
  dim_experiencia: { tipo: "dim", grano: "lo que vio la persona", cols: "experiencia_id, landing, cta, lead_magnet, checkout_simplificado, funnel_completo, webinar, oferta_nuevo_producto" },
};

function estrella() {
  let s;
  return {
    montar(el) {
      s = escena(el, { posicion: [0, 10, 19], objetivo: [0.2, 0, 0], autoGiro: 0.5 });
      const info = el.querySelector("[data-info]");
      const pos = {
        fact_oportunidad: [-1.2, 0, 0],
        fact_gasto_campana_dia: [5.2, 0, 0.5],
        dim_fecha: [2.0, 2.6, -2.2],
        dim_canal: [2.0, -2.2, 2.2],
        dim_campana: [-4.6, 2.2, -1.6],
        dim_perfil: [-5.0, -1.6, 2.4],
        dim_experiencia: [-1.6, -3.4, -2.8],
      };
      const enlaces = [
        ["fact_oportunidad", "dim_fecha"], ["fact_oportunidad", "dim_canal"], ["fact_oportunidad", "dim_campana"],
        ["fact_oportunidad", "dim_perfil"], ["fact_oportunidad", "dim_experiencia"],
        ["fact_gasto_campana_dia", "dim_fecha"], ["fact_gasto_campana_dia", "dim_canal"],
      ];
      const nodos = [];
      for (const [nombre, p] of Object.entries(pos)) {
        const t = TABLAS[nombre];
        const filas = datos.estrella[nombre];
        const r = 0.35 + Math.log10(filas + 1) * 0.22;
        const geo = t.tipo === "hecho" ? new THREE.BoxGeometry(r * 1.7, r * 1.7, r * 1.7) : new THREE.IcosahedronGeometry(r, 1);
        const mat = new THREE.MeshStandardMaterial({ color: t.tipo === "hecho" ? COLOR.rojo : 0x3b8fd9, roughness: 0.35, metalness: 0.2, emissive: t.tipo === "hecho" ? 0x4a0d10 : 0x0b2236 });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(...p);
        m.userData = { nombre, filas, r };
        s.scene.add(m);
        const alambre = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.2 }));
        m.add(alambre);
        nodos.push(m);
        s.etiqueta(`${nombre}<small>${fmt(filas)} filas</small>`, [p[0], p[1] + r + 0.6, p[2]], "tabla" + (t.tipo === "hecho" ? " hecho" : ""));
      }
      const pulsos = [];
      for (const [a, b] of enlaces) {
        const va = new THREE.Vector3(...pos[a]), vb = new THREE.Vector3(...pos[b]);
        const linea = new THREE.Line(new THREE.BufferGeometry().setFromPoints([va, vb]), new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.45 }));
        s.scene.add(linea);
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), new THREE.MeshBasicMaterial({ color: 0xd19a12 }));
        p.userData = { va, vb, fase: Math.random() };
        s.scene.add(p);
        pulsos.push(p);
      }
      // Hover: raycast the tables.
      const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
      let encima = null;
      s.lienzo.addEventListener("pointermove", (e) => {
        const b = s.lienzo.getBoundingClientRect();
        ptr.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
        ray.setFromCamera(ptr, s.camera);
        const hit = ray.intersectObjects(nodos, false)[0]?.object ?? null;
        if (hit === encima) return;
        encima?.scale.setScalar(1);
        encima = hit;
        if (!hit) return;
        hit.scale.setScalar(1.18);
        const t = TABLAS[hit.userData.nombre];
        info.innerHTML = `<h4>${hit.userData.nombre} <span class="muted">· ${t.tipo === "hecho" ? "tabla de hechos" : "dimensión"}</span></h4><p><b>Grano:</b> ${t.grano}. ${t.nota ?? ""}</p><p><code>${t.cols}</code></p>`;
      });
      s.cada = (t) => {
        for (const p of pulsos) {
          const k = (t / 2400 + p.userData.fase) % 1;
          p.position.lerpVectors(p.userData.vb, p.userData.va, k);
        }
        for (const n of nodos) n.rotation.y = t / 4000;
      };
    },
    entrar: () => s.activar(),
    salir: () => s.desactivar(),
  };
}

// ---------------- Channels: share of people vs share of profit ----------------
function canales() {
  let s, barras = [];
  return {
    montar(el) {
      s = escena(el, { posicion: [4, 8, 17], objetivo: [0, 1.8, 0], autoGiro: 0.4 });
      const filas = datos.kpi.filter((k) => k.dimension === "canal");
      const totO = filas.reduce((a, k) => a + k.oportunidades, 0);
      const totC = filas.reduce((a, k) => a + k.contribucion_eur, 0);
      filas.sort((a, b) => b.contribucion_eur / totC - a.contribucion_eur / totC);
      const grid = new THREE.GridHelper(16, 16, 0x94a3b8, 0xd5dbe3);
      s.scene.add(grid);
      filas.forEach((k, i) => {
        const x = (i - (filas.length - 1) / 2) * 1.9;
        const pago = k.valor === "Facebook Ads" || k.valor === "Google Ads";
        const partes = [
          { v: k.oportunidades / totO, color: COLOR.gris, z: -0.45, txt: `${Math.round((k.oportunidades / totO) * 100)} %` },
          { v: k.contribucion_eur / totC, color: pago ? COLOR.ads : COLOR.funnel, z: 0.45, txt: `${Math.round((k.contribucion_eur / totC) * 100)} %` },
        ];
        for (const p of partes) {
          const h = p.v * 14;
          const geo = new THREE.BoxGeometry(0.7, 1, 0.7);
          geo.translate(0, 0.5, 0);
          const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.4, metalness: 0.1 }));
          m.position.set(x, 0, p.z);
          m.scale.y = 0.001;
          m.userData.h = h;
          s.scene.add(m);
          barras.push(m);
          s.etiqueta(p.txt, [x, h + 0.35, p.z], "chica");
        }
        s.etiqueta(k.valor, [x, -0.45, 1.6], "chica");
      });
    },
    entrar() {
      s.activar();
      barras.forEach((b, i) => {
        b.scale.y = 0.001;
        gsap.to(b.scale, { y: b.userData.h, duration: reducido ? 0 : 1.2, delay: 0.3 + i * 0.05, ease: "elastic.out(1, 0.7)" });
      });
    },
    salir: () => s.desactivar(),
  };
}

// ---------------- OLAP cube: revenue by region × segment ----------------
function cubo() {
  let s, celdas = [];
  const SEG = ["B2B Services", "Creator", "Ecommerce", "Enterprise", "SMB"];
  function modo(m) {
    for (const c of celdas) {
      const ver = m === "todo" || (m === "slice" && c.userData.region === "ES") || (m === "dice" && ["ES", "MX"].includes(c.userData.region) && ["B2B Services", "Enterprise"].includes(c.userData.seg));
      gsap.to(c.material, { opacity: ver ? 0.95 : 0.08, duration: 0.6 });
      gsap.to(c.scale, { y: ver ? c.userData.h : c.userData.h * 0.15, duration: 0.8, ease: "power3.inOut" });
    }
  }
  return {
    montar(el) {
      s = escena(el, { posicion: [10, 10, 13], objetivo: [0, 1.2, 0], autoGiro: 0.5 });
      const max = Math.max(...datos.pivote.flatMap((r) => SEG.map((k) => r[k])));
      const bajo = new THREE.Color(0x163a5c), alto = new THREE.Color(0x7cc4ea);
      datos.pivote.forEach((r, i) => {
        SEG.forEach((seg, j) => {
          const v = r[seg];
          const geo = new THREE.BoxGeometry(0.9, 1, 0.9);
          geo.translate(0, 0.5, 0);
          const color = bajo.clone().lerp(alto, Math.sqrt(v / max));
          const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.4, transparent: true, opacity: 0.95 }));
          const x = (j - 2) * 1.15, z = (i - 2.5) * 1.15;
          m.position.set(x, 0, z);
          m.userData = { h: (v / max) * 6, region: r.region, seg };
          m.scale.y = 0.001;
          s.scene.add(m);
          celdas.push(m);
        });
        s.etiqueta(r.region, [-3.3, 0, (i - 2.5) * 1.15], "chica");
      });
      SEG.forEach((seg, j) => s.etiqueta(seg, [(j - 2) * 1.15, -0.3, 3.7], "chica"));
      s.etiqueta("ES · €1,09 M", [-1.5, 6.6, -2.9], "chica");
      el.querySelector("[data-cubo-botones]").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        e.stopPropagation();
        el.querySelectorAll("[data-cubo-botones] button").forEach((x) => x.classList.toggle("activo", x === b));
        modo(b.dataset.modo);
      });
    },
    entrar() {
      s.activar();
      celdas.forEach((c, i) => {
        c.scale.y = 0.001;
        gsap.to(c.scale, { y: c.userData.h, duration: reducido ? 0 : 1, delay: 0.2 + i * 0.025, ease: "back.out(1.6)" });
      });
    },
    salir: () => s.desactivar(),
  };
}

// ---------------- Monte Carlo: 10.000 scenarios per option ----------------
function montecarlo() {
  let s, barras = [], gotas, gotasGeo, caidas = [];
  const ORDEN = ["product", "funnel", "webinar", "ads"];
  const NOMBRE = { product: "Producto nuevo", funnel: "Página mejorada", webinar: "Webinars", ads: "Duplicar publicidad" };
  const { bordes, conteos } = datos.histograma;
  const xDe = (eur) => (eur / 600000) * 14 - 14 / 6 - 0; // -200k..400k -> -4.67..9.33
  const MAX = Math.max(...Object.values(conteos).flat());
  return {
    montar(el) {
      s = escena(el, { posicion: [2.3, 9, 19], objetivo: [2.3, 1.5, 0], autoGiro: 0 });
      const ancho = xDe(bordes[1]) - xDe(bordes[0]);
      ORDEN.forEach((k, fila) => {
        const z = (fila - 1.5) * 2.2;
        conteos[k].forEach((n, b) => {
          if (!n) return;
          const geo = new THREE.BoxGeometry(ancho * 0.86, 1, 1.2);
          geo.translate(0, 0.5, 0);
          const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: COLOR[k], roughness: 0.45, transparent: true, opacity: 0.92 }));
          m.position.set(xDe((bordes[b] + bordes[b + 1]) / 2), 0, z);
          m.userData.h = (n / MAX) * 6;
          m.scale.y = 0.001;
          s.scene.add(m);
          barras.push(m);
        });
      });
      // The €0 wall: left of it, the option loses money.
      const pared = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), new THREE.MeshBasicMaterial({ color: COLOR.ads, transparent: true, opacity: 0.08, side: THREE.DoubleSide }));
      pared.rotation.y = Math.PI / 2;
      pared.position.set(xDe(0), 3.5, 0);
      s.scene.add(pared);
      s.etiqueta("€0 · a la izquierda se pierde", [xDe(0), 7.3, 0], "chica");
      [-200000, 0, 200000, 400000].forEach((v) => s.etiqueta(`€${v / 1000}k`, [xDe(v), -0.4, 4.4], "chica"));
      const grid = new THREE.GridHelper(16, 16, 0x94a3b8, 0xd5dbe3);
      grid.position.x = 2.3;
      s.scene.add(grid);

      // Falling scenarios: each drop lands in a bin drawn from the real histogram.
      const N = 1600;
      gotasGeo = new THREE.BufferGeometry();
      gotasGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      const col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const k = ORDEN[i % 4];
        const fila = ORDEN.indexOf(k);
        let u = Math.random() * 10000, b = 0;
        while ((u -= conteos[k][b]) > 0 && b < conteos[k].length - 1) b++;
        const x = xDe(bordes[b] + Math.random() * (bordes[1] - bordes[0]));
        caidas.push({ x, z: (fila - 1.5) * 2.2 + (Math.random() - 0.5), suelo: (conteos[k][b] / MAX) * 6, retraso: Math.random() * 2.5 });
        const c = new THREE.Color(COLOR[k]).lerp(new THREE.Color(0xffffff), 0.1);
        col.set([c.r, c.g, c.b], i * 3);
      }
      gotasGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      gotas = new THREE.Points(gotasGeo, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, depthWrite: false }));
      s.scene.add(gotas);

      el.querySelector("[data-tabla-mc]").innerHTML =
        `<div class="fmc cab"><i></i><span>Opción</span><b>Esperada</b><b>Riesgo</b></div>` +
        datos.montecarlo
          .map((m) => `<div class="fmc"><i style="background:var(--${m.clave})"></i><span>${NOMBRE[m.clave]}</span><b>${m.utilidad_esperada_eur < 0 ? "−" : ""}€${fmt(Math.abs(m.utilidad_esperada_eur) / 1000)} mil</b><b>${(m.prob_perdida * 100).toFixed(1).replace(".", ",")} %</b></div>`)
          .join("");
    },
    entrar() {
      s.activar();
      barras.forEach((b) => {
        b.scale.y = 0.001;
        gsap.to(b.scale, { y: b.userData.h, duration: reducido ? 0 : 2.4, delay: 0.6, ease: "power2.out" });
      });
      const t0 = performance.now();
      const a = gotasGeo.attributes.position.array;
      s.cada = (t) => {
        const seg = (t - t0) / 1000;
        caidas.forEach((c, i) => {
          const tt = Math.max(0, seg - c.retraso);
          const y = Math.max(c.suelo, 11 - 9 * tt * tt);
          a.set([c.x, seg < c.retraso ? -50 : y, c.z], i * 3);
        });
        gotasGeo.attributes.position.needsUpdate = true;
        gotas.material.opacity = Math.max(0, Math.min(1, 6 - seg));
      };
    },
    salir: () => s.desactivar(),
  };
}

export const escenas = { nube: nube(), estrella: estrella(), canales: canales(), cubo: cubo(), montecarlo: montecarlo() };
