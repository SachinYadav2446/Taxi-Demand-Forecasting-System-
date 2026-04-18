from fastapi import APIRouter, Depends
from services.external_data import WeatherService, EventService
from typing import List, Dict, Any

router = APIRouter(prefix="/intelligence", tags=["Intelligence"])

@router.get("/weather")
async def get_weather_intelligence():
    """Returns current weather conditions and estimated demand impact."""
    return await WeatherService.get_current_impact()

@router.get("/events")
async def get_active_events():
    """Returns active city events being tracked as demand catalysts."""
    return await EventService.get_active_events()

@router.get("/forecast-weather")
async def get_weather_forecast():
    """Returns the 7-day weather forecast for NYC."""
    return await WeatherService.get_weather_forecast()
