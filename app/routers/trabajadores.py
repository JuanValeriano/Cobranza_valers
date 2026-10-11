import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Trabajador
from ..schemas import TrabajadorCreate, TrabajadorUpdate, TrabajadorOut

router = APIRouter(prefix="/api/trabajadores", tags=["Trabajadores"])

@router.get("", response_model=List[TrabajadorOut])
def listar_trabajadores(db: Session = Depends(get_db)):
    return db.query(Trabajador).all()

@router.post("", response_model=TrabajadorOut)
def crear_trabajador(data: TrabajadorCreate, db: Session = Depends(get_db)):
    worker_id = data.id or f"w_{uuid.uuid4().hex[:7]}"
    w = Trabajador(
        id=worker_id,
        nombre=data.nombre,
        dni=data.dni,
        telefono=data.telefono or "",
        rol=data.rol,
        metodo=data.metodo or "EFECTIVO",
        activo=data.activo if data.activo is not None else 1
    )
    db.add(w)
    db.commit()
    db.refresh(w)
    return w

@router.put("/{worker_id}", response_model=TrabajadorOut)
def editar_trabajador(worker_id: str, data: TrabajadorUpdate, db: Session = Depends(get_db)):
    w = db.query(Trabajador).filter(Trabajador.id == worker_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    
    if data.nombre is not None: w.nombre = data.nombre
    if data.dni is not None: w.dni = data.dni
    if data.telefono is not None: w.telefono = data.telefono
    if data.rol is not None: w.rol = data.rol
    if data.metodo is not None: w.metodo = data.metodo
    if data.activo is not None: w.activo = data.activo

    db.commit()
    db.refresh(w)
    return w

@router.patch("/{worker_id}/toggle", response_model=TrabajadorOut)
def alternar_estado(worker_id: str, db: Session = Depends(get_db)):
    w = db.query(Trabajador).filter(Trabajador.id == worker_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    w.activo = 0 if w.activo == 1 else 1
    db.commit()
    db.refresh(w)
    return w
