---
title: Proyecto integrador de Inteligencia de Negocios
subtitle: Cómo usar los datos de ventas para decidir en qué invertir
lang: es
---

Este documento cuenta, paso a paso, cómo pasamos de un archivo de 20.000 filas a una recomendación
para la gerencia. Está escrito para leerse sin formación financiera: cada término se explica la primera
vez que aparece y hay un glosario corto al inicio.

Datos: `data/original/dataset_ventas_transaccional_sintetico_es.csv` (sintético, montos en euros,
enero de 2024 a abril de 2026). Cada número del informe indica de qué tabla sale y se puede regenerar
con `make run`.

---

## El proceso en una página

Seguimos el ciclo clásico de un proyecto de ciencia de datos, adaptado a inteligencia de negocios:

| Paso | Pregunta que responde | Qué hicimos | Dónde |
|---|---|---|---|
| 1. Entender el negocio | ¿Qué hay que decidir? | Definir la decisión y 6 preguntas | Fase 1 |
| 2. Entender y limpiar los datos | ¿Podemos confiar en los datos? | 12 revisiones automáticas en SQL y 7 problemas resueltos | Fase 2 |
| 3. Organizar y medir | ¿Cómo va el negocio? | Esquema estrella e indicadores | Fase 3 |
| 4. Modelar | ¿Qué hace que alguien compre? | Modelo que predice la probabilidad de compra | Fase 3 |
| 5. Simular | ¿Qué pasaría con cada opción? | "¿Qué habría pasado si…?" + 10.000 simulaciones | Fases 3 y 4 |
| 6. Comunicar | ¿Qué hacemos? | Hallazgos, recomendación y límites | Fase 5 |

```text
 archivo original (no se toca)
      -> SQL: limpiar y validar          sql/01_preparacion.sql
      -> SQL: indicadores y estrella     sql/02_indicadores.sql, sql/03_modelo_estrella.sql
      -> Python: modelo + simulación     src/bi/model.py
      -> gráficas + informe              src/bi/plots.py, informe/
```

## En cinco frases

1. **El negocio va bien**: en el último año hubo 76 % más ventas y la ganancia neta casi se duplicó (+92 %).
2. **La mejora vino de convertir mejor**, no de atraer más gente: el porcentaje de interesados que compra
   pasó de 9 % a 12 %, justo cuando se adoptó una versión mejorada del recorrido de compra (el "funnel").
3. **Gastar más en publicidad no sirve**: con el gasto más alto, conseguir una venta cuesta casi 5 veces más.
4. **Recomendación**: llevar el funnel mejorado a todos los clientes (ganancia esperada de €120 mil al año,
   casi sin riesgo) y probar el nuevo producto en un piloto antes de lanzarlo en grande.
5. **Límite**: los datos son sintéticos; el método se puede reutilizar, las cifras no describen una empresa real.

## Glosario mínimo

| Término | Qué significa aquí |
|---|---|
| Oportunidad | Una persona interesada que podría comprar. Es cada fila de la tabla |
| Conversión | Porcentaje de oportunidades que terminan en compra |
| Ticket | Valor promedio de una venta |
| Ganancia neta | Lo que queda de una venta después de pagar el producto, la publicidad y el envío. Es la medida de valor de todo el informe |
| Costo por venta | Cuánto se gasta en publicidad para conseguir una venta (en marketing se le llama CAC) |
| Funnel | El recorrido de compra en la web: página de llegada, botón, regalo descargable y pago |
| Fuga de información | Usar en un modelo datos que solo se conocen después del resultado. El modelo parece bueno y falla en la práctica |
| "¿Qué habría pasado si…?" | Usar el modelo para estimar el resultado de un cambio que no ocurrió (en estadística, contrafactual) |
| Simulación Monte Carlo | Repetir un cálculo miles de veces con supuestos que varían, para ver todos los resultados posibles y no solo uno |
| Escenario pesimista / optimista | En 9 de cada 10 simulaciones se gana al menos el pesimista; solo en 1 de cada 10 se supera el optimista (percentiles 10 y 90) |

