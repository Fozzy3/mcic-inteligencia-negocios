"""Datos del sitio web: lee salidas/ y vuelve a correr la simulación para guardar sus histogramas.

Run (desde la raíz del repo): uv run python web/scripts/exportar_datos.py
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

from bi import model, pipeline

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "salidas"
DEST = ROOT / "web" / "src" / "datos.json"


def records(df: pd.DataFrame) -> list[dict]:
    return json.loads(df.to_json(orient="records"))


def main() -> None:
    kpi = pd.read_csv(OUT / "kpi.csv")
    ads = pd.read_csv(OUT / "ads_niveles.csv")
    con = pipeline.connect()
    df = con.sql("select * from ventas").df()
    volume = ads.set_index("nivel_ads").oportunidades_por_dia
    sims = model.monte_carlo(model.bootstrap(df, volume), model.SUPUESTOS)

    check = model.temporal_check(df)
    canales = sorted(df.channel.unique())
    dia = (df.date - df.date.min()).dt.days
    nube = np.column_stack([dia, df.lead_score, df.channel.map(canales.index), df.converted_to_sale])

    edges = np.linspace(-200_000, 400_000, 61)
    hist = {k: np.histogram(g.utilidad.clip(edges[0], edges[-1] - 1), bins=edges)[0].tolist()
            for k, g in sims.groupby("clave")}

    data = {
        "validacion": records(pd.read_csv(OUT / "validacion.csv")),
        "crecimiento": records(pd.read_csv(OUT / "crecimiento.csv")),
        "kpi": records(kpi),
        "ads": records(ads),
        "lift": records(pd.read_csv(OUT / "lift_2026.csv")),
        "drivers": records(pd.read_csv(OUT / "drivers.csv")),
        "montecarlo": records(pd.read_csv(OUT / "montecarlo_resumen.csv")),
        "pivote": records(pd.read_csv(OUT / "pivote_ingresos_region_segmento.csv")),
        "histograma": {"bordes": edges.tolist(), "conteos": hist},
        "validacion_temporal": {"auc": check["auc"], "ventas_en_top20": check["ventas_en_top20"],
                                 "n_test": check["n_test"]},
        "nube": {"canales": canales, "filas": nube.astype(int).ravel().tolist()},
        "estrella": {t: sum(1 for _ in open(ROOT / "data" / "modelo_dimensional" / f"{t}.csv")) - 1
                     for t in pipeline.STAR_TABLES},
    }
    DEST.write_text(json.dumps(data, ensure_ascii=False))
    print(f"{DEST.relative_to(ROOT)}: {DEST.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
