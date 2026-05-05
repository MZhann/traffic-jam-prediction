# TrafficJam

Intelligent traffic forecasting platform for Almaty: historical data + weather + city events + a trained XGBoost ML model, on an interactive Leaflet/OpenStreetMap canvas. Built as a 3-service monorepo.

## What's working

- ✅ **Map dashboard** at `/` — Almaty road segments colored by traffic score, with a sidebar of filter toggles, a 24-hour timeline, weather/events panel, and live mode label (history / current / prediction).
- ✅ **Auth** — register / login / role-based admin guard. First registered user automatically becomes admin.
- ✅ **Admin panel** at `/admin/events` — CRUD events with affected roads, impact level 1–10, type (marathon, repair, accident, …), validated with Zod + React Hook Form.
- ✅ **History page** at `/history` — per-road traffic-score timeseries chart with date filter.
- ✅ **Analytics page** at `/analytics` — by-hour, busiest-roads, by-weekday charts + auto-summarized AI insights.
- ✅ **Weather** — OpenWeather integration with mock seasonal Almaty fallback (free; no key needed for demo).
- ✅ **ML service** — FastAPI + XGBoost regressor trained on 18 000 synthetic Almaty samples. Achieves MAE ≈ 0.57 / R² ≈ 0.91 on held-out test split. The Express API calls it via REST; falls back to a rule-based scorer when the ML service is down.
- ✅ **Seed script** populates 10 Almaty road segments + 14 days of hourly traffic + a sample event.

## Stack

| Layer    | Tech                                                                                                                  |
|----------|-----------------------------------------------------------------------------------------------------------------------|
| Frontend | Next.js 15, React 19, TypeScript, TailwindCSS 3, Zustand, React Hook Form, Zod, Recharts, react-leaflet + OpenStreetMap |
| Backend  | Node 20+, Express 5, TypeScript, MongoDB, Mongoose, JWT, bcryptjs, pino                                                |
| ML       | Python 3.12, FastAPI, scikit-learn, XGBoost, pandas, joblib                                                            |

## Layout

```
trafficjam/
├── web/                       Next.js dashboard (port 3000)
│   ├── src/app/               /  /login  /register  /history  /analytics  /admin/events
│   ├── src/components/        Map, sidebar, timeline, legend, prediction panel, AdminGuard
│   ├── src/hooks/useTraffic   Polls /api/traffic, falls back to mock roads
│   ├── src/store/             Zustand stores: filters + auth (persisted)
│   └── src/lib/               api client, traffic helpers, config
├── api/                       Express REST API (port 4000)
│   ├── src/models/            User, RoadSegment, TrafficHistory, WeatherRecord, Event, Prediction
│   ├── src/routes/            auth, roads, traffic, events, weather, predictions, analytics
│   ├── src/services/          timeline mode, rule-based scorer, weather, events, mlClient
│   ├── src/middleware/        requireAuth, requireAdmin, validateBody
│   └── src/scripts/seed.ts    `npm run seed` — populates Almaty roads + history
├── ml/                        FastAPI prediction service (port 8000)
│   ├── app/main.py            /health  /predict
│   ├── app/features.py        Feature engineering (shared train + inference)
│   ├── app/synth.py           Synthetic Almaty traffic generator
│   ├── app/train.py           `python -m app.train` → models/traffic_xgb.joblib
│   └── app/model.py           Loads XGBoost, falls back to rule-based if not loaded
├── package.json               npm workspaces (web + api)
└── tsconfig.base.json
```

## Prerequisites

- Node.js 20+
- Python 3.11+
- MongoDB 6+ (local or Atlas)

## Quickstart (4 terminals)

```powershell
# 1 — install JS deps (once)
npm install

# 2 — copy env files
Copy-Item api\.env.example api\.env

# 3 — make sure MongoDB is running (Windows: Start-Service MongoDB)

# Terminal 1 — train the ML model (once)
cd ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m app.train

# Terminal 2 — ML service
.\.venv\Scripts\uvicorn app.main:app --port 8000 --reload

# Terminal 3 — API
npm run dev:api

# Terminal 4 — web
npm run dev:web

# Optional — seed Almaty roads + 14 days of synthetic history + sample event
npm --workspace api run seed
```

Open <http://localhost:3000>. Register the first user (becomes admin), then create events at `/admin/events`.

## Health checks

| URL                                       | What it tells you                                             |
|-------------------------------------------|---------------------------------------------------------------|
| <http://localhost:3000>                   | Map dashboard                                                 |
| <http://localhost:4000/api/health>        | `{ status, db: connected/disconnected }`                      |
| <http://localhost:8000/health>            | `{ status, modelLoaded, modelVersion }`                       |
| <http://localhost:8000/docs>              | Swagger UI for the ML service                                 |

## ML model

- 20 features: hour, day-of-week, weekend flag, rush-hour flags, weather one-hot, road-type one-hot, event-impact total, weather scalars (temperature / wind / humidity).
- Trained on 18 000 synthetic Almaty samples (90 days × 200/day).
- XGBoost `reg:squarederror`, 400 trees, depth 6, lr 0.07.
- Persisted at `ml/models/traffic_xgb.joblib`. Metadata at `ml/models/model_meta.json`.
- Drop-in replacement: when real Almaty data accumulates in `trafficHistory`, write a loader that yields `(features, score)` and call the same training pipeline.

## Notes / tradeoffs

- **Map provider** — three-way fallback in [MapView.tsx](web/src/components/map/MapView.tsx):
  1. **Yandex Maps v3** (recommended) — set `NEXT_PUBLIC_YANDEX_MAPS_KEY` in `web/.env`. Free tier at <https://developer.tech.yandex.ru/services/> ("JavaScript API and HTTP Geocoder"). 50k loads/day free for non-commercial. We use only base tiles + custom polylines — Yandex's commercial traffic layer is **not** required.
  2. **2GIS MapGL** — set `NEXT_PUBLIC_MAPGL_KEY` (free tier at platform.2gis.com).
  3. **Leaflet + CartoDB Voyager** — automatic fallback when neither key is set. No registration, decent palette.
- **Weather** — when `OPENWEATHER_API_KEY` is unset, the API returns a mock weather snapshot with seasonal Almaty flavor. No key needed for demos.
- **ML fallback** — if the ML service is unreachable, the API silently falls back to the rule-based scorer in [api/src/services/prediction.ts](api/src/services/prediction.ts) (same logic the original spec described).
- **DB fallback** — when MongoDB is missing, the web frontend falls back to `MOCK_ROADS` so the map still renders. The API itself returns clean errors instead of hanging.

## Team

- **Darkhan Bukharbay** — frontend (`web/`)
- **Bakytzhan Mussa** — backend & ML (`api/`, `ml/`)
- **Teacher:** Meraslan Meraliyev
