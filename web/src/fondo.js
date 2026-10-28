// Background: a field of particles and slow wireframe solids in real 3D.
// The perspective camera follows the 2D camera, so near and far layers drift at different speeds (parallax).
import * as THREE from "three";

const ESCALA = 0.012; // world px -> background units

export function iniciarFondo(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x0b0e13);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0e13, 0.006);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);

  // Particles spread over the whole route, at several depths.
  const N = 4200;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const paleta = [new THREE.Color(0xed3237), new THREE.Color(0xb49739), new THREE.Color(0x1291c0), new THREE.Color(0x8892a6)];
  for (let i = 0; i < N; i++) {
    pos[i * 3] = -60 + Math.random() * 360;
    pos[i * 3 + 1] = 60 - Math.random() * 220;
    pos[i * 3 + 2] = -10 - Math.random() * 140;
    const c = paleta[Math.random() < 0.7 ? 3 : Math.floor(Math.random() * 3)];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const puntos = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.35, vertexColors: true, transparent: true, opacity: 0.75, sizeAttenuation: true, depthWrite: false }));
  scene.add(puntos);

  // A few slow wireframe solids: data "planets" along the route.
  const solidos = [];
  const formas = [new THREE.IcosahedronGeometry(6, 1), new THREE.TorusKnotGeometry(4, 1.1, 90, 10), new THREE.OctahedronGeometry(6, 0), new THREE.DodecahedronGeometry(5, 0)];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.LineSegments(
      new THREE.WireframeGeometry(formas[i % formas.length]),
      new THREE.LineBasicMaterial({ color: i % 3 === 0 ? 0xed3237 : i % 3 === 1 ? 0xb49739 : 0x1291c0, transparent: true, opacity: 0.16 }),
    );
    m.position.set(-30 + (i * 23) % 300, 40 - ((i * 37) % 200), -40 - (i % 4) * 22);
    m.userData.giro = new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.002);
    scene.add(m);
    solidos.push(m);
  }

  const objetivo = new THREE.Vector3(0, 0, 40);
  const actual = objetivo.clone();
  let giro = 0;
  let raf = 0;

  function tamano() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", tamano);
  tamano();

  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function cuadro() {
    actual.lerp(objetivo, quieto ? 1 : 0.08);
    camera.position.copy(actual);
    camera.lookAt(actual.x, actual.y, actual.z - 50);
    camera.rotateZ(giro);
    if (!quieto) for (const s of solidos) { s.rotation.x += s.userData.giro.x; s.rotation.y += s.userData.giro.y; }
    puntos.rotation.z = Math.sin(performance.now() / 20000) * 0.01;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(cuadro);
  }
  cuadro();
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) cuadro();
  });

  return {
    camara({ x, y, z, r }) {
      // Zooming out moves the background camera back; rotation rolls it a little.
      objetivo.set(x * ESCALA, -y * ESCALA, 12 + 28 / Math.max(z, 0.05) ** 0.5);
      giro = ((-r * Math.PI) / 180) * 0.3;
    },
  };
}
