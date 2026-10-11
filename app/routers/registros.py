import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Registro, Tarifa, Cierre
from ..schemas import RegistroCreate, RegistroOut

router = APIRouter(prefix="/api/registros", tags=["Registros"])

@router.get("", response_model=List[RegistroOut])
def listar_registros(cierre_id: Optional[str] = Query(None, alias="cierreId"), db: Session = Depends(get_db)):
    query = db.query(Registro)
    if cierre_id:
        query = query.filter(Registro.cierre_id == cierre_id)
    registros = query.all()
    return [
        RegistroOut(
            id=r.id,
            workerId=r.worker_id,
            rateId=r.rate_id,
            cierreId=r.cierre_id,
            fecha=r.fecha,
            unidad=r.unidad,
            cantidad=r.cantidad,
            precio=r.precio,
            subtotal=r.subtotal,
            notas=r.notas or ""
        )
        for r in registros
    ]

@router.post("", response_model=RegistroOut)
def crear_registro(data: RegistroCreate, db: Session = Depends(get_db)):
    oc = db.query(Cierre).filter(Cierre.estado == "ABIERTO").first()
    if not oc:
        raise HTTPException(status_code=400, detail="No hay una semana abierta activa")

    rate = db.query(Tarifa).filter(Tarifa.id == data.rate_id).first()
    if not rate:
        raise HTTPException(status_code=404, detail="Tarifa no encontrada")

    precio = rate.precio_par if data.unidad == "PAR" else rate.precio_docena
    subtotal = round(precio * data.cantidad, 2)
    reg_id = f"reg_{uuid.uuid4().hex[:7]}"

    r = Registro(
        id=reg_id,
        worker_id=data.worker_id,
        rate_id=data.rate_id,
        cierre_id=oc.id,
        fecha=data.fecha,
        unidad=data.unidad,
        cantidad=data.cantidad,
        precio=precio,
        subtotal=subtotal,
        notas=data.notas or ""
    )
    db.add(r)
    db.commit()
    db.refresh(r)

    return RegistroOut(
        id=r.id,
        workerId=r.worker_id,
        rateId=r.rate_id,
        cierreId=r.cierre_id,
        fecha=r.fecha,
        unidad=r.unidad,
        cantidad=r.cantidad,
        precio=r.precio,
        subtotal=r.subtotal,
        notas=r.notas or ""
    )

@router.delete("/{record_id}")
def eliminar_registro(record_id: str, db: Session = Depends(get_db)):
    r = db.query(Registro).filter(Registro.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    cierre = db.query(Cierre).filter(Cierre.id == r.cierre_id).first()
    if cierre and cierre.estado == "CERRADO":
        raise HTTPException(status_code=400, detail="No se pueden eliminar registros de una semana cerrada")

    db.delete(r)
    db.commit()
    return {"message": "Registro eliminado con éxito", "id": record_id}