---

## Fase 1. El problema y las preguntas

### La situación

Una empresa que vende en línea en España y Latinoamérica registra cada oportunidad: por qué canal llegó
(email, Google, Facebook…), qué tipo de cliente es, qué versión de la web vio, si fue invitada a un
webinar, si se le ofreció un producto nuevo y si al final compró.

La gerencia está considerando cuatro opciones para el próximo año:

| Opción | En qué consiste |
|---|---|
| Mejorar el funnel | Usar en toda la web la página, el botón, el regalo descargable y el pago simplificado que ya se probaron |
| Webinars | Invitar a un webinar a todos los clientes que ya conocen la marca |
| Duplicar publicidad | Doblar el gasto diario en Facebook y Google |
| Nuevo producto | Ofrecer un producto premium, más caro |

**¿Por qué medimos ganancia neta y no ventas?** Una venta que cuesta €900 de publicidad y deja €800 sube
las ventas, pero hace perder dinero. La ganancia neta ya descuenta esos costos.

### Las preguntas que guían el análisis

| # | Pregunta | Por qué importa |
|---|---|---|
| P1 | ¿El negocio está creciendo bien? | Antes de invertir hay que saber si lo actual funciona |
| P2 | ¿Qué canales y clientes dejan más ganancia? | Mucho volumen no siempre es mucho valor |
| P3 | ¿Qué explica la mejora de 2025? | Si fue el funnel, extenderlo es la decisión obvia |
| P4 | ¿Más publicidad trae más ganancia? | Es la opción más tentadora y la más cara |
| P5 | ¿Qué hace que una persona compre? | Para comparar opciones hay que saber qué mueve la compra |
| P6 | ¿Qué opción deja más ganancia y con qué riesgo? | Es la decisión que hay que tomar |

---

## Fase 2. Preparar y validar los datos

**Regla de oro:** el archivo original nunca se modifica (está guardado como solo lectura). Toda limpieza
se hace con consultas SQL que crean una versión limpia aparte (`sql/01_preparacion.sql`). Así cualquiera
puede revisar qué se hizo y volver al dato original.

### Qué datos tenemos

20.000 filas y 28 columnas, que se agrupan en seis familias (el detalle de cada columna está en el Anexo A):

| Familia | Ejemplos | Para qué la usamos |
|---|---|---|
| Identificación y tiempo | id, fecha, mes, trimestre | Contar sin duplicar y ver la evolución |
| Quién es el cliente | tipo de cliente, etapa, país, dispositivo | Comparar grupos |
| De dónde llegó | canal, objetivo de campaña, nivel de gasto en publicidad | Medir el valor de cada canal |
| Qué vivió (las palancas) | versión de página, botón, regalo, pago simplificado, webinar, producto nuevo | Lo que la empresa puede cambiar |
| Qué pasó | compró o no, días hasta cerrar | El resultado que queremos explicar |
| Cuánto valió y costó | ingreso, margen, costo de publicidad, ganancia neta | Medir el valor |

Además creamos tres columnas que simplifican el análisis: si vio el **funnel mejorado completo**, si llegó
por **publicidad pagada** y su **estado en el webinar** (no invitado, invitado, asistió).

### Doce revisiones automáticas

Cada revisión cuenta cuántas filas tienen un problema (`salidas/validacion.csv`). **Las doce dieron cero.**

| Qué se revisa | Por qué |
|---|---|
| Que no haya oportunidades repetidas | Una fila duplicada infla las ventas |
| Que no falten datos clave (canal, fecha, resultado) | Sin ellos la fila no sirve |
| Que el mes coincida con la fecha | Si no, los totales por mes y por día no cuadran |
| Que los valores sean posibles: puntajes entre 1 y 99, márgenes entre 0 y 1, sí/no solo como 0/1 | Un valor imposible distorsiona los promedios |
| Que las columnas sean coherentes: nadie asiste a un webinar sin invitación, solo hay "días hasta cerrar" si hubo compra, el ingreso es cero si no hubo venta, y las ganancias cuadran con ingresos y costos | Detecta errores de registro |

