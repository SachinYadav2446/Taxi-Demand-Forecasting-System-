import csv
import sys
import os

# Add parent directory to path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal
import models

def seed_zones(csv_path: str, centroids_path: str = None):
    db: Session = SessionLocal()
    try:
        # Check if zones already exist to avoid duplicates
        existing = db.query(models.Zone).count()
        if existing > 0:
            print(f"Processing {existing} existing zones for coordinate updates...")
            # We will update instead of delete/insert to avoid FK constraint issues
            update_mode = True
        else:
            print("Seeding new zones from CSV...")
            update_mode = False

        # Load centroids if available
        centroids = {}
        if centroids_path and os.path.exists(centroids_path):
            print(f"Loading centroids from {centroids_path}...")
            with open(centroids_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # File format: LocationID,X,Y,zone,borough
                    centroids[int(row['LocationID'])] = {
                        'lat': float(row['Y']),
                        'lon': float(row['X'])
                    }

        print("Processing zones from CSV...")
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            zones_to_insert = []
            for row in reader:
                loc_id = int(row['LocationID'])
                coords = centroids.get(loc_id, {'lat': None, 'lon': None})
                
                if update_mode:
                    db.query(models.Zone).filter(models.Zone.location_id == loc_id).update({
                        "latitude": coords['lat'],
                        "longitude": coords['lon']
                    })
                else:
                    zone = models.Zone(
                        location_id=loc_id,
                        borough=row['Borough'],
                        zone_name=row['Zone'],
                        service_zone=row['service_zone'],
                        latitude=coords['lat'],
                        longitude=coords['lon']
                    )
                    zones_to_insert.append(zone)

            if not update_mode:
                db.bulk_save_objects(zones_to_insert)
            
            db.commit()
            print(f"Successfully synchronized {existing if update_mode else len(zones_to_insert)} zones with coordinates!")

    except Exception as e:
        print(f"Error seeding zones: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Try multiple common relative paths for datasets to support both local and docker environments
    possible_paths = [
        os.path.join(current_dir, "..", "..", "datasets"), # Local dev
        os.path.join(current_dir, "..", "datasets"),      # Docker mapping
    ]
    
    dataset_dir = None
    for path in possible_paths:
        if os.path.exists(path):
            dataset_dir = path
            break
            
    if not dataset_dir:
        print("Error: Could not find datasets directory in any expected location.")
        sys.exit(1)

    default_csv = os.path.join(dataset_dir, "raw", "taxi_zone_lookup.csv")
    centroids_csv = os.path.join(dataset_dir, "raw", "taxi_zone_centroids.csv")
    seed_zones(default_csv, centroids_csv)
