from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import models
import schemas
from database import get_db
from services.ml_service import generate_forecast, get_available_forecast_window, MODEL_NAME

router = APIRouter(
    prefix="/forecasts",
    tags=["Forecasts"]
)


@router.get("/{location_id}/window")
def get_forecast_window_options(
    location_id: int,
    horizon: str = "hourly",
    db: Session = Depends(get_db),
):
    if horizon not in ["hourly", "daily"]:
        raise HTTPException(status_code=400, detail="Invalid horizon. Must be 'hourly' or 'daily'.")

    zone = db.query(models.Zone).filter(models.Zone.location_id == location_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    try:
        return get_available_forecast_window(location_id, horizon=horizon)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.get("/{location_id}", response_model=schemas.ForecastResponse)
def get_zone_forecast(
    location_id: int, 
    horizon: str = "hourly",
    requested_date: str | None = None,
    requested_time: str | None = None,
    db: Session = Depends(get_db)
):
    if horizon not in ["hourly", "daily"]:
        raise HTTPException(status_code=400, detail="Invalid horizon. Must be 'hourly' or 'daily'.")
    if requested_time and horizon != "hourly":
        raise HTTPException(status_code=400, detail="requested_time is only valid for hourly forecasts.")
        
    zone = db.query(models.Zone).filter(models.Zone.location_id == location_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    # Build cache key based on location, horizon, date, and time
    cache_key = f"{location_id}:{horizon}"
    if requested_date:
        cache_key += f":{requested_date}"
    if requested_time:
        cache_key += f":{requested_time}"
    
    # Look for existing forecast with same parameters
    forecast = db.query(models.Forecast).filter(
        models.Forecast.location_id == location_id,
        models.Forecast.horizon == horizon,
        models.Forecast.cache_key == cache_key
    ).order_by(models.Forecast.generated_at.desc()).first()
    
    now = datetime.utcnow()
    is_fresh = False
    
    if forecast:
        # Check freshness
        age = now - forecast.generated_at
        meta = (
            forecast.forecast_values.get("meta", {})
            if isinstance(forecast.forecast_values, dict)
            else {}
        )
        model_name = meta.get("model_name")
        model_type = meta.get("model_type")
        
        # Cache is fresh if:
        # 1. Same model version
        # 2. Not a fallback model
        # 3. Age is within limits (1 hour for hourly, 24 hours for daily)
        if model_name == MODEL_NAME and model_type != "no_data_fallback":
            if horizon == "hourly" and age <= timedelta(hours=1):
                is_fresh = True
            elif horizon == "daily" and age <= timedelta(hours=24):
                is_fresh = True
            
    if not is_fresh:
        # Generate new forecast
        forecast_data = generate_forecast(
            location_id,
            horizon,
            requested_date=requested_date,
            requested_time=requested_time,
        )
        
        # In a generic SQLAlchemy setup you can assign python dicts to JSONB directly
        new_forecast = models.Forecast(
            location_id=location_id,
            horizon=horizon,
            cache_key=cache_key,
            generated_at=now,
            forecast_values=forecast_data
        )
        db.add(new_forecast)
        db.commit()
        db.refresh(new_forecast)
        forecast = new_forecast

    # Return the forecast data directly (it's already in the correct format)
    return forecast.forecast_values
