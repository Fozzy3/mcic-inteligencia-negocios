-- KPI cube in long format: one row per (dimension, valor). Ready for Power BI / Looker.
create or replace view kpi as
with dims as (
    unpivot (
        select transaction_id,
               channel                    as canal,
               customer_segment           as segmento,
               lifecycle_stage            as etapa_cliente,
               quarter                    as trimestre,
               month                      as mes,
               ad_budget_level            as nivel_ads,
               campaign_objective         as objetivo_campana,
               geo_region                 as region,
               device                     as dispositivo,
               estado_webinar             as webinar,
               funnel_completo::varchar   as funnel_completo,
               new_product_offer::varchar as oferta_nuevo_producto
        from ventas
    ) on columns(* exclude transaction_id) into name dimension value valor
)
select
    d.dimension,
    d.valor,
    count(*)                                                   as oportunidades,
    sum(v.converted_to_sale)                                   as ventas,
    avg(v.converted_to_sale)                                   as conversion,
    sum(v.revenue_eur)                                         as ingresos_eur,
    sum(v.contribution_profit_eur)                             as contribucion_eur,
    sum(v.cost_attributed_eur)                                 as costo_eur,
    sum(v.cost_attributed_eur) / nullif(sum(v.converted_to_sale), 0) as cac_eur,
    sum(v.revenue_eur) / nullif(sum(v.cost_attributed_eur), 0) as roas,
    sum(v.revenue_eur) / nullif(sum(v.converted_to_sale), 0)   as ticket_medio_eur,
    avg(v.contribution_profit_eur)                             as contribucion_por_oportunidad,
    avg(v.funnel_completo::int)                                as pct_funnel_completo,
    avg(v.lead_score)                                          as lead_score_medio
from dims d join ventas v using (transaction_id)
group by all
order by d.dimension, d.valor;

-- "Are we growing in a healthy way?": last 12 months vs the 12 before.
create or replace view crecimiento as
with p as (
    select case when date > (select max(date) from ventas) - interval 1 year then 'actual' else 'anterior' end as periodo, *
    from ventas
    where date > (select max(date) from ventas) - interval 2 year
), m as (
    select periodo,
           count(*)::double                                              as oportunidades,
           sum(converted_to_sale)::double                                as ventas,
           avg(converted_to_sale)                                        as conversion,
           sum(revenue_eur)                                              as ingresos_eur,
           sum(revenue_eur) / nullif(sum(converted_to_sale), 0)          as ticket_medio_eur,
           sum(cost_attributed_eur)                                      as costo_adquisicion_eur,
           sum(cost_attributed_eur) / nullif(sum(converted_to_sale), 0)  as cac_eur,
           sum(contribution_profit_eur)                                  as contribucion_eur,
           sum(contribution_profit_eur) / nullif(sum(revenue_eur), 0)    as margen_contribucion
    from p group by 1
), u as (
    unpivot m on columns(* exclude periodo) into name indicador value valor
)
select indicador,
       max(valor) filter (where periodo = 'anterior') as anterior,
       max(valor) filter (where periodo = 'actual')   as actual,
       actual / nullif(anterior, 0) - 1               as variacion
from u group by 1;

-- Paid media by budget regime: volume per active campaign-day and attributed vs declared spend.
create or replace view ads_niveles as
with dia as (
    select date, channel, ad_budget_level, count(*) as n,
           avg(campaign_daily_spend_eur) as gasto_declarado, sum(cost_attributed_eur) as costo_atribuido
    from ventas where es_pago group by all
)
select
    d.ad_budget_level                         as nivel_ads,
    count(*)                                  as dias_campana,
    avg(d.n)                                  as oportunidades_por_dia,
    avg(d.gasto_declarado)                    as gasto_diario_declarado_eur,
    avg(d.costo_atribuido)                    as costo_diario_atribuido_eur,
    any_value(k.cac_eur)                      as cac_eur,
    any_value(k.conversion)                   as conversion,
    any_value(k.lead_score_medio)             as lead_score_medio,
    any_value(k.contribucion_por_oportunidad) as contribucion_por_oportunidad
from dia d
join (select ad_budget_level, sum(cost_attributed_eur) / nullif(sum(converted_to_sale), 0) as cac_eur,
             avg(converted_to_sale) as conversion, avg(lead_score) as lead_score_medio,
             avg(contribution_profit_eur) as contribucion_por_oportunidad
      from ventas where es_pago group by 1) k using (ad_budget_level)
group by 1
order by gasto_diario_declarado_eur;
