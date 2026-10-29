import datetime
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Trabajador, Tarifa, Cierre, Registro, Pago
from .cierres import procesar_cierres_automaticos

router = APIRouter(prefix="/api/state", tags=["Estado General"])

@router.get("")
def obtener_estado_completo(db: Session = Depends(get_db)):
    procesar_cierres_automaticos(db)

    workers = db.query(Trabajador).all()
    rates = db.query(Tarifa).all()
    closures = db.query(Cierre).order_by(Cierre.fecha_inicio.asc()).all()
    records = db.query(Registro).all()
    payments = db.query(Pago).all()

    return {
        "workers": [
            {
                "id": w.id,
                "nombre": w.nombre,
                "dni": w.dni,
                "telefono": w.telefono or "",
                "rol": w.rol,
                "metodo": w.metodo,
                "activo": w.activo
            }
            for w in workers
        ],
        "rates": [
            {
                "id": r.id,
                "rol": r.rol,
                "concepto": r.concepto,
                "precioPar": r.precio_par,
                "precioDocena": r.precio_docena,
                "activo": r.activo
            }
            for r in rates
        ],
        "closures": [
            {
                "id": c.id,
                "fechaInicio": c.fecha_inicio,
                "fechaFin": c.fecha_fin,
                "estado": c.estado,
                "totalGastado": c.total_gastado
            }
            for c in closures
        ],
        "records": [
            {
                "id": rec.id,
                "workerId": rec.worker_id,
                "rateId": rec.rate_id,
                "cierreId": rec.cierre_id,
                "fecha": rec.fecha,
                "unidad": rec.unidad,
                "cantidad": rec.cantidad,
                "precio": rec.precio,
                "subtotal": rec.subtotal,
                "notas": rec.notas or ""
            }
            for rec in records
        ],
        "payments": [
            {
                "id": p.id,
                "cierreId": p.cierre_id,
                "workerId": p.worker_id,
                "bruto": p.bruto,
                "descuentos": p.descuentos,
                "neto": p.neto,
                "metodo": p.metodo,
                "montoEfectivo": p.monto_efectivo,
                "montoDigital": p.monto_digital
            }
            for p in payments
        ]
    }
