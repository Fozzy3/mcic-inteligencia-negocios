"""Static figures for the report and deck (Universidad Distrital palette, validated for CVD and contrast)."""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.ticker import FuncFormatter, PercentFormatter  # noqa: E402

# UD azur and gold, one step darker so both reach 3:1 on white.
BLUE, ORANGE = "#0F6E99", "#B8862B"
INK, INK2, GRID, SURFACE = "#373435", "#5c5a5b", "#e3e3e3", "#ffffff"


def eur(x: float) -> str:
    return ("−" if x < 0 else "") + f"€{abs(x):,.0f}".replace(",", ".")


def mil(x: float) -> str:
    return ("−" if x < 0 else "") + f"€{abs(x) / 1000:,.0f} mil".replace(",", ".")


def pct(x: float, d: int = 1) -> str:
    return f"{x * 100:.{d}f} %".replace(".", ",")


EUR = FuncFormatter(lambda x, _: eur(x))
SHORT = {"funnel": "Mejorar el funnel", "webinar": "Webinars",
         "ads": "Duplicar publicidad", "product": "Nuevo producto"}
LEVELS = {"low": "bajo", "medium": "medio", "high": "alto", "saturated": "saturado"}

plt.rcParams.update({
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
    "axes.edgecolor": GRID, "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2,
    "text.color": INK, "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8,
    "axes.spines.top": False, "axes.spines.right": False, "axes.axisbelow": True,
    "font.size": 11, "axes.titlesize": 13, "axes.titleweight": "bold", "axes.titlelocation": "left",
})


def _save(fig, path: Path) -> None:
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def mensual(kpi, path):
    d = kpi[kpi.dimension == "mes"].sort_values("valor")
    fig, ax = plt.subplots(figsize=(9, 4.2))
    for col, color, label in [("ingresos_eur", BLUE, "Ingresos"), ("contribucion_eur", ORANGE, "Contribución")]:
        ax.plot(d.valor, d[col], color=color, lw=2, label=label)
        ax.annotate(label, (len(d) - 1, d[col].iloc[-1]), xytext=(8, 0), textcoords="offset points",
                    va="center", color=INK2, fontsize=10)
    ax.yaxis.set_major_formatter(EUR)
    ax.set_ylim(0, None)
    ax.set_xticks(range(0, len(d), 3), d.valor.iloc[::3], rotation=45)
    ax.set_xlim(-0.5, len(d) + 3)
    ax.legend(frameon=False, loc="upper left")
    ax.set_title("Ingresos y contribución por mes")
    _save(fig, path)


def canales(kpi, path):
    d = kpi[kpi.dimension == "canal"].sort_values("contribucion_por_oportunidad")
    fig, ax = plt.subplots(figsize=(8, 4.2))
    ax.barh(d.valor, d.contribucion_por_oportunidad, color=BLUE, height=0.6)
    for y, (v, c) in enumerate(zip(d.contribucion_por_oportunidad, d.conversion)):
        ax.text(v + 2, y, f"€{v:.0f}  ·  compra el {pct(c)}", va="center", color=INK2, fontsize=10)
    ax.xaxis.set_major_formatter(EUR)
    ax.set_xlim(0, d.contribucion_por_oportunidad.max() * 1.45)
    ax.grid(axis="y", visible=False)
    ax.set_title("Contribución por oportunidad, por canal")
    _save(fig, path)


def tendencia(kpi, path):
    d = kpi[kpi.dimension == "trimestre"].sort_values("valor")
    fig, ax = plt.subplots(figsize=(8, 4.2))
    for col, color, label in [("conversion", BLUE, "Conversión"), ("pct_funnel_completo", ORANGE, "Con funnel mejorado")]:
        ax.plot(d.valor, d[col], color=color, lw=2, marker="o", ms=5, label=label)
        ax.annotate(label, (len(d) - 1, d[col].iloc[-1]), xytext=(8, 0), textcoords="offset points",
                    va="center", color=INK2, fontsize=10)
    ax.yaxis.set_major_formatter(PercentFormatter(1, decimals=0))
    ax.set_xlim(-0.5, len(d) + 1.8)
    ax.tick_params(axis="x", rotation=45)
    ax.set_xticks(range(len(d)), [v + ("*" if v == "2026Q2" else "") for v in d.valor])
    ax.text(0, -0.30, "* solo abril", transform=ax.transAxes, color=INK2, fontsize=9)
    ax.set_title("Conversión y adopción del funnel completo, por trimestre")
    _save(fig, path)


