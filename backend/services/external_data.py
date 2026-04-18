import logging
import httpx
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class WeatherService:
    """
    Service to fetch real-time and forecasted weather data for NYC using Open-Meteo.
    """
    NYC_LAT = 40.7128
    NYC_LON = -74.0060
    API_URL = "https://api.open-meteo.com/v1/forecast"
    
    _cache = {}
    _cache_expiry = None

    @classmethod
    async def get_weather_forecast(cls) -> Dict[str, Any]:
        """Fetches 7-day hourly forecast for NYC."""
        now = datetime.now()
        
        # Simple memory cache to avoid hitting API on every request
        if cls._cache_expiry and now < cls._cache_expiry:
            return cls._cache

        try:
            params = {
                "latitude": cls.NYC_LAT,
                "longitude": cls.NYC_LON,
                "hourly": "temperature_2m,precipitation,weathercode",
                "timezone": "America/New_York",
                "forecast_days": 7
            }
            async with httpx.AsyncClient() as client:
                response = await client.get(cls.API_URL, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                
                cls._cache = data
                cls._cache_expiry = now + timedelta(minutes=30)
                return data
        except Exception as e:
            logger.error(f"Weather API failed: {e}")
            return {}

    @classmethod
    async def get_current_impact(cls) -> Dict[str, Any]:
        """Calculates demand impact based on current weather."""
        data = await cls.get_weather_forecast()
        if not data or "hourly" not in data:
            return {"impact_factor": 1.0, "condition": "Clear", "description": "Normal Ops"}
        
        # Get current hour's data
        now_str = datetime.now().strftime("%Y-%m-%dT%H:00")
        times = data["hourly"]["time"]
        try:
            idx = times.index(now_str) if now_str in times else 0
            temp = data["hourly"]["temperature_2m"][idx]
            precip = data["hourly"]["precipitation"][idx]
            code = data["hourly"]["weathercode"][idx]
            
            impact = 1.0
            condition = "Clear"
            
            # Simple impact logic
            if precip > 5.0:
                impact = 1.25 # Heavy Rain/Snow
                condition = "Heavy Precipitation"
            elif precip > 0.5:
                impact = 1.12 # Light Rain
                condition = "Rain"
            elif temp < 0:
                impact = 1.08 # Freezing
                condition = "Cold"
            
            return {
                "impact_factor": impact,
                "condition": condition,
                "temp": temp,
                "precip": precip,
                "description": f"{condition} (+{int((impact-1)*100)}% demand shift)"
            }
        except Exception:
            return {"impact_factor": 1.0, "condition": "Unknown", "description": "Analyzing..."}

class EventService:
    """
    Manages a registry of NYC events that act as demand catalysts.
    """
    
    # Static list of major recurring/fixed events
    FIXED_EVENTS = [
        {"name": "New Year's Eve Celebration", "zone_id": 230, "borough": "Manhattan", "month": 12, "day": 31, "impact": 2.5},
        {"name": "St. Patrick's Day Parade", "zone_id": 161, "borough": "Manhattan", "month": 3, "day": 17, "impact": 1.8},
        {"name": "NYC Marathon", "zone_id": 43, "borough": "Manhattan", "month": 11, "day": 5, "impact": 2.0},
    ]
    
    # Simulated major surge event locations
    STADIUMS = [
        {"name": "Yankee Stadium Game", "zone_id": 259, "borough": "Bronx", "coords": [40.8296, -73.9262]},
        {"name": "Madison Square Garden Event", "zone_id": 162, "borough": "Manhattan", "coords": [40.7505, -73.9934]},
        {"name": "Barclays Center Concert", "zone_id": 14, "borough": "Brooklyn", "coords": [40.6826, -73.9754]},
    ]

    @classmethod
    async def get_active_events(cls) -> List[Dict[str, Any]]:
        """Returns currently active city events."""
        now = datetime.now()
        active = []
        
        # Check fixed events
        for e in cls.FIXED_EVENTS:
            if e["month"] == now.month and e["day"] == now.day:
                active.append({**e, "type": "major_holiday", "active": True})
        
        # Simulate a recurring stadium surge for the demo
        # Every Friday/Saturday evening, trigger a stadium event
        if now.weekday() in [4, 5] and 18 <= now.hour <= 23:
            stadium = cls.STADIUMS[now.weekday() % len(cls.STADIUMS)]
            active.append({
                **stadium,
                "type": "surge_event",
                "impact": 1.6,
                "active": True,
                "description": "High attendance event - expect localized spikes."
            })
            
        return active
