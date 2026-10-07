"""Conversion model, counterfactual deltas per decision and Monte Carlo."""

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# Only what is known before the sale. Excluded on purpose (leakage): days_to_close, aov_eur,
# revenue_eur, gross_*, contribution_*, and cost_attributed_eur (assigned with the outcome).
CAT = ["channel", "campaign_objective", "customer_segment", "lifecycle_stage", "device",
       "geo_region", "ad_budget_level", "landing_variant", "cta_variant", "quarter"]
BIN = ["lead_magnet", "checkout_simplified", "webinar_invited", "webinar_attended", "new_product_offer"]
FEATURES = CAT + BIN + ["lead_score"]

FIXED_COST_PER_SALE = 22  # found in validation: contribution = gross - cost - 22 per sale
BASE_ADS_LEVEL = "medium"  # paid-media regime in force at the end of the history (2026Q2)

DECISIONS = {
    "funnel": "Optimizar funnel (landing + CTA + lead magnet + checkout)",
    "webinar": "Programa de webinars para leads tibios",
    "ads": "Duplicar inversión en Ads",
    "product": "Lanzar nuevo producto",
}

# Business assumptions for a 12-month horizon: (min, most likely, max). Not in the data,
# to be validated with the business owner; the deck shows how sensitive the ranking is to them.
SUPUESTOS = {
    "funnel": {"cost": (8_000, 12_000, 20_000), "reach": (0.7, 0.9, 1.0)},    # design + dev + A/B
    "webinar": {"cost": (9_600, 14_400, 24_000), "reach": (0.5, 0.8, 1.0)},   # 12 sessions x 0.8-2k
    "ads": {"cost": (0, 2_000, 5_000), "reach": (1, 1, 1)},                   # management; media cost is in the data
    "product": {"cost": (15_000, 25_000, 45_000), "reach": (0.3, 0.6, 0.9)},  # development + launch
}


def fit(df: pd.DataFrame):
    pre = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore"), CAT),
        ("bin", "passthrough", BIN),
        ("num", StandardScaler(), ["lead_score"]),
    ])
    return make_pipeline(pre, LogisticRegression(max_iter=2000)).fit(df[FEATURES], df.converted_to_sale)


def unit_values(df: pd.DataFrame) -> pd.Series:
    """Contribution of one sale before acquisition cost, by (segment, new product offered)."""
    sales = df[df.converted_to_sale == 1]
    return (sales.gross_profit_eur - FIXED_COST_PER_SALE).groupby(
        [sales.customer_segment, sales.new_product_offer]).mean()


def expected_profit(m, df: pd.DataFrame, unit: pd.Series) -> float:
    if df.empty:
        return 0.0
    p = m.predict_proba(df[FEATURES])[:, 1]
    u = unit.reindex(pd.MultiIndex.from_arrays([df.customer_segment, df.new_product_offer])).to_numpy()
    if np.isnan(u).any():  # pandas' sum would silently drop these rows
        missing = df.loc[np.isnan(u), ["customer_segment", "new_product_offer"]].drop_duplicates()
        raise ValueError(f"Sin valor por venta para:\n{missing.to_string(index=False)}")
    return float((p * u - df.cost_attributed_eur.to_numpy()).sum())


def deltas(m, pop: pd.DataFrame, unit: pd.Series, attendance: float, eligible) -> dict:
    """Expected contribution change over `pop` if each decision had been applied to it.
    The product is only extrapolated to `eligible` segments (those where it was ever offered)."""
    e = lambda d: expected_profit(m, d, unit)
    base = e(pop)
    funnel = pop.assign(landing_variant="landing_v2", cta_variant="benefit_cta", lead_magnet=1, checkout_simplified=1)
    warm = pop[(pop.lifecycle_stage != "new_visitor") & (pop.webinar_invited == 0)]
    invited = attendance * e(warm.assign(webinar_invited=1, webinar_attended=1)) \
        + (1 - attendance) * e(warm.assign(webinar_invited=1))
    target = pop[pop.customer_segment.isin(eligible)]
    return {
        "funnel": e(funnel) - base,
        "webinar": invited - e(warm),
        "product": e(target.assign(new_product_offer=1)) - e(target),
    }


def last_12_months(df: pd.DataFrame) -> pd.DataFrame:
    return df[df.date > df.date.max() - pd.DateOffset(years=1)]


def estimate(df: pd.DataFrame, volume: pd.Series) -> dict:
    """All deltas from one sample. `volume` = opportunities per campaign-day by ads level."""
    pop = last_12_months(df)
    m = fit(df)
    eligible = df.loc[df.new_product_offer == 1, "customer_segment"].unique()
    d = deltas(m, pop, unit_values(df), df.webinar_attended.sum() / df.webinar_invited.sum(), eligible)
    # Ads: budget levels ran as time regimes, so per-level history is the counterfactual.
    paid = df[df.ad_budget_level != "organic_or_owned"]
    cpo = paid.groupby("ad_budget_level").contribution_profit_eur.mean()
    n_paid = (pop.ad_budget_level != "organic_or_owned").sum()
    for lvl in ("high", "saturated"):
        d[f"ads_{lvl}"] = n_paid * (volume[lvl] / volume[BASE_ADS_LEVEL] * cpo[lvl] - cpo[BASE_ADS_LEVEL])
    return d


