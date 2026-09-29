# Dhanuja ML Service Runbook

Owner: Dhanuja

This covers the FastAPI prediction service and model artifacts for the final sprint deployment rehearsal.

## Build and Setup

```powershell
cd ml-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Model artifacts are loaded from `ml-service/saved_models/`. The manifest is `saved_models/model_manifest.json`.

## Runtime Configuration

| Variable | Required | Purpose |
|---|---:|---|
| `ML_MODEL_DIR` | No | Override model artifact directory if the service is adapted to read it |
| `PORT` | No | Hosting platform port; local default command uses `8000` |

Keep the FastAPI port private to the backend service. React must never call FastAPI directly.

## Start

```powershell
cd ml-service
.\.venv\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Health Check

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Expected rehearsal result:

- `status` is `ok` when all required models load.
- `status` is `degraded` with model messages when any artifact or manifest is missing.

## Smoke Prediction

Use `ml-service/examples/predict_requests.json` as the source of valid sample requests.

```powershell
Invoke-RestMethod http://localhost:8000/predict `
  -Method Post `
  -ContentType 'application/json' `
  -Body (Get-Content .\examples\predict_requests.json -Raw)
```

## Tests

```powershell
cd ml-service
.\.venv\Scripts\Activate.ps1
python -m pytest
```

## Rollback

1. Stop the FastAPI process.
2. Restore the previously approved `saved_models/` directory and `data/feature_config.json`.
3. Restart the service.
4. Run `/health` and one sample `/predict`.
5. Confirm Spring Boot `/api/predictions/ml-health` reports the service as reachable.
