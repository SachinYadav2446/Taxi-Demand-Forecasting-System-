import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# We get the database URL from environment variable, fallback to default for local non-docker dev
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://myuser:mypassword@localhost:5432/taxidemand")

# SSL Configuration for RDS
connect_args = {}
if "sslrootcert" in SQLALCHEMY_DATABASE_URL:
    # If parameters are in the URL string, SQLAlchemy handles them
    pass
elif os.path.exists("global-bundle.pem"):
    connect_args = {
        "sslmode": "verify-full",
        "sslrootcert": "global-bundle.pem"
    }

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
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
