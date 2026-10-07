---
marp: true
paginate: true
size: 16:9
style: |
  section { font-size: 26px; background: #fcfcfb; color: #0b0b0b; }
  h1 { font-size: 40px; } h2 { font-size: 32px; color: #2a78d6; }
  table { font-size: 20px; } img { display: block; margin: 0 auto; }
  .small { font-size: 18px; color: #52514e; }
---

# ¿En qué invertir para crecer el próximo año?

Proyecto integrador de Inteligencia de Negocios

20.000 oportunidades de venta · enero 2024 a abril 2026 · datos sintéticos

<!-- Guion: tenemos cuatro opciones y hay que elegir. No nos preguntamos cuál vende más, sino cuál deja más ganancia y con qué riesgo. -->

---

## Cómo trabajamos

| Paso | Pregunta |
|---|---|
| 1. Entender el negocio | ¿Qué hay que decidir? |
| 2. Limpiar los datos | ¿Podemos confiar en ellos? |
| 3. Organizar y medir | ¿Cómo va el negocio? |
| 4. Modelar | ¿Qué hace que alguien compre? |
| 5. Simular | ¿Qué pasaría con cada opción? |
| 6. Comunicar | ¿Qué hacemos? |

**Opciones:** mejorar el funnel · webinars · duplicar publicidad · nuevo producto

<!-- Guion: medimos ganancia neta, lo que queda después de pagar producto, publicidad y envío. Una venta que cuesta más de lo que deja sube las ventas y hace perder dinero. -->

---

## Limpiar: los datos tenían trampas

- 12 revisiones automáticas → **0 problemas**. El archivo original no se toca.
- **Costo escondido:** cada venta tiene €22 de costo fijo.
- **Dato repetido:** sumar el gasto en publicidad fila por fila da €4,55 M; el real es **€854 mil**.
- **Dos gastos que no coinciden:** €854 mil declarados frente a €117 mil asignados.
- **Producto ofrecido solo a algunos:** no se puede comparar sin separar por tipo de cliente.
- **Datos del futuro:** ingreso y días hasta cerrar no entran al modelo.

<!-- Guion: que las revisiones den cero no quiere decir que no haya nada que limpiar. Si ignoramos estos puntos, llegamos a conclusiones equivocadas. -->

---

## Modelar: ¿qué hace que alguien compre?

- **Regresión logística**, simple y explicable. Solo usa datos que se conocen antes de la compra.
- Se entrenó con 2024–2025 y se probó con **2026**, un año que no vio.
- Acierta 3 de cada 4 veces al ordenar quién compra (AUC 0,745).
- El 20 % con mayor puntaje reúne el **43 %** de las ventas.

![w:700](fig/4_lift_modelo.png)

<!-- Guion: elegimos un modelo que se pueda explicar porque lo usamos para comparar opciones, no para ganar un concurso de precisión. -->

---

## El negocio va bien, por convertir mejor

| | Año anterior | Último año | Cambio |
|---|---|---|---|
| Ventas | 694 | 1.224 | +76 % |
| Conversión | 9,0 % | 12,2 % | +3,2 puntos |
| Costo por venta | €81 | €66 | −18 % |
| Ganancia neta | €487 mil | €934 mil | **+92 %** |

![w:760](fig/2_tendencia_funnel.png)

<!-- Guion: la conversión salta justo cuando se adopta el funnel mejorado, y el modelo confirma el efecto aun comparando dentro del mismo trimestre. -->

---

## Más publicidad, peor resultado

![w:1000](fig/3_ads_saturacion.png)

Facebook y Google traen el **39 %** de los interesados, pero solo el **13 %** de la ganancia.

<!-- Guion: con el gasto saturado, conseguir una venta cuesta casi cinco veces más y cada interesado hace perder dinero. -->

---

## Comparación de las cuatro opciones

![w:1000](fig/5_montecarlo.png)

<p class="small">200 repeticiones con muestras distintas de los datos × 10.000 simulaciones de costo y alcance. Ganancia extra a 12 meses.</p>

<!-- Guion: el producto tiene la mayor ganancia esperada, pero el rango más amplio. El funnel gana un poco menos y es mucho más seguro. Duplicar la publicidad pierde en el 99,5 % de los escenarios. -->

---

## Recomendación

1. **Ahora:** funnel mejorado para todos. €120 mil esperados, sin escenarios de pérdida. Hoy llega solo al 19 %.
2. **En paralelo:** piloto del nuevo producto con un grupo de comparación. Es la opción con más ganancia (€175 mil), pero la evidencia es de solo ~55 ventas.
3. **No duplicar la publicidad.** Aclarar con finanzas cuál de los dos gastos es el real.
4. **Webinars** solo si cuestan menos de €48 mil al año.
5. **Usar el puntaje del modelo** para decidir a quién llamar primero.

<!-- Guion: el funnel y el producto no compiten entre sí: uno sube la conversión y el otro el valor de cada venta. -->

---

## Qué podría cambiar la conclusión

- Si el producto cuesta más de **€84 mil** lanzarlo, el funnel pasa a ser la mejor opción.
- Si el gasto real en publicidad es el declarado, la publicidad sale aún peor.
- Los costos de implementación son supuestos: hay que validarlos con cada área.
- Datos sintéticos: el método sirve, las cifras no describen una empresa real.

<!-- Guion: cerramos con los límites, porque una recomendación que no dice cuándo deja de valer no se puede defender. -->
