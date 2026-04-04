from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class OperatorCreate(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=8)
    fleet_size: int = Field(..., gt=0)

class DriverCreate(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None

class UserProfile(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    fleet_size: Optional[int] = None

# --- Zone Schemas ---
class ZoneBase(BaseModel):
    location_id: int
    borough: str
    zone_name: str
    service_zone: str

    class Config:
        from_attributes = True

class CompanyZoneCreate(BaseModel):
    location_ids: List[int]

# --- Forecast Schemas ---
class ForecastResponse(BaseModel):
    location_id: int
    horizon: str
    generated_at: datetime
    forecast_values: Dict[str, Any]

    class Config:
        from_attributes = True
