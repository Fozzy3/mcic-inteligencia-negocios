# Arquitectura propuesta en AWS: BI de ventas y decisión de inversión

Propuesta (no implementada) para correr cada mes, sin intervención manual, el mismo flujo que hoy se
ejecuta con `make run`. Archivos: `arquitectura-bi-aws.drawio` (editable), `.drawio.png` y `.drawio.svg`
(exportados con el XML embebido, se pueden reabrir en draw.io).

## Flujo

1. **Ingesta.** El sistema de ventas deja el CSV en S3 (zona raw), con versionado y Object Lock: el
   original nunca se modifica.
2. **Validación.** Glue cataloga el archivo y Athena corre las 15 reglas de `sql/01_preparacion.sql`.
3. **Zona curada.** Solo con 0 fallas se escriben las vistas limpias en Parquet (el `check_zero` del pipeline).
4. **Modelo.** SageMaker corre `src/bi/model.py`: regresión logística, bootstrap y Monte Carlo.
5. **Esquema estrella.** Redshift Serverless carga los 2 hechos y 5 dimensiones y el puntaje del modelo.
6. **Consumo.** QuickSight (o Power BI con conector a Redshift) muestra los KPI a la gerencia.

Control: EventBridge lanza el flujo una vez al mes y Step Functions encadena los pasos; si una regla
falla se detiene y SNS avisa al equipo (línea roja).

## Servicios

| Servicio | Para qué |
|---|---|
| S3 (raw y curada) | Data lake: dato crudo inmutable y vistas limpias |
| Glue + Athena | Catálogo y SQL sin servidor para las reglas de calidad |
| SageMaker AI | Entrenar el modelo y simular escenarios |
| Redshift Serverless | Data warehouse con el esquema estrella |
| QuickSight | Tableros de KPI |
| Step Functions, EventBridge | Orquestación y calendario |
| SNS | Alerta cuando falla una regla |
| Lake Formation, KMS, CloudWatch | Permisos por columna, cifrado y monitoreo |

## Decisiones

- **Serverless en todo el camino:** el volumen (20.000 filas al mes) no justifica clústeres encendidos.
- **Región sa-east-1:** la más cercana a Colombia con todos los servicios.
- **El original es inmutable por diseño de almacenamiento,** no por disciplina: replica la regla de oro del proyecto.
- **Fallar cerrado:** si la calidad no pasa, no se publica ningún número nuevo.
