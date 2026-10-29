import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Registro, Tarifa, Cierre
from ..schemas import RegistroCreate, RegistroUpdate, RegistroOut
from .cierres import procesar_cierres_automaticos

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
    procesar_cierres_automaticos(db)
    oc = db.query(Cierre).filter(Cierre.estado == "ABIERTO").first()
    if not oc:
        today = datetime.date.today()
        monday = today - datetime.timedelta(days=today.weekday())
        sunday = monday + datetime.timedelta(days=6)
        existente = db.query(Cierre).filter(Cierre.fecha_inicio == monday.isoformat()).first()
        if existente:
            existente.estado = "ABIERTO"
            oc = existente
        else:
            oc = Cierre(
                id=f"c_{uuid.uuid4().hex[:7]}",
                fecha_inicio=monday.isoformat(),
                fecha_fin=sunday.isoformat(),
                estado="ABIERTO",
                total_gastado=0.0
            )
            db.add(oc)
        db.commit()
        db.refresh(oc)


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

@router.put("/{record_id}", response_model=RegistroOut)
def actualizar_registro(record_id: str, data: RegistroUpdate, db: Session = Depends(get_db)):
    r = db.query(Registro).filter(Registro.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    cierre = db.query(Cierre).filter(Cierre.id == r.cierre_id).first()
    if cierre and cierre.estado == "CERRADO":
        raise HTTPException(status_code=400, detail="No se pueden editar registros de una semana cerrada")

    if data.worker_id is not None:
        r.worker_id = data.worker_id
    if data.fecha is not None:
        r.fecha = data.fecha
    if data.notas is not None:
        r.notas = data.notas
    if data.rate_id is not None:
        r.rate_id = data.rate_id
    if data.unidad is not None:
        r.unidad = data.unidad
    if data.cantidad is not None:
        r.cantidad = data.cantidad

    rate = db.query(Tarifa).filter(Tarifa.id == r.rate_id).first()
    if rate:
        r.precio = rate.precio_par if r.unidad == "PAR" else rate.precio_docena
        r.subtotal = round(r.precio * r.cantidad, 2)

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

