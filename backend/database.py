import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DB_URL_ENV = os.getenv("DATABASE_URL")

if DB_URL_ENV and DB_URL_ENV.strip():
    SQLALCHEMY_DATABASE_URL = DB_URL_ENV.strip()
    if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    _DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "demandsight_local.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{_DB_FILE}"
    _connect_args_windows_path = _DB_FILE.replace("\\", "/")

_IS_SQLITE = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

if _IS_SQLITE:
    connect_args = {"check_same_thread": False, "timeout": 30}
    _engine_kwargs = {"future": True}
else:
    connect_args = {
        "connect_timeout": 10,
        "options": "-c idle_in_transaction_session_timeout=30000",
    }
    _engine_kwargs = {
        "pool_pre_ping": True,
        "pool_size": 1,
        "max_overflow": 2,
        "pool_recycle": 1800,
    }

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    **_engine_kwargs,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
