from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import models
import schemas
from database import get_db
from services.ml_service import (
    generate_forecast,
    get_available_forecast_window,
    run_model_comparison,
    get_feature_importance,
    MODEL_NAME,
)

router = APIRouter(
    prefix="/forecasts",
    tags=["Forecasts"]
)


def _is_current_model(name: Optional[str]) -> bool:
    """Allow both the exact MODEL_NAME and the Ensemble+<best> prefix used by the ensemble engine."""
    if not name:
        return False
    return name == MODEL_NAME or name.startswith("Ensemble+")


@router.get("/{location_id}/window")
def get_forecast_window_options(
    location_id: int,
    horizon: str = "hourly",
    db: Session = Depends(get_db),
):
    if horizon not in ["hourly", "daily"]:
        raise HTTPException(status_code=400, detail="Invalid horizon. Must be 'hourly' or 'daily'.")

    zone = db.query(models.Zone).filter(models.Zone.location_id == location_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    try:
        return get_available_forecast_window(location_id, horizon=horizon)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{location_id}", response_model=schemas.ForecastResponse)
def get_zone_forecast(
    location_id: int,
    horizon: str = "hourly",
    requested_date: str | None = None,
    requested_time: str | None = None,
    db: Session = Depends(get_db)
):
    if horizon not in ["hourly", "daily"]:
        raise HTTPException(status_code=400, detail="Invalid horizon. Must be 'hourly' or 'daily'.")
    if requested_time and horizon != "hourly":
        raise HTTPException(status_code=400, detail="requested_time is only valid for hourly forecasts.")

    zone = db.query(models.Zone).filter(models.Zone.location_id == location_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    cache_key = f"{location_id}:{horizon}"
    if requested_date:
        cache_key += f":{requested_date}"
    if requested_time:
        cache_key += f":{requested_time}"

    forecast = db.query(models.Forecast).filter(
        models.Forecast.location_id == location_id,
        models.Forecast.horizon == horizon,
        models.Forecast.cache_key == cache_key
    ).order_by(models.Forecast.generated_at.desc()).first()

    now = datetime.utcnow()
    is_fresh = False

    if forecast:
        age = now - forecast.generated_at
        meta = (
            forecast.forecast_values.get("meta", {})
            if isinstance(forecast.forecast_values, dict)
            else {}
        )
        model_name = meta.get("model_name")
        model_type = meta.get("model_type")

        if _is_current_model(model_name) and model_type != "no_data_fallback":
            if horizon == "hourly" and age <= timedelta(hours=1):
                is_fresh = True
            elif horizon == "daily" and age <= timedelta(hours=24):
                is_fresh = True

    if not is_fresh:
        forecast_data = generate_forecast(
            location_id,
            horizon,
            requested_date=requested_date,
            requested_time=requested_time,
        )

        new_forecast = models.Forecast(
            location_id=location_id,
            horizon=horizon,
            cache_key=cache_key,
            generated_at=now,
            forecast_values=forecast_data
        )
        db.add(new_forecast)

        # Also persist per-model run history if meta.per_model metrics are available
        meta = forecast_data.get("meta", {}) if isinstance(forecast_data, dict) else {}
        per_model = (meta.get("model_metrics") or {}).get("per_model", {})
        weights = meta.get("weights", {})
        selected = meta.get("selected_model", "sarimax_pro")
        for model_key, metrics in per_model.items():
            if isinstance(metrics, dict) and "error" not in metrics:
                display_name = {
                    "holt_winters": "HoltWinters",
                    "prophet": "Prophet",
                    "sarimax_pro": "SARIMAX-Pro",
                    "ensemble": "Ensemble",
                }.get(model_key, model_key)
                model_type_map = {
                    "holt_winters": "ets",
                    "prophet": "prophet",
                    "sarimax_pro": "sarimax_exogenous",
                    "ensemble": "weighted_ensemble",
                }
                db.add(models.ModelRun(
                    location_id=location_id,
                    model_name=display_name,
                    model_type=model_type_map.get(model_key, model_key),
                    metrics=metrics,
                    ensemble_weight=float(weights.get(model_key, 0.0) or 0.0),
                    selected=1 if selected == model_key else 0,
                ))

        db.commit()
        db.refresh(new_forecast)
        forecast = new_forecast

    return forecast.forecast_values


@router.get("/{location_id}/compare")
def compare_models(
    location_id: int,
    max_age_hours: int = Query(6, ge=0, le=168, description="Max age (hours) of stored comparison to reuse"),
    db: Session = Depends(get_db),
):
    """
    Side-by-side model comparison for the requested zone.

    Returns Holt-Winters ETS, Prophet, SARIMAX-Pro, and Weighted Ensemble
    performance metrics on the same holdout window including per-model
    weights and % improvement over the baseline SARIMAX model.
    """
    zone = db.query(models.Zone).filter(models.Zone.location_id == location_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    # Return cached comparison if fresh
    if max_age_hours > 0:
        cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)
        cached = (
            db.query(models.ModelComparison)
            .filter(models.ModelComparison.location_id == location_id)
            .filter(models.ModelComparison.created_at >= cutoff)
            .order_by(models.ModelComparison.created_at.desc())
            .first()
        )
        if cached is not None:
            return {
                "location_id": location_id,
                "zone_name": zone.zone_name,
                "borough": zone.borough,
                "from_cache": True,
                "cached_at": cached.created_at.isoformat(),
                "selected_model": cached.selected_model,
                "ensemble_weights": cached.ensemble_weights or {},
                "results": cached.results or {},
                "improvement_over_baseline_sarimax": cached.improvement_over_baseline or {},
                "recommendation": (
                    f"Use {cached.selected_model} for zone {location_id} ({zone.zone_name})"
                    if cached.selected_model
                    else f"Run a fresh comparison for zone {location_id}"
                ),
            }

    comparison = run_model_comparison(location_id)
    if comparison is None:
        raise HTTPException(
            status_code=500,
            detail="Unable to run model comparison. Not enough historical data for this zone."
        )

    # Persist the comparison snapshot
    row = models.ModelComparison(
        location_id=location_id,
        selected_model=comparison.get("selected_model"),
        ensemble_weights=comparison.get("ensemble_weights") or {},
        results=comparison.get("results") or {},
        improvement_over_baseline=comparison.get("improvement_over_baseline_sarimax") or {},
    )
    db.add(row)
    db.commit()

    return {
        "location_id": location_id,
        "zone_name": zone.zone_name,
        "borough": zone.borough,
        "from_cache": False,
        "comparison_generated_at": comparison.get("comparison_generated_at"),
        "selected_model": comparison.get("selected_model"),
        "ensemble_weights": comparison.get("ensemble_weights") or {},
        "results": comparison.get("results") or {},
        "improvement_over_baseline_sarimax": comparison.get("improvement_over_baseline_sarimax") or {},
        "recommendation": comparison.get(
            "recommendation",
            f"Use {comparison.get('selected_model')} for zone {location_id}",
        ),
    }


@router.get("/{location_id}/model-runs")
def get_model_run_history(
    location_id: int,
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Return recent per-model training runs (metrics & weights) for this zone."""
    zone = db.query(models.Zone).filter(models.Zone.location_id == location_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    runs = (
        db.query(models.ModelRun)
        .filter(models.ModelRun.location_id == location_id)
        .order_by(models.ModelRun.created_at.desc())
        .limit(limit)
        .all()
    )

    return {
        "location_id": location_id,
        "zone_name": zone.zone_name,
        "borough": zone.borough,
        "runs": [
            {
                "id": r.id,
                "model_name": r.model_name,
                "model_type": r.model_type,
                "metrics": r.metrics or {},
                "ensemble_weight": r.ensemble_weight,
                "selected": bool(r.selected),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in runs
        ],
    }


@router.get("/{location_id}/feature-importance")
def get_zone_feature_importance(
    location_id: int,
    db: Session = Depends(get_db),
):
    """
    Return LightGBM gain-based feature importance for this zone.

    Includes three views:
      - ``grouped``: feature-family aggregates (lags, rolling stats, calendar,
        holidays, fourier seasonality, profile mean, other)
      - ``per_feature``: raw per-column importance (percent of total gain)
      - ``top_features``: top-15 individual features with labels + importance %
    """
    zone = db.query(models.Zone).filter(models.Zone.location_id == location_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    importance = get_feature_importance(location_id)
    if importance is None:
        raise HTTPException(
            status_code=503,
            detail="Feature importance unavailable. LightGBM may not be installed, or the zone has insufficient historical data.",
        )

    return {
        "location_id": location_id,
        "zone_name": zone.zone_name,
        "borough": zone.borough,
        **importance,
    }
