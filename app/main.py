from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, SessionLocal
from .seed import seed_database
from .routers import trabajadores, tarifas, registros, cierres, pagos, state

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    
    yield

app = FastAPI(
    title="Sistema de Cobranza a Colaboradores — VALER E.I.R.L",
    description="API REST de Control de Producción, Liquidación y Cobranza a Colaboradores",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trabajadores.router)
app.include_router(tarifas.router)
app.include_router(registros.router)
app.include_router(cierres.router)
app.include_router(pagos.router)
app.include_router(state.router)

@app.get("/")
def root():
    return {
        "sistema": "Sistema de Cobranza a Colaboradores — VALER E.I.R.L",
        "status": "online",
        "docs": "/docs"
    }

@app.get("/api/health")
def health():
    return {"status": "healthy"}
