"""Train an XGBoost regressor on synthetic Almaty traffic data.

Usage:
    python -m app.train

Produces:
    ml/models/traffic_xgb.joblib   (the saved model + metadata)
"""
from __future__ import annotations
import json
import time
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor

from .synth import generate_dataset
from .features import FEATURE_COLUMNS

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODEL_DIR / "traffic_xgb.joblib"
META_PATH = MODEL_DIR / "model_meta.json"
MODEL_VERSION = "xgb-synth-v1"


def main() -> None:
    print("[train] generating synthetic dataset…")
    X, y = generate_dataset(n_days=90, samples_per_day=200, seed=7)
    print(f"[train] dataset: X={X.shape}, y={y.shape}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("[train] fitting XGBRegressor…")
    t0 = time.time()
    model = XGBRegressor(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.07,
        subsample=0.85,
        colsample_bytree=0.85,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    train_secs = time.time() - t0

    pred = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, pred))
    r2 = float(r2_score(y_test, pred))
    print(f"[train] MAE={mae:.3f}  R^2={r2:.3f}  ({train_secs:.1f}s)")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "feature_columns": FEATURE_COLUMNS,
            "model_version": MODEL_VERSION,
        },
        MODEL_PATH,
    )
    META_PATH.write_text(
        json.dumps(
            {
                "model_version": MODEL_VERSION,
                "metrics": {"mae": mae, "r2": r2},
                "n_train": int(X_train.shape[0]),
                "n_test": int(X_test.shape[0]),
                "feature_columns": FEATURE_COLUMNS,
                "train_seconds": train_secs,
            },
            indent=2,
        )
    )
    print(f"[train] saved {MODEL_PATH}")
    print(f"[train] meta   {META_PATH}")


if __name__ == "__main__":
    main()
