import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# We get the database URL from environment variable, fallback to default for local non-docker dev
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://myuser:mypassword@localhost:5432/taxidemand")

# Fix for SQLAlchemy 1.4+ where postgres:// is not supported, must be postgresql://
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Neon DB (and most managed Postgres) handles SSL via the connection string.
# No extra cert files needed — sslmode=require is already in the URL.
connect_args = {
    "connect_timeout": 10,
    "options": "-c idle_in_transaction_session_timeout=30000"
}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,   # Reconnects if Neon wakes from sleep
    pool_size=1,          # MINIMIZE for free tier/serverless
    max_overflow=2,       # MINIMIZE for free tier/serverless
    pool_recycle=1800,    # Recycle connections every 30 min
    connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
