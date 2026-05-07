import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from model_service.enhanced_forecast import EnhancedDemandForecaster
import warnings

# Suppress statsmodels warnings for cleaner output
warnings.filterwarnings("ignore")

# Connection
DATABASE_URL = "postgresql://neondb_owner:npg_1nkOJCqob7dg@ep-royal-cell-algzza03.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require"

def test_accuracy_fast(location_id=132):
    print(f"--- FAST ACCURACY TEST (Zone {location_id}) ---")
    engine = create_engine(DATABASE_URL)
    
    # 1. Fetch only the last 30 days for testing (Fast)
    print("Fetching last 30 days of data from Neon...")
    query = f"""
    SELECT datetime as timestamp, pickup_count as demand_count 
    FROM historical_demand 
    WHERE location_id = {location_id} 
    ORDER BY datetime DESC 
    LIMIT 720
    """ # 720 hours = 30 days
    df = pd.read_sql(query, engine)
    
    # Reverse to chronological order
    df = df.iloc[::-1].reset_index(drop=True)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df.set_index('timestamp', inplace=True)
    
    # 2. Split: Last 24 hours for testing, rest for training
    split_point = df.index.max() - timedelta(hours=24)
    train_df = df[df.index <= split_point]
    actual_df = df[df.index > split_point]
    
    print(f"Training on {len(train_df)} hours...")
    print(f"Testing on {len(actual_df)} hours (Last 24hrs)...")
    
    # 3. Initialize and train model
    forecaster = EnhancedDemandForecaster(location_id)
    try:
        # Use simpler model params for speed
        forecaster.order = (1, 0, 1) 
        forecaster.seasonal_order = (0, 0, 0, 0) # No seasonality for fast test
        
        # Train without external data for pure speed diagnostic
        target = train_df['demand_count']
        from statsmodels.tsa.statespace.sarimax import SARIMAX
        model = SARIMAX(target, order=forecaster.order)
        model_fit = model.fit(disp=False)
        
        print("Model computation finished!")
        
        # 4. Forecast
        forecast = model_fit.forecast(steps=len(actual_df))
        
        # 5. Results
        actual_values = actual_df['demand_count'].values
        predicted_values = np.clip(forecast.values, 0, None)
        
        mae = np.mean(np.abs(actual_values - predicted_values))
        avg_demand = np.mean(actual_values)
        accuracy = (1 - (mae / avg_demand)) * 100 if avg_demand > 0 else 0
        
        print("\n--- TEST RESULTS ---")
        print(f"Mean Absolute Error (MAE): {mae:.2f} pickups")
        print(f"Average Real Demand: {avg_demand:.2f} pickups")
        print(f"ESTIMATED ACCURACY: {accuracy:.2f}%")
        
        if accuracy > 85:
            print("Status: EXCELLENT accuracy on real data.")
        elif accuracy > 75:
            print("Status: GOOD accuracy on real data.")
        else:
            print("Status: MODERATE accuracy (needs more exogenous features).")

    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_accuracy_fast()
