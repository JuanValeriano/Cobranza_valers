import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Tarifa
from ..schemas import TarifaCreate, TarifaUpdate, TarifaOut

router = APIRouter(prefix="/api/tarifas", tags=["Tarifas"])

@router.get("", response_model=List[TarifaOut])
def listar_tarifas(db: Session = Depends(get_db)):
    tarifas = db.query(Tarifa).all()
    return [
        TarifaOut(
            id=t.id,
            rol=t.rol,
            concepto=t.concepto,
            precioPar=t.precio_par,
            precioDocena=t.precio_docena,
            activo=t.activo
        )
        for t in tarifas
    ]

@router.post("", response_model=TarifaOut)
def crear_tarifa(data: TarifaCreate, db: Session = Depends(get_db)):
    rate_id = data.id or f"r_{uuid.uuid4().hex[:7]}"
    t = Tarifa(
        id=rate_id,
        rol=data.rol,
        concepto=data.concepto,
        precio_par=data.precio_par,
        precio_docena=data.precio_docena,
        activo=data.activo if data.activo is not None else 1
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return TarifaOut(
        id=t.id,
        rol=t.rol,
        concepto=t.concepto,
        precioPar=t.precio_par,
        precioDocena=t.precio_docena,
        activo=t.activo
    )

@router.put("/{rate_id}", response_model=TarifaOut)
def editar_tarifa(rate_id: str, data: TarifaUpdate, db: Session = Depends(get_db)):
    t = db.query(Tarifa).filter(Tarifa.id == rate_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tarifa no encontrada")
    
    if data.rol is not None: t.rol = data.rol
    if data.concepto is not None: t.concepto = data.concepto
    if data.precio_par is not None: t.precio_par = data.precio_par
    if data.precio_docena is not None: t.precio_docena = data.precio_docena
    if data.activo is not None: t.activo = data.activo

    db.commit()
    db.refresh(t)
    return TarifaOut(
        id=t.id,
        rol=t.rol,
        concepto=t.concepto,
        precioPar=t.precio_par,
        precioDocena=t.precio_docena,
        activo=t.activo
    )

@router.patch("/{rate_id}/toggle", response_model=TarifaOut)
def alternar_estado(rate_id: str, db: Session = Depends(get_db)):
    t = db.query(Tarifa).filter(Tarifa.id == rate_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tarifa no encontrada")
    t.activo = 0 if t.activo == 1 else 1
    db.commit()
    db.refresh(t)
    return TarifaOut(
        id=t.id,
        rol=t.rol,
        concepto=t.concepto,
        precioPar=t.precio_par,
        precioDocena=t.precio_docena,
        activo=t.activo
    )
