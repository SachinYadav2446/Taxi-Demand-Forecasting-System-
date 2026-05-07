"""
Quick seed script to populate database with sample data for testing
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from database import SessionLocal, engine
from models import Zone, HistoricalDemand, Base
from datetime import datetime, timedelta
import random

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # Check if zones already exist
    existing_zones = db.query(Zone).count()
    
    if existing_zones == 0:
        print("🌍 Seeding NYC taxi zones...")
        
        # Sample NYC zones (popular locations)
        zones = [
            Zone(location_id=4, borough="Manhattan", zone_name="Alphabet City", service_zone="Yellow Zone", latitude=40.7258, longitude=-73.9806),
            Zone(location_id=161, borough="Manhattan", zone_name="Midtown Center", service_zone="Yellow Zone", latitude=40.7549, longitude=-73.9840),
            Zone(location_id=162, borough="Manhattan", zone_name="Midtown East", service_zone="Yellow Zone", latitude=40.7549, longitude=-73.9712),
            Zone(location_id=230, borough="Manhattan", zone_name="Times Sq/Theatre District", service_zone="Yellow Zone", latitude=40.7580, longitude=-73.9855),
            Zone(location_id=234, borough="Manhattan", zone_name="Union Sq", service_zone="Yellow Zone", latitude=40.7359, longitude=-73.9911),
            Zone(location_id=237, borough="Manhattan", zone_name="Upper East Side South", service_zone="Yellow Zone", latitude=40.7688, longitude=-73.9632),
            Zone(location_id=238, borough="Manhattan", zone_name="Upper West Side South", service_zone="Yellow Zone", latitude=40.7870, longitude=-73.9754),
            Zone(location_id=239, borough="Manhattan", zone_name="Upper West Side North", service_zone="Yellow Zone", latitude=40.7990, longitude=-73.9680),
            Zone(location_id=48, borough="Manhattan", zone_name="Clinton East", service_zone="Yellow Zone", latitude=40.7620, longitude=-73.9924),
            Zone(location_id=79, borough="Manhattan", zone_name="East Village", service_zone="Yellow Zone", latitude=40.7264, longitude=-73.9818),
        ]
        
        db.add_all(zones)
        db.commit()
        print(f"   ✅ Added {len(zones)} zones")
    else:
        print(f"   ℹ️  {existing_zones} zones already exist")
    
    # Check if historical data exists
    existing_data = db.query(HistoricalDemand).count()
    
    if existing_data == 0:
        print("\n📊 Generating sample historical demand data...")
        print("   (This simulates 30 days of hourly taxi demand)")
        
        # Generate 30 days of hourly data for each zone
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        zones = db.query(Zone).all()
        historical_data = []
        
        current_date = start_date
        count = 0
        
        while current_date <= end_date:
            for zone in zones:
                # Simulate realistic demand patterns
                hour = current_date.hour
                day_of_week = current_date.weekday()
                
                # Base demand varies by zone popularity
                base_demand = {
                    4: 15, 161: 45, 162: 40, 230: 60, 234: 35,
                    237: 50, 238: 45, 239: 40, 48: 30, 79: 25
                }.get(zone.location_id, 20)
                
                # Time of day multiplier
                if 7 <= hour <= 9 or 17 <= hour <= 19:  # Rush hours
                    time_multiplier = 1.5
                elif 22 <= hour or hour <= 5:  # Late night/early morning
                    time_multiplier = 0.4
                else:
                    time_multiplier = 1.0
                
                # Weekend multiplier
                weekend_multiplier = 1.2 if day_of_week >= 5 else 1.0
                
                # Calculate demand with some randomness
                demand = int(base_demand * time_multiplier * weekend_multiplier * random.uniform(0.7, 1.3))
                demand = max(0, demand)  # Ensure non-negative
                
                historical_data.append(
                    HistoricalDemand(
                        location_id=zone.location_id,
                        datetime=current_date,
                        pickup_count=demand
                    )
                )
                count += 1
                
                # Commit in batches for performance
                if count % 1000 == 0:
                    db.bulk_save_objects(historical_data)
                    db.commit()
                    historical_data = []
                    print(f"   📈 Inserted {count} records...")
            
            current_date += timedelta(hours=1)
        
        # Commit remaining data
        if historical_data:
            db.bulk_save_objects(historical_data)
            db.commit()
        
        print(f"   ✅ Generated {count} historical demand records")
        print(f"   📅 Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    else:
        print(f"   ℹ️  {existing_data} historical records already exist")
    
    print("\n🎉 Database seeding complete!")
    print("\n📊 Summary:")
    print(f"   • Zones: {db.query(Zone).count()}")
    print(f"   • Historical records: {db.query(HistoricalDemand).count()}")
    print(f"   • Date range: {db.query(HistoricalDemand).order_by(HistoricalDemand.datetime).first().datetime.strftime('%Y-%m-%d')} to {db.query(HistoricalDemand).order_by(HistoricalDemand.datetime.desc()).first().datetime.strftime('%Y-%m-%d')}")
    
    print("\n✅ Ready to test enhanced forecasts!")
    print("   Try: curl http://localhost:8000/enhanced-forecasts/237/forecast?steps=24")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