### Lo que encontramos al limpiar

Que las revisiones den cero no significa que el dato esté listo. Estos siete puntos cambian las conclusiones
si se ignoran:

| # | Qué vimos | Por qué importa | Qué hicimos |
|---|---|---|---|
| 1 | **Un costo escondido.** La ganancia neta no cuadraba en 2.096 filas: todas eran ventas y siempre faltaban €22 | Sin entenderlo, parece un error de cálculo | Era un costo fijo por venta (por ejemplo, envío). Lo documentamos como regla del negocio |
| 2 | **Un dato repetido.** El gasto diario de cada campaña aparece en todas las oportunidades de ese día | Sumarlo fila por fila da €4,55 millones; el gasto real es €854 mil (5 veces menos) | Lo pasamos a una tabla aparte, con una fila por campaña y día |
| 3 | **Dos gastos que no coinciden.** El gasto de campaña declarado (€854 mil) es 7 veces el asignado a las oportunidades (€117 mil) | Si el verdadero es el declarado, la publicidad es aún menos rentable | Usamos el asignado, que es el que entra en la ganancia, y lo dejamos como pregunta abierta |
| 4 | **Ceros y vacíos que no son errores.** El ticket vale 0 y los días hasta cerrar están vacíos cuando no hubo venta (90 % de las filas) | Promediar el ticket en todas las filas da €116 en vez de ~€1.100 | El ticket se calcula solo sobre ventas, y los vacíos no se rellenan |
| 5 | **Datos del futuro.** Ingreso, margen y días hasta cerrar se conocen después de la compra | Si el modelo los usa, "adivina" la compra con información de la compra | Los sacamos del modelo (fuga de información) |
| 6 | **Un producto que solo se ofreció a algunos.** El producto nuevo solo se ofreció a clientes B2B Services, Ecommerce y Enterprise, que ya compran caro | Comparar "con oferta vs. sin oferta" le atribuye al producto el valor del tipo de cliente | Comparamos dentro de cada tipo de cliente y no suponemos efectos en quienes nunca lo recibieron |
| 7 | **Cambios que coinciden en el tiempo.** El nivel de publicidad y el funnel cambiaron por periodos; además 2026T2 solo tiene abril | Comparar promedios mezcla el efecto de la palanca con el del momento | El modelo compara oportunidades del mismo trimestre y las gráficas avisan del trimestre incompleto |

---

## Fase 3. Modelo analítico e indicadores

### 3.1 Organizar los datos: esquema estrella

En BI no se trabaja con una sola tabla gigante. Se separa en una **tabla de hechos** (lo que se mide: si compró,
cuánto pagó, cuánto costó) y **tablas de consulta** o dimensiones (por dónde se corta: fecha, canal, cliente,
experiencia). Así es como mejor funcionan Power BI, Tableau o una tabla dinámica.

```text
                    fecha
                      |
   canal ------ OPORTUNIDADES ------ experiencia (funnel, webinar, producto)
                 |          |
              cliente     campaña

   GASTO POR CAMPAÑA Y DÍA ---- fecha, canal      (tabla aparte: problema 2 de la Fase 2)
```

Control de calidad: al volver a unir las tablas se obtienen exactamente los totales del archivo original
(20.000 filas, €2,33 millones de ingresos), y una prueba automática lo verifica. Las tablas quedan exportadas en
`data/modelo_estrella/` (`sql/03_modelo_estrella.sql`).

### 3.2 Indicadores

| Indicador | Pregunta que responde | Cómo se calcula |
|---|---|---|
| Conversión | ¿Qué tan bien convencemos? | ventas / oportunidades |
| Ticket | ¿Cuánto vale cada venta? | ingresos / ventas |
| Costo por venta | ¿Cuánto cuesta conseguir una venta? | gasto en publicidad / ventas |
| Ganancia neta por oportunidad | ¿Cuánto vale cada interesado que llega? | ganancia neta / oportunidades |
| % con funnel mejorado | ¿Cuánto se ha adoptado la mejora? | oportunidades con las 4 mejoras / total |
| Ganancia esperada y probabilidad de perder | ¿Qué opción conviene y qué tan segura es? | Simulación (3.4) |

