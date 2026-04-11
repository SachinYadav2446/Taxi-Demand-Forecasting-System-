import os
import glob
import pandas as pd
import sys
import logging

# Add parent directory to path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import engine, SessionLocal
import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Point to root datasets folder
RAW_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "datasets", "raw")

def ingest_historical_data():
    if not os.path.exists(RAW_DATA_DIR):
        logger.error(f"Raw data directory not found: {RAW_DATA_DIR}")
        return

    db: Session = SessionLocal()
    try:
        # Check if already ingested
        existing = db.query(models.HistoricalDemand).count()
        if existing > 0:
            logger.info(f"Database already contains {existing} historical records. Skipping massive ingestion.")
            return

        logger.info("Starting historical data ingestion pipeline...")
        all_data = []

        # Find all data files
        data_files = []
        for ext in ['*.parquet', '*.csv']:
            data_files.extend(glob.glob(os.path.join(RAW_DATA_DIR, ext)))
            
        # Filter out lookup files
        data_files = [f for f in data_files if 'lookup' not in f and 'zone_analysis' not in f]

        if not data_files:
            logger.warning("No trip data files found.")
            return

        logger.info(f"Found {len(data_files)} raw dataset files.")

        for file_path in sorted(data_files):
            try:
                filename = os.path.basename(file_path)
                logger.info(f"Processing chunk: {filename}...")
                
                if file_path.endswith('.parquet'):
                    df = pd.read_parquet(file_path, engine='pyarrow')
                else:
                    df = pd.read_csv(file_path)
                
                if 'tpep_pickup_datetime' not in df.columns or 'PULocationID' not in df.columns:
                    logger.warning(f"Skipping {filename}: missing required columns")
                    continue
                
                df['tpep_pickup_datetime'] = pd.to_datetime(df['tpep_pickup_datetime'])
                
                # Aggregate computationally in pandas before DB to save millions of SQL ops
                hourly_demand = df.groupby([
                    'PULocationID', 
                    pd.Grouper(key='tpep_pickup_datetime', freq='h')
                ]).size().reset_index(name='pickup_count')
                
                hourly_demand = hourly_demand.rename(columns={
                    'PULocationID': 'location_id',
                    'tpep_pickup_datetime': 'datetime'
                })
                
                # Drop nulls
                hourly_demand = hourly_demand.dropna()
                
                all_data.append(hourly_demand)
                logger.info(f" => Extracted {len(hourly_demand)} aggregated vectors.")
                
            except Exception as e:
                logger.error(f"Failed to process {file_path}: {e}")

        if not all_data:
            logger.error("No valid data compiled.")
            return

        logger.info("Combining mapping structures...")
        combined = pd.concat(all_data, ignore_index=True)
        
        # Deduplicate mathematically on location_id and datetime (sums if split across files)
        combined = combined.groupby(['location_id', 'datetime'])['pickup_count'].sum().reset_index()

        logger.info(f"Total structured rows to commit to PostgeSQL: {len(combined)}")

        # Use Pandas optimized SQL dump directly to SqlAlchemy engine heavily accelerating IO
        logger.info("Executing Bulk Insert Phase to Database Engine. This will take ~60 seconds...")
        combined.to_sql('historical_demand', engine, if_exists='append', index=False, chunksize=50000)
        
        logger.info("SUCCESS: Entire dataset successfully locked into PostgreSQL persistent volumes!")

    except Exception as e:
        logger.error(f"Fatal error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    ingest_historical_data()
