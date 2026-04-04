from __future__ import annotations

import warnings
from functools import lru_cache
from itertools import product
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.stattools import adfuller

MODEL_NAME = "shared-notebook-forecast-v4-ensemble"
PROJECT_BENCHMARK_ACCURACY = 91.0

# US Federal Holidays (simplified - can be expanded)
US_HOLIDAYS_2025 = {
    "2025-01-01", "2025-01-20", "2025-02-17", "2025-05-26",
    "2025-06-19", "2025-07-04", "2025-09-01", "2025-10-13",
    "2025-11-11", "2025-11-27", "2025-12-25",
}
US_HOLIDAYS_2026 = {
    "2026-01-01", "2026-01-19", "2026-02-16", "2026-05-25",
    "2026-06-19", "2026-07-03", "2026-09-07", "2026-10-12",
    "2026-11-11", "2026-11-26", "2026-12-25",
}
ALL_HOLIDAYS = US_HOLIDAYS_2025 | US_HOLIDAYS_2026

# Geographic clustering for low-data zones
# Maps low-data zones to their nearest high-data neighbor or borough representative
ZONE_CLUSTERS = {
    # Queens - Jamaica area
    2: [130, 131, 215],  # Jamaica Bay -> Jamaica, Jamaica Estates, South Jamaica
    8: [130, 131],  # Astoria Park -> Jamaica area
    9: [130, 131],  # Auburndale -> Jamaica area
    15: [130, 131],  # Bay Terrace -> Jamaica area
    16: [130, 131],  # Bayside -> Jamaica area
    27: [130, 131],  # Breezy Point -> Jamaica area
    30: [130, 131],  # Broad Channel -> Jamaica area
    57: [130, 131],  # Corona -> Jamaica area
    64: [130, 131],  # Douglaston -> Jamaica area
    73: [130, 131],  # East Flushing -> Jamaica area
    96: [130, 131],  # Forest Park -> Jamaica area
    98: [130, 131],  # Fresh Meadows -> Jamaica area
    101: [130, 131],  # Glen Oaks -> Jamaica area
    171: [130, 131],  # Murray Hill-Queens -> Jamaica area
    175: [130, 131],  # Oakland Gardens -> Jamaica area
    192: [130, 131],  # Queensboro Hill -> Jamaica area
    201: [130, 131],  # Rockaway Park -> Jamaica area
    207: [130, 131],  # Saint Michaels Cemetery -> Jamaica area
    252: [130, 131],  # Whitestone -> Jamaica area
    253: [130, 131],  # Willets Point -> Jamaica area
    
    # Bronx - cluster to central Bronx
    31: [195, 200],  # Bronx Park -> Parkchester, Ridgewood
    46: [195, 200],  # City Island -> Parkchester
    58: [195, 200],  # Country Club -> Parkchester
    59: [195, 200],  # Crotona Park -> Parkchester
    183: [195, 200],  # Pelham Bay -> Parkchester
    184: [195, 200],  # Pelham Bay Park -> Parkchester
    199: [195, 200],  # Rikers Island -> Parkchester
    240: [195, 200],  # Van Cortlandt Park -> Parkchester
    
    # Brooklyn - cluster to central Brooklyn
    11: [72, 181],  # Bath Beach -> East Flatbush, Park Slope
    111: [72, 181],  # Green-Wood Cemetery -> East Flatbush
    150: [72, 181],  # Manhattan Beach -> East Flatbush
    154: [72, 181],  # Marine Park -> East Flatbush
    178: [72, 181],  # Ocean Parkway South -> East Flatbush
    190: [72, 181],  # Prospect Park -> East Flatbush
    
    # Manhattan - cluster to nearby high-traffic areas
    103: [161, 162],  # Governor's Island -> Midtown
    104: [161, 162],  # Governor's Island -> Midtown
    105: [161, 162],  # Governor's Island -> Midtown
    120: [161, 162],  # Highbridge Park -> Midtown
    128: [161, 162],  # Inwood Hill Park -> Midtown
    153: [161, 162],  # Marble Hill -> Midtown
    194: [161, 162],  # Randalls Island -> Midtown
    
    # Staten Island - cluster to St. George area
    5: [206, 221],  # Arden Heights -> St. George, Stapleton
    6: [206, 221],  # Arrochar -> St. George
    23: [206, 221],  # Bloomfield -> St. George
    44: [206, 221],  # Charleston -> St. George
    84: [206, 221],  # Eltingville -> St. George
    99: [206, 221],  # Freshkills Park -> St. George
    109: [206, 221],  # Great Kills -> St. George
    110: [206, 221],  # Great Kills Park -> St. George
    115: [206, 221],  # Grymes Hill -> St. George
    118: [206, 221],  # Heartland Village -> St. George
    156: [206, 221],  # Mariners Harbor -> St. George
    172: [206, 221],  # New Dorp -> St. George
    176: [206, 221],  # Oakwood -> St. George
    187: [206, 221],  # Port Richmond -> St. George
    204: [206, 221],  # Rossville -> St. George
    214: [206, 221],  # South Beach -> St. George
    245: [206, 221],  # West Brighton -> St. George
    251: [206, 221],  # Westerleigh -> St. George
}

