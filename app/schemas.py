from typing import Optional, List
from pydantic import BaseModel, Field

class TrabajadorBase(BaseModel):
    nombre: str
    dni: str
    telefono: Optional[str] = ""
    rol: str
    metodo: Optional[str] = "EFECTIVO"
    activo: Optional[int] = 1

class TrabajadorCreate(TrabajadorBase):
    id: Optional[str] = None

class TrabajadorUpdate(BaseModel):
    nombre: Optional[str] = None
    dni: Optional[str] = None
    telefono: Optional[str] = None
    rol: Optional[str] = None
    metodo: Optional[str] = None
    activo: Optional[int] = None

class TrabajadorOut(TrabajadorBase):
    id: str

    class Config:
        from_attributes = True


class TarifaBase(BaseModel):
    rol: str
    concepto: str
    precio_par: float = Field(alias="precioPar")
    precio_docena: float = Field(alias="precioDocena")
    activo: Optional[int] = 1

    class Config:
        populate_by_name = True

class TarifaCreate(TarifaBase):
    id: Optional[str] = None

class TarifaUpdate(BaseModel):
    rol: Optional[str] = None
    concepto: Optional[str] = None
    precio_par: Optional[float] = Field(None, alias="precioPar")
    precio_docena: Optional[float] = Field(None, alias="precioDocena")
    activo: Optional[int] = None

    class Config:
        populate_by_name = True

class TarifaOut(BaseModel):
    id: str
    rol: str
    concepto: str
    precioPar: float = Field(..., serialization_alias="precioPar")
    precioDocena: float = Field(..., serialization_alias="precioDocena")
    activo: int

    class Config:
        from_attributes = True
        populate_by_name = True

class CierreBase(BaseModel):
    fecha_inicio: str = Field(alias="fechaInicio")
    fecha_fin: str = Field(alias="fechaFin")
    estado: Optional[str] = "ABIERTO"
    total_gastado: Optional[float] = Field(0.0, alias="totalGastado")

    class Config:
        populate_by_name = True

class CierreOut(BaseModel):
    id: str
    fechaInicio: str
    fechaFin: str
    estado: str
    totalGastado: Optional[float] = 0.0

    class Config:
        from_attributes = True
        populate_by_name = True

class RegistroCreate(BaseModel):
    worker_id: str = Field(alias="workerId")
    rate_id: str = Field(alias="rateId")
    fecha: str
    unidad: str = "PAR"
    cantidad: float
    notas: Optional[str] = ""

    class Config:
        populate_by_name = True

class RegistroOut(BaseModel):
    id: str
    workerId: str
    rateId: str
    cierreId: str
    fecha: str
    unidad: str
    cantidad: float
    precio: float
    subtotal: float
    notas: Optional[str] = ""

    class Config:
        from_attributes = True
        populate_by_name = True

class PagoUpdate(BaseModel):
    descuentos: Optional[float] = None
    metodo: Optional[str] = None
    bruto: Optional[float] = None

class PagoOut(BaseModel):
    id: str
    cierreId: str
    workerId: str
    bruto: float
    descuentos: float
    neto: float
    metodo: str
    montoEfectivo: float
    montoDigital: float

    class Config:
        from_attributes = True
        populate_by_name = True