def bootstrap(df: pd.DataFrame, volume: pd.Series, b: int = 200, seed: int = 7) -> pd.DataFrame:
    """Parameter uncertainty: re-estimate every delta on `b` resamples of the history."""
    rng = np.random.default_rng(seed)
    idx = rng.integers(len(df), size=(b, len(df)))
    return pd.DataFrame([estimate(df.iloc[i], volume) for i in idx])


def monte_carlo(deltas_: pd.DataFrame, supuestos: dict, n: int = 10_000, seed: int = 42) -> pd.DataFrame:
    """Parameter uncertainty (bootstrap draw) x execution uncertainty (reach, cost)."""
    rng = np.random.default_rng(seed)
    tri = lambda lo, mode, hi: np.full(n, float(lo)) if lo == hi else rng.triangular(lo, mode, hi, n)
    pick = rng.integers(len(deltas_), size=n)
    out = []
    for k in DECISIONS:
        cost, reach = tri(*supuestos[k]["cost"]), tri(*supuestos[k]["reach"])
        if k == "ads":  # doubling spend lands between the historical 'high' and 'saturated' regimes
            w = rng.random(n)
            gain = (1 - w) * deltas_.ads_high.to_numpy()[pick] + w * deltas_.ads_saturated.to_numpy()[pick]
        else:
            gain = deltas_[k].to_numpy()[pick]
        out.append(pd.DataFrame({"clave": k, "utilidad": reach * gain - cost, "costo": cost}))
    return pd.concat(out, ignore_index=True)


def summarize(sims: pd.DataFrame) -> pd.DataFrame:
    g = sims.groupby("clave")
    s = pd.DataFrame({
        "utilidad_esperada_eur": g.utilidad.mean(),
        "p10_eur": g.utilidad.quantile(0.1),
        "p50_eur": g.utilidad.quantile(0.5),
        "p90_eur": g.utilidad.quantile(0.9),
        "prob_perdida": g.utilidad.apply(lambda x: (x < 0).mean()),
        "roi": g.utilidad.mean() / g.costo.mean(),
        "costo_esperado_eur": g.costo.mean(),
    })
    s.insert(0, "decision", s.index.map(DECISIONS))
    return s.sort_values("utilidad_esperada_eur", ascending=False).reset_index()


def temporal_check(df: pd.DataFrame, cutoff: str = "2026-01-01") -> dict:
    """Train on the past, score the future: AUC and conversion by score decile."""
    train, test = df[df.date < cutoff], df[df.date >= cutoff]
    p = fit(train).predict_proba(test[FEATURES])[:, 1]
    dec = pd.qcut(pd.Series(p).rank(method="first", ascending=False), 10, labels=range(1, 11))
    lift = (pd.DataFrame({"decil": dec.to_numpy(), "venta": test.converted_to_sale.to_numpy()})
            .groupby("decil", observed=True).venta.agg(oportunidades="size", conversion="mean"))
    top2 = test.converted_to_sale.to_numpy()[dec.to_numpy() <= 2].sum() / test.converted_to_sale.sum()
    return {"auc": roc_auc_score(test.converted_to_sale, p), "lift": lift.reset_index(),
            "ventas_en_top20": top2, "n_test": len(test)}


# Reference level per categorical for reading the coefficients (status quo of each lever).
REFERENCE = {"ad_budget_level": "medium", "landing_variant": "baseline", "cta_variant": "standard",
             "lifecycle_stage": "known_lead", "channel": "Email", "customer_segment": "SMB",
             "campaign_objective": "nurture", "device": "desktop", "geo_region": "ES"}


def drivers(m) -> pd.DataFrame:
    raw = pd.DataFrame({"variable": m[0].get_feature_names_out(), "coef": m[-1].coef_[0]})
    return contrasts(raw)


def contrasts(raw: pd.DataFrame) -> pd.DataFrame:
    """Coefficients as effects against a reference level.
    The one-hot keeps every level, so a single dummy's coefficient is not interpretable on its
    own; the difference with the reference level is (and is what the report quotes)."""
    rows = []
    for var, coef in zip(raw.variable, raw.coef):
        kind, name = var.split("__", 1)
        if kind != "cat":
            rows.append((name, "1", "0", coef) if kind == "bin" else (name, "+1 desv. estándar", "media", coef))
            continue
        feat = next(c for c in CAT if name.startswith(c + "_"))
        rows.append((feat, name[len(feat) + 1:], None, coef))
    d = pd.DataFrame(rows, columns=["variable", "nivel", "referencia", "coef"])
    for feat in CAT:
        sel = d.variable == feat
        if not sel.any():
            continue
        levels = d.loc[sel, "nivel"]
        ref = REFERENCE.get(feat, levels.min())
        d.loc[sel, "coef"] -= d.loc[sel & (d.nivel == ref), "coef"].item()
        d.loc[sel, "referencia"] = ref
    d = d[d.coef != 0].copy()
    d["odds_ratio"] = np.exp(d.coef)
    return d.reindex(d.coef.abs().sort_values(ascending=False).index).reset_index(drop=True)
