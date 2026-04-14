from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, UniqueConstraint, Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

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
    forecast_values = Column(JSONB)

class HistoricalDemand(Base):
    __tablename__ = "historical_demand"
    __table_args__ = (UniqueConstraint('location_id', 'datetime', name='uq_location_datetime'),)

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("zones.location_id"), index=True)
    datetime = Column(TIMESTAMP, index=True)
    pickup_count = Column(Integer)