La **ganancia neta por oportunidad** es el indicador más útil: resume en un número si la gente compra,
cuánto paga y cuánto costó traerla. Todos los indicadores están calculados por canal, cliente, país,
mes y trimestre en `salidas/kpi.csv`, listos para cualquier herramienta de BI.

### 3.3 El modelo: ¿qué hace que alguien compre?

**Objetivo.** Estimar, para cada oportunidad, la probabilidad de que compre.

**Por qué este modelo.** Usamos una **regresión logística**, uno de los modelos más simples para predecir
un sí o un no. La elegimos porque el efecto de cada variable se puede explicar en una frase: para
comparar opciones necesitamos entender el modelo, no solo que acierte.

**Qué variables usa.** Solo las que se conocen antes de la compra: canal, tipo de cliente, país,
dispositivo, nivel de publicidad, palancas del funnel, webinar, oferta de producto, puntaje previo del
interesado y trimestre. Quedan fuera las que tienen fuga de información (problema 5).

**Cómo lo evaluamos.** Lo entrenamos con 2024 y 2025 y lo probamos con 2026, un periodo que nunca vio. Es la
prueba honesta, porque así se va a usar: para predecir lo que viene.

| Medida | Resultado | Cómo leerlo |
|---|---|---|
| AUC | 0,745 | Si se toman al azar una persona que compró y una que no, el modelo le da mayor puntaje a la que compró 3 de cada 4 veces (adivinar sería 1 de cada 2) |
| 10 % con mayor puntaje | compra el 33,5 % | 2,6 veces el promedio de 2026 (12,8 %) |
| 20 % con mayor puntaje | reúne el 43 % de las ventas | Atenderlos primero rinde más del doble que atender al azar |

Fuente: `salidas/lift_2026.csv`.

**Qué aprendió.** Cuánto cambian las chances de compra con cada factor, dejando todo lo demás igual
(`salidas/drivers.csv`; "chances" = probabilidad de comprar dividida entre la de no comprar):

| Factor | Efecto en las chances de compra |
|---|---|
| Puntaje previo del interesado (16 puntos más) | +82 % |
| Asistir al webinar (además de ser invitado) | +43 % |
| Botón que explica el beneficio | +24 % |
| Página de llegada nueva | +17 % |
| Regalo descargable | +16 % |
| Pago simplificado | +5 % |
| Publicidad en nivel saturado (frente a medio) | −49 % |
| Ofrecer el producto nuevo | −38 % (compran menos, pero cada venta vale el doble) |

### 3.4 De la predicción a la decisión

El modelo dice qué mueve la compra. Para decidir hacen falta tres pasos más:

1. **"¿Qué habría pasado si…?"** Tomamos las 10.073 oportunidades del último año y le pedimos al modelo la
   ganancia esperada con cada opción aplicada:
   - Funnel: todas ven las cuatro mejoras.
   - Webinars: los 3.334 clientes conocidos que no fueron invitados reciben invitación y asiste 1 de cada 4,
     como en el pasado.
   - Producto: se ofrece a los 5.858 clientes de los tres tipos donde hay evidencia.
   - Publicidad: como el gasto ya fue alto o saturado en algunos periodos, usamos lo que pasó entonces.
2. **Incertidumbre de los datos.** Repetimos todo el cálculo 200 veces, cada vez con una muestra distinta
   de las mismas filas (bootstrap). Si el resultado cambia mucho entre repeticiones, la evidencia es débil.
3. **Incertidumbre de la ejecución.** Ninguna iniciativa sale exactamente como se planea. Corremos 10.000
   simulaciones en las que varían el costo de implementarla y a cuánta gente llega:

