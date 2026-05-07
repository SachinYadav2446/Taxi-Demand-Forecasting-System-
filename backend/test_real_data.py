"""
Test Script: Verify External Data APIs with Real Data
Tests all API integrations and shows live data
"""

import sys
import os
from datetime import datetime, timedelta
from services.external_data_collectors import (
    WeatherDataCollector,
    EventDataCollector,
    HolidayDataCollector,
    TransitDataCollector,
    FlightDataCollector,
    ExternalDataAggregator
)

def print_header(title):
    """Print a formatted header"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def test_weather_api():
    """Test OpenWeatherMap API with real data"""
    print_header("🌦️  TESTING WEATHER API (OpenWeatherMap)")
    
    try:
        weather = WeatherDataCollector()
        data = weather.get_current_weather()
        
        print("\n✅ SUCCESS! Real weather data received:")
        print(f"   📍 Location: New York City")
        print(f"   🌡️  Temperature: {data['temperature']:.1f}°F")
        print(f"   🤔 Feels Like: {data['feels_like']:.1f}°F")
        print(f"   💧 Humidity: {data['humidity']}%")
        print(f"   ☁️  Condition: {data['weather_condition']} - {data['weather_description']}")
        print(f"   💨 Wind Speed: {data['wind_speed']:.1f} mph")
        
        if data['rain_1h'] > 0:
            print(f"   🌧️  RAIN DETECTED: {data['rain_1h']:.1f} mm/hour")
            print(f"   💡 Impact: Expect 20-30% increase in taxi demand!")
        else:
            print(f"   ☀️  No rain currently")
        
        if data['snow_1h'] > 0:
            print(f"   ❄️  SNOW DETECTED: {data['snow_1h']:.1f} mm/hour")
            print(f"   💡 Impact: Expect 40-50% increase in taxi demand!")
        
        print(f"   ⏰ Updated: {data['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Test forecast
        print("\n📊 Getting 24-hour weather forecast...")
        forecast = weather.get_forecast(hours=24)
        
        if not forecast.empty:
            print(f"   ✅ Forecast received for next {len(forecast)} periods")
            print(f"   📈 Temperature range: {forecast['temperature'].min():.1f}°F - {forecast['temperature'].max():.1f}°F")
            
            rain_periods = forecast[forecast['rain_3h'] > 0]
            if not rain_periods.empty:
                print(f"   🌧️  Rain expected in {len(rain_periods)} periods")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print("   Check your OPENWEATHER_API_KEY in .env file")
        return False


def test_events_api():
    """Test Ticketmaster API with real data"""
    print_header("🎭 TESTING EVENTS API (Ticketmaster)")
    
    try:
        events = EventDataCollector()
        start = datetime.now()
        end = start + timedelta(hours=48)
        
        print(f"\n🔍 Searching for events in NYC...")
        print(f"   Period: {start.strftime('%Y-%m-%d %H:%M')} to {end.strftime('%Y-%m-%d %H:%M')}")
        
        events_df = events.get_events(start, end)
        
        if events_df.empty:
            print("\n   ℹ️  No major events found in the next 48 hours")
            print("   (This is normal if there are no large events scheduled)")
        else:
            print(f"\n✅ SUCCESS! Found {len(events_df)} events:")
            
            for idx, event in events_df.head(10).iterrows():
                print(f"\n   🎫 Event {idx + 1}:")
                print(f"      Name: {event['event_name']}")
                print(f"      Type: {event['event_type']}")
                print(f"      Venue: {event['venue_name']}")
                print(f"      Time: {event['start_time'].strftime('%Y-%m-%d %H:%M')}")
                print(f"      Expected Attendance: {event['expected_attendance']:,}")
                print(f"      💡 Impact: +{int(event['expected_attendance'] * 0.001)} trips/hour near venue")
            
            if len(events_df) > 10:
                print(f"\n   ... and {len(events_df) - 10} more events")
            
            total_attendance = events_df['expected_attendance'].sum()
            print(f"\n   📊 Total Expected Attendance: {total_attendance:,.0f} people")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print("   Check your TICKETMASTER_API_KEY in .env file")
        return False


def test_holidays():
    """Test Holiday data"""
    print_header("📅 TESTING HOLIDAY DATA")
    
    try:
        holidays = HolidayDataCollector()
        
        # Check if today is a holiday
        today = datetime.now()
        is_holiday = holidays.is_holiday(today)
        
        print(f"\n📆 Today: {today.strftime('%A, %B %d, %Y')}")
        
        if is_holiday:
            print(f"   🎉 TODAY IS A HOLIDAY!")
            print(f"   💡 Impact: Demand patterns will differ from normal days")
        else:
            print(f"   📅 Regular day (not a holiday)")
        
        # Get upcoming holidays
        print(f"\n🔮 Upcoming holidays in {today.year}:")
        holidays_df = holidays.get_holidays(today.year)
        
        # Filter future holidays
        future_holidays = holidays_df[holidays_df['date'] >= today.date()].head(5)
        
        for idx, holiday in future_holidays.iterrows():
            days_until = (holiday['date'] - today.date()).days
            print(f"   • {holiday['holiday_name']}: {holiday['date']} ({days_until} days)")
        
        print(f"\n✅ SUCCESS! Holiday data loaded")
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        return False


def test_transit():
    """Test MTA Transit data"""
    print_header("🚇 TESTING TRANSIT DATA (MTA)")
    
    try:
        transit = TransitDataCollector()
        
        print("\n🔍 Checking NYC subway service status...")
        
        alerts = transit.get_service_alerts()
        disruption_score = transit.get_disruption_score()
        
        print(f"\n   Disruption Score: {disruption_score:.0%}")
        
        if disruption_score == 0:
            print(f"   ✅ All subway lines operating normally")
        elif disruption_score < 0.3:
            print(f"   ⚠️  Minor delays detected")
            print(f"   💡 Impact: +5-10% taxi demand")
        elif disruption_score < 0.7:
            print(f"   ⚠️  Moderate disruptions")
            print(f"   💡 Impact: +15-25% taxi demand")
        else:
            print(f"   🚨 Major disruptions!")
            print(f"   💡 Impact: +30-50% taxi demand")
        
        print(f"\n✅ SUCCESS! Transit data accessible")
        print(f"   Note: MTA API is public (no key required)")
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        return False


def test_flights():
    """Test AviationStack API"""
    print_header("✈️  TESTING FLIGHT DATA (AviationStack)")
    
    try:
        flights = FlightDataCollector()
        
        print("\n🔍 Checking airport traffic...")
        
        timestamp = datetime.now()
        airport_scores = flights.get_airport_traffic_score(timestamp)
        
        print(f"\n   Airport Traffic Scores (0-1 scale):")
        for airport, score in airport_scores.items():
            status = "🔴 High" if score > 0.7 else "🟡 Medium" if score > 0.4 else "🟢 Low"
            print(f"   {airport}: {score:.0%} {status}")
        
        # Try to get actual flight data for JFK
        print(f"\n📊 Fetching arrivals for JFK...")
        jfk_arrivals = flights.get_arrivals('JFK', timestamp)
        
        if jfk_arrivals.empty:
            print(f"   ℹ️  Using estimated traffic (API key may be missing or limit reached)")
            print(f"   💡 Add AVIATIONSTACK_API_KEY to .env for real flight data")
        else:
            print(f"   ✅ Found {len(jfk_arrivals)} arrivals")
            print(f"   💡 Impact: Increased taxi demand near JFK")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print("   Note: AviationStack has limited free tier (100 calls/month)")
        print("   System will use estimated traffic if API key is missing")
        return False


def test_aggregator():
    """Test the complete data aggregator"""
    print_header("🎯 TESTING COMPLETE DATA AGGREGATION")
    
    try:
        aggregator = ExternalDataAggregator()
        
        print("\n🔄 Fetching all external features for current time...")
        
        features = aggregator.get_features_for_timestamp(datetime.now())
        
        print("\n✅ SUCCESS! All features aggregated:")
        print(f"\n   📊 Feature Summary:")
        print(f"   • Temperature: {features['temperature']:.1f}°F")
        print(f"   • Raining: {'Yes' if features['is_raining'] else 'No'}")
        print(f"   • Snowing: {'Yes' if features['is_snowing'] else 'No'}")
        print(f"   • Weekend: {'Yes' if features['is_weekend'] else 'No'}")
        print(f"   • Rush Hour: {'Yes' if features['is_rush_hour'] else 'No'}")
        print(f"   • Holiday: {'Yes' if features['is_holiday'] else 'No'}")
        print(f"   • Events: {features['event_count']}")
        print(f"   • Transit Disruption: {features['transit_disruption']:.0%}")
        print(f"   • JFK Traffic: {features['jfk_traffic']:.0%}")
        print(f"   • LGA Traffic: {features['lga_traffic']:.0%}")
        print(f"   • EWR Traffic: {features['ewr_traffic']:.0%}")
        
        # Calculate demand multiplier
        base_demand = 100
        demand_multiplier = 1.0
        
        if features['is_raining']:
            demand_multiplier += 0.25
        if features['is_snowing']:
            demand_multiplier += 0.40
        if features['is_rush_hour']:
            demand_multiplier += 0.35
        if features['event_count'] > 0:
            demand_multiplier += 0.20
        if features['transit_disruption'] > 0.5:
            demand_multiplier += 0.30
        
        predicted_demand = base_demand * demand_multiplier
        
        print(f"\n   💡 DEMAND PREDICTION:")
        print(f"   Base Demand: {base_demand} trips/hour")
        print(f"   Multiplier: {demand_multiplier:.2f}x")
        print(f"   Predicted Demand: {predicted_demand:.0f} trips/hour")
        print(f"   Change: {(demand_multiplier - 1) * 100:+.0f}%")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        return False


def main():
    """Run all tests"""
    print("\n" + "🚖" * 35)
    print("REAL-TIME EXTERNAL DATA API TESTING")
    print("Testing with YOUR API keys")
    print("🚖" * 35)
    
    results = {
        'Weather (OpenWeatherMap)': test_weather_api(),
        'Events (Ticketmaster)': test_events_api(),
        'Holidays': test_holidays(),
        'Transit (MTA)': test_transit(),
        'Flights (AviationStack)': test_flights(),
        'Complete Aggregation': test_aggregator()
    }
    
    # Summary
    print_header("📊 TEST SUMMARY")
    
    print("\n   Results:")
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"   {status} - {test_name}")
    
    passed_count = sum(results.values())
    total_count = len(results)
    
    print(f"\n   Overall: {passed_count}/{total_count} tests passed")
    
    if passed_count == total_count:
        print("\n   🎉 ALL TESTS PASSED!")
        print("   Your external data integration is working perfectly!")
    elif passed_count >= total_count - 1:
        print("\n   ✅ MOSTLY WORKING!")
        print("   One API may need attention, but system is functional")
    else:
        print("\n   ⚠️  SOME ISSUES DETECTED")
        print("   Check the error messages above")
    
    print("\n" + "=" * 70)
    print("🔗 Next Steps:")
    print("   1. Check API documentation: http://localhost:8000/docs")
    print("   2. Test enhanced forecast: curl http://localhost:8000/enhanced-forecasts/237/forecast")
    print("   3. View current features: curl http://localhost:8000/enhanced-forecasts/237/external-features")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
