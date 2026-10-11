import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Pago, Trabajador
from ..schemas import PagoUpdate, PagoOut

router = APIRouter(prefix="/api/pagos", tags=["Pagos"])

@router.get("", response_model=List[PagoOut])
def listar_pagos(db: Session = Depends(get_db)):
    pagos = db.query(Pago).all()
    return [
        PagoOut(
            id=p.id,
            cierreId=p.cierre_id,
            workerId=p.worker_id,
            bruto=p.bruto,
            descuentos=p.descuentos,
            neto=p.neto,
            metodo=p.metodo,
            montoEfectivo=p.monto_efectivo,
            montoDigital=p.monto_digital
        )
        for p in pagos
    ]

@router.put("/{cierre_id}/{worker_id}", response_model=PagoOut)
def actualizar_pago(cierre_id: str, worker_id: str, data: PagoUpdate, db: Session = Depends(get_db)):
    pago = db.query(Pago).filter(Pago.cierre_id == cierre_id, Pago.worker_id == worker_id).first()
    worker = db.query(Trabajador).filter(Trabajador.id == worker_id).first()
    
    if not pago:
        bruto = data.bruto or 0.0
        descuentos = data.descuentos or 0.0
        neto = round(bruto - descuentos, 2)
        metodo = data.metodo or (worker.metodo if worker else "EFECTIVO")
        pago = Pago(
            id=f"pago_{uuid.uuid4().hex[:7]}",
            cierre_id=cierre_id,
            worker_id=worker_id,
            bruto=bruto,
            descuentos=descuentos,
            neto=neto,
            metodo=metodo,
            monto_efectivo=neto if metodo == "EFECTIVO" else (neto/2 if metodo == "MIXTO" else 0.0),
            monto_digital=0.0 if metodo == "EFECTIVO" else (neto/2 if metodo == "MIXTO" else neto)
        )
        db.add(pago)
    else:
        if data.bruto is not None: pago.bruto = data.bruto
        if data.descuentos is not None: pago.descuentos = data.descuentos
        pago.neto = round(pago.bruto - pago.descuentos, 2)
        if data.metodo is not None: pago.metodo = data.metodo
        
        pago.monto_efectivo = pago.neto if pago.metodo == "EFECTIVO" else (pago.neto/2 if pago.metodo == "MIXTO" else 0.0)
        pago.monto_digital = 0.0 if pago.metodo == "EFECTIVO" else (pago.neto/2 if pago.metodo == "MIXTO" else pago.neto)

    db.commit()
    db.refresh(pago)

    return PagoOut(
        id=pago.id,
        cierreId=pago.cierre_id,
        workerId=pago.worker_id,
        bruto=pago.bruto,
        descuentos=pago.descuentos,
        neto=pago.neto,
        metodo=pago.metodo,
        montoEfectivo=pago.monto_efectivo,
        montoDigital=pago.monto_digital
    )
