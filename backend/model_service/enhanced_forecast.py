"""
Enhanced Forecasting with External Data Integration
Uses SARIMAX with exogenous variables (weather, events, holidays, etc.)
"""

import pandas as pd
import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
from typing import Dict, Tuple, Optional
import pickle
import logging
from pathlib import Path

from services.external_data_collectors import ExternalDataAggregator

logger = logging.getLogger(__name__)


class EnhancedDemandForecaster:
    """
    Advanced demand forecasting with external data integration
    """
    
    def __init__(self, location_id: int):
        self.location_id = location_id
        self.model = None
        self.scaler = StandardScaler()
        self.external_data = ExternalDataAggregator()
        self.feature_columns = None
        
        # SARIMAX parameters (can be tuned per zone)
        self.order = (2, 1, 2)  # (p, d, q)
        self.seasonal_order = (1, 1, 1, 24)  # (P, D, Q, s) - 24 hours seasonality
        
    def prepare_training_data(
        self,
        demand_data: pd.DataFrame,
        start_date: datetime,
        end_date: datetime
    ) -> Tuple[pd.Series, pd.DataFrame]:
        """
        Prepare training data with external features
        
        Args:
            demand_data: Historical demand (timestamp, demand_count)
            start_date: Training start date
            end_date: Training end date
            
        Returns:
            (target_series, exogenous_features)
        """
        # Ensure demand_data has datetime index
        if not isinstance(demand_data.index, pd.DatetimeIndex):
            demand_data['timestamp'] = pd.to_datetime(demand_data['timestamp'])
            demand_data.set_index('timestamp', inplace=True)
        
        # Resample to hourly (in case of missing hours)
        demand_hourly = demand_data.resample('h').sum()
        demand_hourly = demand_hourly.fillna(0)
        
        # Get external features for the same period
        external_features = self.external_data.get_features_dataframe(
            start_date=start_date,
            end_date=end_date,
            freq='h'
        )
        
        # Align indices
        common_index = demand_hourly.index.intersection(external_features.index)
        demand_aligned = demand_hourly.loc[common_index]
        features_aligned = external_features.loc[common_index]
        
        # Store feature columns for later use
        self.feature_columns = features_aligned.columns.tolist()
        
        # Scale features
        features_scaled = pd.DataFrame(
            self.scaler.fit_transform(features_aligned),
            index=features_aligned.index,
            columns=features_aligned.columns
        )
        
        return demand_aligned['demand_count'], features_scaled
    
    def train(
        self,
        demand_data: pd.DataFrame,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Train SARIMAX model with external features
        
        Returns:
            Training metrics and model info
        """
        logger.info(f"Training enhanced model for location {self.location_id}")
        
        # Prepare data
        target, exog = self.prepare_training_data(demand_data, start_date, end_date)
        
        # Train SARIMAX model
        try:
            self.model = SARIMAX(
                target,
                exog=exog,
                order=self.order,
                seasonal_order=self.seasonal_order,
                enforce_stationarity=False,
                enforce_invertibility=False
            )
            
            self.model_fit = self.model.fit(disp=False, maxiter=200)
            
            # Calculate training metrics
            predictions = self.model_fit.fittedvalues
            residuals = target - predictions
            
            metrics = {
                'location_id': self.location_id,
                'aic': self.model_fit.aic,
                'bic': self.model_fit.bic,
                'mae': np.mean(np.abs(residuals)),
                'rmse': np.sqrt(np.mean(residuals**2)),
                'mape': np.mean(np.abs(residuals / (target + 1))) * 100,
                'training_samples': len(target),
                'features_used': self.feature_columns,
                'trained_at': datetime.now().isoformat()
            }
            
            logger.info(f"Model trained successfully. MAE: {metrics['mae']:.2f}, RMSE: {metrics['rmse']:.2f}")
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            raise
    
    def forecast(
        self,
        steps: int = 24,
        return_confidence: bool = True
    ) -> pd.DataFrame:
        """
        Generate forecast with external features
        
        Args:
            steps: Number of hours to forecast
            return_confidence: Include confidence intervals
            
        Returns:
            DataFrame with predictions and optional confidence intervals
        """
        if self.model_fit is None:
            raise ValueError("Model not trained. Call train() first.")
        
        # Get future external features
        start_forecast = datetime.now()
        end_forecast = start_forecast + timedelta(hours=steps)
        
        future_exog = self.external_data.get_features_dataframe(
            start_date=start_forecast,
            end_date=end_forecast,
            freq='h'
        )
        
        # Ensure same columns as training
        future_exog = future_exog[self.feature_columns]
        
        # Scale features
        future_exog_scaled = pd.DataFrame(
            self.scaler.transform(future_exog),
            index=future_exog.index,
            columns=future_exog.columns
        )
        
        # Generate forecast
        forecast_result = self.model_fit.forecast(
            steps=steps,
            exog=future_exog_scaled
        )
        
        # Prepare output
        forecast_df = pd.DataFrame({
            'timestamp': future_exog.index,
            'predicted_demand': forecast_result.values
        })
        
        # Add confidence intervals if requested
        if return_confidence:
            forecast_obj = self.model_fit.get_forecast(
                steps=steps,
                exog=future_exog_scaled
            )
            conf_int = forecast_obj.conf_int(alpha=0.05)  # 95% confidence
            
            forecast_df['lower_bound'] = conf_int.iloc[:, 0].values
            forecast_df['upper_bound'] = conf_int.iloc[:, 1].values
        
        # Ensure non-negative predictions
        forecast_df['predicted_demand'] = forecast_df['predicted_demand'].clip(lower=0)
        if return_confidence:
            forecast_df['lower_bound'] = forecast_df['lower_bound'].clip(lower=0)
            forecast_df['upper_bound'] = forecast_df['upper_bound'].clip(lower=0)
        
        return forecast_df
    
    def explain_forecast(self, forecast_df: pd.DataFrame) -> Dict:
        """
        Explain what's driving the forecast
        Analyzes feature importance and key factors
        """
        # Get current external features
        current_features = self.external_data.get_features_for_timestamp(datetime.now())
        
        explanations = []
        
        # Weather impact
        if current_features['is_raining']:
            explanations.append({
                'factor': 'Weather',
                'impact': 'high',
                'description': f"Rain detected ({current_features['rain_intensity']:.1f}mm). Expect 20-30% demand increase."
            })
        
        if current_features['is_snowing']:
            explanations.append({
                'factor': 'Weather',
                'impact': 'very_high',
                'description': "Snow detected. Expect 40-50% demand increase."
            })
        
        if current_features['temperature'] < 32 or current_features['temperature'] > 85:
            explanations.append({
                'factor': 'Temperature',
                'impact': 'medium',
                'description': f"Extreme temperature ({current_features['temperature']:.0f}°F). Expect 10-15% demand increase."
            })
        
        # Event impact
        if current_features['event_count'] > 0:
            explanations.append({
                'factor': 'Events',
                'impact': 'high',
                'description': f"{current_features['event_count']} major events happening. Expected {current_features['expected_event_attendance']:,.0f} attendees."
            })
        
        # Holiday impact
        if current_features['is_holiday']:
            explanations.append({
                'factor': 'Holiday',
                'impact': 'medium',
                'description': "Holiday detected. Demand patterns may differ from typical days."
            })
        
        # Transit impact
        if current_features['transit_disruption'] > 0.5:
            explanations.append({
                'factor': 'Transit Disruption',
                'impact': 'high',
                'description': f"Subway disruptions detected (severity: {current_features['transit_disruption']:.0%}). Expect increased taxi demand."
            })
        
        # Airport impact
        high_airport_traffic = [
            airport for airport, score in [
                ('JFK', current_features['jfk_traffic']),
                ('LGA', current_features['lga_traffic']),
                ('EWR', current_features['ewr_traffic'])
            ] if score > 0.7
        ]
        
        if high_airport_traffic:
            explanations.append({
                'factor': 'Airport Traffic',
                'impact': 'medium',
                'description': f"High traffic at {', '.join(high_airport_traffic)}. Expect increased demand near airports."
            })
        
        # Time-based factors
        if current_features['is_rush_hour']:
            explanations.append({
                'factor': 'Rush Hour',
                'impact': 'high',
                'description': "Peak commute hours. Expect 30-40% higher demand."
            })
        
        return {
            'location_id': self.location_id,
            'forecast_timestamp': datetime.now().isoformat(),
            'explanations': explanations,
            'current_features': current_features,
            'average_predicted_demand': forecast_df['predicted_demand'].mean()
        }
    
    def save_model(self, path: str):
        """Save trained model to disk"""
        model_data = {
            'model_fit': self.model_fit,
            'scaler': self.scaler,
            'feature_columns': self.feature_columns,
            'location_id': self.location_id,
            'order': self.order,
            'seasonal_order': self.seasonal_order
        }
        
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.info(f"Model saved to {path}")
    
    def load_model(self, path: str):
        """Load trained model from disk"""
        with open(path, 'rb') as f:
            model_data = pickle.load(f)
        
        self.model_fit = model_data['model_fit']
        self.scaler = model_data['scaler']
        self.feature_columns = model_data['feature_columns']
        self.location_id = model_data['location_id']
        self.order = model_data['order']
        self.seasonal_order = model_data['seasonal_order']
        
        logger.info(f"Model loaded from {path}")


def compare_models(
    location_id: int,
    demand_data: pd.DataFrame,
    start_date: datetime,
    end_date: datetime
) -> Dict:
    """
    Compare basic ARIMA vs enhanced SARIMAX with external features
    """
    from model_service.forecast_core import ForecastCore
    
    # Split data for testing
    split_point = start_date + (end_date - start_date) * 0.8
    
    train_data = demand_data[demand_data.index < split_point]
    test_data = demand_data[demand_data.index >= split_point]
    
    # Train basic model
    basic_model = ForecastCore(location_id)
    basic_metrics = basic_model.train(train_data, start_date, split_point)
    basic_forecast = basic_model.forecast(steps=len(test_data))
    
    # Train enhanced model
    enhanced_model = EnhancedDemandForecaster(location_id)
    enhanced_metrics = enhanced_model.train(train_data, start_date, split_point)
    enhanced_forecast = enhanced_model.forecast(steps=len(test_data))
    
    # Calculate test set performance
    basic_mae = np.mean(np.abs(test_data['demand_count'].values - basic_forecast['predicted_demand'].values))
    enhanced_mae = np.mean(np.abs(test_data['demand_count'].values - enhanced_forecast['predicted_demand'].values))
    
    improvement = ((basic_mae - enhanced_mae) / basic_mae) * 100
    
    return {
        'location_id': location_id,
        'basic_model': {
            'mae': basic_mae,
            'metrics': basic_metrics
        },
        'enhanced_model': {
            'mae': enhanced_mae,
            'metrics': enhanced_metrics
        },
        'improvement_percentage': improvement,
        'recommendation': 'enhanced' if improvement > 5 else 'basic'
    }
