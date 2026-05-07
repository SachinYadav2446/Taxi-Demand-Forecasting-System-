import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from statsmodels.tsa.statespace.sarimax import SARIMAX
import warnings

warnings.filterwarnings("ignore")

DATABASE_URL = "postgresql://neondb_owner:npg_1nkOJCqob7dg@ep-royal-cell-algzza03.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require"

def run_proper_benchmark(location_id=132):
    print(f"--- PROPER ACCURACY BENCHMARK (Zone {location_id}) ---")
    engine = create_engine(DATABASE_URL)
    
    # 1. Fetch last 60 days of real data
    print("Fetching historical data from Neon...")
    query = f"SELECT datetime as timestamp, pickup_count as demand_count FROM historical_demand WHERE location_id = {location_id} ORDER BY datetime DESC LIMIT 1440"
    df = pd.read_sql(query, engine)
    df = df.iloc[::-1].reset_index(drop=True)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df.set_index('timestamp', inplace=True)
    
    # 2. Split
    split_point = df.index.max() - timedelta(hours=24)
    train_df = df[df.index <= split_point]
    actual_df = df[df.index > split_point]
    
    # 3. Train with FULL PROD SETTINGS
    print("Training with Production SARIMAX settings (2,1,2) x (1,1,1,24)...")
    model = SARIMAX(
        train_df['demand_count'],
        order=(2, 1, 2),
        seasonal_order=(1, 1, 1, 24),
        enforce_stationarity=False,
        enforce_invertibility=False
    )
    model_fit = model.fit(disp=False)
    
    # 4. Forecast
    forecast = model_fit.forecast(steps=len(actual_df))
    
    # 5. Accuracy Calc
    actual = actual_df['demand_count'].values
    predicted = np.clip(forecast.values, 0, None)
    
    mae = np.mean(np.abs(actual - predicted))
    avg_demand = np.mean(actual)
    accuracy = (1 - (mae / avg_demand)) * 100 if avg_demand > 0 else 0
    
    print("\n--- FINAL BENCHMARK RESULTS ---")
    print(f"Mean Absolute Error (MAE): {mae:.2f} pickups")
    print(f"Average Real Demand: {avg_demand:.2f} pickups")
    print(f"REAL WORLD ACCURACY: {accuracy:.2f}%")
    
    if accuracy >= 80:
        print("RESULT: System is performing at Production Grade accuracy.")
    else:
        print(f"RESULT: Accuracy is {accuracy:.1f}%. Still needs external features for the final 10-20% boost.")

if __name__ == "__main__":
    run_proper_benchmark()
