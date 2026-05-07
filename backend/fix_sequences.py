from database import engine
from sqlalchemy import text

def fix_sequences():
    tables_with_id = ['companies', 'drivers', 'historical_demand', 'company_zones', 'forecasts']
    
    with engine.connect() as conn:
        print("Resetting database sequences...")
        
        # Standard ID tables
        for table in tables_with_id:
            try:
                # Find the sequence name
                res = conn.execute(text(f"SELECT pg_get_serial_sequence('{table}', 'id')")).scalar()
                if res:
                    conn.execute(text(f"SELECT setval('{res}', COALESCE(MAX(id), 1)) FROM {table}"))
                    print(f"  - Reset sequence for {table}")
            except Exception as e:
                print(f"  - Error resetting {table}: {e}")
        
        # Special case for zones (location_id)
        try:
            res = conn.execute(text("SELECT pg_get_serial_sequence('zones', 'location_id')")).scalar()
            if res:
                conn.execute(text(f"SELECT setval('{res}', COALESCE(MAX(location_id), 1)) FROM zones"))
                print("  - Reset sequence for zones")
        except Exception as e:
            print(f"  - Error resetting zones: {e}")
            
        conn.commit()
    print("\n✅ DONE! All sequences are now synchronized. Registration will work now.")

if __name__ == "__main__":
    fix_sequences()
