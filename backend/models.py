from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, UniqueConstraint, Float, JSON, TypeDecorator, types
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class _Json(TypeDecorator):
    """Dialect-agnostic JSON column type: JSONB on Postgres, JSON on SQLite/other."""

    impl = types.JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            try:
                from sqlalchemy.dialects.postgresql import JSONB
                return dialect.type_descriptor(JSONB())
            except Exception:
                pass
        return dialect.type_descriptor(JSON())


def _json_column(**kwargs):
    return Column(_Json(), **kwargs)

class Zone(Base):
    __tablename__ = "zones"

    location_id = Column(Integer, primary_key=True, index=True)
    borough = Column(String)
    zone_name = Column(String)
    service_zone = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(Text)
    fleet_size = Column(Integer)

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password_hash = Column(Text)

class CompanyZone(Base):
    __tablename__ = "company_zones"
    __table_args__ = (UniqueConstraint('company_id', 'location_id', name='uq_company_zone'),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    location_id = Column(Integer, ForeignKey("zones.location_id"))

class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("zones.location_id"))
    horizon = Column(String) # e.g., "hourly", "daily"
    cache_key = Column(String, index=True) # Cache key for deduplication
    generated_at = Column(TIMESTAMP, server_default=func.now())
    forecast_values = _json_column()

class HistoricalDemand(Base):
    __tablename__ = "historical_demand"
    __table_args__ = (UniqueConstraint('location_id', 'datetime', name='uq_location_datetime'),)

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("zones.location_id"), index=True)
    datetime = Column(TIMESTAMP, index=True)
    pickup_count = Column(Integer)


class ModelRun(Base):
    """
    Historical record of per-model training / validation runs per zone.
    Used by the Ensemble Engine to track rolling performance and weights.
    """
    __tablename__ = "model_runs"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("zones.location_id"), index=True)
    model_name = Column(String, index=True)   # "SARIMAX-Pro", "Prophet", "HoltWinters", "Ensemble"
    model_type = Column(String, index=True)   # "sarimax_exogenous", "prophet", "ets", "weighted_ensemble"
    metrics = _json_column()                   # { mae, rmse, wmape, r2, train_size, test_size }
    ensemble_weight = Column(Float, default=0.0)
    selected = Column(Integer, default=0)     # 1 = was the winning/selected model this run
    train_start = Column(TIMESTAMP, nullable=True)
    train_end = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)


class ModelComparison(Base):
    """
    Snapshot of a full multi-model comparison for a zone.
    Stores the side-by-side table returned by the /compare endpoint.
    """
    __tablename__ = "model_comparisons"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("zones.location_id"), index=True)
    selected_model = Column(String)
    ensemble_weights = _json_column()
    results = _json_column()                    # Per-model metric rows
    improvement_over_baseline = _json_column()  # % improvement vs SARIMAX baseline
    created_at = Column(TIMESTAMP, server_default=func.now())
