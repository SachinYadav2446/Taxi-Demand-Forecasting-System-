import sys
import os
import traceback

# Add project root and backend folder to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, "..")) # /backend
sys.path.append(os.path.join(current_dir, "..", "..")) # project root (for model_service)

from model_service.forecast_core import generate_product_forecast, backtest_models, get_zone_series

print("="*60)
print("Testing Improved Taxi Demand Forecasting Model")
print("="*60)

# Test multiple zones
test_zones = [4, 161, 162, 230, 234]

for zone_id in test_zones:
    print(f"\n{'='*60}")
    print(f"Zone {zone_id}")
    print(f"{'='*60}")
    
    try:
        # Get zone series first to check data availability
        zone_series = get_zone_series(zone_id, horizon='hourly')
        print(f"Data points: {len(zone_series)}")
        
        # Run backtest with improved model
        print("Running backtest (without grid search for speed)...")
        backtest = backtest_models(zone_series, horizon='hourly', use_grid_search=False)
        
        print(f"\nResults:")
        print(f"  Best Model: {backtest['best_model']}")
        print(f"  Best Accuracy: {backtest['best_accuracy']:.2f}%")
        
        # Show all model results
        print(f"\n  All Models:")
        for model_name, result in backtest['results'].items():
            acc = result['accuracy']
            print(f"    {model_name}: {acc:.2f}%" if acc else f"    {model_name}: N/A")
        
        # Generate full forecast
        res = generate_product_forecast(zone_id=zone_id, horizon='hourly', use_grid_search=False)
        print(f"\n  Forecast generated successfully!")
        print(f"  Peak demand: {res['peak_window']['predicted_demand']} at {res['peak_window']['timestamp']}")
        
    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()

print(f"\n{'='*60}")
print("Testing with Grid Search (Zone 161 only - may take longer)")
print(f"{'='*60}")

try:
    zone_series = get_zone_series(161, horizon='hourly')
    backtest_gs = backtest_models(zone_series, horizon='hourly', use_grid_search=True)
    
    print(f"\nGrid Search Results:")
    print(f"  Best Model: {backtest_gs['best_model']}")
    print(f"  Best Accuracy: {backtest_gs['best_accuracy']:.2f}%")
    if 'model_params' in backtest_gs:
        print(f"  Optimal Order: {backtest_gs['model_params'].get('order')}")
        print(f"  Optimal Seasonal Order: {backtest_gs['model_params'].get('seasonal_order')}")
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
