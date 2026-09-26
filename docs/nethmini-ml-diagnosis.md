# Nethmini ML and Diagnosis Scope

## Backend endpoints

- `GET /api/diagnosis`
- `GET /api/diagnosis/{key}`
- `GET /api/equipment/{equipmentId}/diagnosis?unresolved=true`
- `GET /api/predictions/latest`
- `GET /api/predictions/summary`
- `GET /api/predictions/ml-health`
- `POST /api/predictions/run`
- `GET /api/equipment/{equipmentId}/predictions?page=0&size=20`

React calls only the Spring Boot backend. FastAPI remains behind Spring Boot through `MlClient`.

## Environment

- `ML_SERVICE_URL`: FastAPI base URL, default `http://localhost:8000`
- `ML_SERVICE_TIMEOUT_MS`: request timeout, default `3000`
- `ML_SERVICE_RETRY_COUNT`: retry count after the first attempt, default `1`
- `ML_PREDICTION_ENABLED`: enables scheduled prediction polling, default `false`
- `ML_PREDICTION_INITIAL_DELAY_MS`: scheduler initial delay, default `15000`
- `ML_PREDICTION_FIXED_DELAY_MS`: scheduler delay, default `60000`

## Local verification

1. Start FastAPI on port `8000`.
2. Start Spring Boot with `ML_PREDICTION_ENABLED=true` when scheduler verification is needed.
3. Generate or load sensor readings for enabled equipment.
4. Call `POST /api/predictions/run`.
5. Verify `GET /api/predictions/latest` and `/predictions` in React.
6. Stop FastAPI and verify `GET /api/predictions/ml-health` reports `reachable=false` while monitoring and diagnosis still work.
