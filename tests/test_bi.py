import numpy as np
import pandas as pd
import pytest

from bi import model, pipeline

ROW = dict(
    transaction_id="TX-1", date="2025-06-01", month="2025-06", quarter="2025Q2",
    channel="Email", campaign_objective="nurture", customer_segment="SMB",
    lifecycle_stage="known_lead", device="desktop", geo_region="ES",
    ad_budget_level="organic_or_owned", campaign_daily_spend_eur=5.0, cost_attributed_eur=2.0,
    landing_variant="baseline", cta_variant="standard", lead_magnet=0, checkout_simplified=0,
    webinar_invited=0, webinar_attended=0, new_product_offer=0, lead_score=50,
    converted_to_sale=1, days_to_close=3, aov_eur=100.0, revenue_eur=100.0,
    gross_margin_pct=0.8, gross_profit_eur=80.0, contribution_profit_eur=56.0,  # 80 - 2 - 22
)


def con_from(rows):
    return pipeline.connect(pd.DataFrame(rows))


def test_validation_passes_on_consistent_row():
    v = con_from([ROW]).sql("select * from validacion").df()
    assert v.fallas.sum() == 0, v


def test_validation_flags_each_broken_rule():
    bad = [
        ROW,
        {**ROW, "revenue_eur": 90.0},                        # revenue != aov * sale
        {**ROW, "transaction_id": "TX-3", "webinar_attended": 1},  # attended without invite
    ]
    v = con_from(bad).sql("select * from validacion").df().set_index("regla").fallas
    assert v["id_duplicado"] == 1
    assert v["ingreso_igual_ticket_por_venta"] == 1
    assert v["asistio_sin_invitacion"] == 1


def test_validation_flags_quarter_null_and_paid_channel_rules():
    bad = [
        ROW,
        {**ROW, "transaction_id": "TX-2", "quarter": "2019Q4"},
        {**ROW, "transaction_id": "TX-3", "channel": "Google Ads"},          # paid channel, organic level
        {**ROW, "transaction_id": "TX-4", "lead_score": None},
    ]
    v = con_from(bad).sql("select * from validacion").df().set_index("regla").fallas
    assert v["trimestre_distinto_a_fecha"] == 1
    assert v["canal_pagado_sin_presupuesto_ads"] == 1
    assert v["nulos_en_atributos"] == 1


def test_star_controls_catch_duplicated_date_key():
    ok = con_from([ROW]).sql("select * from control_estrella").df()
    assert ok.fallas.sum() == 0, ok
    bad = con_from([ROW, {**ROW, "transaction_id": "TX-2", "quarter": "2019Q4"}])
    c = bad.sql("select * from control_estrella").df().set_index("regla").fallas
    assert c["dim_fecha_clave_unica"] == 1
    assert c["hechos_filas_distintas_a_ventas"] == 2    # each fact row now joins two dates
    with pytest.raises(ValueError):
        pipeline.check_zero(c.reset_index(), "esquema estrella")


def test_kpi_channel():
    rows = [ROW, {**ROW, "transaction_id": "TX-2", "converted_to_sale": 0, "days_to_close": None,
                  "aov_eur": 0.0, "revenue_eur": 0.0, "gross_profit_eur": 0.0,
                  "contribution_profit_eur": -2.0}]
    k = con_from(rows).sql("select * from kpi where dimension = 'canal'").df().iloc[0]
    assert k.oportunidades == 2
    assert k.conversion == 0.5
    assert k.cac_eur == 4.0                    # 4 EUR cost / 1 sale
    assert k.contribucion_por_oportunidad == 27.0


def test_star_schema_rejoins_to_the_same_totals():
    rows = [ROW, {**ROW, "transaction_id": "TX-2", "channel": "Google Ads", "ad_budget_level": "medium",
                  "customer_segment": "Enterprise", "revenue_eur": 300.0, "aov_eur": 300.0,
                  "gross_profit_eur": 240.0, "contribution_profit_eur": 216.0}]
    con = con_from(rows)
    joined = con.sql("""
        select c.canal, p.segmento, f.ingresos_eur
        from fact_oportunidad f
        join dim_canal c using (canal_id)
        join dim_perfil p using (perfil_id)
        join dim_fecha d using (fecha)
        order by f.ingresos_eur""").df()
    assert len(joined) == 2
    assert joined.ingresos_eur.sum() == 400.0
    assert joined.iloc[1].canal == "Google Ads" and joined.iloc[1].segmento == "Enterprise"


