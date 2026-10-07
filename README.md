# Proyecto integrador de Inteligencia de Negocios

Juan Felipe Rodríguez Galindo (20261595004) y Carlos Stiven Mora Hoyos (20261595003)
Maestría en Ciencias de la Información y las Comunicaciones, Universidad Distrital Francisco José de Caldas.

La pregunta es en qué iniciativa de crecimiento debería invertir la empresa el próximo año. El proyecto recorre
el flujo completo sobre 20.000 oportunidades comerciales: validación del dato en SQL, esquema estrella,
indicadores, un modelo de conversión, escenarios contrafactuales y simulación Monte Carlo.

## Entregables

| Archivo | Contenido |
|---|---|
| [`informe/informe.pdf`](informe/informe.pdf) | Informe completo, con el SQL en el anexo |
| [`presentacion/presentacion.pdf`](presentacion/presentacion.pdf) | Diapositivas de la sustentación (plantilla institucional UD) |

Las fuentes están en `informe/informe.tex` y `presentacion/presentacion.tex`.

## Datos

El archivo original está en `data/original/dataset_ventas_transaccional_sintetico_es.csv` (sha256
`b51f235e…ef12e5`), junto con los materiales del enunciado del caso. Todo el proceso trabaja sobre vistas y
nunca lo modifica.

## Cómo se ejecuta

```bash
make install       # crea el entorno con uv
make test          # pruebas automáticas
make run           # valida, calcula indicadores, entrena, simula y regenera salidas/ y las figuras
make pdf           # compila informe y presentación con tectonic
```

`make pdf` copia las fuentes institucionales (Times New Roman y Cambria) desde el manual de marca a `fuentes/`,
que no se versiona. Si el manual está en otra ruta: `make pdf MARCA=/ruta/al/manual`.

## Estructura

```text
sql/
  01_preparacion.sql      vista limpia `ventas` y 15 reglas de validación
  02_indicadores.sql      cubo de indicadores, crecimiento 12m vs 12m, publicidad por nivel de gasto
  03_modelo_dimensional.sql  2 tablas de hechos, 5 dimensiones y controles de la estrella
src/bi/
  model.py                regresión logística, escenarios, bootstrap, Monte Carlo y supuestos de costo
  pipeline.py             ejecuta todo de principio a fin y se detiene si falla una regla
  plots.py                figuras del informe
tests/test_bi.py          pruebas de validación, indicadores, estrella, crecimiento, modelo y simulación
salidas/                  tablas de resultados citadas en el informe
informe/                  informe LaTeX, figuras (fig/) y logos (img/)
presentacion/             diapositivas LaTeX y fondos institucionales (assets/)
data/original/           CSV original del caso (solo lectura) y materiales del enunciado
data/modelo_dimensional/ tablas del esquema estrella para Power BI (las regenera `make run`)
```

Reglas del proyecto: el dato original nunca se modifica; ninguna variable posterior a la venta entra al modelo;
cada número del informe cita la vista o el archivo del que sale.