| Opción | Costo de implementación (mínimo / probable / máximo) | A cuánta gente llega |
|---|---|---|
| Funnel | €8 mil / €12 mil / €20 mil | 70 a 100 % |
| Webinars | €9,6 mil / €14,4 mil / €24 mil (12 sesiones al año) | 50 a 100 % |
| Publicidad | €0 / €2 mil / €5 mil (gestión; el gasto en anuncios ya está en los datos) | 100 % |
| Producto | €15 mil / €25 mil / €45 mil | 30 a 90 % |

Estos costos **son supuestos nuestros, no salen de los datos**. Por eso en la Fase 4 decimos cuánto tendrían
que cambiar para que cambie la recomendación.

---

## Fase 4. Resultados

### 4.1 ¿El negocio está creciendo bien? (P1)

Último año (mayo 2025 a abril 2026) frente al año anterior (`salidas/crecimiento.csv`):

| Indicador | Año anterior | Último año | Cambio |
|---|---|---|---|
| Oportunidades | 7.680 | 10.073 | +31 % |
| Ventas | 694 | 1.224 | +76 % |
| Conversión | 9,0 % | 12,2 % | +3,2 puntos |
| Costo por venta | €81 | €66 | −18 % |
| Ganancia neta | €487 mil | €934 mil | +92 % |

**Lectura:** las ventas crecen más que los interesados y la ganancia más que las ventas. Es crecimiento por
eficiencia, el más sano. La alerta: el gasto total en publicidad sube 44 %, y ese dato no es del todo
confiable (problema 3).

![Figura 1. Ingresos y ganancia neta por mes. Fuente: `kpi`, dimensión mes.](fig/0_evolucion_mensual.png)

### 4.2 ¿Dónde está el valor? (P2)

![Figura 2. Ganancia neta por oportunidad y conversión por canal. Fuente: `kpi`, dimensión canal.](fig/1_canales.png)

- Facebook y Google traen el **39 %** de los interesados, pero solo el **13 %** de la ganancia.
- Email, SEO (blog) y Webinar traen el 40 % de los interesados y el **69 %** de la ganancia.
- Los clientes Enterprise son el 10 % de los interesados y dejan el **24 %** de la ganancia.
- España reúne el 47 % de los ingresos, pero todos los países son igual de rentables, así que el país no cambia la
  decisión (`salidas/pivote_ingresos_region_segmento.csv`).

### 4.3 ¿Qué explica la mejora? (P3)

![Figura 3. Conversión y adopción del funnel mejorado por trimestre (2026T2 solo incluye abril). Fuente: `kpi`, dimensión trimestre.](fig/2_tendencia_funnel.png)

- **Hecho:** la conversión salta de ~9 % a ~13 % en el tercer trimestre de 2025, el mismo en que el
  funnel mejorado pasa de 0 % a 16 % de las oportunidades.
- **Explicación probable:** el funnel mejorado.
- **¿Por qué no es casualidad?** El modelo compara oportunidades con y sin las mejoras dentro del mismo trimestre,
  canal y tipo de cliente, y las mejoras siguen aumentando la compra (3.3).
- **Pendiente:** confirmar que no hubo otros cambios en esas fechas (precios, equipo de ventas).

### 4.4 ¿Más publicidad trae más ganancia? (P4)

![Figura 4. Costo por venta y ganancia por oportunidad según el nivel de gasto en publicidad. Fuente: `ads_niveles`.](fig/3_ads_saturacion.png)

No. Pasar del gasto medio (el actual) al saturado multiplica el gasto por 2,5, pero los interesados solo por 1,3,
y además son de menor calidad (puntaje promedio de 52,5 a 37,8). Resultado: cada venta cuesta €853 en vez de €178,
y cada interesado deja −€3 en lugar de €36 (`salidas/ads_niveles.csv`).

### 4.5 ¿Funciona el modelo? (P5)

