import uuid
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Cierre, Registro, Pago, Trabajador
from ..schemas import CierreOut

router = APIRouter(prefix="/api/cierres", tags=["Cierres"])

@router.get("", response_model=List[CierreOut])
def listar_cierres(db: Session = Depends(get_db)):
    cierres = db.query(Cierre).order_by(Cierre.fecha_inicio.desc()).all()
    return [
        CierreOut(
            id=c.id,
            fechaInicio=c.fecha_inicio,
            fechaFin=c.fecha_fin,
            estado=c.estado,
            totalGastado=c.total_gastado
        )
        for c in cierres
    ]

@router.post("/{cierre_id}/close", response_model=CierreOut)
def cerrar_semana(cierre_id: str, db: Session = Depends(get_db)):
    cierre = db.query(Cierre).filter(Cierre.id == cierre_id).first()
    if not cierre:
        raise HTTPException(status_code=404, detail="Semana no encontrada")
    if cierre.estado == "CERRADO":
        raise HTTPException(status_code=400, detail="Esta semana ya fue cerrada")

    registros = db.query(Registro).filter(Registro.cierre_id == cierre_id).all()
    by_worker = {}
    for r in registros:
        by_worker[r.worker_id] = by_worker.get(r.worker_id, 0.0) + r.subtotal

    total_gastado = 0.0
    for wid, bruto in by_worker.items():
        total_gastado += bruto
        worker = db.query(Trabajador).filter(Trabajador.id == wid).first()
        metodo = worker.metodo if worker else "EFECTIVO"

        pago = db.query(Pago).filter(Pago.cierre_id == cierre_id, Pago.worker_id == wid).first()
        descuentos = pago.descuentos if pago else 0.0
        neto = round(bruto - descuentos, 2)
        if pago:
            metodo = pago.metodo or metodo

        monto_efectivo = neto if metodo == "EFECTIVO" else (neto / 2 if metodo == "MIXTO" else 0.0)
        monto_digital = 0.0 if metodo == "EFECTIVO" else (neto / 2 if metodo == "MIXTO" else neto)

        if not pago:
            pago = Pago(
                id=f"pago_{uuid.uuid4().hex[:7]}",
                cierre_id=cierre_id,
                worker_id=wid,
                bruto=bruto,
                descuentos=descuentos,
                neto=neto,
                metodo=metodo,
                monto_efectivo=monto_efectivo,
                monto_digital=monto_digital
            )
            db.add(pago)
        else:
            pago.bruto = bruto
            pago.neto = neto
            pago.metodo = metodo
            pago.monto_efectivo = monto_efectivo
            pago.monto_digital = monto_digital

    cierre.estado = "CERRADO"
    cierre.total_gastado = round(total_gastado, 2)

    hay_abierta = db.query(Cierre).filter(Cierre.estado == "ABIERTO").first()
    if not hay_abierta:
        fin_date = datetime.date.fromisoformat(cierre.fecha_fin)
        next_start = fin_date + datetime.timedelta(days=2)
        next_fin = next_start + datetime.timedelta(days=5)
        nuevo_cierre = Cierre(
            id=f"c_{uuid.uuid4().hex[:7]}",
            fecha_inicio=next_start.isoformat(),
            fecha_fin=next_fin.isoformat(),
            estado="ABIERTO",
            total_gastado=0.0
        )
        db.add(nuevo_cierre)

    db.commit()
    db.refresh(cierre)

    return CierreOut(
        id=cierre.id,
        fechaInicio=cierre.fecha_inicio,
        fechaFin=cierre.fecha_fin,
        estado=cierre.estado,
        totalGastado=cierre.total_gastado
    )
