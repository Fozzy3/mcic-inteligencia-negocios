# Presentación interactiva

Sitio que cuenta el proyecto como un Prezi: un solo lienzo con 35 marcos y una cámara que viaja entre
ellos, gráficos animados con los números reales, escenas 3D (three.js), una figura isométrica hecha con
la skill [Anatomy](https://github.com/wheresryan22/anatomy) y la arquitectura propuesta en AWS.

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/ (también reconstruye la figura isométrica)
npm run preview    # sirve dist/
```

Desde la raíz también: `make web` (dev) y `make web-build`.

## Navegación

| Tecla | Acción |
|---|---|
| `→` `espacio` rueda ↓ | siguiente (primero revela los pasos del marco) |
| `←` rueda ↑ | anterior |
| `O` | vista general; clic en un marco para ir |
| `N` | notas del presentador |
| `F` | pantalla completa |
| `1`…`5` | saltar a cada paso |

Cada marco tiene su propia URL (`#matriz`, `#aws`…). En la consola: `presentacion.ir("aws", 3)`.

## De dónde salen los datos

`src/datos.json` se genera con `uv run python web/scripts/exportar_datos.py` (desde la raíz). Lee
`salidas/*.csv` y vuelve a correr la simulación de `src/bi/model.py` para guardar los histogramas de los
10.000 escenarios, la nube de 20.000 puntos y el AUC temporal.

## Estructura

```text
index.html            los 35 marcos (contenido) y el HUD
src/main.js           motor tipo Prezi: cámara, vuelos con zoom, pasos, teclado, rueda, táctil, vista general
src/fondo.js          fondo 3D con parallax que sigue a la cámara
src/tres.js           escenas 3D: nube de puntos, esquema estrella, canales, cubo OLAP, Monte Carlo
src/graficos.js       gráficos SVG animados (GSAP) y el recorrido del diagrama AWS
anatomy/build.mjs     figura isométrica "comparador de opciones" (kit de Anatomy en anatomy/kit, MIT)
aws/                  diagrama draw.io de la arquitectura propuesta, exportaciones y guía
public/               logos, figura construida y diagrama servido por el sitio
```
