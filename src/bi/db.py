"""Materializa las capas medallion en data/bi.duckdb para explorarlas en DBeaver (make db).

bronce = CSV crudo, plata = vista limpia + validación, oro = esquema estrella (con PK/FK) + cubos de KPI.
"""
from bi.pipeline import ROOT, connect

DB = ROOT / "data" / "bi.duckdb"

# tabla -> (llave primaria, [(columna FK, dimensión)])
ORO = {
    "dim_fecha": ("fecha", []),
    "dim_canal": ("canal_id", []),
    "dim_campana": ("campana_id", []),
    "dim_perfil": ("perfil_id", []),
    "dim_experiencia": ("experiencia_id", []),
    "fact_oportunidad": ("transaction_id", [("fecha", "dim_fecha"), ("canal_id", "dim_canal"),
                                            ("campana_id", "dim_campana"), ("perfil_id", "dim_perfil"),
                                            ("experiencia_id", "dim_experiencia")]),
    "fact_gasto_campana_dia": ("fecha, canal_id, nivel_presupuesto_ads",
                               [("fecha", "dim_fecha"), ("canal_id", "dim_canal")]),
}


def copy(con, src, dst, pk=None, fks=()):
    cols = [f'"{n}" {t}' for n, t, *_ in con.sql(f"describe memory.{src}").fetchall()]
    cols += [f"primary key ({pk})"] if pk else []
    cols += [f"foreign key ({c}) references oro.{t} ({c})" for c, t in fks]
    con.execute(f"create table {dst} ({', '.join(cols)})")
    con.execute(f"insert into {dst} select * from memory.{src}")


def main():
    DB.unlink(missing_ok=True)
    con = connect()
    con.execute(f"attach '{DB}' as bi")
    con.execute("use bi")  # FK must live in the same database
    for s in ("bronce", "plata", "oro"):
        con.execute(f"create schema {s}")
    copy(con, "raw", "bronce.ventas_crudo")
    copy(con, "ventas", "plata.ventas", "transaction_id")
    copy(con, "validacion", "plata.validacion")
    for t, (pk, fks) in ORO.items():
        copy(con, t, f"oro.{t}", pk, fks)
    for t in ("kpi", "crecimiento", "ads_niveles", "control_estrella"):
        copy(con, t, f"oro.{t}")
    con.close()
    print(DB)


if __name__ == "__main__":
    main()