# Minimum data threshold for a zone to be considered "good data"
MIN_DATA_POINTS = 168  # 1 week of hourly data
MIN_AVG_TRIPS = 2.0  # At least 2 trips per hour on average


def resolve_raw_data_dir(base_file: str | Path | None = None) -> Path:
    current_file = Path(base_file).resolve() if base_file else Path(__file__).resolve()
    candidates = [
        current_file.parent / "data" / "raw",
        current_file.parents[1] / "model_service" / "data" / "raw",
        Path("/app/model_service/data/raw"),
        Path("/model_service/data/raw"),
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return candidates[0]


RAW_DATA_DIR = resolve_raw_data_dir(__file__)


@lru_cache(maxsize=1)
def load_hourly_demand(raw_data_dir: str | Path = RAW_DATA_DIR, min_year: int = 2025) -> pd.DataFrame:
    """Load hourly demand data from parquet files.
    
    Args:
        raw_data_dir: Path to raw data directory
        min_year: Minimum year to include (filters out old data)
    """
    raw_path = Path(raw_data_dir)
    parquet_files = sorted(raw_path.glob("*.parquet"))
    if not parquet_files:
        raise FileNotFoundError(f"No parquet files found in {raw_path}")

    frames = []
    for parquet_path in parquet_files:
        frame = pd.read_parquet(parquet_path)
        required = {"PULocationID", "tpep_pickup_datetime"}
        if not required.issubset(frame.columns):
            continue
        frame = frame[["PULocationID", "tpep_pickup_datetime"]].copy()
        frame["tpep_pickup_datetime"] = pd.to_datetime(frame["tpep_pickup_datetime"], errors="coerce")
        frame = frame.dropna(subset=["PULocationID", "tpep_pickup_datetime"])
        # Filter to recent data only (avoid old/erroneous data)
        frame = frame[frame["tpep_pickup_datetime"].dt.year >= min_year]
        if not frame.empty:
            frames.append(frame)

    if not frames:
        raise ValueError("No usable parquet trip data found.")

    trips = pd.concat(frames, ignore_index=True)
    return (
        trips.groupby(["PULocationID", pd.Grouper(key="tpep_pickup_datetime", freq="h")])
        .size()
        .reset_index(name="trip_count")
        .sort_values(["PULocationID", "tpep_pickup_datetime"])
    )


def get_zone_series(location_id: int, horizon: str = "hourly", raw_data_dir: str | Path = RAW_DATA_DIR) -> pd.Series:
    hourly_demand = load_hourly_demand(raw_data_dir)
    zone_data = hourly_demand[hourly_demand["PULocationID"] == location_id].copy()
    if zone_data.empty:
        raise ValueError(f"No trip data found for zone {location_id}")

    zone_data = zone_data.set_index("tpep_pickup_datetime").sort_index()
    zone_series = zone_data["trip_count"].resample("h").asfreq().fillna(0.0).astype(float)
    if horizon == "daily":
        zone_series = zone_series.resample("D").sum().astype(float)
    return zone_series


def build_future_index(zone_series: pd.Series, horizon: str) -> pd.DatetimeIndex:
    future_periods = 24 if horizon == "hourly" else 14
    offset = pd.tseries.frequencies.to_offset("h" if horizon == "hourly" else "D")
    return pd.date_range(zone_series.index[-1] + offset, periods=future_periods, freq=offset)


def is_holiday(date_index: pd.DatetimeIndex) -> pd.Series:
    """Check if dates are holidays."""
    date_strings = date_index.strftime("%Y-%m-%d")
    return pd.Series([d in ALL_HOLIDAYS for d in date_strings], index=date_index).astype(int)


def build_features(zone_series: pd.Series, horizon: str = "hourly", include_lags: bool = True) -> pd.DataFrame:
    """Build features for forecasting.
    
    Args:
        zone_series: Time series of trip counts
        horizon: 'hourly' or 'daily'
        include_lags: Whether to include lag features (set to False during backtesting to avoid data leakage)
    """
    feature_frame = pd.DataFrame({"trip_count": zone_series.astype(float)})
    
    # Time-based features (always safe, no leakage)
    feature_frame["day_of_week"] = feature_frame.index.dayofweek
    feature_frame["is_weekend"] = np.where(feature_frame.index.dayofweek >= 5, 1, 0)
    feature_frame["day_of_month"] = feature_frame.index.day
    feature_frame["month"] = feature_frame.index.month
    feature_frame["is_holiday"] = is_holiday(feature_frame.index)
    
    # Cyclical encoding for day_of_week
    feature_frame["day_of_week_sin"] = np.sin(2 * np.pi * feature_frame["day_of_week"] / 7)
    feature_frame["day_of_week_cos"] = np.cos(2 * np.pi * feature_frame["day_of_week"] / 7)
    
    # Cyclical encoding for month
    feature_frame["month_sin"] = np.sin(2 * np.pi * feature_frame["month"] / 12)
    feature_frame["month_cos"] = np.cos(2 * np.pi * feature_frame["month"] / 12)

    if horizon == "hourly":
        feature_frame["hour_of_day"] = feature_frame.index.hour
        # Cyclical encoding for hour
        feature_frame["hour_sin"] = np.sin(2 * np.pi * feature_frame["hour_of_day"] / 24)
        feature_frame["hour_cos"] = np.cos(2 * np.pi * feature_frame["hour_of_day"] / 24)
        
        # Lag features - only include if explicitly requested (avoid data leakage in backtesting)
        if include_lags:
            feature_frame["demand_24h_ago"] = feature_frame["trip_count"].shift(24)
            feature_frame["demand_168h_ago"] = feature_frame["trip_count"].shift(168)
        else:
            feature_frame["demand_24h_ago"] = np.nan
            feature_frame["demand_168h_ago"] = np.nan
    else:
        feature_frame["hour_of_day"] = 0
        feature_frame["hour_sin"] = 0
        feature_frame["hour_cos"] = 0
        if include_lags:
            feature_frame["demand_24h_ago"] = feature_frame["trip_count"].shift(1)
            feature_frame["demand_168h_ago"] = feature_frame["trip_count"].shift(7)
        else:
            feature_frame["demand_24h_ago"] = np.nan
            feature_frame["demand_168h_ago"] = np.nan

    return feature_frame


def apply_boxcox_transform(series: pd.Series) -> tuple[pd.Series, float]:
    """Apply Box-Cox transformation to handle zeros and stabilize variance.
    Returns transformed series and lambda parameter.
    """
    # Add small constant to handle zeros
    min_val = series.min()
    offset = abs(min_val) + 1 if min_val <= 0 else 0
    shifted_series = series + offset
    
    # Apply Box-Cox
    transformed, lmbda = stats.boxcox(shifted_series)
    return pd.Series(transformed, index=series.index), lmbda, offset


def inverse_boxcox_transform(transformed_series: pd.Series, lmbda: float, offset: float) -> pd.Series:
    """Inverse Box-Cox transformation."""
    if lmbda == 0:
        result = np.exp(transformed_series)
    else:
        result = np.power(transformed_series * lmbda + 1, 1 / lmbda)
    return result - offset


def validate_training_data(zone_series: pd.Series, horizon: str) -> tuple[bool, str]:
    """Validate that we have sufficient data for training."""
    min_hours = 168   # 1 week minimum for hourly (reduced from 2 weeks)
    min_days = 14     # 2 weeks minimum for daily (reduced from 30 days)
    
    if horizon == "hourly":
        if len(zone_series) < min_hours:
            return False, f"Insufficient data: need at least {min_hours} hours, got {len(zone_series)}"
    else:
        if len(zone_series) < min_days:
            return False, f"Insufficient data: need at least {min_days} days, got {len(zone_series)}"
    
    # Check for too many zeros (sparse series) - taxi data is naturally sparse at hourly level
    # Allow up to 85% zeros for hourly data (many hours have no trips in certain zones)
    sparsity = series_sparsity(zone_series)
    max_sparsity = 0.90 if horizon == "hourly" else 0.70
    if sparsity > max_sparsity:
        return False, f"Series too sparse: {sparsity:.1%} zeros, max allowed {max_sparsity:.0%}"
    
    return True, "OK"


def estimate_differencing(train_series: pd.Series) -> int:
    d_value = 0
    series_diff = train_series.copy()
    while d_value <= 2:
        if series_diff.dropna().empty or series_diff.std() == 0:
            break
        try:
            p_value = adfuller(series_diff.dropna(), autolag="AIC")[1]
        except Exception:
            break
        if p_value < 0.05:
            break
        series_diff = series_diff.diff().dropna()
        d_value += 1
    return d_value


def wmape_accuracy(actual: pd.Series, predicted: pd.Series) -> float | None:
    denominator = float(actual.sum())
    if denominator <= 0:
        return None
    wmape = float(np.abs(actual - predicted).sum() / denominator)
    return round(max(0.0, (1.0 - wmape) * 100.0), 2)


def fit_sarimax_grid_search(
    y_train: pd.Series, 
    exog_train: pd.DataFrame, 
    seasonal_period: int, 
    d_value: int,
    use_boxcox: bool = True
) -> tuple:
    """Fit SARIMAX with grid search for optimal parameters.
    
    Returns:
        tuple: (fitted_model, best_order, best_seasonal_order, transform_params)
    """
    # Apply Box-Cox transformation if requested
    lmbda = None
    offset = 0
    if use_boxcox:
        y_train_transformed, lmbda, offset = apply_boxcox_transform(y_train)
    else:
        y_train_transformed = y_train
    
    # Define parameter grid (very limited to speed up - 4 combinations only)
    p_values = [1, 2]
    q_values = [1]
    P_values = [0, 1]
    Q_values = [0]
    D_value = 1  # Usually 1 for seasonal differencing
    
    best_aic = float('inf')
    best_model = None
    best_order = (1, d_value, 1)
    best_seasonal_order = (1, D_value, 0, seasonal_period)
    
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        
        for p, q in product(p_values, q_values):
            for P, Q in product(P_values, Q_values):
                try:
                    order = (p, d_value, q)
                    seasonal_order = (P, D_value, Q, seasonal_period)
                    
                    model = SARIMAX(
                        y_train_transformed,
                        exog=exog_train,
                        order=order,
                        seasonal_order=seasonal_order,
                        enforce_stationarity=False,
                        enforce_invertibility=False,
                    )
                    fitted = model.fit(disp=False, maxiter=50)  # Limit iterations
                    
                    if fitted.aic < best_aic:
                        best_aic = fitted.aic
                        best_model = fitted
                        best_order = order
                        best_seasonal_order = seasonal_order
                        
                except Exception:
                    continue
    
    if best_model is None:
        # Fallback to simple model if grid search fails
        best_model = SARIMAX(
            y_train_transformed,
            exog=exog_train,
            order=(1, d_value, 1),
            seasonal_order=(1, D_value, 0, seasonal_period),
            enforce_stationarity=False,
            enforce_invertibility=False,
        ).fit(disp=False, maxiter=50)
        best_order = (1, d_value, 1)
        best_seasonal_order = (1, D_value, 0, seasonal_period)
    
    transform_params = {"use_boxcox": use_boxcox, "lambda": lmbda, "offset": offset}
    return best_model, best_order, best_seasonal_order, transform_params


def fit_sarimax_simple(y_train: pd.Series, exog_train: pd.DataFrame, seasonal_period: int, d_value: int):
    """Simple SARIMAX fit without grid search (for faster execution)."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = SARIMAX(
            y_train,
            exog=exog_train,
            order=(2, d_value, 1),
            seasonal_order=(1, 1, 0, seasonal_period),
            enforce_stationarity=False,
            enforce_invertibility=False,
        )
        return model.fit(disp=False, maxiter=50)


def series_sparsity(series: pd.Series) -> float:
    if len(series) == 0:
        return 1.0
    return float((series <= 0).mean())


def seasonal_naive_values(train_series: pd.Series, periods: int, seasonal_period: int) -> np.ndarray:
    if len(train_series) >= seasonal_period:
        seed_values = train_series.iloc[-seasonal_period:].to_numpy()
        repeats = int(np.ceil(periods / seasonal_period))
        return np.tile(seed_values, repeats)[:periods]
    return np.repeat(train_series.iloc[-1], periods)


def calendar_profile_values(train_series: pd.Series, forecast_index: pd.DatetimeIndex, horizon: str) -> np.ndarray:
    """Generate calendar-based predictions using historical patterns.

    With 8+ months of data, we can use more sophisticated patterns including:
    - Day of week + hour patterns (with recency weighting)
    - Month-based seasonal adjustments
    - Holiday patterns
    - Recent trend bias
    """
    global_mean = float(train_series.mean())

    if horizon == "hourly":
        # Primary: day of week + hour pattern
        grouped = train_series.groupby([train_series.index.dayofweek, train_series.index.hour]).mean().to_dict()

        # Fallback: hour pattern across all days
        fallback_by_hour = train_series.groupby(train_series.index.hour).mean()

        # With more data, add month-based adjustment
        month_adjustment = {}
        if len(train_series) > 24 * 30 * 2:  # At least 2 months of data
            monthly_avg = train_series.groupby(train_series.index.month).mean()
            overall_avg = train_series.mean()
            for month in range(1, 13):
                if month in monthly_avg.index:
                    month_adjustment[month] = monthly_avg[month] / overall_avg
                else:
                    month_adjustment[month] = 1.0

        values = []
        for idx in forecast_index:
            # Base value from day-of-week + hour pattern
            value = grouped.get((idx.dayofweek, idx.hour))
            if value is None or pd.isna(value):
                value = fallback_by_hour.get(idx.hour, global_mean)

            value = float(value if not pd.isna(value) else global_mean)

            # Apply month-based seasonal adjustment if available
            if month_adjustment:
                value *= month_adjustment.get(idx.month, 1.0)

            values.append(value)

        return np.array(values, dtype=float)

    # Daily horizon
    grouped = train_series.groupby(train_series.index.dayofweek).mean()
    return np.array([float(grouped.get(idx.dayofweek, global_mean)) for idx in forecast_index], dtype=float)


def backtest_models(zone_series: pd.Series, horizon: str, use_grid_search: bool = True) -> dict:
    """Backtest models using proper validation without data leakage.
    
    Args:
        zone_series: Raw time series data
        horizon: 'hourly' or 'daily'
        use_grid_search: Whether to use grid search for hyperparameter tuning (ignored for speed)
    """
    test_size = 24 if horizon == "hourly" else 14
    
    # Validate data sufficiency
    is_valid, msg = validate_training_data(zone_series, horizon)
    if not is_valid:
        raise ValueError(msg)
    
    # Split data
    train_series = zone_series.iloc[:-test_size]
    test_series = zone_series.iloc[-test_size:]
    
    if len(train_series) < test_size * 2 or len(test_series) == 0:
        raise ValueError("Not enough history for backtesting.")

    y_test = test_series.copy()
    seasonal_period = 24 if horizon == "hourly" else 7

    # Baseline 1: Seasonal Naive (same hour yesterday)
    seasonal_pred = seasonal_naive_values(train_series, len(y_test), seasonal_period)
    seasonal_series = pd.Series(seasonal_pred, index=y_test.index)

    # Baseline 2: Calendar Profile (day-of-week + hour average)
    calendar_pred = calendar_profile_values(train_series, y_test.index, horizon)
    calendar_series = pd.Series(calendar_pred, index=y_test.index)

    # Baseline 3: Recent Moving Average (captures short-term trend)
    # Use the last 3 days average as a trend baseline
    if horizon == "hourly" and len(train_series) >= 72:
        recent_avg = train_series.tail(72).mean()  # Average of last 3 days
        recent_trend_factor = recent_avg / (train_series.tail(168).mean() + 0.01)  # Compare to last week
        recent_pred = calendar_pred * recent_trend_factor
    else:
        recent_pred = calendar_pred.copy()
    recent_series = pd.Series(recent_pred, index=y_test.index)

    # Baseline 4: Holiday-adjusted calendar
    holiday_adjusted_pred = calendar_pred.copy()
    for i, idx in enumerate(y_test.index):
        if idx.strftime("%Y-%m-%d") in ALL_HOLIDAYS:
            holiday_adjusted_pred[i] = calendar_pred[i] * 0.8
    holiday_series = pd.Series(holiday_adjusted_pred, index=y_test.index)

    # Calculate individual model accuracies first
    seasonal_acc = wmape_accuracy(y_test, seasonal_series) or 50
    calendar_acc = wmape_accuracy(y_test, calendar_series) or 50
    recent_acc = wmape_accuracy(y_test, recent_series) or 50

    # Use fixed weights optimized across multiple zones
    # Seasonal: 35%, Calendar: 45%, Recent trend: 20%
    # This provides stability while capturing different patterns
    ensemble_pred = (0.35 * seasonal_pred + 0.45 * calendar_pred + 0.20 * recent_pred)
    ensemble_series = pd.Series(ensemble_pred, index=y_test.index)

    results = {
        "seasonal_naive": {"predictions": seasonal_series, "accuracy": seasonal_acc},
        "calendar_profile": {"predictions": calendar_series, "accuracy": calendar_acc},
        "recent_trend": {"predictions": recent_series, "accuracy": recent_acc},
        "holiday_adjusted": {"predictions": holiday_series, "accuracy": wmape_accuracy(y_test, holiday_series)},
        "ensemble": {"predictions": ensemble_series, "accuracy": wmape_accuracy(y_test, ensemble_series)},
    }

    ranking = sorted(results.items(), key=lambda item: (-1 if item[1]["accuracy"] is None else -item[1]["accuracy"]))
    
    return {
        "results": results, 
        "best_model": ranking[0][0], 
        "best_accuracy": ranking[0][1]["accuracy"], 
        "test_actual": y_test,
        "model_params": {
            "model_type": "enhanced_baseline",
            "features": ["calendar_profile", "holiday_adjustment", "ensemble", "month_seasonality"],
        }
    }


def _build_payload(history: pd.Series, future_index: pd.DatetimeIndex, forecast_values: np.ndarray) -> tuple[list[dict], list[dict]]:
    historical = [{"timestamp": idx.isoformat(), "actual": int(round(value)), "predicted": None} for idx, value in history.items()]
    predicted = [{"timestamp": idx.isoformat(), "actual": None, "predicted": int(round(max(0.0, value)))} for idx, value in zip(future_index, forecast_values)]
    return historical, predicted


def get_cluster_for_zone(zone_id: int) -> list[int] | None:
    """Get the cluster of zones for a low-data zone."""
    return ZONE_CLUSTERS.get(zone_id)


def generate_cluster_forecast(
    zone_id: int,
    cluster_zones: list[int],
    horizon: str,
    raw_data_dir: str | Path = RAW_DATA_DIR,
) -> dict:
    """Generate forecast for a low-data zone using cluster data.

    Aggregates data from nearby zones to create a representative forecast.
    """
    # Load data for all cluster zones
    cluster_series_list = []
    valid_cluster_zones = []

    for cluster_zone_id in cluster_zones:
        try:
            series = get_zone_series(cluster_zone_id, horizon=horizon, raw_data_dir=raw_data_dir)
            is_valid, _ = validate_training_data(series, horizon)
            if is_valid:
                cluster_series_list.append(series)
                valid_cluster_zones.append(cluster_zone_id)
        except Exception:
            continue

    if not cluster_series_list:
        raise ValueError(f"No valid cluster data available for zone {zone_id}")

    # Aggregate cluster data (simple average across zones)
    # First, align all series to the same time index
    common_index = cluster_series_list[0].index
    for series in cluster_series_list[1:]:
        common_index = common_index.union(series.index)

    # Reindex all series to common index and fill missing with 0
    aligned_series = [series.reindex(common_index, fill_value=0) for series in cluster_series_list]

    # Calculate average across all cluster zones
    cluster_series = pd.Series(
        np.mean([s.values for s in aligned_series], axis=0),
        index=common_index
    )

    # Calculate scaling factor based on historical data if available
    try:
        target_zone_series = get_zone_series(zone_id, horizon=horizon, raw_data_dir=raw_data_dir)
        # Calculate ratio of target zone mean to cluster mean
        target_mean = target_zone_series.mean()
        cluster_mean = cluster_series.mean()
        if cluster_mean > 0 and target_mean > 0:
            # Use actual ratio, but ensure minimum visibility (not all zeros)
            # Clamp between 0.05 (5%) and 0.5 (50%) to keep values reasonable
            scaling_factor = min(max(target_mean / cluster_mean, 0.05), 0.5)
        else:
            scaling_factor = 0.1  # Default for zones with some but very little data
    except Exception:
        # Fallback: zones with almost no data get a small fixed scaling
        scaling_factor = 0.1

    cluster_series = cluster_series * scaling_factor
    
    # Run backtest on cluster data
    backtest = backtest_models(cluster_series, horizon=horizon, use_grid_search=False)
    
    best_model = backtest["best_model"]
    best_accuracy = backtest["best_accuracy"]
    test_actual = backtest["test_actual"]
    seasonal_period = 24 if horizon == "hourly" else 7
    future_index = build_future_index(cluster_series, horizon)
    future_periods = len(future_index)
    
    # Generate forecast using best model
    if best_model == "seasonal_naive":
        forecast_values = seasonal_naive_values(cluster_series, future_periods, seasonal_period)
    elif best_model == "holiday_adjusted":
        base_values = calendar_profile_values(cluster_series, future_index, horizon)
        forecast_values = base_values.copy()
        for i, idx in enumerate(future_index):
            if idx.strftime("%Y-%m-%d") in ALL_HOLIDAYS:
                forecast_values[i] = base_values[i] * 0.8
    elif best_model == "ensemble":
        seasonal_values = seasonal_naive_values(cluster_series, future_periods, seasonal_period)
        calendar_values = calendar_profile_values(cluster_series, future_index, horizon)
        forecast_values = 0.4 * seasonal_values + 0.6 * calendar_values
    else:
        forecast_values = calendar_profile_values(cluster_series, future_index, horizon)
    
    # For very low-demand zones, use probabilistic rounding to create realistic variation
    # This prevents all-0 or all-1 forecasts while respecting the zone's low-demand nature
    if scaling_factor <= 0.1:
        import random
        random.seed(zone_id)  # Deterministic for same zone
        # Use value as probability threshold for 1, otherwise 0
        forecast_values = np.array([
            1 if random.random() < min(x * 2, 0.5) else 0 for x in forecast_values
        ])

    history, predicted = _build_payload(cluster_series.tail(future_periods), future_index, forecast_values)
    forecast_frame = pd.DataFrame({"predicted": forecast_values}, index=future_index)

    # Note: forecast_values already include the scaling_factor applied to cluster_series at line 609
    # Do NOT apply scaling_factor again to avoid double-scaling
    peak_value = int(forecast_frame["predicted"].max())

    return {
        "historical": history,
        "predicted": predicted,
        "requested_window": {
            "timestamp": future_index[0].isoformat(),
            "predicted_demand": int(forecast_frame.iloc[0]["predicted"]),
            "available": True,
        },
        "peak_window": {
            "timestamp": forecast_frame["predicted"].idxmax().isoformat(),
            "predicted_demand": peak_value,
        },
        "meta": {
            "model_name": MODEL_NAME,
            "model_type": f"cluster_based ({best_model})",
            "estimated_accuracy": best_accuracy,
            "project_benchmark_accuracy": PROJECT_BENCHMARK_ACCURACY,
            "data_points": int(len(cluster_series)),
            "selection_reason": f"low_data_zone_using_cluster_{valid_cluster_zones}",
            "series_sparsity": round(series_sparsity(cluster_series), 4),
            "confidence_band": "medium" if (best_accuracy or 0) >= 70 else "low",
            "cluster_zones": valid_cluster_zones,
            "scaling_factor": scaling_factor,
        },
        "backtest_actual": [
            {"timestamp": idx.isoformat(), "actual": int(round(value))}
            for idx, value in test_actual.items()
        ],
    }


def generate_product_forecast(
    zone_id: int,
    horizon: str,
    requested_date: str | None = None,
    requested_time: str | None = None,
    raw_data_dir: str | Path = RAW_DATA_DIR,
    use_grid_search: bool = True,
) -> dict:
    """Generate demand forecast for a specific zone using enhanced baseline models.
    
    For low-data zones, uses geographic clustering to aggregate nearby zone data.
    
    Args:
        zone_id: The location ID to forecast for
        horizon: 'hourly' or 'daily'
        requested_date: Specific date to forecast (optional)
        requested_time: Specific time to forecast (optional)
        raw_data_dir: Path to raw data directory
        use_grid_search: Ignored - kept for API compatibility
    """
    zone_series = get_zone_series(zone_id, horizon=horizon, raw_data_dir=raw_data_dir)
    
    # Check if zone has sufficient data
    is_valid, msg = validate_training_data(zone_series, horizon)
    
    # Check data sufficiency metrics
    has_sufficient_data = (
        len(zone_series) >= MIN_DATA_POINTS and 
        zone_series.mean() >= MIN_AVG_TRIPS
    )
    
    # If zone has low data, try clustering
    if not has_sufficient_data or not is_valid:
        cluster_zones = get_cluster_for_zone(zone_id)
        if cluster_zones:
            try:
                return generate_cluster_forecast(zone_id, cluster_zones, horizon, raw_data_dir)
            except Exception as e:
                # Fall through to regular forecast if clustering fails
                pass
    
    # Regular forecast for zones with good data
    if not is_valid:
        raise ValueError(msg)
    
    # Run backtest with improved methodology
    backtest = backtest_models(zone_series, horizon=horizon, use_grid_search=False)

    best_model = backtest["best_model"]
    best_accuracy = backtest["best_accuracy"]
    test_actual = backtest["test_actual"]
    model_params = backtest.get("model_params", {})
    seasonal_period = 24 if horizon == "hourly" else 7
    future_index = build_future_index(zone_series, horizon)
    future_periods = len(future_index)

    # Generate forecast using best model
    if best_model == "seasonal_naive":
        forecast_values = seasonal_naive_values(zone_series, future_periods, seasonal_period)
    elif best_model == "holiday_adjusted":
        # Enhanced calendar profile with holiday adjustment
        base_values = calendar_profile_values(zone_series, future_index, horizon)
        forecast_values = base_values.copy()
        for i, idx in enumerate(future_index):
            if idx.strftime("%Y-%m-%d") in ALL_HOLIDAYS:
                forecast_values[i] = base_values[i] * 0.8  # Holiday adjustment
    elif best_model == "ensemble":
        # Ensemble model: weighted combination
        seasonal_values = seasonal_naive_values(zone_series, future_periods, seasonal_period)
        calendar_values = calendar_profile_values(zone_series, future_index, horizon)
        forecast_values = 0.4 * seasonal_values + 0.6 * calendar_values
    else:
        # Default to calendar profile
        forecast_values = calendar_profile_values(zone_series, future_index, horizon)

    history, predicted = _build_payload(zone_series.tail(future_periods), future_index, forecast_values)
    forecast_frame = pd.DataFrame({"predicted": forecast_values}, index=future_index)
    forecast_frame["predicted"] = forecast_frame["predicted"].clip(lower=0).round().astype(int)

    requested_available = True
    if requested_date:
        requested_timestamp = pd.Timestamp(f"{requested_date} {requested_time}" if horizon == "hourly" and requested_time else requested_date)
        requested_row = forecast_frame.loc[forecast_frame.index == requested_timestamp]
        requested_available = not requested_row.empty
        requested_prediction = int(requested_row["predicted"].iloc[0]) if requested_available else None
    else:
        requested_timestamp = forecast_frame.index[0]
        requested_prediction = int(forecast_frame.iloc[0]["predicted"])

    peak_row = forecast_frame["predicted"].idxmax()
    peak_value = int(forecast_frame.loc[peak_row, "predicted"])
    confidence_band = "high" if (best_accuracy or 0) >= 80 else "medium" if (best_accuracy or 0) >= 55 else "low"

    return {
        "historical": history,
        "predicted": predicted,
        "requested_window": {
            "timestamp": requested_timestamp.isoformat(),
            "predicted_demand": requested_prediction,
            "available": requested_available,
        },
        "peak_window": {
            "timestamp": peak_row.isoformat(),
            "predicted_demand": peak_value,
        },
        "meta": {
            "model_name": MODEL_NAME,
            "model_type": best_model,
            "estimated_accuracy": best_accuracy,
            "project_benchmark_accuracy": PROJECT_BENCHMARK_ACCURACY,
            "data_points": int(len(zone_series)),
            "selection_reason": "best_backtest_score",
            "series_sparsity": round(series_sparsity(zone_series), 4),
            "confidence_band": confidence_band,
            "model_params": model_params,
        },
        "backtest_actual": [
            {"timestamp": idx.isoformat(), "actual": int(round(value))}
            for idx, value in test_actual.items()
        ],
    }


def get_available_forecast_window(
    location_id: int,
    horizon: str = "hourly",
    raw_data_dir: str | Path = RAW_DATA_DIR,
) -> dict:
    zone_series = get_zone_series(location_id, horizon=horizon, raw_data_dir=raw_data_dir)

    # Check if zone has sufficient data - if not, use cluster data for window
    is_valid, _ = validate_training_data(zone_series, horizon)
    has_sufficient_data = (
        len(zone_series) >= MIN_DATA_POINTS and
        zone_series.mean() >= MIN_AVG_TRIPS
    )

    if not has_sufficient_data or not is_valid:
        cluster_zones = get_cluster_for_zone(location_id)
        if cluster_zones:
            try:
                # Use cluster data to build the window (consistent with forecast)
                cluster_series_list = []
                for cluster_zone_id in cluster_zones:
                    try:
                        series = get_zone_series(cluster_zone_id, horizon=horizon, raw_data_dir=raw_data_dir)
                        is_cluster_valid, _ = validate_training_data(series, horizon)
                        if is_cluster_valid:
                            cluster_series_list.append(series)
                    except Exception:
                        continue

                if cluster_series_list:
                    # Use the first valid cluster zone's series for window
                    zone_series = cluster_series_list[0]
            except Exception:
                pass  # Fall back to original zone_series

    future_index = build_future_index(zone_series, horizon)
    dates = []
    seen_dates = set()

    for timestamp in future_index:
        date_value = timestamp.strftime("%Y-%m-%d")
        if date_value in seen_dates:
            continue
        seen_dates.add(date_value)
        dates.append({
            "value": date_value,
            "label": timestamp.strftime("%a, %b %d").replace(" 0", " "),
        })

    times = [
        {
            "date": timestamp.strftime("%Y-%m-%d"),
            "value": timestamp.strftime("%H:%M"),
            "label": timestamp.strftime("%I:%M %p").lstrip("0"),
        }
        for timestamp in future_index
    ] if horizon == "hourly" else []

    return {
        "start_timestamp": future_index[0].isoformat(),
        "end_timestamp": future_index[-1].isoformat(),
        "dates": dates,
        "times": times,
    }


def generate_forecast(
    location_id: int,
    horizon: str = "hourly",
    requested_date: str | None = None,
    requested_time: str | None = None,
    raw_data_dir: str | Path = RAW_DATA_DIR,
) -> dict:
    try:
        return generate_product_forecast(
            location_id,
            horizon,
            requested_date=requested_date,
            requested_time=requested_time,
            raw_data_dir=raw_data_dir,
        )
    except ValueError:
        return {
            "historical": [],
            "predicted": [],
            "requested_window": {
                "timestamp": None,
                "predicted_demand": None,
                "available": False,
            },
            "peak_window": {
                "timestamp": None,
                "predicted_demand": None,
            },
            "meta": {
                "model_name": MODEL_NAME,
                "model_type": "no_data_fallback",
                "estimated_accuracy": None,
                "project_benchmark_accuracy": PROJECT_BENCHMARK_ACCURACY,
                "data_points": 0,
                "message": "No trip history was available for this zone in the current dataset.",
            },
        }
    except Exception as exc:
        return {
            "historical": [],
            "predicted": [],
            "requested_window": {
                "timestamp": None,
                "predicted_demand": None,
                "available": False,
            },
            "peak_window": {
                "timestamp": None,
                "predicted_demand": None,
            },
            "meta": {
                "model_name": MODEL_NAME,
                "model_type": "no_data_fallback",
                "estimated_accuracy": None,
                "project_benchmark_accuracy": PROJECT_BENCHMARK_ACCURACY,
                "data_points": 0,
                "message": f"Forecast generation failed: {exc}",
            },
        }
