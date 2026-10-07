-- Dimensional model (star schema) for Power BI / Tableau / Excel pivot tables.
-- Grain of the fact: one commercial opportunity (one row of the original file).
-- Campaign spend lives at a different grain (campaign-day), so it gets its own fact.

create or replace view dim_fecha as
select distinct
    date                 as fecha,
    year(date)           as anio,
    month                as mes,
    quarter              as trimestre,
    dayname(date)        as dia_semana,
    isodow(date) >= 6    as es_fin_de_semana
from ventas;

create or replace view dim_canal as
select row_number() over (order by channel) as canal_id,
       channel                              as canal,
       case when channel in ('Facebook Ads', 'Google Ads') then 'Ads pagados'
            else 'Propio / orgánico / afiliados' end as tipo_canal
from (select distinct channel from ventas);

create or replace view dim_campana as
select row_number() over (order by campaign_objective, ad_budget_level) as campana_id,
       campaign_objective as objetivo_campana,
       ad_budget_level    as nivel_presupuesto_ads
from (select distinct campaign_objective, ad_budget_level from ventas);

-- "Junk" dimension: low-cardinality customer attributes combined in one table.
create or replace view dim_perfil as
select row_number() over (order by customer_segment, lifecycle_stage, geo_region, device) as perfil_id,
       customer_segment as segmento,
       lifecycle_stage  as etapa_cliente,
       geo_region       as region,
       device           as dispositivo
from (select distinct customer_segment, lifecycle_stage, geo_region, device from ventas);

-- What the customer experienced: funnel variants, webinar, new product.
create or replace view dim_experiencia as
select row_number() over (order by landing, cta, lead_magnet, checkout_simplificado, webinar, oferta_nuevo_producto)
           as experiencia_id, *
from (select distinct
        landing_variant          as landing,
        cta_variant              as cta,
        lead_magnet::bool        as lead_magnet,
        checkout_simplified::bool as checkout_simplificado,
        funnel_completo,
        estado_webinar           as webinar,
        new_product_offer::bool  as oferta_nuevo_producto
      from ventas);

create or replace view fact_oportunidad as
select
    v.transaction_id,
    v.date                    as fecha,
    c.canal_id,
    k.campana_id,
    p.perfil_id,
    e.experiencia_id,
    v.lead_score,
    v.converted_to_sale       as convertida,
    v.days_to_close           as dias_cierre,
    v.revenue_eur             as ingresos_eur,
    v.gross_margin_pct        as margen_bruto_pct,
    v.gross_profit_eur        as utilidad_bruta_eur,
    v.cost_attributed_eur     as costo_adquisicion_eur,
    22 * v.converted_to_sale  as costo_fijo_venta_eur,
    v.contribution_profit_eur as contribucion_eur
from ventas v
join dim_canal c       on c.canal = v.channel
join dim_campana k     on k.objetivo_campana = v.campaign_objective and k.nivel_presupuesto_ads = v.ad_budget_level
join dim_perfil p      on (p.segmento, p.etapa_cliente, p.region, p.dispositivo)
                        = (v.customer_segment, v.lifecycle_stage, v.geo_region, v.device)
join dim_experiencia e on (e.landing, e.cta, e.lead_magnet, e.checkout_simplificado, e.webinar, e.oferta_nuevo_producto)
                        = (v.landing_variant, v.cta_variant, v.lead_magnet::bool, v.checkout_simplified::bool,
                           v.estado_webinar, v.new_product_offer::bool);

-- campaign_daily_spend_eur repeats on every opportunity of the same campaign-day:
-- summing it per row would multiply the spend. Its true grain is (date, channel).
create or replace view fact_gasto_campana_dia as
select v.date as fecha, c.canal_id, v.ad_budget_level as nivel_presupuesto_ads,
       avg(v.campaign_daily_spend_eur) as gasto_declarado_eur,
       count(*) as oportunidades
from ventas v join dim_canal c on c.canal = v.channel
where v.es_pago
group by all;
