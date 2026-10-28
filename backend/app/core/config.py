"""Application configuration (environment driven)."""
from __future__ import annotations

import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    PROJECT_NAME: str = "Soudia Parts Ticketing API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"

    APP_ENV: str = os.getenv("APP_ENV", "development").split("#")[0].strip()

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:@127.0.0.1:3306/parts_ticketing_system?charset=utf8mb4"
    ).split(" #")[0].strip()

    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-only-secret-change-me")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "12"))

    CORS_ORIGIN: str = os.getenv("CORS_ORIGIN", "http://localhost:3010,http://127.0.0.1:3010")

    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads")))
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "10"))

    ADMIN_NAME: str = os.getenv("ADMIN_NAME", "Administrator")
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@example.com")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "Admin@12345")

    @property
    def IS_PRODUCTION(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def CORS_ORIGINS_LIST(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGIN.split(",") if o.strip()]

    def validate_for_production(self) -> None:
        if self.IS_PRODUCTION and (
            self.JWT_SECRET.startswith("dev-only") or len(self.JWT_SECRET) < 32
        ):
            raise RuntimeError("JWT_SECRET must be a random string of at least 32 characters in production.")


settings = Settings()
