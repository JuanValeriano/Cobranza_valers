import datetime
from sqlalchemy.orm import Session
from .models import Trabajador, Tarifa, Cierre, Registro, Pago

def seed_database(db: Session):
    if db.query(Trabajador).first():
        return

    today = datetime.date.today()
    monday = today - datetime.timedelta(days=today.weekday())
    monday_iso = monday.isoformat()
    sunday_iso = (monday + datetime.timedelta(days=6)).isoformat()

    def add_days_iso(base_iso: str, days: int) -> str:
        d = datetime.date.fromisoformat(base_iso)
        return (d + datetime.timedelta(days=days)).isoformat()

    workers_data = [
        {"id": "w1", "nombre": "Jorge Ramírez", "dni": "41022310", "telefono": "987 112 004", "rol": "ARMADOR", "metodo": "EFECTIVO", "activo": 1},
        {"id": "w2", "nombre": "Luis Huamán", "dni": "45871209", "telefono": "988 340 771", "rol": "ARMADOR", "metodo": "YAPE", "activo": 1},
        {"id": "w3", "nombre": "Pedro Salazar", "dni": "42219087", "telefono": "989 004 552", "rol": "PERFILADOR", "metodo": "EFECTIVO", "activo": 1},
        {"id": "w4", "nombre": "Marco Ttito", "dni": "47765310", "telefono": "981 220 093", "rol": "PERFILADOR", "metodo": "TRANSFERENCIA", "activo": 1},
        {"id": "w5", "nombre": "Ana Quispe", "dni": "44012987", "telefono": "986 771 220", "rol": "CORTADOR", "metodo": "EFECTIVO", "activo": 1},
        {"id": "w6", "nombre": "Rosa Mamani", "dni": "48120093", "telefono": "987 665 110", "rol": "CORTADOR", "metodo": "YAPE", "activo": 1},
        {"id": "w7", "nombre": "Elena Vargas", "dni": "43209871", "telefono": "984 552 671", "rol": "ALISTADORA", "metodo": "EFECTIVO", "activo": 1},
        {"id": "w8", "nombre": "Carlos Ñahui", "dni": "46612093", "telefono": "983 110 224", "rol": "ARMADOR", "metodo": "EFECTIVO", "activo": 0},
    ]

    for w in workers_data:
        db.add(Trabajador(**w))

    rates_data = [
        {"id": "r1", "rol": "ARMADOR", "concepto": "Falsas", "precio_par": 8.50, "precio_docena": 96.00, "activo": 1},
        {"id": "r2", "rol": "ARMADOR", "concepto": "Eva", "precio_par": 7.00, "precio_docena": 80.00, "activo": 1},
        {"id": "r3", "rol": "ARMADOR", "concepto": "Falsas forradas", "precio_par": 9.20, "precio_docena": 104.00, "activo": 1},
        {"id": "r4", "rol": "ARMADOR", "concepto": "Azaleia", "precio_par": 8.80, "precio_docena": 100.00, "activo": 1},
        {"id": "r5", "rol": "ARMADOR", "concepto": "Espanso", "precio_par": 7.50, "precio_docena": 85.00, "activo": 1},
        {"id": "r6", "rol": "ARMADOR", "concepto": "PU", "precio_par": 8.00, "precio_docena": 90.00, "activo": 1},
        {"id": "r7", "rol": "PERFILADOR", "concepto": "Código 932", "precio_par": 12.00, "precio_docena": 138.00, "activo": 1},
        {"id": "r8", "rol": "PERFILADOR", "concepto": "Código 944", "precio_par": 14.50, "precio_docena": 166.00, "activo": 1},
        {"id": "r9", "rol": "PERFILADOR", "concepto": "Código 810", "precio_par": 10.80, "precio_docena": 124.00, "activo": 1},
        {"id": "r10", "rol": "CORTADOR", "concepto": "Cuero", "precio_par": 6.00, "precio_docena": 68.00, "activo": 1},
        {"id": "r11", "rol": "CORTADOR", "concepto": "Badana", "precio_par": 4.50, "precio_docena": 51.00, "activo": 1},
        {"id": "r12", "rol": "CORTADOR", "concepto": "Forro", "precio_par": 3.80, "precio_docena": 43.00, "activo": 1},
        {"id": "r13", "rol": "ALISTADORA", "concepto": "Cajas armadas", "precio_par": 1.20, "precio_docena": 13.50, "activo": 1},
        {"id": "r14", "rol": "ALISTADORA", "concepto": "Piedras / adornos", "precio_par": 2.50, "precio_docena": 28.00, "activo": 1},
        {"id": "r15", "rol": "ALISTADORA", "concepto": "Pegado", "precio_par": 1.80, "precio_docena": 20.50, "activo": 1},
    ]

    for r in rates_data:
        db.add(Tarifa(**r))

    closures_data = [
        {"id": "c_open", "fecha_inicio": monday_iso, "fecha_fin": sunday_iso, "estado": "ABIERTO", "total_gastado": 0.0},
        {"id": "c_prev1", "fecha_inicio": add_days_iso(monday_iso, -7), "fecha_fin": add_days_iso(sunday_iso, -7), "estado": "CERRADO", "total_gastado": 4200.0},
        {"id": "c_prev2", "fecha_inicio": add_days_iso(monday_iso, -14), "fecha_fin": add_days_iso(sunday_iso, -14), "estado": "CERRADO", "total_gastado": 3850.0},
        {"id": "c_prev3", "fecha_inicio": add_days_iso(monday_iso, -21), "fecha_fin": add_days_iso(sunday_iso, -21), "estado": "CERRADO", "total_gastado": 3500.0},
    ]

    for c in closures_data:
        db.add(Cierre(**c))

    db.commit()

    rates_map = {r["id"]: r for r in rates_data}
    def calc_rate(rate_id, unidad, cant):
        rt = rates_map[rate_id]
        p = rt["precio_par"] if unidad == "PAR" else rt["precio_docena"]
        return p, round(p * cant, 2)

    tod_off = min(today.weekday(), 5)
    sample_recs = [
        ("reg_1", "w1", "r1", 0, "DOCENA", 3, "c_open", ""),
        ("reg_2", "w1", "r2", 1, "PAR", 18, "c_open", ""),
        ("reg_3", "w2", "r4", 0, "DOCENA", 2.5, "c_open", ""),
        ("reg_4", "w2", "r6", min(2, tod_off), "PAR", 22, "c_open", "Lote con retoque"),
        ("reg_5", "w3", "r7", 0, "DOCENA", 4, "c_open", ""),
        ("reg_6", "w3", "r8", 1, "PAR", 16, "c_open", ""),
        ("reg_7", "w4", "r9", min(2, tod_off), "DOCENA", 3.5, "c_open", ""),
        ("reg_8", "w5", "r10", 0, "DOCENA", 5, "c_open", ""),
        ("reg_9", "w6", "r11", 1, "PAR", 30, "c_open", ""),
        ("reg_10", "w5", "r12", min(tod_off, 3), "PAR", 24, "c_open", ""),
        ("reg_11", "w7", "r13", 0, "DOCENA", 6, "c_open", ""),
        ("reg_12", "w7", "r14", 1, "PAR", 20, "c_open", "Pedido especial"),
        ("reg_13", "w7", "r15", min(tod_off, 4), "DOCENA", 2, "c_open", ""),
    ]

    for rid, wid, rtid, offset, uni, qty, cid, notas in sample_recs:
        p, sub = calc_rate(rtid, uni, qty)
        db.add(Registro(
            id=rid,
            worker_id=wid,
            rate_id=rtid,
            fecha=add_days_iso(monday_iso, offset),
            unidad=uni,
            cantidad=qty,
            precio=p,
            subtotal=sub,
            notas=notas,
            cierre_id=cid
        ))

    db.commit()
