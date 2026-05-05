"""Feature engineering shared by training + inference.

The same `build_feature_row` is called when generating synthetic training data
and when serving predictions, so the feature contract stays in one place.
"""
from __future__ import annotations
from datetime import datetime
from typing import Iterable

import numpy as np
import pandas as pd

WEATHER_LEVELS = ["clear", "cloudy", "rain", "snow", "fog", "storm"]
ROAD_TYPES = ["main", "secondary", "highway"]

FEATURE_COLUMNS = [
    "hour",
    "dayOfWeek",
    "isWeekend",
    "isMorningRush",
    "isEveningRush",
    "isNight",
    "temperature",
    "windSpeed",
    "humidity",
    "weather_clear",
    "weather_cloudy",
    "weather_rain",
    "weather_snow",
    "weather_fog",
    "weather_storm",
    "road_main",
    "road_secondary",
    "road_highway",
    "totalEventImpact",
    "hasEvent",
]


def build_feature_row(
    *,
    when: datetime,
    weather_condition: str,
    temperature: float,
    wind_speed: float,
    humidity: float,
    road_type: str,
    event_impact_total: float,
) -> dict[str, float]:
    hour = when.hour
    dow = when.weekday()  # 0=Mon … 6=Sun
    is_weekend = 1.0 if dow >= 5 else 0.0
    is_morning_rush = 1.0 if 8 <= hour <= 10 else 0.0
    is_evening_rush = 1.0 if 17 <= hour <= 19 else 0.0
    is_night = 1.0 if hour <= 5 or hour >= 23 else 0.0

    row: dict[str, float] = {
        "hour": float(hour),
        "dayOfWeek": float(dow),
        "isWeekend": is_weekend,
        "isMorningRush": is_morning_rush,
        "isEveningRush": is_evening_rush,
        "isNight": is_night,
        "temperature": float(temperature),
        "windSpeed": float(wind_speed),
        "humidity": float(humidity),
        "totalEventImpact": float(event_impact_total),
        "hasEvent": 1.0 if event_impact_total > 0 else 0.0,
    }

    for w in WEATHER_LEVELS:
        row[f"weather_{w}"] = 1.0 if weather_condition == w else 0.0

    rt = road_type if road_type in ROAD_TYPES else "main"
    for r in ROAD_TYPES:
        row[f"road_{r}"] = 1.0 if rt == r else 0.0

    return row


def to_dataframe(rows: Iterable[dict[str, float]]) -> pd.DataFrame:
    df = pd.DataFrame(list(rows))
    # Ensure column ordering matches training time
    for c in FEATURE_COLUMNS:
        if c not in df.columns:
            df[c] = 0.0
    return df[FEATURE_COLUMNS].astype(np.float32)
