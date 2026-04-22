import os
import sqlalchemy
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres:Sachin2442006@database-1.cdoqem628xxj.eu-north-1.rds.amazonaws.com:5432/postgres"

print(f"Testing connection to: {db_url}")

try:
    engine = create_engine(db_url, connect_args={"sslmode": "require"})
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"Connection successful! Result: {result.scalar()}")
except Exception as e:
    print(f"Connection failed: {e}")