def test_growth_compares_last_12_months_with_previous_12():
    rows = [{**ROW, "transaction_id": "TX-1", "date": "2025-06-01", "month": "2025-06"},
            {**ROW, "transaction_id": "TX-2", "date": "2026-06-01", "month": "2026-06"},
            {**ROW, "transaction_id": "TX-3", "date": "2026-05-01", "month": "2026-05"}]
    g = con_from(rows).sql("select * from crecimiento").df().set_index("indicador")
    assert g.loc["oportunidades", "anterior"] == 1
    assert g.loc["oportunidades", "actual"] == 2
    assert g.loc["oportunidades", "variacion"] == 1.0   # +100%


def test_monte_carlo_is_delta_minus_cost_when_no_uncertainty():
    deltas = pd.DataFrame({"funnel": [1000.0], "webinar": [500.0], "product": [-100.0],
                           "ads_high": [300.0], "ads_saturated": [300.0]})
    fixed = {k: {"cost": (100, 100, 100), "reach": (1, 1, 1)} for k in model.DECISIONS}
    s = model.summarize(model.monte_carlo(deltas, fixed, n=50))
    s = s.set_index("clave")
    assert s.loc["funnel", "utilidad_esperada_eur"] == 900
    assert s.loc["product", "prob_perdida"] == 1.0
    assert s.loc["funnel", "prob_perdida"] == 0.0
    assert s.index[0] == "funnel"              # ranked by expected profit


def test_uplift_recovers_direction_of_planted_effect():
    rng = np.random.default_rng(0)
    df = pd.DataFrame([ROW] * 2000)
    df["transaction_id"] = [f"TX-{i}" for i in range(len(df))]
    df["landing_variant"] = rng.choice(["baseline", "landing_v2"], len(df))
    df["lead_score"] = rng.integers(1, 99, len(df))
    p = np.where(df.landing_variant == "landing_v2", 0.30, 0.10)
    df["converted_to_sale"] = (rng.random(len(df)) < p).astype(int)
    m = model.fit(df)
    unit = pd.Series({("SMB", 0): 100.0, ("SMB", 1): 100.0})
    base = model.expected_profit(m, df, unit)
    lifted = model.expected_profit(m, df.assign(landing_variant="landing_v2"), unit)
    assert base == model.expected_profit(m, df, unit)
    # half the rows move from 10% to 30% conversion: +0.2 * 1000 * 100 EUR
    assert 15_000 < lifted - base < 25_000

    # the new product was never offered to SMB in this history: no extrapolation there
    d = model.deltas(m, df, unit, attendance=0.25, eligible=["Enterprise"])
    assert d["product"] == 0


def test_expected_profit_fails_when_a_unit_value_is_missing():
    df = pd.DataFrame([ROW] * 40)
    df["transaction_id"] = range(len(df))
    df.loc[:9, "converted_to_sale"] = 0
    m = model.fit(df)
    with pytest.raises(ValueError):
        model.expected_profit(m, df.assign(customer_segment="Enterprise"), pd.Series({("SMB", 0): 100.0}))


def test_drivers_are_contrasts_against_the_reference_level():
    raw = pd.DataFrame({"variable": ["cat__landing_variant_baseline", "cat__landing_variant_landing_v2",
                                     "bin__lead_magnet", "num__lead_score"],
                        "coef": [-0.4, -0.25, 0.15, 0.6]})
    d = model.contrasts(raw).set_index("variable")
    assert d.loc["landing_variant", "nivel"] == "landing_v2"
    assert d.loc["landing_variant", "coef"] == pytest.approx(0.15)   # -0.25 - (-0.4)
    assert len(d) == 3                                                # the reference row is dropped


def test_unit_value_is_per_segment_and_offer():
    rows = [ROW, {**ROW, "transaction_id": "TX-2", "customer_segment": "Enterprise", "gross_profit_eur": 222.0}]
    u = model.unit_values(pd.DataFrame(rows))
    assert u[("SMB", 0)] == 58.0          # 80 - 22
    assert u[("Enterprise", 0)] == 200.0  # 222 - 22
