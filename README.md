# Proyecto integrador de Inteligencia de Negocios

¿En qué iniciativa de crecimiento debería invertir la empresa el próximo año? Flujo completo de BI sobre
20.000 oportunidades comerciales: problema → preparación y validación → modelo dimensional, KPIs y modelo
predictivo → Monte Carlo → recomendación sustentada en evidencia.

## Entregables

| Archivo | Qué es |
|---|---|
| [`informe/proceso.pdf`](informe/proceso.pdf) | Todo el proceso en un PDF: informe por fases + anexo con el SQL |
| [`informe/INFORME.md`](informe/INFORME.md) | Fuente del informe (se lee directo en GitHub) |
| [`informe/presentacion.md`](informe/presentacion.md) | Presentación Marp con guion en las notas |

## Cómo se ejecuta

```bash
make install   # crea el entorno con uv
make test      # 8 pruebas
make run       # valida, calcula KPIs, entrena, simula y regenera tablas y gráficas (~2 min)
make pdf       # regenera informe/proceso.pdf (pandoc + weasyprint)
```

## Estructura

```text
data/original/        CSV original, solo lectura, fuera de git
data/modelo_estrella/ esquema estrella exportado para Power BI (lo genera `make run`, fuera de git)
sql/
  01_preparacion.sql   vista limpia `ventas` + 12 reglas de validación
  02_indicadores.sql   cubo de KPIs, crecimiento 12m vs 12m, Ads por régimen
  03_modelo_estrella.sql  2 tablas de hechos + 5 dimensiones
src/bi/
  model.py             regresión logística, contrafactuales, bootstrap, Monte Carlo, supuestos de negocio
  pipeline.py          orquesta todo de punta a punta
  plots.py             gráficas del informe
tests/test_bi.py       pruebas de validación, KPIs, estrella, crecimiento, modelo y Monte Carlo
salidas/               tablas de resultados citadas en el informe
informe/               informe, presentación, gráficas (fig/) y estilo del PDF (pdf.css)
```

Reglas del proyecto: el dato original nunca se modifica (toda transformación es una vista SQL); ninguna
variable posterior a la venta entra al modelo; todo número del informe cita la vista o el archivo del
que sale.
