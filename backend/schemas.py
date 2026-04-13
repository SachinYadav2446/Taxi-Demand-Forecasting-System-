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

class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2)
    fleet_size: Optional[int] = Field(None, gt=0)

class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

# --- Zone Schemas ---
class ZoneBase(BaseModel):
    location_id: int
    borough: str
    zone_name: str
    service_zone: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True

class CompanyZoneCreate(BaseModel):
    location_ids: List[int]

# --- Forecast Schemas ---
class ForecastResponse(BaseModel):
    historical: list
    predicted: list
    meta: Dict[str, Any]
    requested_window: Optional[Dict[str, Any]]
    peak_demand: Optional[Dict[str, Any]]
    average_demand: Optional[float]

    class Config:
        from_attributes = True

# --- Recommendation Schemas ---
class RecommendationItem(BaseModel):
    location_id: int
    zone_name: str
    borough: str
    forecasted_pickups: int
