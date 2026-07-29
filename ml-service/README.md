# Expressway Power ML Service

This service predicts whether monitored equipment is likely to fail within six
hours and returns the likely fault family with ordered corrective actions.

## Setup

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Train

```bash
python training/train_failure_models.py
```

Training uses the existing chronological `TRAIN`, `VALIDATION` and `TEST`
partitions. The output is written to `saved_models/` and `reports/`.

## Run

```bash
uvicorn main:app --reload --port 8001
```

## Request

```json
{
  "equipmentId": 1,
  "equipmentCode": "GENERATOR-01",
  "equipmentType": "GENERATOR",
  "readings": {
    "operating_state": "RUNNING"
  }
}
```

`readings` must contain every feature listed for the selected equipment type in
`data/feature_config.json`.

## Response

```json
{
  "equipmentId": 1,
  "equipmentCode": "GENERATOR-01",
  "equipmentType": "GENERATOR",
  "failureProbability": 0.73,
  "predictedFailureType": "GEN_LOW_FUEL",
  "recommendedActions": ["Confirm the fuel reading against the local tank gauge."],
  "confidence": 0.73,
  "modelVersion": "generator-failure-6h-20260728-v1"
}
```

`GET /health` reports whether all four six-hour model artifacts loaded.

## Test

```bash
pytest
```
