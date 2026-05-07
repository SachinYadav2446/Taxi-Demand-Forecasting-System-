"""
Test Enhanced Model via API Endpoints
Tests external data integration and forecast accuracy
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def print_header(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def test_external_data_apis():
    """Test all external data endpoints"""
    print_header("🌍 TESTING EXTERNAL DATA INTEGRATION")
    
    tests = {
        'Weather Data': f'{BASE_URL}/enhanced-forecasts/weather/current',
        'Upcoming Events': f'{BASE_URL}/enhanced-forecasts/events/upcoming?hours=48',
        'External Features': f'{BASE_URL}/enhanced-forecasts/237/external-features'
    }
    
    results = {}
    
    for name, url in tests.items():
        print(f"\n🔍 Testing: {name}")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ SUCCESS!")
                
                # Show sample data
                if name == 'Weather Data':
                    print(f"   🌡️  Temperature: {data.get('temperature', 'N/A')}°F")
                    print(f"   ☁️  Condition: {data.get('weather_condition', 'N/A')}")
                    print(f"   💧 Humidity: {data.get('humidity', 'N/A')}%")
                    if data.get('is_raining'):
                        print(f"   🌧️  RAIN DETECTED - Expect higher demand!")
                
                elif name == 'Upcoming Events':
                    event_count = data.get('event_count', 0)
                    print(f"   🎭 Events found: {event_count}")
                    if event_count > 0:
                        events = data.get('events', [])
                        for i, event in enumerate(events[:3], 1):
                            print(f"      {i}. {event.get('event_name', 'Unknown')}")
                
                elif name == 'External Features':
                    features = data.get('features', {})
                    print(f"   📊 Features collected:")
                    print(f"      • Temperature: {features.get('temperature', 'N/A')}°F")
                    print(f"      • Raining: {features.get('is_raining', False)}")
                    print(f"      • Rush Hour: {features.get('is_rush_hour', False)}")
                    print(f"      • Holiday: {features.get('is_holiday', False)}")
                    print(f"      • Events: {features.get('event_count', 0)}")
                    print(f"      • Transit Disruption: {features.get('transit_disruption', 0):.0%}")
                
                results[name] = True
            else:
                print(f"   ❌ FAILED: HTTP {response.status_code}")
                print(f"   Error: {response.text[:200]}")
                results[name] = False
                
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
            results[name] = False
    
    return results

def test_enhanced_forecast():
    """Test enhanced forecast endpoint"""
    print_header("🔮 TESTING ENHANCED FORECAST")
    
    location_id = 237  # Popular Manhattan zone
    steps = 24  # 24 hours
    
    url = f'{BASE_URL}/enhanced-forecasts/{location_id}/forecast?steps={steps}'
    
    print(f"\n🔍 Testing enhanced forecast for location {location_id}")
    print(f"   URL: {url}")
    print(f"   Forecast horizon: {steps} hours")
    
    try:
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n   ✅ SUCCESS!")
            
            forecast = data.get('forecast', [])
            print(f"\n   📊 Forecast Summary:")
            print(f"      • Periods: {len(forecast)}")
            
            if forecast:
                demands = [f['predicted_demand'] for f in forecast]
                print(f"      • Average demand: {sum(demands)/len(demands):.1f} trips/hour")
                print(f"      • Peak demand: {max(demands):.1f} trips/hour")
                print(f"      • Min demand: {min(demands):.1f} trips/hour")
                
                # Show first few predictions
                print(f"\n   📋 Sample Predictions (first 5 hours):")
                print(f"      {'Time':<20} {'Demand':<10} {'Lower':<10} {'Upper':<10}")
                print(f"      {'-'*50}")
                for i, pred in enumerate(forecast[:5]):
                    timestamp = pred.get('timestamp', 'N/A')
                    demand = pred.get('predicted_demand', 0)
                    lower = pred.get('lower_bound', 0)
                    upper = pred.get('upper_bound', 0)
                    print(f"      {timestamp:<20} {demand:<10.1f} {lower:<10.1f} {upper:<10.1f}")
            
            # Check if explanation is available
            explanation = data.get('explanation')
            if explanation:
                print(f"\n   💡 Forecast Explanation:")
                explanations = explanation.get('explanations', [])
                if explanations:
                    for exp in explanations[:5]:
                        factor = exp.get('factor', 'Unknown')
                        impact = exp.get('impact', 'unknown')
                        desc = exp.get('description', 'No description')
                        print(f"      • {factor} ({impact}): {desc}")
                else:
                    print(f"      No special factors detected - normal conditions")
            
            return True
        else:
            print(f"\n   ❌ FAILED: HTTP {response.status_code}")
            print(f"   Error: {response.text[:500]}")
            return False
            
    except Exception as e:
        print(f"\n   ❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_model_comparison():
    """Test model comparison endpoint"""
    print_header("⚖️  TESTING MODEL COMPARISON")
    
    location_id = 237
    url = f'{BASE_URL}/enhanced-forecasts/{location_id}/compare-models'
    
    print(f"\n🔍 Comparing basic vs enhanced model for location {location_id}")
    print(f"   URL: {url}")
    print(f"   ⏳ This may take 30-60 seconds...")
    
    try:
        response = requests.get(url, timeout=120)
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n   ✅ SUCCESS!")
            
            basic = data.get('basic_model', {})
            enhanced = data.get('enhanced_model', {})
            improvement = data.get('improvement_percentage', 0)
            recommendation = data.get('recommendation', 'unknown')
            
            print(f"\n   📊 Comparison Results:")
            print(f"\n      Basic Model (ARIMA):")
            print(f"         MAE: {basic.get('mae', 'N/A'):.2f} trips/hour")
            
            print(f"\n      Enhanced Model (SARIMAX + External Data):")
            print(f"         MAE: {enhanced.get('mae', 'N/A'):.2f} trips/hour")
            
            print(f"\n      🎯 Improvement: {improvement:+.1f}%")
            print(f"      💡 Recommendation: Use {recommendation.upper()} model")
            
            if improvement > 15:
                print(f"\n      ✅ SIGNIFICANT IMPROVEMENT!")
                print(f"         External data integration is working well!")
            elif improvement > 5:
                print(f"\n      ✅ MODERATE IMPROVEMENT")
                print(f"         External data provides value")
            elif improvement > 0:
                print(f"\n      ⚖️  SLIGHT IMPROVEMENT")
                print(f"         Both models are comparable")
            else:
                print(f"\n      ⚠️  Basic model performs better")
                print(f"         May need more training data or parameter tuning")
            
            return True
        else:
            print(f"\n   ❌ FAILED: HTTP {response.status_code}")
            print(f"   Error: {response.text[:500]}")
            return False
            
    except Exception as e:
        print(f"\n   ❌ ERROR: {e}")
        return False

def test_health():
    """Test if API is running"""
    print_header("🏥 TESTING API HEALTH")
    
    url = f'{BASE_URL}/health'
    
    try:
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n   ✅ API is healthy!")
            print(f"   Status: {data.get('status', 'unknown')}")
            print(f"   Database: {data.get('database', 'unknown')}")
            return True
        else:
            print(f"\n   ❌ API returned: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"\n   ❌ Cannot connect to API: {e}")
        print(f"\n   Make sure the backend is running on {BASE_URL}")
        return False

def main():
    print("\n" + "🚖" * 35)
    print("ENHANCED MODEL API TESTING")
    print("Testing External Data Integration & Accuracy")
    print("🚖" * 35)
    
    # Test API health first
    if not test_health():
        print("\n❌ API is not running. Please start the backend server first.")
        print("   Run: python -m uvicorn main:app --reload")
        return
    
    # Run all tests
    results = {}
    
    # Test external data
    external_results = test_external_data_apis()
    results.update(external_results)
    
    # Test enhanced forecast
    results['Enhanced Forecast'] = test_enhanced_forecast()
    
    # Test model comparison (this takes longer)
    results['Model Comparison'] = test_model_comparison()
    
    # Summary
    print_header("📊 TEST SUMMARY")
    
    print("\n   Results:")
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"   {status} - {test_name}")
    
    passed_count = sum(results.values())
    total_count = len(results)
    
    print(f"\n   Overall: {passed_count}/{total_count} tests passed")
    
    if passed_count == total_count:
        print("\n   🎉 ALL TESTS PASSED!")
        print("   Your enhanced forecasting system is working perfectly!")
    elif passed_count >= total_count - 1:
        print("\n   ✅ MOSTLY WORKING!")
        print("   System is functional with minor issues")
    else:
        print("\n   ⚠️  SOME ISSUES DETECTED")
        print("   Check the error messages above")
    
    print("\n" + "=" * 70)
    print("🔗 Next Steps:")
    print("   • View API docs: http://localhost:8000/docs")
    print("   • Test in browser: http://localhost:5173")
    print("   • Check logs for more details")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
