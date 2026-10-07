# Evaluacion del dataset transaccional sintetico

## Checks
- dataset_transaccional_20k: PASS
- parametros_emergen_del_historico: PASS
- conclusion_y_narrativa: PASS

## Baseline historico
- Registros: 20,000
- Periodo: 2024-01-01 a 2026-04-30
- Conversion media: 10.5%
- Revenue historico: 2,326,751 EUR
- Contribution profit historico: 1,541,244 EUR
- AUC modelo de conversion: 0.735

## Variables clave para estimar hipotesis
- Cambios de funnel: landing_variant, cta_variant, lead_magnet, checkout_simplified.
- Presion de ads: ad_budget_level, campaign_daily_spend_eur, cost_attributed_eur, lead_score.
- Webinar: webinar_invited, webinar_attended.
- Nuevo producto: new_product_offer, customer_segment, aov_eur, gross_margin_pct.
- Resultado de negocio: converted_to_sale, revenue_eur, gross_profit_eur, contribution_profit_eur.

## Resumen por canal
| channel | registros | conversion | revenue_eur | contribution_profit_eur | coste_medio |
| --- | --- | --- | --- | --- | --- |
| Afiliados | 1745 | 7.3% | 136072 | 78113 | 7.15 |
| Email | 3254 | 19.1% | 680292 | 505200 | 0.72 |
| Facebook Ads | 4599 | 4.8% | 228624 | 84433 | 15.94 |
| Google Ads | 3269 | 6.1% | 221094 | 111850 | 13.28 |
| SEO / Blog | 3083 | 12.2% | 420311 | 300375 | 1.85 |
| Webinar | 1659 | 17.5% | 355556 | 253968 | 5.64 |
| YouTube Organico | 2391 | 10.8% | 284802 | 207307 | 1.23 |

## Parametros estimados desde historico
| parameter | sample_size | baseline_conversion | scenario_conversion | conversion_lift_pct | profit_lift_per_opportunity_eur | source |
| --- | --- | --- | --- | --- | --- | --- |
| funnel_full_optimized | 20000 | 0.1053 | 0.1492 | 0.4173 | 33.84 | Estimado con contrafactual ML sobre historico sintetico |
| paid_budget_low | 787 | 0.0635 | 0.0548 |  | 29.07 | Historico por nivel de inversion en ads |
| paid_budget_medium | 3290 | 0.0669 | 0.0692 |  | 38.85 | Historico por nivel de inversion en ads |
| paid_budget_high | 2029 | 0.0527 | 0.0566 |  | 28.31 | Historico por nivel de inversion en ads |
| paid_budget_saturated | 1762 | 0.0255 | 0.0226 |  | -5.03 | Historico por nivel de inversion en ads |
| webinar_attendance | 13555 | 0.1343 | 0.1809 | 0.3471 | 44.51 | Estimado con contrafactual ML sobre historico sintetico |
| new_product_offer | 11615 | 0.1197 | 0.0897 | -0.2504 | 64.38 | Estimado con contrafactual ML sobre historico sintetico |

## Simulacion Monte Carlo
| ranking | decision | expected_profit_eur | p10_eur | p50_eur | p90_eur | probability_loss | expected_roi |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Mejorar landing + CTA + lead magnet | 66106 | 55967 | 65865 | 76455 | 0.0% | 55.1x |
| 2 | Webinar de ventas | 31358 | 20267 | 30948 | 43062 | 0.0% | 12.5x |
| 3 | Duplicar inversion en Ads | 30844 | 4936 | 29999 | 57613 | 6.1% | 3.4x |
| 4 | Nuevo producto | 27214 | -25850 | 2759 | 77908 | 45.3% | 2.3x |

## Lectura ejecutiva
- Las hipotesis no se fijan como tabla externa: se estiman con contrafactuales del modelo entrenado sobre el historico.
- Mejorar el funnel gana porque el historico contiene tests de landing, CTA, lead magnet y checkout que el modelo aprende como mejora de conversion.
- Duplicar ads usa el patron historico de saturacion: cuando sube el nivel de inversion, crece el volumen pero baja la calidad media y sube el coste por oportunidad.
- Webinar emerge como buena segunda opcion porque el historico contiene invitados/asistentes y el modelo aprende uplift en leads templados.
- Nuevo producto mantiene el P90 mas alto por ticket mayor, pero tambien mayor probabilidad de perdida por menor conversion, coste fijo y variabilidad de ejecucion.