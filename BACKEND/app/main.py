import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import engine, Base, SessionLocal
from .seed import seed_database
from .routers import trabajadores, tarifas, registros, cierres, pagos, state
from .routers.cierres import procesar_cierres_automaticos

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

async def auto_cierre_background_task():
    """Tarea periódica que revisa y procesa cierres automáticos cada 30 segundos."""
    while True:
        try:
            db = SessionLocal()
            try:
                procesar_cierres_automaticos(db)
            finally:
                db.close()
        except Exception as e:
            print(f"[AUTO-CIERRE BACKGROUND ERROR]: {e}")
        await asyncio.sleep(30)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas en PostgreSQL (Neon) si no existen
    Base.metadata.create_all(bind=engine)
    
    # Poblar base de datos inicial y verificar cierres automáticos
    db = SessionLocal()
    try:
        seed_database(db)
        procesar_cierres_automaticos(db)
    finally:
        db.close()
    
    # Iniciar la tarea periódica en segundo plano
    bg_task = asyncio.create_task(auto_cierre_background_task())
    try:
        yield
    finally:
        bg_task.cancel()

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

@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

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

# Montar archivos estáticos para servir el frontend si está presente localmente
frontend_dir = os.path.join(os.path.dirname(BASE_DIR), "FRONTEND")
css_dir = os.path.join(frontend_dir, "css") if os.path.isdir(os.path.join(frontend_dir, "css")) else os.path.join(BASE_DIR, "css")
js_dir = os.path.join(frontend_dir, "js") if os.path.isdir(os.path.join(frontend_dir, "js")) else os.path.join(BASE_DIR, "js")
index_file = os.path.join(frontend_dir, "index.html") if os.path.isfile(os.path.join(frontend_dir, "index.html")) else os.path.join(BASE_DIR, "index.html")

if os.path.isdir(css_dir):
    app.mount("/css", StaticFiles(directory=css_dir), name="css")

if os.path.isdir(js_dir):
    app.mount("/js", StaticFiles(directory=js_dir), name="js")

@app.get("/")
def serve_index():
    if os.path.isfile(index_file):
        return FileResponse(index_file)
    return {
        "sistema": "Sistema de Cobranza a Colaboradores — VALER E.I.R.L",
        "estado": "Backend API en línea",
        "docs": "/docs"
    }
