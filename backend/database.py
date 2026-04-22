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

# SSL Configuration for RDS
connect_args = {}
if "sslrootcert" in SQLALCHEMY_DATABASE_URL:
    # If parameters are in the URL string, SQLAlchemy handles them
    pass
else:
    # Try to find global-bundle.pem in current dir or parent dir (for Lambda)
    cert_path = os.path.join(os.path.dirname(__file__), "global-bundle.pem")
    if not os.path.exists(cert_path):
        # Fallback to current working directory
        cert_path = "global-bundle.pem"
        
    if os.path.exists(cert_path):
        # Using 'require' is safer than 'verify-full' if there are hostname mismatches,
        # but still ensures encrypted connection.
        connect_args = {
            "sslmode": "require",
            "sslrootcert": cert_path
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
