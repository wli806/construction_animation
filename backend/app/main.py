import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .database import engine
from . import models
from .routers import auth, projects, tasks

# Create tables on startup (use Alembic for migrations in production)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="4D BIM Construction API", version="1.0.0", docs_url="/api/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve built frontend in production
_DIST = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dist")
if os.path.isdir(_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        index = os.path.join(_DIST, "index.html")
        return FileResponse(index)
