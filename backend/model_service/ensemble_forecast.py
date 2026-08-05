"""
Ensemble Forecasting Module — Multi-model demand forecasting with automatic selection.

Models implemented:
  1. Holt-Winters ETS (Exponential Smoothing with Trend + Seasonality)
  2. Prophet (Meta) with exogenous regressors
  3. LightGBM with lag / rolling / Fourier temporal features + feature importance
  4. Weighted Ensemble with validation-based auto-selection

Designed as a drop-in replacement/upgrade for advanced_forecast.py.
The response format mirrors TaxiDemandForecaster so forecast_core.py can
integrate both paths transparently.
"""

import os
import logging
import pickle
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

import pandas as pd
import numpy as np
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from sklearn.metrics import mean_absolute_error, mean_squared_error
import warnings

warnings.filterwarnings("ignore")

# Prophet is optional — import gracefully so the rest of the module works without it.
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except Exception:  # pragma: no cover
    PROPHET_AVAILABLE = False
    Prophet = None

# LightGBM is optional — enable via `pip install lightgbm`
try:
    import lightgbm as lgbm
    LIGHTGBM_AVAILABLE = True
except Exception:  # pragma: no cover
    LIGHTGBM_AVAILABLE = False
    lgbm = None  # type: ignore

# Holidays library is already in requirements.
try:
    import holidays as _holidays
    HOLIDAYS_AVAILABLE = True
except Exception:  # pragma: no cover
    HOLIDAYS_AVAILABLE = False
    _holidays = None

from .advanced_forecast import TaxiDemandForecaster

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent


def _get_cache_dir(subdir: str) -> Path:
    """Cross-platform cache dir inside the system temp dir (writable in Docker/Lambda too)."""
    try:
        base = Path(tempfile.gettempdir()) / "demandsight_cache"
    except Exception:
        base = BASE_DIR / "_local_cache"
    p = base / subdir
    try:
        p.mkdir(exist_ok=True, parents=True)
    except Exception:
        p = BASE_DIR / "_local_cache" / subdir
        p.mkdir(exist_ok=True, parents=True)
    return p


CACHE_DIR = _get_cache_dir("ensemble")

