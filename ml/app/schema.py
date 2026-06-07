from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, Field


WeatherCondition = Literal["clear", "cloudy", "rain", "snow", "fog", "storm"]
RoadType = Literal["main", "secondary", "highway"]


class WeatherInput(BaseModel):
    condition: WeatherCondition = "clear"
    temperature: float = 15.0
    windSpeed: float = 0.0
    humidity: float = 50.0


class EventInput(BaseModel):
    impactLevel: int = Field(0, ge=0, le=10)
    affectedRoads: list[str] = []


class RoadInput(BaseModel):
    id: str
    name: str = ""
    roadType: RoadType = "main"


class PredictRequest(BaseModel):
    selectedTime: str  # ISO datetime
    weather: WeatherInput | None = None
    events: list[EventInput] = []
    roads: list[RoadInput]


class PredictionItem(BaseModel):
    roadSegmentId: str
    score: float
    confidence: float


class PredictResponse(BaseModel):
    modelVersion: str
    predictions: list[PredictionItem]


class HealthResponse(BaseModel):
    status: str
    service: str
    modelLoaded: bool
    modelVersion: str
