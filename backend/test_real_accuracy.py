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

def test_model_accuracy(location_id=132):
    print(f"--- MODEL ACCURACY TEST (Zone {location_id}) ---")
    engine = create_engine(DATABASE_URL)
    
    # 1. Fetch data from Neon
    print("Fetching historical data from Neon...")
    query = f"SELECT datetime as timestamp, pickup_count as demand_count FROM historical_demand WHERE location_id = {location_id} ORDER BY datetime ASC"
    df = pd.read_sql(query, engine)
    
    if len(df) < 100:
        print("❌ Error: Not enough data for training. Need at least 100 rows.")
        return

    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df.set_index('timestamp', inplace=True)
    
    # 2. Split data: Use everything except the last 24 hours for training
    last_timestamp = df.index.max()
    split_point = last_timestamp - timedelta(hours=24)
    
    train_df = df[df.index <= split_point]
    actual_df = df[df.index > split_point]
    
    print(f"Training on {len(train_df)} rows (up to {split_point})...")
    print(f"Testing on {len(actual_df)} rows (last 24 hours)...")
    
    # 3. Initialize and train model
    forecaster = EnhancedDemandForecaster(location_id)
    try:
        # Mocking external data dates to match our historical window for the test
        start_date = train_df.index.min()
        end_date = train_df.index.max()
        
        forecaster.train(train_df, start_date, end_date)
        print("✅ Training successful!")
        
        # 4. Generate Forecast for 24 hours
        # We'll use a simplified version for the test to avoid external API calls
        forecast_df = forecaster.model_fit.forecast(steps=len(actual_df), exog=None) # Simplified for quick check
        
        # 5. Calculate Accuracy
        actual_values = actual_df['demand_count'].values
        predicted_values = forecast_df.values
        
        # Clip negative predictions
        predicted_values = np.clip(predicted_values, a_min=0, a_max=None)
        
        mae = np.mean(np.abs(actual_values - predicted_values))
        avg_demand = np.mean(actual_values)
        accuracy = (1 - (mae / avg_demand)) * 100 if avg_demand > 0 else 0
        
        print("\n--- TEST RESULTS ---")
        print(f"Mean Absolute Error (MAE): {mae:.2f} pickups")
        print(f"Average Real Demand: {avg_demand:.2f} pickups")
        print(f"MODEL ACCURACY: {accuracy:.2f}%")
        
        if accuracy > 80:
            print("Excellent: Model is performing with high accuracy!")
        elif accuracy > 70:
            print("Good: Model is performing well.")
        else:
            print("Warning: Model accuracy is low. Consider more training data or feature tuning.")

    except Exception as e:
        print(f"ERROR during test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_model_accuracy()