MODEL_ORDER = [
    "ensemble",
    "lightgbm",
    "prophet",
    "sarimax_pro",
    "holt_winters",
    "seasonal_naive",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sanitize(v):
    if v is None or (isinstance(v, float) and not np.isfinite(v)):
        return 0.0
    return float(v)


def _wmape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    denom = np.sum(np.abs(y_true))
    if denom == 0:
        return 0.0
    return float(np.sum(np.abs(y_true - y_pred)) / denom * 100.0)


def _safe_clip(y: np.ndarray) -> np.ndarray:
    return np.clip(np.nan_to_num(y, nan=0.0, posinf=0.0, neginf=0.0), 0.0, None)


def _make_holiday_series(idx: pd.DatetimeIndex, country: str = "US") -> pd.Series:
    """Return a 0/1 series flagging public holidays for the given index."""
    out = pd.Series(0, index=idx, dtype=np.int8)
    if not HOLIDAYS_AVAILABLE:
        return out
    try:
        hols = _holidays.CountryHoliday(country, years=sorted(set(idx.year)))
        for d in idx.date:
            if d in hols:
                out.loc[idx.date == d] = 1
    except Exception:
        pass
    return out


# ---------------------------------------------------------------------------
# Holt-Winters ETS
# ---------------------------------------------------------------------------

class HoltWintersForecaster:
    """Holt-Winters Triple Exponential Smoothing — fast, robust baseline."""

    name = "HoltWinters"
    model_type = "ets"

    def __init__(self, location_id: int):
        self.location_id = location_id
        self.model = None
        self.metrics: Dict[str, float] = {}
        self.is_trained = False
        self._train_end = None

    def train(self, ts: pd.Series) -> Dict[str, float]:
        if len(ts) < 48:
            logger.warning(f"[HW-{self.location_id}] Insufficient data: {len(ts)}")
            return {"error": "insufficient_data"}

        test_hours = min(168, len(ts) // 5)
        train_size = len(ts) - test_hours
        train = ts.iloc[:train_size].astype(float)
        test = ts.iloc[train_size:].astype(float)

        freq = ts.index.inferred_freq or "h"
        seasonal_periods = 24
        if len(train) < seasonal_periods * 2 + 5:
            seasonal_periods = 12 if len(train) > 30 else None

        try:
            trend_type = "add" if seasonal_periods else None
            seasonal_type = "add" if seasonal_periods else None
            self.model = ExponentialSmoothing(
                train,
                trend=trend_type,
                seasonal=seasonal_type,
                seasonal_periods=seasonal_periods or 2,
                initialization_method="estimated",
                freq=freq,
            ).fit(optimized=True, remove_bias=True)
        except Exception as exc:
            logger.warning(f"[HW-{self.location_id}] Fit failed ({exc}), retrying simple")
            try:
                self.model = ExponentialSmoothing(
                    train,
                    trend=None,
                    seasonal=None,
                    initialization_method="estimated",
                    freq=freq,
                ).fit(optimized=True)
            except Exception as exc2:
                return {"error": f"ets_fit_failed: {exc2}"}

        preds = self.model.forecast(steps=len(test)).values
        preds = _safe_clip(preds)
        test_arr = test.values.astype(float)

        self.metrics = {
            "mae": float(mean_absolute_error(test_arr, preds)),
            "rmse": float(np.sqrt(mean_squared_error(test_arr, preds))),
            "wmape": _wmape(test_arr, preds),
            "train_size": int(train_size),
            "test_size": int(test_hours),
        }
        self._train_end = ts.index[train_size - 1]

        # Refit on full data for production forecast
        try:
            full = ts.astype(float)
            seasonal_periods_full = 24 if len(full) >= 48 else None
            trend_full = "add" if seasonal_periods_full else None
            seasonal_full = "add" if seasonal_periods_full else None
            self.model = ExponentialSmoothing(
                full,
                trend=trend_full,
                seasonal=seasonal_full,
                seasonal_periods=seasonal_periods_full or 2,
                initialization_method="estimated",
                freq=freq,
            ).fit(optimized=True, remove_bias=True)
        except Exception:
            pass  # keep the partial-fit model as fallback

        self.is_trained = True
        logger.info(
            f"[HW-{self.location_id}] Trained. MAE={self.metrics['mae']:.2f}, "
            f"WMAPE={self.metrics['wmape']:.1f}%"
        )
        return self.metrics

    def predict(self, steps: int) -> np.ndarray:
        if not self.is_trained or self.model is None:
            raise ValueError("Model not trained")
        preds = self.model.forecast(steps=steps).values
        return _safe_clip(preds)


# ---------------------------------------------------------------------------
# Prophet Forecaster
# ---------------------------------------------------------------------------

class ProphetForecaster:
    """Prophet forecaster with holiday + weather-aware regressors."""

    name = "Prophet"
    model_type = "prophet"

    def __init__(self, location_id: int):
        self.location_id = location_id
        self.model = None
        self.metrics: Dict[str, float] = {}
        self.is_trained = False
        self._demand_profiles: Dict[Tuple[int, int], float] = {}
        self._has_precip = False

    def _build_regressor_frame(self, idx: pd.DatetimeIndex, precip_series: Optional[pd.Series] = None) -> pd.DataFrame:
        df = pd.DataFrame(index=idx)
        df["ds"] = idx
        df["hour"] = idx.hour.astype(int)
        df["dow"] = idx.dayofweek.astype(int)
        df["is_weekend"] = (idx.dayofweek >= 5).astype(int)

        if self._demand_profiles:
            df["profile_mean"] = [
                self._demand_profiles.get((int(r.dow), int(r.hour)), 0.0)
                for _, r in df.iterrows()
            ]
        else:
            df["profile_mean"] = 0.0

        df["holiday"] = _make_holiday_series(idx).values

        if precip_series is not None:
            df["precipitation"] = precip_series.reindex(idx, fill_value=0.0).values
            self._has_precip = True
        else:
            df["precipitation"] = 0.0
        return df

    def train(self, ts: pd.Series) -> Dict[str, float]:
        if not PROPHET_AVAILABLE:
            return {"error": "prophet_not_installed"}
        if len(ts) < 72:
            logger.warning(f"[Prophet-{self.location_id}] Insufficient data: {len(ts)}")
            return {"error": "insufficient_data"}

        # Build target-encoded demand profiles STRICTLY on training slice
        test_hours = min(168, len(ts) // 5)
        train_size = len(ts) - test_hours
        train_ts = ts.iloc[:train_size]
        test_ts = ts.iloc[train_size:]

        recent = train_ts.tail(min(len(train_ts), 24 * 90))
        tmp = pd.DataFrame({"val": recent})
        tmp["d"] = tmp.index.dayofweek
        tmp["h"] = tmp.index.hour
        self._demand_profiles = tmp.groupby(["d", "h"])["val"].mean().to_dict()

        train_df = self._build_regressor_frame(train_ts.index)
        train_df["y"] = train_ts.values.astype(float)

        test_df = self._build_regressor_frame(test_ts.index)

        try:
            self.model = Prophet(
                yearly_seasonality="auto" if len(ts) > 365 * 24 else False,
                weekly_seasonality=True,
                daily_seasonality=True,
                changepoint_prior_scale=0.05,
                seasonality_prior_scale=10.0,
                interval_width=0.9,
            )
            self.model.add_regressor("profile_mean", prior_scale=5.0, standardize=False, mode="additive")
            self.model.add_regressor("holiday", prior_scale=5.0, standardize=False, mode="additive")
            self.model.add_regressor("precipitation", prior_scale=2.0, standardize=True, mode="additive")
            self.model.fit(train_df[["ds", "y", "profile_mean", "holiday", "precipitation"]])
        except Exception as exc:
            logger.warning(f"[Prophet-{self.location_id}] Fit failed: {exc}")
            return {"error": f"prophet_fit_failed: {exc}"}

        # Evaluate on test slice
        try:
            forecast = self.model.predict(test_df[["ds", "profile_mean", "holiday", "precipitation"]])
            preds = _safe_clip(forecast["yhat"].values)
            actual = test_ts.values.astype(float)
            self.metrics = {
                "mae": float(mean_absolute_error(actual, preds)),
                "rmse": float(np.sqrt(mean_squared_error(actual, preds))),
                "wmape": _wmape(actual, preds),
                "train_size": int(train_size),
                "test_size": int(test_hours),
            }
        except Exception as exc:
            logger.warning(f"[Prophet-{self.location_id}] Eval failed: {exc}")
            self.metrics = {
                "mae": float("nan"),
                "rmse": float("nan"),
                "wmape": float("nan"),
                "train_size": int(train_size),
                "test_size": int(test_hours),
            }

        # Refit on the full dataset
        try:
            full_df = self._build_regressor_frame(ts.index)
            full_df["y"] = ts.values.astype(float)
            self.model = Prophet(
                yearly_seasonality="auto" if len(ts) > 365 * 24 else False,
                weekly_seasonality=True,
                daily_seasonality=True,
                changepoint_prior_scale=0.05,
                seasonality_prior_scale=10.0,
                interval_width=0.9,
            )
            self.model.add_regressor("profile_mean", prior_scale=5.0, standardize=False, mode="additive")
            self.model.add_regressor("holiday", prior_scale=5.0, standardize=False, mode="additive")
            self.model.add_regressor("precipitation", prior_scale=2.0, standardize=True, mode="additive")
            self.model.fit(full_df[["ds", "y", "profile_mean", "holiday", "precipitation"]])
        except Exception:
            pass

        self.is_trained = True
        logger.info(
            f"[Prophet-{self.location_id}] Trained. MAE={_sanitize(self.metrics.get('mae')):.2f}, "
            f"WMAPE={_sanitize(self.metrics.get('wmape')):.1f}%"
        )
        return self.metrics

    def predict(self, steps: int, last_ts: pd.Timestamp) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        if not PROPHET_AVAILABLE:
            raise RuntimeError("prophet not installed")
        if not self.is_trained or self.model is None:
            raise ValueError("Model not trained")

        future_idx = pd.date_range(start=last_ts + pd.Timedelta(hours=1), periods=steps, freq="h")
        future_df = self._build_regressor_frame(future_idx)

        forecast = self.model.predict(future_df[["ds", "profile_mean", "holiday", "precipitation"]])
        yhat = _safe_clip(forecast["yhat"].values)
        lower = _safe_clip(forecast["yhat_lower"].values)
        upper = _safe_clip(forecast["yhat_upper"].values)
        return yhat, lower, upper


# ---------------------------------------------------------------------------
# LightGBM Gradient Boosted Tree Forecaster
# ---------------------------------------------------------------------------

class LightGBMForecaster:
    """
    Time-series-as-supervised gradient boosting forecaster using LightGBM.

    Feature family:
      - Lag features:    t-1h, t-2h, t-3h, t-6h, t-12h, t-24h, t-48h, t-168h
      - Rolling stats:   6h/24h/72h/168h rolling mean + std
      - Temporal:        hour, day-of-week, weekend, week-of-year, month, hour×dow
      - Fourier:         sin/cos pairs for daily (24h) + weekly (168h) cycles
      - Profile:         target-encoded (dow, hour) profile mean from training slice
      - Calendars:       holiday flag, day-of-year linear trend
    """

    name = "LightGBM"
    model_type = "lightgbm"

    LAG_HOURS = [1, 2, 3, 6, 12, 24, 48, 168]
    ROLL_WINDOWS = [6, 24, 72, 168]
    FOURIER_PERIODS = [(24, 3), (168, 4)]  # (period_hours, fourier_order)

    def __init__(self, location_id: int):
        self.location_id = location_id
        self.model = None
        self.feature_names_: List[str] = []
        self.metrics: Dict[str, float] = {}
        self.feature_importance_: Dict[str, float] = {}
        self.is_trained = False
        self._demand_profiles: Dict[Tuple[int, int], float] = {}
        self._last_train_ts: pd.Series = pd.Series(dtype=float)
        self._n_estimators = 500

    # --------------------------------------------------------------
    # Feature engineering
    # --------------------------------------------------------------
    def _add_temporal(self, df: pd.DataFrame, idx: pd.DatetimeIndex) -> None:
        df["hour"] = idx.hour.astype(np.int16)
        df["dow"] = idx.dayofweek.astype(np.int16)
        df["is_weekend"] = (idx.dayofweek >= 5).astype(np.int8)
        df["week_of_year"] = idx.isocalendar().week.astype(np.int16)
        df["month"] = idx.month.astype(np.int16)
        df["hour_x_dow"] = (df["hour"].astype(np.int32) * 10 + df["dow"].astype(np.int32)).astype(np.int32)
        df["day_of_year"] = idx.dayofyear.astype(np.int16)
        df["holiday"] = _make_holiday_series(idx).values.astype(np.int8)

    def _add_fourier(self, df: pd.DataFrame, idx: pd.DatetimeIndex) -> None:
        t_numeric = np.arange(len(idx), dtype=np.float64)
        for period, order in self.FOURIER_PERIODS:
            for k in range(1, order + 1):
                df[f"s_p{period}_k{k}"] = np.sin(2 * np.pi * k * t_numeric / period).astype(np.float32)
                df[f"c_p{period}_k{k}"] = np.cos(2 * np.pi * k * t_numeric / period).astype(np.float32)

    def _add_profile(self, df: pd.DataFrame, idx: pd.DatetimeIndex) -> None:
        if not self._demand_profiles:
            df["profile_mean"] = 0.0
            return
        pairs = np.array([(d, h) for d, h in zip(idx.dayofweek, idx.hour)])
        vals = np.array([self._demand_profiles.get((int(d), int(h)), 0.0) for d, h in pairs])
        df["profile_mean"] = vals.astype(np.float32)

    def _add_lags_and_roll(self, df: pd.DataFrame, series: pd.Series) -> None:
        """In-place lag + rolling feature columns. Caller must ensure index alignment."""
        s = series.astype(np.float64)
        # Lags
        for h in self.LAG_HOURS:
            lagged = s.shift(h).reindex(df.index).values.astype(np.float64)
            df[f"lag_{h}h"] = lagged
        # Rolling mean + std
        for w in self.ROLL_WINDOWS:
            df[f"roll{w}_mean"] = s.rolling(window=w, min_periods=max(2, w // 4)).mean().reindex(df.index).values.astype(np.float64)
            df[f"roll{w}_std"] = s.rolling(window=w, min_periods=max(2, w // 4)).std().reindex(df.index).values.astype(np.float64)
            # Guard against NaNs (early rows with insufficient history)
            df[f"roll{w}_std"] = np.nan_to_num(df[f"roll{w}_std"].values.astype(np.float64), nan=0.0).astype(np.float64)

    def _build_features(
        self,
        ts: pd.Series,
        future_steps: int = 0,
        exog_precip: Optional[pd.Series] = None,
    ) -> Any:
        """
        Build features for training + optional future prediction rows.

        For training (future_steps=0):
          Returns (X: DataFrame, y_array: 1d-array, None)

        For future predictions (future_steps>0):
          Returns (X_future: DataFrame, preds: array, lower: array, upper: array, future_idx: DatetimeIndex)
          Uses iterative 1-step forecast feeding predictions back into lags for multi-step rollout.
        """
        if future_steps == 0:
            work_idx = ts.index
            y_full = ts.values.astype(np.float64)

            df = pd.DataFrame(index=work_idx)
            self._add_temporal(df, work_idx)
            self._add_fourier(df, work_idx)
            self._add_profile(df, work_idx)
            self._add_lags_and_roll(df, ts)

            # Drop rows where any lag/roll feature is NaN (first 168 rows don't have weekly lag)
            first_valid = max(self.LAG_HOURS)
            if len(df) > first_valid:
                df = df.iloc[first_valid:]
                y = y_full[first_valid:]
            else:
                y = y_full
            # Drop any remaining NaN rows
            mask = df.isna().any(axis=1).values
            if mask.any():
                keep = ~mask
                df = df.loc[keep]
                y = y[keep]
            self.feature_names_ = list(df.columns)
            return df, y, None

        # Future-only prediction with iterative rollout
        last_ts_val = ts.index[-1]
        future_idx = pd.date_range(start=last_ts_val + pd.Timedelta(hours=1), periods=future_steps, freq="h")
        all_idx = ts.index.append(future_idx)
        extended = pd.Series(np.concatenate([ts.values.astype(np.float64), np.zeros(future_steps, dtype=np.float64)]), index=all_idx)

        # Build the full feature matrix (training+future rows) to get feature alignment
        # We'll overwrite lag values iteratively as we forecast each step.
        all_df = pd.DataFrame(index=all_idx)
        self._add_temporal(all_df, all_idx)
        self._add_fourier(all_df, all_idx)
        self._add_profile(all_df, all_idx)
        # Compute lags and rolling stats using actuals for the training portion;
        # we'll fill future lag slots step-by-step via iterative forecast
        self._add_lags_and_roll(all_df, extended)

        feature_cols = self.feature_names_
        future_df = all_df.loc[future_idx, feature_cols].copy()
        # Iterative multi-step rollout — step-by-step feeding predictions into lags
        extended_local = extended.copy()
        # Track residuals on last 24h for uncertainty band
        train_preds = self.model.predict(all_df.loc[ts.index, feature_cols].fillna(0.0)) if len(self.feature_names_) else np.zeros(len(ts))
        resid_std = float(np.std(ts.values.astype(np.float64) - train_preds)) if len(train_preds) == len(ts) else 0.0
        if not np.isfinite(resid_std):
            resid_std = 0.0
        for step_i, fts in enumerate(future_idx):
            # Refresh the lag features for this row based on current extended_local series
            row_features = {}
            hour_i = fts.hour
            dow_i = fts.dayofweek
            row_features["hour"] = hour_i
            row_features["dow"] = dow_i
            row_features["is_weekend"] = 1 if dow_i >= 5 else 0
            row_features["week_of_year"] = fts.isocalendar().week
            row_features["month"] = fts.month
            row_features["hour_x_dow"] = hour_i * 10 + dow_i
            row_features["day_of_year"] = fts.dayofyear
            row_features["holiday"] = int(_make_holiday_series(pd.DatetimeIndex([fts])).iloc[0])
            t_position = len(ts) + step_i
            for period, order in self.FOURIER_PERIODS:
                for k in range(1, order + 1):
                    row_features[f"s_p{period}_k{k}"] = np.sin(2 * np.pi * k * t_position / period)
                    row_features[f"c_p{period}_k{k}"] = np.cos(2 * np.pi * k * t_position / period)
            row_features["profile_mean"] = self._demand_profiles.get((int(dow_i), int(hour_i)), 0.0)
            # Lags: extended_local[0..(len(ts)-1+step_i)] are actuals+predictions so far
            for h in self.LAG_HOURS:
                lag_index_in_extended = (len(ts) + step_i) - h
                if lag_index_in_extended >= 0 and lag_index_in_extended < len(extended_local):
                    row_features[f"lag_{h}h"] = float(extended_local.iloc[lag_index_in_extended])
                else:
                    row_features[f"lag_{h}h"] = 0.0
            # Rolling features using current extended_local up to this step
            hist = extended_local.iloc[: len(ts) + step_i]
            for w in self.ROLL_WINDOWS:
                n = min(w, len(hist))
                if n >= 2:
                    tail = hist.tail(n)
                    row_features[f"roll{w}_mean"] = float(tail.mean())
                    row_features[f"roll{w}_std"] = float(tail.std()) if n > 1 else 0.0
                else:
                    row_features[f"roll{w}_mean"] = 0.0
                    row_features[f"roll{w}_std"] = 0.0
            # Predict 1 step
            row_arr = np.array([[float(row_features[c]) for c in feature_cols]], dtype=np.float32)
            row_arr = np.nan_to_num(row_arr, nan=0.0, posinf=0.0, neginf=0.0)
            pred = float(self.model.predict(row_arr)[0])
            pred = max(0.0, pred)
            # Write the future prediction back into extended_local for subsequent lags
            extended_local.iloc[len(ts) + step_i] = pred
            # Write the refreshed row features into future_df for traceability
            for c in feature_cols:
                future_df.at[fts, c] = row_features.get(c, future_df.at[fts, c])

        preds_future = extended_local.iloc[len(ts) :].values.astype(np.float64)
        # Build expanding residual-based CI
        ci_scale = np.linspace(1.0, 1.8, future_steps)
        resid_std = max(resid_std, 1e-3)
        lower = _safe_clip(preds_future - ci_scale * resid_std)
        upper = preds_future + ci_scale * resid_std
        return future_df, preds_future, lower, upper, future_idx

    # --------------------------------------------------------------
    # Train / predict
    # --------------------------------------------------------------
    def train(self, ts: pd.Series) -> Dict[str, Any]:
        if not LIGHTGBM_AVAILABLE:
            return {"error": "lightgbm_not_installed"}
        if len(ts) < 24 * 14:
            logger.warning(f"[LGBM-{self.location_id}] Insufficient data: {len(ts)} < 336 hours")
            return {"error": "insufficient_data"}

        test_hours = min(168, len(ts) // 5)
        train_size = len(ts) - test_hours
        train_ts = ts.iloc[:train_size]
        test_ts = ts.iloc[train_size:]

        # Profiles: strict target-encode from training only
        recent = train_ts.tail(min(len(train_ts), 24 * 90))
        tmp = pd.DataFrame({"val": recent})
        tmp["d"] = tmp.index.dayofweek
        tmp["h"] = tmp.index.hour
        self._demand_profiles = tmp.groupby(["d", "h"])["val"].mean().to_dict()

        # Build training features on full train+test (lags need the history)
        # Then split by index
        all_X, all_y, _ = self._build_features(ts)
        # Split on index boundary
        train_mask = all_X.index <= train_ts.index[-1]
        test_mask = ~train_mask & (all_X.index <= test_ts.index[-1])
        if train_mask.sum() < 100 or test_mask.sum() < 24:
            return {"error": "insufficient_rows_after_feature_build"}

        X_train = all_X.loc[train_mask].fillna(0.0)
        y_train = all_y[train_mask]
        X_test = all_X.loc[test_mask].fillna(0.0)
        y_test = all_y[test_mask]
        self.feature_names_ = list(X_train.columns)

        try:
            self.model = lgbm.LGBMRegressor(
                n_estimators=self._n_estimators,
                learning_rate=0.05,
                num_leaves=63,
                max_depth=-1,
                min_child_samples=40,
                subsample=0.9,
                colsample_bytree=0.8,
                reg_alpha=0.1,
                reg_lambda=0.1,
                random_state=42,
                verbose=-1,
            )
            self.model.fit(
                X_train,
                y_train,
                eval_set=[(X_test, y_test)],
                callbacks=[lgbm.early_stopping(30, verbose=False)],
            )
        except TypeError:
            # Older LightGBM versions
            self.model = lgbm.LGBMRegressor(
                n_estimators=self._n_estimators,
                learning_rate=0.05,
                num_leaves=63,
                max_depth=-1,
                min_child_samples=40,
                subsample=0.9,
                colsample_bytree=0.8,
                reg_alpha=0.1,
                reg_lambda=0.1,
                random_state=42,
                verbose=-1,
            )
            self.model.fit(X_train, y_train)
        except Exception as exc:
            logger.warning(f"[LGBM-{self.location_id}] Fit failed: {exc}")
            return {"error": f"lightgbm_fit_failed: {exc}"}

        preds = _safe_clip(self.model.predict(X_test))
        self.metrics = {
            "mae": float(mean_absolute_error(y_test, preds)),
            "rmse": float(np.sqrt(mean_squared_error(y_test, preds))),
            "wmape": _wmape(y_test, preds),
            "train_size": int(train_mask.sum()),
            "test_size": int(test_mask.sum()),
        }

        # Feature importance (gain-based if available, split otherwise)
        try:
            gain = self.model.booster_.feature_importance(importance_type="gain")
            norm_gain = gain / (gain.sum() + 1e-9)
            importance = dict(zip(self.feature_names_, [float(x) for x in norm_gain]))
            # Aggregate into feature groups for the UI
            groups: Dict[str, float] = {}
            for name, val in importance.items():
                if name.startswith("lag_"):
                    key = "recent_demand_lags"
                elif name.startswith("roll"):
                    key = "rolling_statistics"
                elif name in ("hour", "dow", "is_weekend", "week_of_year", "month", "hour_x_dow", "day_of_year"):
                    key = "time_of_week_calendar"
                elif name in ("profile_mean",):
                    key = "historical_profile_mean"
                elif name in ("holiday",):
                    key = "holidays"
                elif name.startswith("s_p") or name.startswith("c_p"):
                    key = "fourier_seasonality"
                else:
                    key = "other"
                groups[key] = groups.get(key, 0.0) + float(val)
            self.feature_importance_ = {
                "per_feature": {k: round(v * 100.0, 3) for k, v in importance.items()},
                "grouped": {k: round(v * 100.0, 2) for k, v in groups.items()},
                "top_features": [
                    {"feature": name, "importance_pct": round(importance[name] * 100.0, 2)}
                    for name in sorted(importance, key=importance.get, reverse=True)[:15]
                ],
            }
        except Exception:
            self.feature_importance_ = {
                "per_feature": {},
                "grouped": {},
                "top_features": [],
            }

        # Refit on the full available dataset (train+eval combined) using best_iter
        try:
            best_iter = getattr(self.model, "best_iteration_", self._n_estimators) or self._n_estimators
            full_X_vals = all_X.fillna(0.0)
            full_y = all_y
            self.model = lgbm.LGBMRegressor(
                n_estimators=best_iter,
                learning_rate=0.05,
                num_leaves=63,
                max_depth=-1,
                min_child_samples=40,
                subsample=0.9,
                colsample_bytree=0.8,
                reg_alpha=0.1,
                reg_lambda=0.1,
                random_state=42,
                verbose=-1,
            )
            self.model.fit(full_X_vals, full_y)
        except Exception:
            pass  # keep validation-fit model

        self._last_train_ts = ts.copy()
        self.is_trained = True
        logger.info(
            f"[LGBM-{self.location_id}] Trained. MAE={self.metrics['mae']:.2f}, "
            f"WMAPE={self.metrics['wmape']:.1f}% | Features: {len(self.feature_names_)}"
        )
        return {**self.metrics, "feature_importance": self.feature_importance_["grouped"]}

    def predict(self, steps: int) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        if not LIGHTGBM_AVAILABLE:
            raise RuntimeError("lightgbm not installed")
        if not self.is_trained or self.model is None:
            raise ValueError("LightGBM not trained")
        if len(self._last_train_ts) == 0:
            raise ValueError("No training series for future rollout")
        _, preds, lower, upper, _ = self._build_features(self._last_train_ts, future_steps=steps)
        return _safe_clip(np.asarray(preds, dtype=np.float64)), np.asarray(lower, dtype=np.float64), np.asarray(upper, dtype=np.float64)


# ---------------------------------------------------------------------------
# Ensemble Engine
# ---------------------------------------------------------------------------

class EnsembleForecaster:
    """
    Weighted ensemble combining Holt-Winters, Prophet, LightGBM, and SARIMAX-Pro.

    Weights are derived from the inverse WMAPE on a recent holdout window so
    models that perform better for a given zone automatically contribute more.
    """

    name = "Ensemble"
    model_type = "weighted_ensemble"

    def __init__(self, location_id: int):
        self.location_id = location_id
        self.hw = HoltWintersForecaster(location_id)
        self.prophet = ProphetForecaster(location_id)
        self.lgbm = LightGBMForecaster(location_id)
        self.sarimax = TaxiDemandForecaster(location_id)

        self.weights: Dict[str, float] = {}
        self.model_metrics: Dict[str, Dict[str, float]] = {}
        self.is_trained = False
        self.selected_model: str = "ensemble"
        self.train_time_sec: float = 0.0
        self._cache_path = CACHE_DIR / f"ensemble_{location_id}.pkl"

    # ------------------------------------------------------------------
    # Training + weight computation
    # ------------------------------------------------------------------
    def train_all(self, ts: pd.Series) -> Dict[str, Any]:
        logger.info(f"[Ensemble-{self.location_id}] Training all models on {len(ts)} points...")
        t0 = datetime.now()

        results: Dict[str, Dict[str, float]] = {}

        # 1. Holt-Winters (always available, fastest — great baseline)
        logger.info(f"[Ensemble-{self.location_id}] Fitting Holt-Winters...")
        hw_res = self.hw.train(ts)
        results["holt_winters"] = hw_res

        # 2. LightGBM (optional dependency, fastest high-accuracy model)
        if LIGHTGBM_AVAILABLE:
            logger.info(f"[Ensemble-{self.location_id}] Fitting LightGBM...")
            lgb_res = self.lgbm.train(ts)
            # train() may return dict with feature_importance key for ensemble; extract metrics
            if isinstance(lgb_res, dict) and "error" not in lgb_res:
                results["lightgbm"] = {
                    "mae": float(lgb_res.get("mae", 0)),
                    "rmse": float(lgb_res.get("rmse", 0)),
                    "wmape": float(lgb_res.get("wmape", 0)),
                    "train_size": int(lgb_res.get("train_size", 0)),
                    "test_size": int(lgb_res.get("test_size", 0)),
                    "feature_importance_grouped": lgb_res.get("feature_importance", {}),
                }
            else:
                results["lightgbm"] = lgb_res if isinstance(lgb_res, dict) else {"error": str(lgb_res)}
        else:
            results["lightgbm"] = {"error": "lightgbm_not_installed"}

        # 3. Prophet (optional)
        if PROPHET_AVAILABLE:
            logger.info(f"[Ensemble-{self.location_id}] Fitting Prophet...")
            pr_res = self.prophet.train(ts)
            results["prophet"] = pr_res
        else:
            results["prophet"] = {"error": "prophet_not_installed"}

        # 4. SARIMAX-Pro (from advanced_forecast)
        logger.info(f"[Ensemble-{self.location_id}] Fitting SARIMAX-Pro...")
        sar_res = self.sarimax.train(ts)
        results["sarimax_pro"] = sar_res if isinstance(sar_res, dict) else {"error": str(sar_res)}

        # Compute normalized inverse-WMAPE weights
        self.model_metrics = results
        wmapes: Dict[str, float] = {}
        for key, res in results.items():
            if isinstance(res, dict) and "error" not in res:
                w = float(res.get("wmape", 0) or 0)
                if w <= 0:
                    w = 1e-3
                wmapes[key] = w

        self.weights = self._compute_weights(wmapes)

        # Pick "best single model" for the UI
        if wmapes:
            self.selected_model = min(wmapes, key=wmapes.get)
            if self.weights:
                avg_wmape = sum(
                    wmapes[k] * self.weights.get(k, 0.0) for k in wmapes if k in self.weights
                )
                if avg_wmape < wmapes[self.selected_model]:
                    self.selected_model = "ensemble"
        else:
            self.selected_model = "sarimax_pro"

        self.is_trained = True
        self.train_time_sec = (datetime.now() - t0).total_seconds()

        logger.info(
            f"[Ensemble-{self.location_id}] Done in {self.train_time_sec:.1f}s. "
            f"Weights={self.weights} | Selected={self.selected_model}"
        )
        self._save_cache()
        return {
            "weights": self.weights,
            "metrics": results,
            "selected_model": self.selected_model,
            "train_time_sec": self.train_time_sec,
            "feature_importance": self.lgbm.feature_importance_ if LIGHTGBM_AVAILABLE and self.lgbm.is_trained else {},
        }

    @staticmethod
    def _compute_weights(wmapes: Dict[str, float]) -> Dict[str, float]:
        if not wmapes:
            return {}
        inv = {k: 1.0 / max(v, 1e-3) for k, v in wmapes.items()}
        total = sum(inv.values())
        if total == 0:
            return {k: 1.0 / len(inv) for k in inv}
        weights = {k: round(v / total, 4) for k, v in inv.items()}
        # Ensure sum = 1 (account for rounding)
        diff = 1.0 - sum(weights.values())
        if weights and abs(diff) > 1e-6:
            top_key = max(weights, key=weights.get)
            weights[top_key] = round(weights[top_key] + diff, 4)
        return weights

    # ------------------------------------------------------------------
    # Prediction
    # ------------------------------------------------------------------
    def predict(
        self,
        steps: int,
        ts: Optional[pd.Series] = None,
    ) -> Dict[str, Any]:
        """Return predictions dict with per-model + weighted-ensemble outputs."""
        if not self.is_trained:
            raise ValueError("Ensemble not trained. Call train_all() first.")

        if ts is None or len(ts) == 0:
            raise ValueError("Time series is required to build future index")

        last_ts = ts.index[-1]
        future_idx = pd.date_range(start=last_ts + pd.Timedelta(hours=1), periods=steps, freq="h")

        outputs: Dict[str, np.ndarray] = {}
        ci_bounds: Dict[str, Tuple[np.ndarray, np.ndarray]] = {}

        # Holt-Winters
        if self.hw.is_trained:
            try:
                hw_preds = self.hw.predict(steps)
                outputs["holt_winters"] = hw_preds
                std = float(np.nanstd(hw_preds) or 1.0) * 0.15
                ci_bounds["holt_winters"] = (
                    _safe_clip(hw_preds - std * np.linspace(1.0, 1.5, steps)),
                    hw_preds + std * np.linspace(1.0, 1.5, steps),
                )
            except Exception as exc:
                logger.warning(f"[Ensemble-{self.location_id}] HW predict failed: {exc}")

        # Prophet
        if self.prophet.is_trained and PROPHET_AVAILABLE:
            try:
                pr_preds, pr_lo, pr_hi = self.prophet.predict(steps, last_ts)
                outputs["prophet"] = pr_preds
                ci_bounds["prophet"] = (pr_lo, pr_hi)
            except Exception as exc:
                logger.warning(f"[Ensemble-{self.location_id}] Prophet predict failed: {exc}")

        # LightGBM
        if self.lgbm.is_trained and LIGHTGBM_AVAILABLE:
            try:
                lgb_preds, lgb_lo, lgb_hi = self.lgbm.predict(steps)
                outputs["lightgbm"] = lgb_preds
                ci_bounds["lightgbm"] = (lgb_lo, lgb_hi)
            except Exception as exc:
                logger.warning(f"[Ensemble-{self.location_id}] LightGBM predict failed: {exc}")

        # SARIMAX-Pro
        if self.sarimax.is_trained:
            try:
                sar_df = self.sarimax.predict(future_idx, ts)
                sar_preds = sar_df["predicted"].values.astype(float)
                outputs["sarimax_pro"] = sar_preds
                ci_bounds["sarimax_pro"] = (
                    sar_df["confidence_lower"].values.astype(float),
                    sar_df["confidence_upper"].values.astype(float),
                )
            except Exception as exc:
                logger.warning(f"[Ensemble-{self.location_id}] SARIMAX predict failed: {exc}")

        if not outputs:
            raise RuntimeError("No models produced predictions")

        # Weighted combination (or single-model if only one available)
        weights_used = {k: self.weights.get(k, 0.0) for k in outputs}
        wsum = sum(weights_used.values())
        if wsum <= 0 or len(outputs) == 1:
            # Fall back to equal weights / best single model
            if self.selected_model in outputs:
                weights_used = {self.selected_model: 1.0}
            else:
                w = 1.0 / len(outputs)
                weights_used = {k: w for k in outputs}
        else:
            weights_used = {k: v / wsum for k, v in weights_used.items()}

        ensemble_preds = np.zeros(steps, dtype=float)
        for k, w in weights_used.items():
            ensemble_preds += w * outputs[k]

        # Ensemble CI: weighted average of individual CIs
        lo = np.zeros(steps, dtype=float)
        hi = np.zeros(steps, dtype=float)
        for k, w in weights_used.items():
            if k in ci_bounds:
                lo += w * ci_bounds[k][0]
                hi += w * ci_bounds[k][1]
        # If no CI info at all, use ±15% expanding band
        if not np.any(lo) and not np.any(hi):
            std = float(np.nanstd(ensemble_preds) or 1.0) * 0.15
            lo = _safe_clip(ensemble_preds - std * np.linspace(1.0, 1.5, steps))
            hi = ensemble_preds + std * np.linspace(1.0, 1.5, steps)

        return {
            "index": future_idx,
            "ensemble_predicted": ensemble_preds,
            "ensemble_lower": lo,
            "ensemble_upper": hi,
            "per_model": {k: v for k, v in outputs.items()},
            "weights_used": {k: round(v, 4) for k, v in weights_used.items()},
        }

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------
    def _save_cache(self):
        try:
            with open(self._cache_path, "wb") as f:
                pickle.dump(
                    {
                        "hw_model": self.hw.model,
                        "hw_metrics": self.hw.metrics,
                        "hw_trained": self.hw.is_trained,
                        "prophet_model": self.prophet.model if PROPHET_AVAILABLE else None,
                        "prophet_metrics": self.prophet.metrics,
                        "prophet_trained": self.prophet.is_trained,
                        "prophet_profiles": self.prophet._demand_profiles,
                        "lgbm_model": self.lgbm.model if LIGHTGBM_AVAILABLE else None,
                        "lgbm_metrics": self.lgbm.metrics,
                        "lgbm_trained": self.lgbm.is_trained,
                        "lgbm_profiles": self.lgbm._demand_profiles,
                        "lgbm_train_ts": self.lgbm._last_train_ts,
                        "lgbm_feature_names": self.lgbm.feature_names_,
                        "lgbm_feature_importance": self.lgbm.feature_importance_,
                        "sarimax_model": self.sarimax.model,
                        "sarimax_metrics": self.sarimax.metrics,
                        "sarimax_trained": self.sarimax.is_trained,
                        "sarimax_profiles": self.sarimax.demand_profiles,
                        "sarimax_exog": self.sarimax.exog_vars,
                        "sarimax_diff": self.sarimax.differencing_order,
                        "weights": self.weights,
                        "model_metrics": self.model_metrics,
                        "selected_model": self.selected_model,
                    },
                    f,
                )
            logger.info(f"[Ensemble-{self.location_id}] Saved cache")
        except Exception as exc:
            logger.warning(f"[Ensemble-{self.location_id}] Cache save failed: {exc}")

    def load_cache(self) -> bool:
        if not self._cache_path.exists():
            return False
        try:
            with open(self._cache_path, "rb") as f:
                data = pickle.load(f)
            self.hw.model = data.get("hw_model")
            self.hw.metrics = data.get("hw_metrics", {})
            self.hw.is_trained = bool(data.get("hw_trained", False))

            self.prophet.model = data.get("prophet_model")
            self.prophet.metrics = data.get("prophet_metrics", {})
            self.prophet.is_trained = bool(data.get("prophet_trained", False))
            self.prophet._demand_profiles = data.get("prophet_profiles", {})

            self.lgbm.model = data.get("lgbm_model")
            self.lgbm.metrics = data.get("lgbm_metrics", {})
            self.lgbm.is_trained = bool(data.get("lgbm_trained", False))
            self.lgbm._demand_profiles = data.get("lgbm_profiles", {})
            self.lgbm._last_train_ts = data.get("lgbm_train_ts", pd.Series(dtype=float))
            self.lgbm.feature_names_ = data.get("lgbm_feature_names", [])
            self.lgbm.feature_importance_ = data.get("lgbm_feature_importance", {})

            self.sarimax.model = data.get("sarimax_model")
            self.sarimax.metrics = data.get("sarimax_metrics", {})
            self.sarimax.is_trained = bool(data.get("sarimax_trained", False))
            self.sarimax.demand_profiles = data.get("sarimax_profiles", {})
            self.sarimax.exog_vars = data.get("sarimax_exog", self.sarimax.exog_vars)
            self.sarimax.differencing_order = data.get("sarimax_diff", 0)

            self.weights = data.get("weights", {})
            self.model_metrics = data.get("model_metrics", {})
            self.selected_model = data.get("selected_model", "sarimax_pro")
            self.is_trained = any(
                [
                    self.hw.is_trained,
                    self.prophet.is_trained,
                    self.lgbm.is_trained,
                    self.sarimax.is_trained,
                ]
            )
            logger.info(f"[Ensemble-{self.location_id}] Loaded cache")
            return self.is_trained
        except Exception as exc:
            logger.warning(f"[Ensemble-{self.location_id}] Cache load failed: {exc}")
            return False


# ---------------------------------------------------------------------------
# Public API (mirrors generate_advanced_forecast shape)
# ---------------------------------------------------------------------------

def generate_ensemble_forecast(
    location_id: int,
    ts: pd.Series,
    horizon: str = "hourly",
    periods: int = 24,
    requested_date: Optional[str] = None,
    requested_time: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Main entrypoint — produces a forecast using the weighted ensemble.
    Returns a dict with the same schema as generate_advanced_forecast() so it
    can be used as a drop-in replacement in forecast_core.py.
    """
    forecaster = EnsembleForecaster(location_id)
    if not forecaster.load_cache():
        train_res = forecaster.train_all(ts)
        if "error" in train_res:
            logger.error(f"Ensemble training failed for zone {location_id}: {train_res}")
            return None

    forecast_steps = periods if horizon == "hourly" else periods * 24
    try:
        preds = forecaster.predict(forecast_steps, ts)
    except Exception as exc:
        logger.error(f"Ensemble predict failed for zone {location_id}: {exc}")
        return None

    future_idx: pd.DatetimeIndex = preds["index"]
    ensemble = preds["ensemble_predicted"]
    lo = preds["ensemble_lower"]
    hi = preds["ensemble_upper"]

    # ---------- Build historical data ----------
    historical_data = []
    if horizon == "daily":
        for i in range(max(0, len(ts) - 168), len(ts), 24):
            chunk = ts.iloc[i:i + 24]
            if len(chunk):
                historical_data.append({
                    "timestamp": ts.index[i].isoformat(),
                    "actual": int(max(0, round(chunk.sum(), 2))),
                })
    else:
        for i in range(max(0, len(ts) - 24), len(ts)):
            historical_data.append({
                "timestamp": ts.index[i].isoformat(),
                "actual": int(max(0, round(ts.iloc[i], 2))),
            })

    # ---------- Build predicted data (hourly or daily aggregation) ----------
    baseline_avg = float(np.mean(ts)) if len(ts) else 1.0
    base_fare = 15.00

    predicted_rows: List[Dict[str, Any]] = []
    peak_demand = 0.0
    peak_timestamp = None

    if horizon == "daily":
        fdf = pd.DataFrame({
            "date": future_idx.date,
            "predicted": ensemble,
            "lower": lo,
            "upper": hi,
        })
        agg = fdf.groupby("date").agg({
            "predicted": "sum",
            "lower": "sum",
            "upper": "sum",
        }).reset_index()
        baseline_avg_daily = baseline_avg * 24.0
        for _, row in agg.iterrows():
            ts_day = pd.Timestamp(row["date"]) + timedelta(hours=12)
            pred_val = float(round(row["predicted"], 2))
            surge = 1.0
            if pred_val > baseline_avg_daily * 1.3:
                surge = 1.5
            elif pred_val > baseline_avg_daily * 1.1:
                surge = 1.15
            predicted_rows.append({
                "timestamp": ts_day.isoformat(),
                "predicted": pred_val,
                "confidence_lower": max(0.0, round(float(row["lower"]), 2)),
                "confidence_upper": round(float(row["upper"]), 2),
                "surge_multiplier": surge,
                "projected_revenue": round(pred_val * base_fare * surge, 2),
            })
            if pred_val > peak_demand:
                peak_demand = pred_val
                peak_timestamp = ts_day.isoformat()
    else:
        for i, t in enumerate(future_idx):
            pred_val = float(round(ensemble[i], 2))
            surge = 1.0
            if pred_val > baseline_avg * 1.5:
                surge = 1.75
            elif pred_val > baseline_avg * 1.2:
                surge = 1.25
            predicted_rows.append({
                "timestamp": t.isoformat(),
                "predicted": pred_val,
                "confidence_lower": max(0.0, round(float(lo[i]), 2)),
                "confidence_upper": round(float(hi[i]), 2),
                "surge_multiplier": surge,
                "projected_revenue": round(pred_val * base_fare * surge, 2),
            })
            if pred_val > peak_demand:
                peak_demand = pred_val
                peak_timestamp = t.isoformat()

    # Filter by requested_date if provided
    if requested_date:
        if horizon == "hourly":
            filtered = [p for p in predicted_rows if p["timestamp"].startswith(requested_date)]
        else:
            filtered = [p for p in predicted_rows if p["timestamp"] >= requested_date][:7]
        if filtered:
            predicted_rows = filtered
            peak_demand = 0.0
            peak_timestamp = None
            for p in predicted_rows:
                if p["predicted"] > peak_demand:
                    peak_demand = p["predicted"]
                    peak_timestamp = p["timestamp"]

    # Aggregate model-level metrics for the response
    agg_metrics: Dict[str, Any] = {}
    for model_key, m in forecaster.model_metrics.items():
        if isinstance(m, dict) and "error" not in m:
            agg_metrics[model_key] = {
                "mae": _sanitize(m.get("mae")),
                "rmse": _sanitize(m.get("rmse")),
                "wmape": _sanitize(m.get("wmape")),
            }
        elif isinstance(m, dict) and "error" in m:
            agg_metrics[model_key] = {"error": m["error"]}

    # Use best model's R²-ish for accuracy estimate
    est_acc = 60.0
    if agg_metrics:
        best_wmape = min(
            (m.get("wmape", 50.0) for m in agg_metrics.values() if isinstance(m, dict) and "error" not in m),
            default=50.0,
        )
        est_acc = float(np.clip(100.0 - best_wmape, 60.0, 95.0))

    # Requested window resolution
    requested_window = None
    if predicted_rows:
        if horizon == "hourly" and requested_date and requested_time:
            target = f"{requested_date}T{requested_time}:00"
            for pred in predicted_rows:
                if pred["timestamp"].startswith(target):
                    requested_window = pred
                    break
        if not requested_window:
            requested_window = predicted_rows[0]

    return {
        "historical": historical_data,
        "predicted": predicted_rows,
        "requested_window": requested_window,
        "meta": {
            "model_name": f"Ensemble+{forecaster.selected_model}",
            "model_type": "weighted_ensemble",
            "data_points": len(ts),
            "model_metrics": {
                "mae": float(np.mean([
                    m["mae"] for m in agg_metrics.values()
                    if isinstance(m, dict) and "error" not in m
                ] or [0.0])),
                "rmse": float(np.mean([
                    m["rmse"] for m in agg_metrics.values()
                    if isinstance(m, dict) and "error" not in m
                ] or [0.0])),
                "wmape": float(np.mean([
                    m["wmape"] for m in agg_metrics.values()
                    if isinstance(m, dict) and "error" not in m
                ] or [0.0])),
                "per_model": agg_metrics,
                "differencing_order": getattr(forecaster.sarimax, "differencing_order", 0),
            },
            "weights": preds["weights_used"],
            "model_contributions": sorted(
                preds["weights_used"].items(), key=lambda kv: kv[1], reverse=True
            ),
            "selected_model": forecaster.selected_model,
            "confidence_band": "high" if est_acc > 85 else "medium" if est_acc > 70 else "low",
            "estimated_accuracy": round(est_acc, 1),
            "features_used": [
                "historical_demand",
                "profile_mean",
                "hour_of_day",
                "day_of_week",
                "weekend_flag",
                "holidays",
                "lag_features" if LIGHTGBM_AVAILABLE and forecaster.lgbm.is_trained else None,
                "rolling_statistics" if LIGHTGBM_AVAILABLE and forecaster.lgbm.is_trained else None,
                "fourier_seasonality" if LIGHTGBM_AVAILABLE and forecaster.lgbm.is_trained else None,
            ],
            "ensemble_components": sorted(list(set(preds["weights_used"].keys()) & set(preds["per_model"].keys()))),
            "feature_importance": (
                forecaster.lgbm.feature_importance_
                if LIGHTGBM_AVAILABLE and forecaster.lgbm.is_trained
                else {}
            ),
        },
        "peak_demand": {
            "value": float(peak_demand),
            "timestamp": peak_timestamp,
        },
        "average_demand": float(round(np.mean([p["predicted"] for p in predicted_rows]), 2)) if predicted_rows else 0.0,
        "per_model_breakdown": {
            model: [
                {
                    "timestamp": future_idx[i].isoformat() if horizon == "hourly" else future_idx[min(i, len(future_idx) - 1)].isoformat(),
                    "predicted": round(float(arr[i]), 2),
                }
                for i in range(min(len(arr), len(predicted_rows) if horizon == "hourly" else forecast_steps))
            ]
            for model, arr in preds["per_model"].items()
        },
    }


def compare_models_for_zone(location_id: int, ts: pd.Series) -> Optional[Dict[str, Any]]:
    """
    Run all models once, measure on the same validation fold, and return a
    structured comparison table used by the comparison API endpoint.
    """
    ens = EnsembleForecaster(location_id)
    _ = ens.train_all(ts)
    if not ens.model_metrics:
        return None

    rows: Dict[str, Any] = {}
    feature_importance_snapshot: Dict[str, Any] = {}
    for key, res in ens.model_metrics.items():
        if isinstance(res, dict) and "error" not in res:
            if key == "lightgbm" and res.get("feature_importance_grouped"):
                feature_importance_snapshot = res["feature_importance_grouped"]
            rows[key] = {
                "model_name": {
                    "holt_winters": "Holt-Winters ETS",
                    "prophet": "Prophet",
                    "sarimax_pro": "SARIMAX-Pro",
                    "lightgbm": "LightGBM GBM",
                }.get(key, key.replace("_", " ").title()),
                "mae": round(_sanitize(res.get("mae")), 2),
                "rmse": round(_sanitize(res.get("rmse")), 2),
                "wmape": round(_sanitize(res.get("wmape")), 2),
                "train_size": int(res.get("train_size", 0)),
                "test_size": int(res.get("test_size", 0)),
                "weight": round(ens.weights.get(key, 0.0), 4),
                "selected": ens.selected_model == key,
            }

    rows["ensemble"] = {
        "model_name": "Weighted Ensemble",
        "mae": round(
            float(np.average(
                [r["mae"] for r in rows.values()],
                weights=[r["weight"] for r in rows.values()] if rows else None,
            )) if rows else 0.0,
            2,
        ),
        "rmse": round(
            float(np.average(
                [r["rmse"] for r in rows.values()],
                weights=[r["weight"] for r in rows.values()] if rows else None,
            )) if rows else 0.0,
            2,
        ),
        "wmape": round(
            float(np.average(
                [r["wmape"] for r in rows.values()],
                weights=[r["weight"] for r in rows.values()] if rows else None,
            )) if rows else 0.0,
            2,
        ),
        "selected": ens.selected_model == "ensemble",
        "weight": 1.0 if ens.selected_model == "ensemble" else 0.0,
    }

    # Rank by WMAPE ascending
    ranked = sorted(
        [(k, v) for k, v in rows.items()],
        key=lambda kv: kv[1].get("wmape", 1e9),
    )
    for rank, (k, v) in enumerate(ranked, start=1):
        v["rank"] = rank

    baseline_key = "sarimax_pro" if "sarimax_pro" in rows else next(iter(rows), None)
    improvements = {}
    if baseline_key and baseline_key in rows:
        baseline_wmape = rows[baseline_key]["wmape"]
        for k, v in rows.items():
            if k == baseline_key or baseline_wmape <= 0:
                improvements[k] = 0.0
            else:
                improvements[k] = round((baseline_wmape - v["wmape"]) / baseline_wmape * 100.0, 2)

    return {
        "location_id": location_id,
        "comparison_generated_at": datetime.now().isoformat(),
        "selected_model": ens.selected_model,
        "ensemble_weights": ens.weights,
        "results": rows,
        "improvement_over_baseline_sarimax": improvements,
        "feature_importance_grouped": feature_importance_snapshot,
        "recommendation": f"Use {ens.selected_model} for zone {location_id}",
    }


def get_feature_importance_for_zone(location_id: int, ts: pd.Series) -> Optional[Dict[str, Any]]:
    """
    Train (or load cached) ensemble and return LightGBM-based feature importance.
    Returns grouped, per-feature, and top-K importance breakdowns.
    """
    ens = EnsembleForecaster(location_id)
    if not ens.load_cache():
        _ = ens.train_all(ts)
    if not (LIGHTGBM_AVAILABLE and ens.lgbm.is_trained and ens.lgbm.feature_importance_):
        fallback = {}
        # Extract best-effort info from model_metrics if available
        lgb_meta = ens.model_metrics.get("lightgbm", {})
        if isinstance(lgb_meta, dict) and lgb_meta.get("feature_importance_grouped"):
            fallback = {"grouped": lgb_meta["feature_importance_grouped"]}
        return fallback or None
    return {
        "location_id": location_id,
        "generated_at": datetime.now().isoformat(),
        "n_features": len(ens.lgbm.feature_names_),
        **ens.lgbm.feature_importance_,
    }
