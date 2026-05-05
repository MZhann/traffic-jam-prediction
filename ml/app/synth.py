"""Synthetic Almaty traffic dataset.

Generates a realistic-ish dataset for training:
- diurnal pattern with rush-hour peaks (8-10, 17-19)
- weekend dampening
- seasonal weather effects (snow makes everything worse)
- random events sprinkled in
- per-road-type baseline

Real production usage would replace this with historical data from MongoDB
(`db.trafficHistory.find()`).
"""
from __future__ import annotations
import random
from datetime import datetime, timedelta

import numpy as np

from .features import build_feature_row, to_dataframe, WEATHER_LEVELS, ROAD_TYPES


ROAD_BASE = {"main": 4.5, "secondary": 3.5, "highway": 5.0}
WEATHER_DELTA = {
    "clear": 0.0,
    "cloudy": 0.2,
    "rain": 1.5,
    "snow": 2.7,
    "fog": 1.0,
    "storm": 2.2,
}


def _seasonal_weather(month: int, rng: random.Random) -> str:
    if month in (12, 1, 2):
        return rng.choices(["snow", "cloudy", "clear", "fog"], weights=[55, 25, 15, 5])[0]
    if month in (3, 4, 11):
        return rng.choices(["rain", "cloudy", "clear", "snow"], weights=[35, 35, 25, 5])[0]
    if month in (5, 6, 9, 10):
        return rng.choices(["clear", "cloudy", "rain", "storm"], weights=[55, 30, 12, 3])[0]
    return rng.choices(["clear", "cloudy", "storm"], weights=[75, 20, 5])[0]


def _temperature(month: int, hour: int, rng: random.Random) -> float:
    base = {1: -8, 2: -6, 3: 2, 4: 11, 5: 18, 6: 23, 7: 26, 8: 25, 9: 19, 10: 11, 11: 3, 12: -5}[month]
    diurnal = 6 * np.sin(((hour - 4) / 24) * 2 * np.pi)
    noise = rng.gauss(0, 2)
    return float(base + diurnal + noise)


def _score_for_row(
    *,
    hour: int,
    dow: int,
    weather: str,
    road_type: str,
    event_impact_total: float,
    rng: random.Random,
) -> float:
    score = ROAD_BASE.get(road_type, 4.0)
    if 8 <= hour <= 10:
        score += 2.2
    elif 17 <= hour <= 19:
        score += 2.7
    elif 12 <= hour <= 14:
        score += 0.9
    elif hour <= 5 or hour >= 23:
        score -= 2.5
    if dow >= 5:
        score -= 1.3
    score += WEATHER_DELTA[weather]
    score += event_impact_total * 0.45
    score += rng.gauss(0, 0.7)
    return float(np.clip(score, 0.0, 10.0))


def generate_dataset(n_days: int = 90, samples_per_day: int = 200, seed: int = 7):
    rng = random.Random(seed)
    rows: list[dict[str, float]] = []
    targets: list[float] = []

    end = datetime.now().replace(minute=0, second=0, microsecond=0)
    start = end - timedelta(days=n_days)

    for _ in range(n_days * samples_per_day):
        days_offset = rng.uniform(0, n_days)
        hour_offset = rng.uniform(0, 24)
        when = start + timedelta(days=days_offset, hours=hour_offset)

        weather = _seasonal_weather(when.month, rng)
        temp = _temperature(when.month, when.hour, rng)
        wind = max(0.0, rng.gauss(3, 2))
        humidity = max(15.0, min(95.0, rng.gauss(55, 15)))
        road_type = rng.choices(ROAD_TYPES, weights=[60, 25, 15])[0]

        # 8% chance of an event near this sample
        event_impact = 0.0
        if rng.random() < 0.08:
            event_impact = rng.choice([3, 5, 7, 9])

        target = _score_for_row(
            hour=when.hour,
            dow=when.weekday(),
            weather=weather,
            road_type=road_type,
            event_impact_total=event_impact,
            rng=rng,
        )

        rows.append(
            build_feature_row(
                when=when,
                weather_condition=weather,
                temperature=temp,
                wind_speed=wind,
                humidity=humidity,
                road_type=road_type,
                event_impact_total=event_impact,
            )
        )
        targets.append(target)

    X = to_dataframe(rows)
    y = np.asarray(targets, dtype=np.float32)
    return X, y


__all__ = ["generate_dataset", "WEATHER_LEVELS", "ROAD_TYPES"]