![Figura 5. Porcentaje que compró en 2026 según el puntaje del modelo entrenado con 2024–2025. Fuente: `salidas/lift_2026.csv`.](fig/4_lift_modelo.png)

Sí: quienes tienen mejor puntaje compran mucho más. Además de servir para decidir la inversión, el modelo le
dice al equipo comercial a quién llamar primero.

### 4.6 ¿Qué opción conviene? (P6)

![Figura 6. Ganancia extra a 12 meses por opción, en 10.000 simulaciones. El punto es el valor central; la barra va del escenario pesimista al optimista. Fuente: `salidas/montecarlo_resumen.csv`.](fig/5_montecarlo.png)

| Opción | Ganancia esperada en 12 meses | Pesimista | Optimista | Probabilidad de perder |
|---|---|---|---|---|
| Nuevo producto (3 tipos de cliente) | €175 mil | €75 mil | €285 mil | 0,1 % |
| Mejorar el funnel | €120 mil | €77 mil | €166 mil | 0 % |
| Webinars | €32 mil | €8 mil | €56 mil | 3,9 % |
| Duplicar publicidad | −€101 mil | −€158 mil | −€45 mil | 99,5 % |

Cómo leerla:

- **El producto** tiene la mayor ganancia esperada, pero también el rango más amplio: es la apuesta menos segura.
- **El funnel** gana un poco menos, pero con un rango estrecho y sin escenarios de pérdida: es la apuesta más segura.
- **Duplicar publicidad** pierde dinero en casi todas las simulaciones.
- **No son excluyentes.** El funnel mejora la conversión y el producto el valor de cada venta; se pueden hacer los dos.

**¿Cuándo cambiaría la recomendación?**

- Si lanzar el producto cuesta más de **€84 mil**, el funnel pasa a ser la mejor opción.
- Los webinars solo valen la pena si el programa cuesta menos de **€48 mil** al año.

---

## Fase 5. Hallazgos y recomendación

### Hallazgos

Separamos lo que muestran los datos (hecho), lo que creemos que lo explica (interpretación) y lo que
falta confirmar:

| Hecho | Explicación probable | Falta confirmar |
|---|---|---|
| La conversión subió de 9 % a 12 % y el costo por venta bajó 18 % | El funnel mejorado | Otros cambios en las mismas fechas |
| La publicidad trae el 39 % de los interesados y solo el 13 % de la ganancia | Más gasto compra tráfico de peor calidad | Cuál de los dos gastos registrados es el real |
| El producto nuevo duplica la ganancia por venta dentro de cada tipo de cliente | Es un producto premium (€2.827 frente a €1.064) | Solo hay ~55 ventas: puede ser novedad o quitarle ventas a otros productos |
| Asistir al webinar aumenta las chances de compra un 43 %, pero solo asiste 1 de cada 4 invitados | El valor está en que asistan, no en invitar | El costo real de cada sesión |

### Recomendación a la gerencia

1. **Ahora: funnel mejorado para todos.** Hoy solo lo ve el 19 % de las oportunidades. Es la opción con mejor
   relación entre ganancia y seguridad, y la que tiene más evidencia (cuatro trimestres).
2. **En paralelo: piloto del producto nuevo** en B2B Services, Ecommerce y Enterprise durante un trimestre,
   ofreciéndolo a un grupo elegido al azar y comparándolo con otro que no lo recibe. Escalarlo solo si el
   piloto confirma la mejora.
3. **No duplicar la publicidad.** Mantener el nivel actual y aclarar con finanzas por qué los dos registros de
   gasto no coinciden.
4. **Webinars, solo si cuestan menos de €48 mil al año**, y medir cuántos asisten, no cuántos se invitan.
5. **Usar el puntaje del modelo** para que el equipo comercial atienda primero a los más probables.

### Preguntas difíciles que esperamos