def ads_saturacion(ads, path):
    d = ads.set_index("nivel_ads").loc[list(LEVELS)]
    labels = [f"{LEVELS[lvl]}\n€{g:.0f}/día" for lvl, g in zip(LEVELS, d.gasto_diario_declarado_eur)]
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.8))
    for ax, col, title in [(axes[0], "cac_eur", "Costo de publicidad por venta"),
                           (axes[1], "contribucion_por_oportunidad", "Contribución por oportunidad")]:
        ax.bar(labels, d[col], color=BLUE, width=0.6)
        for x, v in enumerate(d[col]):
            ax.text(x, max(v, 0), eur(v), ha="center", va="bottom", color=INK2, fontsize=10)
        ax.axhline(0, color=INK2, lw=0.8)
        ax.yaxis.set_major_formatter(EUR)
        ax.grid(axis="x", visible=False)
        ax.set_title(title, fontsize=12)
    fig.suptitle("Facebook y Google según el nivel de gasto diario",
                 x=0.01, ha="left", fontweight="bold")
    _save(fig, path)


def lift(lift_df, path):
    fig, ax = plt.subplots(figsize=(8, 3.8))
    ax.bar(lift_df.decil.astype(str), lift_df.conversion, color=BLUE, width=0.65)
    base = (lift_df.conversion * lift_df.oportunidades).sum() / lift_df.oportunidades.sum()
    ax.axhline(base, color=INK2, lw=1, ls="--")
    ax.text(9.4, base, f" promedio {pct(base)}", va="bottom", ha="right", color=INK2, fontsize=10)
    ax.yaxis.set_major_formatter(PercentFormatter(1, decimals=0))
    ax.set_xlabel("Grupos de 10 % según el puntaje del modelo (1 = los más probables)")
    ax.set_ylabel("% que compró")
    ax.grid(axis="x", visible=False)
    ax.set_title("Conversión en 2026 por decil de puntaje")
    _save(fig, path)


def montecarlo(res, path):
    order = res.clave.tolist()[::-1]
    fig, ax = plt.subplots(figsize=(9, 4))
    for y, k in enumerate(order):
        r = res.set_index("clave").loc[k]
        ax.plot([r.p10_eur, r.p90_eur], [y, y], color=BLUE, lw=6, solid_capstyle="round", alpha=0.35)
        ax.plot(r.utilidad_esperada_eur, y, "o", color=BLUE, ms=9)
        ax.text(r.utilidad_esperada_eur, y + 0.28,
                f"esperado {mil(r.utilidad_esperada_eur)} · P(pérdida) {pct(r.prob_perdida)}",
                ha="center", color=INK2, fontsize=9.5, bbox=dict(facecolor=SURFACE, edgecolor="none", pad=1))
    ax.axvline(0, color=INK2, lw=1)
    ax.set_yticks(range(len(order)), [SHORT[k] for k in order])
    ax.xaxis.set_major_formatter(EUR)
    ax.set_ylim(-0.5, len(order) - 0.2)
    ax.grid(axis="y", visible=False)
    fig.suptitle("Contribución adicional a 12 meses: valor esperado y rango P10–P90",
                 x=0.01, ha="left", fontweight="bold")
    _save(fig, path)


def all_figures(kpi, ads, lift_df, res, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    mensual(kpi, out / "0_evolucion_mensual.png")
    canales(kpi, out / "1_canales.png")
    tendencia(kpi, out / "2_tendencia_funnel.png")
    ads_saturacion(ads, out / "3_ads_saturacion.png")
    lift(lift_df, out / "4_lift_modelo.png")
    montecarlo(res, out / "5_montecarlo.png")
