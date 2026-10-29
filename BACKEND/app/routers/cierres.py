import uuid
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Cierre, Registro, Pago, Trabajador
from ..schemas import CierreOut

router = APIRouter(prefix="/api/cierres", tags=["Cierres"])

def ejecutar_cierre_semana_db(cierre: Cierre, db: Session) -> Cierre:
    """Ejecuta el cálculo de nómina y cierra formalmente la semana indicada."""
    if cierre.estado == "CERRADO":
        return cierre

    registros = db.query(Registro).filter(Registro.cierre_id == cierre.id).all()
    by_worker = {}
    for r in registros:
        by_worker[r.worker_id] = by_worker.get(r.worker_id, 0.0) + r.subtotal

    total_gastado = 0.0
    for wid, bruto in by_worker.items():
        total_gastado += bruto
        worker = db.query(Trabajador).filter(Trabajador.id == wid).first()
        metodo = worker.metodo if worker else "EFECTIVO"

        pago = db.query(Pago).filter(Pago.cierre_id == cierre.id, Pago.worker_id == wid).first()
        descuentos = pago.descuentos if pago else 0.0
        neto = round(bruto - descuentos, 2)
        if pago:
            metodo = pago.metodo or metodo
            if metodo == "MIXTO" and pago.monto_efectivo is not None and pago.monto_digital is not None and round(pago.monto_efectivo + pago.monto_digital, 2) == neto:
                monto_efectivo = pago.monto_efectivo
                monto_digital = pago.monto_digital
            elif metodo == "MIXTO":
                monto_efectivo = round(neto / 2, 2)
                monto_digital = round(neto - monto_efectivo, 2)
            elif metodo == "EFECTIVO":
                monto_efectivo = neto
                monto_digital = 0.0
            else:
                monto_efectivo = 0.0
                monto_digital = neto
        else:
            monto_efectivo = neto if metodo == "EFECTIVO" else (round(neto / 2, 2) if metodo == "MIXTO" else 0.0)
            monto_digital = 0.0 if metodo == "EFECTIVO" else (round(neto - monto_efectivo, 2) if metodo == "MIXTO" else neto)

        if not pago:
            pago = Pago(
                id=f"pago_{uuid.uuid4().hex[:7]}",
                cierre_id=cierre.id,
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

    # Si no queda ninguna semana abierta, abrir la semana siguiente (inicia Lunes siguiente)
    hay_abierta = db.query(Cierre).filter(Cierre.estado == "ABIERTO").first()
    if not hay_abierta:
        fin_date = datetime.date.fromisoformat(cierre.fecha_fin)
        # Si terminaba en domingo (weekday 6) o cualquier día, el siguiente lunes es fin_date + 1 (o según corresponda)
        if fin_date.weekday() == 6:
            next_start = fin_date + datetime.timedelta(days=1)
        elif fin_date.weekday() == 5: # Sábado (legado)
            next_start = fin_date + datetime.timedelta(days=2)
        else:
            next_start = fin_date + datetime.timedelta(days=1)
        next_fin = next_start + datetime.timedelta(days=6) # Domingo

        # Verificar si ya existía una semana para esa fecha inicio
        semana_existente = db.query(Cierre).filter(Cierre.fecha_inicio == next_start.isoformat()).first()
        if semana_existente:
            semana_existente.estado = "ABIERTO"
        else:
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
    return cierre

def procesar_cierres_automaticos(db: Session):
    """
    Verifica las semanas abiertas. Si pasaron las 11:59:59 PM del domingo (o fecha_fin),
    se cierran automáticamente calculando nómina y se asegura la semana siguiente abierta.
    """
    now = datetime.datetime.now()
    today = now.date()

    abiertas = db.query(Cierre).filter(Cierre.estado == "ABIERTO").all()
    for c in abiertas:
        fin_date = datetime.date.fromisoformat(c.fecha_fin)
        
        # Corregir si fecha_fin era sábado (formato anterior) para extenderlo hasta domingo
        if fin_date.weekday() == 5:
            fin_date = fin_date + datetime.timedelta(days=1)
            c.fecha_fin = fin_date.isoformat()
            db.commit()

        # Condición: domingo a las 11:59:59 PM
        limite = datetime.datetime.combine(fin_date, datetime.time(23, 59, 59))
        if now > limite:
            print(f"[AUTO-CIERRE] Cierre automático de semana {c.id} ({c.fecha_inicio} a {c.fecha_fin}) por vencer el domingo a las 11:59 PM.")
            ejecutar_cierre_semana_db(c, db)

    # Asegurar que exista una semana ABIERTA para la semana en curso (Lunes a Domingo)
    hay_abierta = db.query(Cierre).filter(Cierre.estado == "ABIERTO").first()
    if not hay_abierta:
        curr_monday = today - datetime.timedelta(days=today.weekday())
        curr_sunday = curr_monday + datetime.timedelta(days=6)
        existente = db.query(Cierre).filter(Cierre.fecha_inicio == curr_monday.isoformat()).first()
        if not existente:
            nuevo = Cierre(
                id=f"c_{uuid.uuid4().hex[:7]}",
                fecha_inicio=curr_monday.isoformat(),
                fecha_fin=curr_sunday.isoformat(),
                estado="ABIERTO",
                total_gastado=0.0
            )
            db.add(nuevo)
            db.commit()

@router.get("", response_model=List[CierreOut])
def listar_cierres(db: Session = Depends(get_db)):
    procesar_cierres_automaticos(db)
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

    cierre = ejecutar_cierre_semana_db(cierre, db)

    return CierreOut(
        id=cierre.id,
        fechaInicio=cierre.fecha_inicio,
        fechaFin=cierre.fecha_fin,
        estado=cierre.estado,
        totalGastado=cierre.total_gastado
    )

@router.post("/{cierre_id}/reopen", response_model=CierreOut)
def reabrir_semana(cierre_id: str, db: Session = Depends(get_db)):
    cierre = db.query(Cierre).filter(Cierre.id == cierre_id).first()
    if not cierre:
        raise HTTPException(status_code=404, detail="Semana no encontrada")
    cierre.estado = "ABIERTO"
    db.commit()
    db.refresh(cierre)
    return CierreOut(
        id=cierre.id,
        fechaInicio=cierre.fecha_inicio,
        fechaFin=cierre.fecha_fin,
        estado=cierre.estado,
        totalGastado=cierre.total_gastado
    )

@router.post("/nueva-semana", response_model=CierreOut)
def crear_nueva_semana(db: Session = Depends(get_db)):
    ultimo = db.query(Cierre).order_by(Cierre.fecha_fin.desc()).first()
    if ultimo:
        fin_date = datetime.date.fromisoformat(ultimo.fecha_fin)
        next_start = fin_date + datetime.timedelta(days=1)
        next_fin = next_start + datetime.timedelta(days=6)
    else:
        today = datetime.date.today()
        next_start = today - datetime.timedelta(days=today.weekday())
        next_fin = next_start + datetime.timedelta(days=6)

    nuevo = Cierre(
        id=f"c_{uuid.uuid4().hex[:7]}",
        fecha_inicio=next_start.isoformat(),
        fecha_fin=next_fin.isoformat(),
        estado="ABIERTO",
        total_gastado=0.0
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return CierreOut(
        id=nuevo.id,
        fechaInicio=nuevo.fecha_inicio,
        fechaFin=nuevo.fecha_fin,
        estado=nuevo.estado,
        totalGastado=nuevo.total_gastado
    )

