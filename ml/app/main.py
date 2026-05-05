from __future__ import annotations
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .schema import (
    HealthResponse,
    PredictionItem,
    PredictRequest,
    PredictResponse,
)
from . import model as model_module

app = FastAPI(title="TrafficJam ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    loaded = model_module.load_model()
    print(f"[ml] model loaded={loaded} version={model_module.model_version()}")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="trafficjam-ml",
        modelLoaded=model_module.is_loaded(),
        modelVersion=model_module.model_version(),
    )


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    when = _parse_iso(req.selectedTime)
    rows = model_module.build_inference_rows(
        when=when,
        weather=req.weather.model_dump() if req.weather else None,
        events=[e.model_dump() for e in req.events],
        roads=[r.model_dump() for r in req.roads],
    )
    scores, base_conf = model_module.predict(rows)

    items = [
        PredictionItem(
            roadSegmentId=r.id,
            score=float(round(scores[i], 2)),
            confidence=float(round(base_conf, 2)),
        )
        for i, r in enumerate(req.roads)
    ]
    return PredictResponse(
        modelVersion=model_module.model_version(),
        predictions=items,
    )


def _parse_iso(s: str) -> datetime:
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        d = datetime.fromisoformat(s)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.astimezone()
    except Exception:
        return datetime.now()
