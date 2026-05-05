"""Model registry — loads the saved XGBoost regressor on import.

Falls back to a rule-based scorer when the saved model file is absent so the
service still works before/without training.
"""
from __future__ import annotations
import math
from pathlib import Path
from typing import Any

import joblib
import numpy as np

from .features import build_feature_row, to_dataframe

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "traffic_xgb.joblib"

_state: dict[str, Any] = {
    "model": None,
    "model_version": "rule-based-fallback-v1",
    "loaded": False,
}


def load_model() -> bool:
    """Attempt to load the saved model. Safe to call multiple times."""
    if _state["loaded"]:
        return _state["model"] is not None
    _state["loaded"] = True
    if not MODEL_PATH.exists():
        return False
    try:
        bundle = joblib.load(MODEL_PATH)
        _state["model"] = bundle["model"]
        _state["model_version"] = bundle.get("model_version", "xgb-unknown")
        return True
    except Exception:
        _state["model"] = None
        return False


def is_loaded() -> bool:
    return _state["model"] is not None


def model_version() -> str:
    return str(_state["model_version"])


def predict(rows: list[dict[str, float]]) -> tuple[np.ndarray, float]:
    """Return (scores, confidence). Falls back to a deterministic rule-based scorer."""
    if not _state["loaded"]:
        load_model()

    df = to_dataframe(rows)

    if _state["model"] is not None:
        scores = np.asarray(_state["model"].predict(df), dtype=np.float64)
        scores = np.clip(scores, 0.0, 10.0)
        return scores, 0.85

    # Rule-based fallback (mirrors api/src/services/prediction.ts)
    scores = np.array([_rule_based_score(r) for r in rows], dtype=np.float64)
    return scores, 0.6


def _rule_based_score(row: dict[str, float]) -> float:
    base = 4.0
    if row.get("road_main", 0) > 0.5:
        base = 4.5
    elif row.get("road_secondary", 0) > 0.5:
        base = 3.5
    elif row.get("road_highway", 0) > 0.5:
        base = 5.0

    score = base
    if row.get("isMorningRush", 0) > 0.5:
        score += 2.0
    if row.get("isEveningRush", 0) > 0.5:
        score += 2.5
    if row.get("isNight", 0) > 0.5:
        score -= 2.5
    if row.get("isWeekend", 0) > 0.5:
        score -= 1.2

    if row.get("weather_rain", 0) > 0.5:
        score += 1.5
    if row.get("weather_snow", 0) > 0.5:
        score += 2.5
    if row.get("weather_storm", 0) > 0.5:
        score += 2.0
    if row.get("weather_fog", 0) > 0.5:
        score += 1.0

    score += row.get("totalEventImpact", 0) * 0.4
    return float(max(0.0, min(10.0, score)))


def build_inference_rows(
    *,
    when,
    weather: dict | None,
    events: list[dict],
    roads: list[dict],
) -> list[dict[str, float]]:
    """Convert API request payload → list of feature rows (one per road)."""
    weather_condition = (weather or {}).get("condition", "clear")
    temperature = (weather or {}).get("temperature", 15.0) or 15.0
    wind_speed = (weather or {}).get("windSpeed", 0.0) or 0.0
    humidity = (weather or {}).get("humidity", 50.0) or 50.0

    total_event_impact = float(sum(int(e.get("impactLevel", 0) or 0) for e in events))

    rows: list[dict[str, float]] = []
    for road in roads:
        rows.append(
            build_feature_row(
                when=when,
                weather_condition=weather_condition,
                temperature=temperature,
                wind_speed=wind_speed,
                humidity=humidity,
                road_type=str(road.get("roadType", "main") or "main"),
                event_impact_total=total_event_impact,
            )
        )
    return rows


def confidence_floor(_count: int) -> float:
    """Reserved for future per-road confidence calibration."""
    return 0.0 if math.isnan(0) else 0.0
