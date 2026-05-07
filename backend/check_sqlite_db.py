import sqlite3
from datetime import datetime

conn = sqlite3.connect('taxidemand.db')
cursor = conn.cursor()

print("=" * 70)
print("CHECKING SQLITE DATABASE (taxidemand.db)")
print("=" * 70)

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print(f"\n📊 Tables found: {[t[0] for t in tables]}")

# Check zones
try:
    cursor.execute("SELECT COUNT(*) FROM zones")
    zone_count = cursor.fetchone()[0]
    print(f"\n🌍 Zones: {zone_count}")
    
    if zone_count > 0:
        cursor.execute("SELECT * FROM zones LIMIT 3")
        print("   Sample zones:")
        for row in cursor.fetchall():
            print(f"      {row}")
except Exception as e:
    print(f"   ❌ Error reading zones: {e}")

# Check historical_demand
try:
    cursor.execute("SELECT COUNT(*) FROM historical_demand")
    demand_count = cursor.fetchone()[0]
    print(f"\n📈 Historical demand records: {demand_count:,}")
    
    if demand_count > 0:
        cursor.execute("SELECT MIN(datetime), MAX(datetime) FROM historical_demand")
        date_range = cursor.fetchone()
        print(f"   📅 Date range: {date_range[0]} to {date_range[1]}")
        
        cursor.execute("SELECT * FROM historical_demand LIMIT 3")
        print("   Sample records:")
        for row in cursor.fetchall():
            print(f"      {row}")
except Exception as e:
    print(f"   ❌ Error reading historical_demand: {e}")

# Check companies
try:
    cursor.execute("SELECT COUNT(*) FROM companies")
    company_count = cursor.fetchone()[0]
    print(f"\n🏢 Companies: {company_count}")
except Exception as e:
    print(f"   ℹ️  No companies table")

conn.close()

print("\n" + "=" * 70)
print("✅ Database check complete!")
print("=" * 70)
