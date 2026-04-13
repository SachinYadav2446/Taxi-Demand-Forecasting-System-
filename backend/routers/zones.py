from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import models
import schemas
from database import get_db
from sqlalchemy import text
from core.security import require_operator, get_current_user
from datetime import timedelta
from routers.forecasts import get_zone_forecast

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

@router.get("/trends")
def get_zone_trends(db: Session = Depends(get_db)):
    # Dynamically find the terminal edge of the actual dataset, regardless of current server calendar time
    # Clamp to < 2026-03-01 to perfectly ignore broken TLC taximeters reporting fake future rides
    max_date = db.execute(text("SELECT MAX(datetime) FROM historical_demand WHERE datetime < '2026-03-01'")).scalar()
    if not max_date:
        return {"top_zones": [], "bottom_zones": []}
    
    seven_days_ago = max_date - timedelta(days=7)
    
    # Natively query highest traffic hotspots (Top 5)
    top_query = text("""
        SELECT z.location_id, z.zone_name, z.borough, SUM(h.pickup_count) as total_pickups
        FROM historical_demand h
        JOIN zones z ON h.location_id = z.location_id
        WHERE h.datetime >= :start_date
        GROUP BY z.location_id, z.zone_name, z.borough
        ORDER BY total_pickups DESC LIMIT 5
    """)
    
    # Natively query absolute lowest traffic dead zones (Bottom 5)
    bottom_query = text("""
        SELECT z.location_id, z.zone_name, z.borough, SUM(h.pickup_count) as total_pickups
        FROM historical_demand h
        JOIN zones z ON h.location_id = z.location_id
        WHERE h.datetime >= :start_date
        GROUP BY z.location_id, z.zone_name, z.borough
        ORDER BY total_pickups ASC LIMIT 5
    """)
    
    top = db.execute(top_query, {"start_date": seven_days_ago}).fetchall()
    bottom = db.execute(bottom_query, {"start_date": seven_days_ago}).fetchall()
    
    return {
        "top_zones": [
            {"location_id": r.location_id, "zone_name": r.zone_name, "borough": r.borough, "pickups": int(r.total_pickups)} 
            for r in top
        ],
        "bottom_zones": [
            {"location_id": r.location_id, "zone_name": r.zone_name, "borough": r.borough, "pickups": int(r.total_pickups)} 
            for r in bottom
        ],
    }

@router.get("/heatmap_data")
def get_heatmap_data(db: Session = Depends(get_db)):
    max_date = db.execute(text("SELECT MAX(datetime) FROM historical_demand WHERE datetime < '2026-03-01'")).scalar()
    if not max_date:
        return []
        
    seven_days_ago = max_date - timedelta(days=7)
    
    query = text("""
        SELECT z.location_id, z.zone_name, z.borough, z.latitude, z.longitude, SUM(h.pickup_count) as value
        FROM historical_demand h
        JOIN zones z ON h.location_id = z.location_id
        WHERE h.datetime >= :start_date
        GROUP BY z.location_id, z.zone_name, z.borough, z.latitude, z.longitude
        ORDER BY value DESC
    """)
    
    results = db.execute(query, {"start_date": seven_days_ago}).fetchall()
    
    # Exclude known "water" or "non-land" zones that confuse users (2: Jamaica Bay, 103: Governor's Island, etc.)
    # Also exclude 264 (N/A) and 265 (Outside NYC)
    EXCLUDED_ZONES = {2, 103, 104, 105, 264, 265}
    
    heatmap_data = [
        {
            "location_id": r.location_id, 
            "name": r.zone_name, 
            "borough": r.borough, 
            "value": int(r.value),
            "latitude": r.latitude,
            "longitude": r.longitude
        } 
        for r in results if r.value > 0 and r.location_id not in EXCLUDED_ZONES
    ]
    
    return heatmap_data

@router.get("/{location_id}/recommendations", response_model=List[schemas.RecommendationItem])
def get_smart_recommendations(location_id: int, db: Session = Depends(get_db)):
    # 1. Get the current zone's borough
    current_zone = db.query(models.Zone).filter(models.Zone.location_id == location_id).first()
    if not current_zone:
        raise HTTPException(status_code=404, detail="Current zone not found")

    borough = current_zone.borough
    if not borough or borough.lower() in ["unknown", "n/a"]:
         # Fallback to Manhattan if borough is unknown to at least give some recommendations
         borough = "Manhattan"

    # 2. Get top 5 historically busiest zones in this same borough over the last 7 days (to act as heuristic filter)
    max_date = db.execute(text("SELECT MAX(datetime) FROM historical_demand WHERE datetime < '2026-03-01'")).scalar()
    if not max_date:
        return []
    seven_days_ago = max_date - timedelta(days=7)

    query = text("""
        SELECT z.location_id, z.zone_name, z.borough, SUM(h.pickup_count) as value
        FROM historical_demand h
        JOIN zones z ON h.location_id = z.location_id
        WHERE h.datetime >= :start_date 
          AND z.borough = :borough
          AND z.location_id != :current_loc
        GROUP BY z.location_id, z.zone_name, z.borough
        ORDER BY value DESC
        LIMIT 5
    """)
    top_candidates = db.execute(query, {"start_date": seven_days_ago, "borough": borough, "current_loc": location_id}).fetchall()

    if not top_candidates:
        return []

    recommendations = []
    
    # 3. For each candidate, grab the actual AI forecast for the current upcoming hour
    for candidate in top_candidates:
        try:
            # We call the existing cached forecast endpoint logic
            forecast_data = get_zone_forecast(location_id=candidate.location_id, horizon="hourly", db=db)
            
            # Extract the very first predicted value (the closest upcoming hour)
            predicted_list = forecast_data.get("predicted", [])
            upcoming_pickups = 0
            if predicted_list and len(predicted_list) > 0:
                upcoming_pickups = predicted_list[0].get("predicted", 0)
            
            recommendations.append({
                "location_id": candidate.location_id,
                "zone_name": candidate.zone_name,
                "borough": candidate.borough,
                "forecasted_pickups": int(upcoming_pickups)
            })
        except Exception as e:
            # If forecast fails for one zone, we just skip it to avoid breaking the whole feature
            print(f"Failed to fetch forecast for zone {candidate.location_id}: {e}")
            continue

    # 4. Sort by the highest forecasted AI value and return top 3
    recommendations.sort(key=lambda x: x["forecasted_pickups"], reverse=True)
    return recommendations[:3]