| Pregunta | Respuesta |
|---|---|
| ¿Por qué no comparar promedios y ya? | Porque mezclan el efecto de la palanca con el tipo de cliente y el momento. Con promedios simples, el producto parecía valer el doble de lo que estimamos al comparar dentro de cada tipo de cliente |
| ¿Cómo saben que el modelo no hace trampa? | No usa datos posteriores a la compra y se probó en 2026, un año que no vio al entrenar |
| ¿Y si los costos supuestos están mal? | Por eso decimos cuándo cambia la recomendación: el producto tendría que costar más de €84 mil |
| ¿Por qué no coincide con el ejercicio original del caso? | El caso original estimaba que duplicar la publicidad ganaba €31 mil y que el producto bajaba la compra un 25 %. El histórico muestra que el gasto saturado pierde dinero y que, dentro de cada tipo de cliente, el producto baja la conversión entre 0 y 3,3 puntos |
| ¿Sirve para una empresa real? | El método sí; las cifras no, porque los datos son sintéticos |

---

## Anexo A. Diccionario de variables

| Variable | Tipo | Qué representa | Uso |
|---|---|---|---|
| transaction_id | Identificador | Una oportunidad (una fila) | Validar que no haya repetidos |
| date | Fecha | Día de la oportunidad | Evolución en el tiempo |
| month, quarter | Fecha (derivada) | Mes y trimestre | Se valida que coincidan con la fecha |
| channel | Categoría | Canal de llegada (7) | Dimensión principal |
| campaign_objective | Categoría | Objetivo de la campaña (captar, nutrir, recuperar…) | Dimensión |
| customer_segment | Categoría | Tipo de cliente (B2B Services, Enterprise, Ecommerce, Creator, SMB) | Dimensión; valor de cada venta |
| lifecycle_stage | Categoría | Visitante nuevo, contacto conocido o cliente que vuelve | Define a quién invitar al webinar |
| device, geo_region | Categoría | Dispositivo y país | Dimensiones |
| ad_budget_level | Categoría ordenada | Nivel de gasto en publicidad (bajo → saturado) | Solo en canales pagados |
| campaign_daily_spend_eur | Número | Gasto diario de la campaña | Se repite por fila (problema 2) |
| cost_attributed_eur | Número | Costo de publicidad asignado a la oportunidad | Entra en la ganancia; fuera del modelo |
| landing_variant, cta_variant | Categoría | Versión de la página y del botón | Palancas del funnel |
| lead_magnet, checkout_simplified | Sí/No | Recibió el regalo / pago simplificado | Palancas del funnel |
| webinar_invited, webinar_attended | Sí/No | Invitado / asistió al webinar | Palanca webinar |
| new_product_offer | Sí/No | Se le ofreció el producto nuevo | Palanca producto |
| lead_score | Número (1–99) | Puntaje previo del interesado | Variable más predictiva |
| converted_to_sale | Sí/No | Compró | Lo que el modelo predice |
| days_to_close | Número | Días hasta la compra | Solo si compró; fuera del modelo (fuga) |
| aov_eur, revenue_eur | Número | Ticket e ingreso (iguales; 0 si no compró) | Indicadores |
| gross_margin_pct, gross_profit_eur | Número | Margen y ganancia bruta | Indicadores; fuera del modelo |
| contribution_profit_eur | Número | Ganancia neta | Medida de valor del informe |

## Anexo B. Cómo reproducir todo

```bash
make install   # crea el entorno
make test      # 8 pruebas automáticas
make run       # limpia, calcula, entrena, simula y regenera tablas y gráficas (~2 min)
make pdf       # regenera este documento
```

| Archivo | Contenido |
|---|---|
| `sql/01_preparacion.sql` | Versión limpia de los datos y las 12 revisiones |
| `sql/02_indicadores.sql` | Indicadores, crecimiento y publicidad por nivel de gasto |
| `sql/03_modelo_estrella.sql` | Esquema estrella |
| `src/bi/model.py` | Modelo, "¿qué habría pasado si…?", simulación y supuestos de costo |
| `src/bi/pipeline.py` | Ejecuta todo de principio a fin |
| `src/bi/plots.py` | Gráficas |
| `salidas/` | Tablas de resultados citadas en este documento |
