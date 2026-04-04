import csv
import sys
from sqlalchemy.orm import Session
from database import SessionLocal
import models

def seed_zones(csv_path: str):
    db: Session = SessionLocal()
    try:
        # Check if zones already exist to avoid duplicates
        existing = db.query(models.Zone).count()
        if existing > 0:
            print(f"Database already has {existing} zones. Skipping seed.")
            return

        print("Seeding zones from CSV...")
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            zones_to_insert = []
            for row in reader:
                zone = models.Zone(
                    location_id=int(row['LocationID']),
                    borough=row['Borough'],
                    zone_name=row['Zone'],
                    service_zone=row['service_zone']
                )
                zones_to_insert.append(zone)

            db.bulk_save_objects(zones_to_insert)
            db.commit()
            print(f"Successfully seeded {len(zones_to_insert)} zones!")

    except Exception as e:
        print(f"Error seeding zones: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_zones("taxi_zone_lookup.csv")
