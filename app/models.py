import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Trabajador(Base):
    __tablename__ = "trabajadores"

    id = Column(String(50), primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    dni = Column(String(20), nullable=False, index=True)
    telefono = Column(String(50), nullable=True, default="")
    rol = Column(String(50), nullable=False)
    metodo = Column(String(50), nullable=False, default="EFECTIVO")
    activo = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    registros = relationship("Registro", back_populates="trabajador", cascade="all, delete-orphan")
    pagos = relationship("Pago", back_populates="trabajador", cascade="all, delete-orphan")


class Tarifa(Base):
    __tablename__ = "tarifas"

    id = Column(String(50), primary_key=True, index=True)
    rol = Column(String(50), nullable=False, index=True)
    concepto = Column(String(150), nullable=False)
    precio_par = Column(Float, nullable=False, default=0.0)
    precio_docena = Column(Float, nullable=False, default=0.0)
    activo = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    registros = relationship("Registro", back_populates="tarifa")


class Cierre(Base):
    __tablename__ = "cierres"

    id = Column(String(50), primary_key=True, index=True)
    fecha_inicio = Column(String(20), nullable=False)
    fecha_fin = Column(String(20), nullable=False)
    estado = Column(String(20), nullable=False, default="ABIERTO")
    total_gastado = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    registros = relationship("Registro", back_populates="cierre", cascade="all, delete-orphan")
    pagos = relationship("Pago", back_populates="cierre", cascade="all, delete-orphan")


class Registro(Base):
    __tablename__ = "registros"

    id = Column(String(50), primary_key=True, index=True)
    worker_id = Column(String(50), ForeignKey("trabajadores.id"), nullable=False, index=True)
    rate_id = Column(String(50), ForeignKey("tarifas.id"), nullable=False, index=True)
    cierre_id = Column(String(50), ForeignKey("cierres.id"), nullable=False, index=True)
    fecha = Column(String(20), nullable=False, index=True)
    unidad = Column(String(20), nullable=False, default="PAR")
    cantidad = Column(Float, nullable=False, default=1.0)
    precio = Column(Float, nullable=False, default=0.0)
    subtotal = Column(Float, nullable=False, default=0.0)
    notas = Column(Text, nullable=True, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    trabajador = relationship("Trabajador", back_populates="registros")
    tarifa = relationship("Tarifa", back_populates="registros")
    cierre = relationship("Cierre", back_populates="registros")


class Pago(Base):
    __tablename__ = "pagos"

    id = Column(String(50), primary_key=True, index=True)
    cierre_id = Column(String(50), ForeignKey("cierres.id"), nullable=False, index=True)
    worker_id = Column(String(50), ForeignKey("trabajadores.id"), nullable=False, index=True)
    bruto = Column(Float, nullable=False, default=0.0)
    descuentos = Column(Float, nullable=False, default=0.0)
    neto = Column(Float, nullable=False, default=0.0)
    metodo = Column(String(50), nullable=False, default="EFECTIVO")
    monto_efectivo = Column(Float, nullable=False, default=0.0)
    monto_digital = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    cierre = relationship("Cierre", back_populates="pagos")
    trabajador = relationship("Trabajador", back_populates="pagos")
