"""SQLAlchemy engine / session management."""
from __future__ import annotations

from typing import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

_db_url = settings.DATABASE_URL
if _db_url.startswith("mysql://"):
    _db_url = _db_url.replace("mysql://", "mysql+pymysql://", 1)

_is_sqlite = _db_url.startswith("sqlite")

engine_kwargs = {"pool_pre_ping": True}
if _is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 3600,
    })

engine = create_engine(
    _db_url,
    **engine_kwargs
)

if _is_sqlite:

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _):  # pragma: no cover - trivial
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA journal_mode=WAL")
        cur.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
