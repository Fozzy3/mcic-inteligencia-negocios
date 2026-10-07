"""End to end: validate -> KPIs -> model -> Monte Carlo -> figures. Run: uv run python -m bi.pipeline"""

from pathlib import Path

import duckdb
import pandas as pd

from bi import model

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "original" / "dataset_ventas_transaccional_sintetico_es.csv"
OUT = ROOT / "salidas"
FIG = ROOT / "informe" / "fig"
STAR = ROOT / "data" / "modelo_dimensional"  # star-schema tables for Power BI
STAR_TABLES = ["dim_fecha", "dim_canal", "dim_campana", "dim_perfil", "dim_experiencia",
               "fact_oportunidad", "fact_gasto_campana_dia"]


def _sql_path(path: Path) -> str:
    return "'" + str(path).replace("'", "''") + "'"


def connect(source: pd.DataFrame | Path = DATA) -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    if isinstance(source, pd.DataFrame):
        con.register("raw", source)
    else:
        if not Path(source).exists():
            raise FileNotFoundError(f"No está el archivo original: {source}. Cópielo ahí (ver README, sección Datos).")
        con.execute(f"create view raw as select * from read_csv_auto({_sql_path(source)})")
    for f in sorted((ROOT / "sql").glob("*.sql")):
        con.execute(f.read_text())
    return con


def check_zero(checks: pd.DataFrame, what: str) -> None:
    """Stop the run if any rule has failures (explicit raise: survives python -O)."""
    bad = checks[checks.fallas > 0]
    if not bad.empty:
        raise ValueError(f"Reglas con fallas ({what}):\n{bad.to_string(index=False)}")


def main() -> None:
    from bi import plots

    OUT.mkdir(exist_ok=True)
    con = connect()
    val = con.sql("select * from validacion").df()
    val.to_csv(OUT / "validacion.csv", index=False)
    check_zero(val, "validación de datos")

    kpi = con.sql("select * from kpi").df()
    ads = con.sql("select * from ads_niveles").df()
    kpi.to_csv(OUT / "kpi.csv", index=False)
    ads.to_csv(OUT / "ads_niveles.csv", index=False)
    con.sql("select * from crecimiento").df().to_csv(OUT / "crecimiento.csv", index=False)
    con.sql("""pivot (select geo_region as region, customer_segment, revenue_eur from ventas)
               on customer_segment using round(sum(revenue_eur)) group by region order by region""") \
        .df().to_csv(OUT / "pivote_ingresos_region_segmento.csv", index=False)
    check_zero(con.sql("select * from control_estrella").df(), "esquema estrella")
    STAR.mkdir(parents=True, exist_ok=True)
    for t in STAR_TABLES:
        con.execute(f"copy {t} to {_sql_path(STAR / f'{t}.csv')} (header)")

    df = con.sql("select * from ventas").df()
    check = model.temporal_check(df)
    check["lift"].to_csv(OUT / "lift_2026.csv", index=False)
    model.drivers(model.fit(df)).to_csv(OUT / "drivers.csv", index=False)

    volume = ads.set_index("nivel_ads").oportunidades_por_dia
    point = model.estimate(df, volume)
    sims = model.monte_carlo(model.bootstrap(df, volume), model.SUPUESTOS)
    res = model.summarize(sims)
    res.to_csv(OUT / "montecarlo_resumen.csv", index=False)

    plots.all_figures(kpi, ads, check["lift"], res, FIG)

    pd.set_option("display.width", 200)
    print(val.to_string(index=False), "\n")
    print(f"AUC temporal (test 2026, n={check['n_test']}): {check['auc']:.3f} | "
          f"ventas capturadas por el top 20%: {check['ventas_en_top20']:.1%}\n")
    print("Deltas puntuales 12m (EUR):", {k: round(v) for k, v in point.items()}, "\n")
    print(res.round(3).to_string(index=False))


if __name__ == "__main__":
    main()
