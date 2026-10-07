-- Expects a view/table `raw` with the original CSV (see bi.pipeline.connect).
-- The original file is never modified: everything here is a view.

create or replace view ventas as
select
    * replace (cast(date as date) as date),
    landing_variant = 'landing_v2' and cta_variant = 'benefit_cta'
        and lead_magnet = 1 and checkout_simplified = 1          as funnel_completo,
    ad_budget_level <> 'organic_or_owned'                        as es_pago,
    case when webinar_attended = 1 then 'asistio'
         when webinar_invited = 1 then 'invitado'
         else 'no_invitado' end                                  as estado_webinar
from raw;

-- One row per rule; `fallas` = rows breaking it. All must be 0 before analysis.
create or replace view validacion as
select 'id_duplicado' as regla, count(*) - count(distinct transaction_id) as fallas from ventas
union all select 'nulos_en_campos_clave', count(*) filter (
    where transaction_id is null or date is null or channel is null
       or converted_to_sale is null or contribution_profit_eur is null) from ventas
union all select 'mes_distinto_a_fecha', count(*) filter (where month <> strftime(date, '%Y-%m')) from ventas
union all select 'binarios_fuera_de_0_1', count(*) filter (
    where lead_magnet not in (0, 1) or checkout_simplified not in (0, 1) or webinar_invited not in (0, 1)
       or webinar_attended not in (0, 1) or new_product_offer not in (0, 1) or converted_to_sale not in (0, 1)) from ventas
union all select 'lead_score_fuera_de_1_99', count(*) filter (where lead_score not between 1 and 99) from ventas
union all select 'margen_fuera_de_0_1', count(*) filter (where gross_margin_pct not between 0 and 1) from ventas
union all select 'asistio_sin_invitacion', count(*) filter (where webinar_attended > webinar_invited) from ventas
union all select 'dias_cierre_solo_si_hay_venta', count(*) filter (
    where (days_to_close is null) <> (converted_to_sale = 0)) from ventas
union all select 'ingreso_igual_ticket_por_venta', count(*) filter (
    where abs(revenue_eur - aov_eur * converted_to_sale) > 0.01) from ventas
union all select 'utilidad_bruta_igual_ingreso_por_margen', count(*) filter (
    where abs(gross_profit_eur - revenue_eur * gross_margin_pct) > 0.02) from ventas
-- Discovered while profiling: every sale carries a fixed 22 EUR fulfilment cost.
union all select 'contribucion_igual_bruta_menos_costo_menos_22', count(*) filter (
    where abs(contribution_profit_eur - (gross_profit_eur - cost_attributed_eur - 22 * converted_to_sale)) > 0.02) from ventas
union all select 'canal_organico_con_presupuesto_ads', count(*) filter (
    where channel not in ('Facebook Ads', 'Google Ads') and es_pago) from ventas;
