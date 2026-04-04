from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import models
import schemas
from database import get_db
from core.security import require_operator, get_current_user

router = APIRouter(
    prefix="/zones",
    tags=["Zones"]
)

@router.get("/", response_model=Dict[str, List[schemas.ZoneBase]])
def get_zones_grouped_by_borough(db: Session = Depends(get_db)):
    zones = db.query(models.Zone).all()
    grouped = {}
    for z in zones:
        b = z.borough if z.borough else "Unknown"
        if b not in grouped:
            grouped[b] = []
        grouped[b].append(z)
    return grouped

@router.post("/company")
def update_company_zones(
    zone_data: schemas.CompanyZoneCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_operator)
):
    company_id = current_user["user"].id
    
    # Verify all location_ids exist
    valid_zones = db.query(models.Zone.location_id).filter(models.Zone.location_id.in_(zone_data.location_ids)).all()
    valid_zone_ids = {z[0] for z in valid_zones}
    if len(valid_zone_ids) != len(zone_data.location_ids):
        raise HTTPException(status_code=400, detail="One or more zone IDs are invalid")
    
    # Delete existing mappings for the company
    db.query(models.CompanyZone).filter(models.CompanyZone.company_id == company_id).delete()
    
    # Insert new mappings
    new_mappings = [
        models.CompanyZone(company_id=company_id, location_id=loc_id)
        for loc_id in valid_zone_ids
    ]
    db.bulk_save_objects(new_mappings)
    db.commit()
    
    return {"message": "Company zones updated successfully", "mapped_zones": list(valid_zone_ids)}

@router.get("/company", response_model=List[schemas.ZoneBase])
def get_company_zones(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_operator)
):
    company_id = current_user["user"].id
    zones = db.query(models.Zone).join(
        models.CompanyZone, models.Zone.location_id == models.CompanyZone.location_id
    ).filter(
        models.CompanyZone.company_id == company_id
    ).all()
    return zones
