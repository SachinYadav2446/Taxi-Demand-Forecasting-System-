"""
External Data Collection Services
Fetches weather, events, holidays, and transit data for demand forecasting
"""

import requests
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import os
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)


class WeatherDataCollector:
    """
    Collects weather data from OpenWeatherMap API
    Free tier: 1000 calls/day
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('OPENWEATHER_API_KEY')
        self.base_url = "https://api.openweathermap.org/data/2.5"
        # NYC coordinates
        self.lat = 40.7128
        self.lon = -74.0060
    
    def get_current_weather(self) -> Dict:
        """Get current weather conditions"""
        try:
            url = f"{self.base_url}/weather"
            params = {
                'lat': self.lat,
                'lon': self.lon,
                'appid': self.api_key,
                'units': 'imperial'  # Fahrenheit
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            return {
                'temperature': data['main']['temp'],
                'feels_like': data['main']['feels_like'],
                'humidity': data['main']['humidity'],
                'pressure': data['main']['pressure'],
                'weather_condition': data['weather'][0]['main'],
                'weather_description': data['weather'][0]['description'],
                'wind_speed': data['wind']['speed'],
                'clouds': data['clouds']['all'],
                'rain_1h': data.get('rain', {}).get('1h', 0),
                'snow_1h': data.get('snow', {}).get('1h', 0),
                'timestamp': datetime.now()
            }
        except Exception as e:
            logger.error(f"Error fetching weather data: {e}")
            return self._get_default_weather()
    
    def get_forecast(self, hours: int = 48) -> pd.DataFrame:
        """Get weather forecast for next N hours"""
        try:
            url = f"{self.base_url}/forecast"
            params = {
                'lat': self.lat,
                'lon': self.lon,
                'appid': self.api_key,
                'units': 'imperial'
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            forecasts = []
            for item in data['list'][:hours//3]:  # 3-hour intervals
                forecasts.append({
                    'timestamp': datetime.fromtimestamp(item['dt']),
                    'temperature': item['main']['temp'],
                    'humidity': item['main']['humidity'],
                    'weather_condition': item['weather'][0]['main'],
                    'rain_3h': item.get('rain', {}).get('3h', 0),
                    'snow_3h': item.get('snow', {}).get('3h', 0),
                    'wind_speed': item['wind']['speed']
                })
            
            return pd.DataFrame(forecasts)
        except Exception as e:
            logger.error(f"Error fetching weather forecast: {e}")
            return pd.DataFrame()
    
    def _get_default_weather(self) -> Dict:
        """Return default weather when API fails"""
        return {
            'temperature': 60.0,
            'feels_like': 60.0,
            'humidity': 50,
            'pressure': 1013,
            'weather_condition': 'Clear',
            'weather_description': 'clear sky',
            'wind_speed': 5.0,
            'clouds': 0,
            'rain_1h': 0,
            'snow_1h': 0,
            'timestamp': datetime.now()
        }


class EventDataCollector:
    """
    Collects event data (concerts, sports, conferences)
    Using Ticketmaster API (free tier available)
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('TICKETMASTER_API_KEY')
        self.base_url = "https://app.ticketmaster.com/discovery/v2"
        self.nyc_dma_id = "345"  # NYC DMA ID
    
    def get_events(self, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Get events in NYC for date range"""
        try:
            url = f"{self.base_url}/events.json"
            params = {
                'apikey': self.api_key,
                'dmaId': self.nyc_dma_id,
                'startDateTime': start_date.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'endDateTime': end_date.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'size': 200
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if '_embedded' not in data:
                return pd.DataFrame()
            
            events = []
            for event in data['embedded']['events']:
                events.append({
                    'event_name': event['name'],
                    'event_type': event.get('classifications', [{}])[0].get('segment', {}).get('name', 'Other'),
                    'venue_name': event.get('_embedded', {}).get('venues', [{}])[0].get('name', 'Unknown'),
                    'start_time': datetime.fromisoformat(event['dates']['start']['dateTime'].replace('Z', '+00:00')),
                    'expected_attendance': self._estimate_attendance(event)
                })
            
            return pd.DataFrame(events)
        except Exception as e:
            logger.error(f"Error fetching events: {e}")
            return pd.DataFrame()
    
    def _estimate_attendance(self, event: Dict) -> int:
        """Estimate attendance based on event type"""
        event_type = event.get('classifications', [{}])[0].get('segment', {}).get('name', 'Other')
        
        attendance_map = {
            'Sports': 20000,
            'Music': 15000,
            'Arts & Theatre': 5000,
            'Family': 3000,
            'Other': 1000
        }
        
        return attendance_map.get(event_type, 1000)


class HolidayDataCollector:
    """
    Collects holiday and special day information
    """
    
    @staticmethod
    def get_holidays(year: int) -> pd.DataFrame:
        """Get US holidays for a given year"""
        import holidays
        
        us_holidays = holidays.US(years=year)
        
        holiday_list = []
        for date, name in us_holidays.items():
            holiday_list.append({
                'date': date,
                'holiday_name': name,
                'is_federal': True
            })
        
        # Add NYC-specific events
        nyc_events = [
            {'date': f'{year}-12-31', 'holiday_name': 'New Years Eve', 'is_federal': False},
            {'date': f'{year}-11-01', 'holiday_name': 'NYC Marathon', 'is_federal': False},
            {'date': f'{year}-07-04', 'holiday_name': 'Independence Day', 'is_federal': True},
        ]
        
        for event in nyc_events:
            holiday_list.append({
                'date': datetime.strptime(event['date'], '%Y-%m-%d').date(),
                'holiday_name': event['holiday_name'],
                'is_federal': event['is_federal']
            })
        
        return pd.DataFrame(holiday_list)
    
    @staticmethod
    def is_holiday(date: datetime) -> bool:
        """Check if a date is a holiday"""
        import holidays
        us_holidays = holidays.US()
        return date.date() in us_holidays


class TransitDataCollector:
    """
    Collects NYC subway/transit disruption data
    Using MTA API (No API key required as of 2024)
    """
    
    def __init__(self, api_key: Optional[str] = None):
        # MTA no longer requires API keys for real-time feeds
        self.base_url = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds"
    
    def get_service_alerts(self) -> List[Dict]:
        """Get current service alerts and disruptions"""
        try:
            # MTA GTFS-RT feed (no API key needed)
            url = f"{self.base_url}/camsys%2Fsubway-alerts"
            
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            # Parse GTFS-RT protobuf (simplified)
            alerts = []
            # In production, use gtfs-realtime-bindings library
            # For now, return mock data structure
            
            return alerts
        except Exception as e:
            logger.error(f"Error fetching transit alerts: {e}")
            return []
    
    def get_disruption_score(self) -> float:
        """
        Calculate disruption score (0-1)
        0 = no disruptions, 1 = major disruptions
        """
        alerts = self.get_service_alerts()
        
        if not alerts:
            return 0.0
        
        # Weight by severity
        score = min(len(alerts) * 0.1, 1.0)
        return score


class FlightDataCollector:
    """
    Collects flight schedule data for airport demand prediction
    Using AviationStack API (free tier available)
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('AVIATIONSTACK_API_KEY')
        self.base_url = "http://api.aviationstack.com/v1"
        self.airports = ['JFK', 'LGA', 'EWR']  # NYC airports
    
    def get_arrivals(self, airport: str, date: datetime) -> pd.DataFrame:
        """Get flight arrivals for an airport"""
        try:
            url = f"{self.base_url}/flights"
            params = {
                'access_key': self.api_key,
                'arr_iata': airport,
                'flight_date': date.strftime('%Y-%m-%d')
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if 'data' not in data:
                return pd.DataFrame()
            
            flights = []
            for flight in data['data']:
                flights.append({
                    'airport': airport,
                    'flight_number': flight['flight']['iata'],
                    'arrival_time': datetime.fromisoformat(flight['arrival']['scheduled']),
                    'airline': flight['airline']['name'],
                    'origin': flight['departure']['iata']
                })
            
            return pd.DataFrame(flights)
        except Exception as e:
            logger.error(f"Error fetching flight data: {e}")
            return pd.DataFrame()
    
    def get_airport_traffic_score(self, timestamp: datetime) -> Dict[str, float]:
        """
        Calculate expected taxi demand at each airport
        Returns score 0-1 for each airport
        """
        scores = {}
        
        for airport in self.airports:
            arrivals = self.get_arrivals(airport, timestamp)
            
            if arrivals.empty:
                scores[airport] = 0.5  # Default
                continue
            
            # Count flights in next 2 hours
            window_start = timestamp
            window_end = timestamp + timedelta(hours=2)
            
            flights_in_window = arrivals[
                (arrivals['arrival_time'] >= window_start) &
                (arrivals['arrival_time'] <= window_end)
            ]
            
            # Normalize to 0-1 scale (assume max 30 flights per 2 hours)
            score = min(len(flights_in_window) / 30.0, 1.0)
            scores[airport] = score
        
        return scores


class ExternalDataAggregator:
    """
    Aggregates all external data sources into a single feature set
    """
    
    def __init__(self):
        self.weather = WeatherDataCollector()
        self.events = EventDataCollector()
        self.holidays = HolidayDataCollector()
        self.transit = TransitDataCollector()
        self.flights = FlightDataCollector()
    
    def get_features_for_timestamp(self, timestamp: datetime) -> Dict:
        """
        Get all external features for a specific timestamp
        This is what gets fed into SARIMAX as exogenous variables
        """
        features = {}
        
        # Weather features
        weather = self.weather.get_current_weather()
        features['temperature'] = weather['temperature']
        features['humidity'] = weather['humidity']
        features['is_raining'] = 1 if weather['rain_1h'] > 0 else 0
        features['is_snowing'] = 1 if weather['snow_1h'] > 0 else 0
        features['rain_intensity'] = weather['rain_1h']
        features['wind_speed'] = weather['wind_speed']
        
        # Time features
        features['hour'] = timestamp.hour
        features['day_of_week'] = timestamp.weekday()
        features['is_weekend'] = 1 if timestamp.weekday() >= 5 else 0
        features['is_rush_hour'] = 1 if timestamp.hour in [7, 8, 9, 17, 18, 19] else 0
        
        # Holiday features
        features['is_holiday'] = 1 if self.holidays.is_holiday(timestamp) else 0
        
        # Event features
        events = self.events.get_events(
            timestamp,
            timestamp + timedelta(hours=4)
        )
        features['event_count'] = len(events)
        features['expected_event_attendance'] = events['expected_attendance'].sum() if not events.empty else 0
        
        # Transit features
        features['transit_disruption'] = self.transit.get_disruption_score()
        
        # Airport features
        airport_scores = self.flights.get_airport_traffic_score(timestamp)
        features['jfk_traffic'] = airport_scores.get('JFK', 0.5)
        features['lga_traffic'] = airport_scores.get('LGA', 0.5)
        features['ewr_traffic'] = airport_scores.get('EWR', 0.5)
        
        return features
    
    def get_features_dataframe(
        self, 
        start_date: datetime, 
        end_date: datetime,
        freq: str = 'H'  # Hourly by default
    ) -> pd.DataFrame:
        """
        Get features for a date range as a DataFrame
        Used for training and forecasting
        """
        date_range = pd.date_range(start=start_date, end=end_date, freq=freq)
        
        features_list = []
        for timestamp in date_range:
            features = self.get_features_for_timestamp(timestamp)
            features['timestamp'] = timestamp
            features_list.append(features)
        
        df = pd.DataFrame(features_list)
        df.set_index('timestamp', inplace=True)
        
        return df


# Utility function for easy import
def get_external_features(timestamp: datetime) -> Dict:
    """
    Convenience function to get all external features
    """
    aggregator = ExternalDataAggregator()
    return aggregator.get_features_for_timestamp(timestamp)
