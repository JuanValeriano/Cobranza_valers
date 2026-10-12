import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import engine, Base, SessionLocal
from .seed import seed_database
from .routers import trabajadores, tarifas, registros, cierres, pagos, state

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas en PostgreSQL (Neon) si no existen
    Base.metadata.create_all(bind=engine)
    
    # Poblar base de datos inicial si está vacía
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

# Configurar CORS para permitir peticiones desde cualquier origen local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar Routers de la API
app.include_router(trabajadores.router)
app.include_router(tarifas.router)
app.include_router(registros.router)
app.include_router(cierres.router)
app.include_router(pagos.router)
app.include_router(state.router)

# Healthcheck
@app.get("/api/health")
def health():
    return {"status": "healthy", "db": "connected"}

# Montar archivos estáticos para servir el frontend desde el mismo servidor
css_dir = os.path.join(BASE_DIR, "css")
js_dir = os.path.join(BASE_DIR, "js")

if os.path.isdir(css_dir):
    app.mount("/css", StaticFiles(directory=css_dir), name="css")

if os.path.isdir(js_dir):
    app.mount("/js", StaticFiles(directory=js_dir), name="js")

@app.get("/")
def serve_index():
    index_path = os.path.join(BASE_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    return {"sistema": "Sistema de Cobranza a Colaboradores — VALER E.I.R.L", "docs": "/docs"}
