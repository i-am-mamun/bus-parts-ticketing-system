"""FastAPI Application entry point for Soudia Parts Ticketing System."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.rbac_service import ensure_rbac_seeded
from app.routers.auth_users import audit_router, auth_router, settings_router, users_router
from app.routers.fleet import router as fleet_router
from app.routers.rbac import router as rbac_router
from app.routers.tickets import router as tickets_router
from app.seed import ensure_admin

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("soudia_parts_ticketing")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Ensure upload directory exists
    upload_path = Path(settings.UPLOAD_DIR).resolve()
    upload_path.mkdir(parents=True, exist_ok=True)
    (upload_path / "logos").mkdir(parents=True, exist_ok=True)
    (upload_path / "tickets").mkdir(parents=True, exist_ok=True)

    # 2. Automatically create database tables if they do not exist
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Error creating tables: {e}")

    # 3. Seed default admin & RBAC permissions
    with SessionLocal() as db:
        try:
            ensure_admin(db)
            ensure_rbac_seeded(db)
            logger.info("Admin and RBAC defaults verified.")
        except Exception as e:
            logger.error(f"Error in RBAC seed: {e}")

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Soudia Paribahan Bus Parts Ticketing System Backend",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS_LIST or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads (ticket problem images, attachments, company logo)
upload_dir = Path(settings.UPLOAD_DIR).resolve()
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

# Include Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(settings_router)
app.include_router(audit_router)
app.include_router(rbac_router)
app.include_router(fleet_router)
app.include_router(tickets_router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.APP_ENV,
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "error": str(exc)},
    )
