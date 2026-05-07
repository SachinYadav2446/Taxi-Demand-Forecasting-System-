"""
Train Enhanced SARIMAX Model with Historical Data
This script trains the enhanced forecasting model for a specific zone
"""

import sys
from datetime import datetime, timedelta
from database import SessionLocal
from models import HistoricalDemand, Zone
from model_service.enhanced_forecast import EnhancedDemandForecaster
from services.external_data_collectors import ExternalDataAggregator
import pandas as pd
import numpy as np

def train_model_for_zone(location_id: int, days_back: int = 30):
    """
    Train enhanced model for a specific zone
    
    Args:
        location_id: Zone ID to train model for
        days_back: Number of days of historical data to use
    """
    print(f"\n{'='*60}")
    print(f"Training Enhanced Model for Zone {location_id}")
    print(f"{'='*60}\n")
    
    db = SessionLocal()
    
    try:
        # Get zone info
        zone = db.query(Zone).filter(Zone.location_id == location_id).first()
        if not zone:
            print(f"❌ Zone {location_id} not found!")
            return False
        
        print(f"📍 Zone: {zone.zone_name} ({zone.borough})")
        
        # Get historical data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        print(f"📅 Fetching data from {start_date.date()} to {end_date.date()}")
        
        records = db.query(HistoricalDemand).filter(
            HistoricalDemand.location_id == location_id,
            HistoricalDemand.datetime >= start_date,
            HistoricalDemand.datetime <= end_date
        ).order_by(HistoricalDemand.datetime).all()
        
        if len(records) < 100:
            print(f"❌ Not enough data! Found {len(records)} records, need at least 100")
            return False
        
        print(f"✅ Found {len(records)} historical records")
        
        # Convert to DataFrame
        data = []
        for record in records:
            data.append({
                'datetime': record.datetime,
                'demand': record.pickup_count  # Fixed: use pickup_count
            })
        
        df = pd.DataFrame(data)
        df.set_index('datetime', inplace=True)
        
        # Resample to hourly if needed
        df = df.resample('h').sum()  # Fixed: use lowercase 'h'
        
        print(f"📊 Data range: {df.index.min()} to {df.index.max()}")
        print(f"📈 Average demand: {df['demand'].mean():.1f} trips/hour")
        print(f"📉 Min demand: {df['demand'].min():.0f} trips/hour")
        print(f"📈 Max demand: {df['demand'].max():.0f} trips/hour")
        
        # Get external features for the same period
        print(f"\n🌐 Collecting external features...")
        aggregator = ExternalDataAggregator()
        
        external_features = []
        for timestamp in df.index:
            features = aggregator.get_features_for_timestamp(timestamp)
            external_features.append(features)
        
        exog_df = pd.DataFrame(external_features, index=df.index)
        
        print(f"✅ Collected {len(exog_df.columns)} external features")
        print(f"   Features: {', '.join(exog_df.columns[:5])}...")
        
        # Train model
        print(f"\n🤖 Training SARIMAX model...")
        print(f"   This may take 2-5 minutes...")
        
        forecaster = EnhancedDemandForecaster(location_id)
        
        # Split data
        train_size = int(len(df) * 0.8)
        train_demand = df['demand'][:train_size]
        test_demand = df['demand'][train_size:]
        train_exog = exog_df[:train_size]
        test_exog = exog_df[train_size:]
        
        print(f"   Training set: {len(train_demand)} hours")
        print(f"   Test set: {len(test_demand)} hours")
        
        # Train
        forecaster.train(train_demand, train_exog)
        
        # Evaluate
        print(f"\n📊 Evaluating model...")
        metrics = forecaster.evaluate(test_demand, test_exog)
        
        print(f"\n✅ Model Training Complete!")
        print(f"\n📈 Performance Metrics:")
        print(f"   MAE (Mean Absolute Error): {metrics['mae']:.2f} trips/hour")
        print(f"   RMSE (Root Mean Squared Error): {metrics['rmse']:.2f} trips/hour")
        print(f"   MAPE (Mean Absolute % Error): {metrics['mape']:.1f}%")
        
        # Save model
        model_path = f"models/enhanced_{location_id}.pkl"
        forecaster.save_model(model_path)
        print(f"\n💾 Model saved to: {model_path}")
        
        # Test forecast
        print(f"\n🔮 Testing 24-hour forecast...")
        forecast_df = forecaster.forecast(steps=24, return_confidence=True)
        
        print(f"\n📅 Next 6 Hours Forecast:")
        for i in range(min(6, len(forecast_df))):
            row = forecast_df.iloc[i]
            print(f"   {row['timestamp'].strftime('%I:%M %p')}: {row['predicted_demand']:.0f} trips/hour (±{(row['upper_bound'] - row['lower_bound'])/2:.0f})")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error training model: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        db.close()


def main():
    """Main function"""
    print("\n" + "🚖" * 30)
    print("ENHANCED MODEL TRAINING")
    print("🚖" * 30 + "\n")
    
    # Get location ID from command line or use default
    if len(sys.argv) > 1:
        location_id = int(sys.argv[1])
    else:
        location_id = 237  # Default to Times Square
    
    # Get days back from command line or use default
    if len(sys.argv) > 2:
        days_back = int(sys.argv[2])
    else:
        days_back = 30  # Default to 30 days
    
    success = train_model_for_zone(location_id, days_back)
    
    if success:
        print(f"\n{'='*60}")
        print(f"✅ SUCCESS! Model trained and ready to use")
        print(f"{'='*60}\n")
        print(f"🎯 Next Steps:")
        print(f"   1. Refresh your frontend")
        print(f"   2. Select Zone {location_id}")
        print(f"   3. View the enhanced forecast!")
        print(f"\n💡 To train for other zones:")
        print(f"   python train_enhanced_model.py <zone_id> <days_back>")
        print(f"   Example: python train_enhanced_model.py 161 30\n")
    else:
        print(f"\n{'='*60}")
        print(f"❌ FAILED! Could not train model")
        print(f"{'='*60}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
