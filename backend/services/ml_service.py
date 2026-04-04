from __future__ import annotations

import sys
from pathlib import Path

CURRENT_FILE = Path(__file__).resolve()
PROJECT_ROOT = CURRENT_FILE.parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from model_service.forecast_core import (  # noqa: E402
    MODEL_NAME,
    generate_forecast as shared_generate_forecast,
    get_available_forecast_window as shared_get_available_forecast_window,
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
