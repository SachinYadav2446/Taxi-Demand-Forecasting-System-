from __future__ import annotations

import sys
from pathlib import Path

CURRENT_FILE = Path(__file__).resolve()
if (CURRENT_FILE.parents[1] / "model_service").exists():
    PROJECT_ROOT = CURRENT_FILE.parents[1]
else:
    PROJECT_ROOT = CURRENT_FILE.parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from model_service.forecast_core import (  # noqa: E402
    MODEL_NAME,
    generate_forecast as shared_generate_forecast,
    get_available_forecast_window as shared_get_available_forecast_window,
    compare_models_for_zone as _shared_compare,
    prepare_time_series as _shared_prepare_ts,
    load_zone_data as _shared_load_zone,
    get_feature_importance_for_zone as _shared_feature_importance,
)


def generate_forecast(location_id: int, horizon: str = "hourly", requested_date: str | None = None, requested_time: str | None = None):
    return shared_generate_forecast(
        location_id,
        horizon=horizon,
        requested_date=requested_date,
        requested_time=requested_time,
    )


def get_available_forecast_window(location_id: int, horizon: str = "hourly"):
    return shared_get_available_forecast_window(location_id, horizon=horizon)


def run_model_comparison(location_id: int):
    """Run multi-model comparison for a zone. Returns Holt-Winters vs Prophet vs LightGBM vs SARIMAX-Pro vs Ensemble."""
    df = _shared_load_zone(location_id)
    if df.empty:
        return None
    ts = _shared_prepare_ts(df)
    return _shared_compare(location_id, ts)


def get_feature_importance(location_id: int):
    """Return LightGBM gain-based feature importance (grouped + per-feature + top-15) for a zone."""
    df = _shared_load_zone(location_id)
    if df.empty:
        return None
    ts = _shared_prepare_ts(df)
    return _shared_feature_importance(location_id, ts)
