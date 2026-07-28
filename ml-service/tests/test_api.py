import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

import routes.predict as predict_route
from main import app
from models.schemas import PredictRequest
from services.predictor import (
    MissingFeaturesError,
    ModelUnavailableError,
    PredictionService,
)


ROOT_DIR = Path(__file__).resolve().parents[1]
client = TestClient(app)


class SuccessfulService:
    def predict(self, request: PredictRequest):
        return {
            "equipmentId": request.equipmentId,
            "equipmentCode": request.equipmentCode,
            "equipmentType": request.equipmentType,
            "failureProbability": 0.82,
            "predictedFailureType": "GEN_LOW_FUEL",
            "recommendedActions": ["Confirm the local tank gauge."],
            "confidence": 0.82,
            "modelVersion": "generator-failure-6h-test-v1",
        }


class MissingFeatureService:
    def predict(self, request: PredictRequest):
        raise MissingFeaturesError(["fuel_level_pct"])


class UnavailableService:
    def predict(self, request: PredictRequest):
        raise ModelUnavailableError("Model is unavailable")


class InvalidFeatureService:
    def predict(self, request: PredictRequest):
        from services.predictor import InvalidFeaturesError

        raise InvalidFeaturesError("fuel_level_pct must be numeric")


VALID_REQUEST = {
    "equipmentId": 1,
    "equipmentCode": "GENERATOR-01",
    "equipmentType": "GENERATOR",
    "readings": {"fuel_level_pct": 15.0},
}


def test_predict_contract_is_camel_case(monkeypatch):
    monkeypatch.setattr(predict_route, "prediction_service", SuccessfulService())
    response = client.post("/predict", json=VALID_REQUEST)

    assert response.status_code == 200
    assert response.json() == {
        "equipmentId": 1,
        "equipmentCode": "GENERATOR-01",
        "equipmentType": "GENERATOR",
        "failureProbability": 0.82,
        "predictedFailureType": "GEN_LOW_FUEL",
        "recommendedActions": ["Confirm the local tank gauge."],
        "confidence": 0.82,
        "modelVersion": "generator-failure-6h-test-v1",
    }


def test_unknown_equipment_type_is_rejected():
    request = {**VALID_REQUEST, "equipmentType": "TRANSFORMER"}
    response = client.post("/predict", json=request)
    assert response.status_code == 422


def test_missing_model_features_are_reported(monkeypatch):
    monkeypatch.setattr(predict_route, "prediction_service", MissingFeatureService())
    response = client.post("/predict", json=VALID_REQUEST)
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "MISSING_FEATURES"
    assert response.json()["detail"]["missingFeatures"] == ["fuel_level_pct"]


def test_unavailable_model_returns_service_unavailable(monkeypatch):
    monkeypatch.setattr(predict_route, "prediction_service", UnavailableService())
    response = client.post("/predict", json=VALID_REQUEST)
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "MODEL_UNAVAILABLE"


def test_invalid_model_features_are_reported(monkeypatch):
    monkeypatch.setattr(predict_route, "prediction_service", InvalidFeatureService())
    response = client.post("/predict", json=VALID_REQUEST)
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_FEATURES"


def test_health_is_degraded_when_model_manifest_is_missing(tmp_path):
    service = PredictionService(
        model_dir=tmp_path,
        catalog_path=ROOT_DIR / "data" / "diagnosis-catalog.json",
    )
    health = service.health()
    assert health.status == "degraded"
    assert not any(model.loaded for model in health.models.values())
    assert all(model.message for model in health.models.values())


@pytest.mark.skipif(
    not (ROOT_DIR / "saved_models" / "model_manifest.json").exists(),
    reason="Trained model artifacts are delivered outside ordinary git history.",
)
def test_saved_models_load_and_serve_real_predictions():
    service = PredictionService()
    assert service.health().status == "ok"
    manifest = json.loads(
        (ROOT_DIR / "saved_models" / "model_manifest.json").read_text(
            encoding="utf-8"
        )
    )
    for metadata in manifest["models"].values():
        artifact_path = ROOT_DIR / "saved_models" / metadata["artifact"]
        assert artifact_path.stat().st_size == metadata["sizeBytes"]
        assert hashlib.sha256(artifact_path.read_bytes()).hexdigest() == metadata[
            "sha256"
        ]

    files = {
        "GENERATOR": "generator",
        "MDP": "mdp",
        "SDP": "sdp",
        "UPS": "ups",
    }
    for equipment_id, (equipment_type, file_prefix) in enumerate(
        files.items(), start=1
    ):
        artifact = service.models[equipment_type]
        data = pd.read_csv(
            ROOT_DIR
            / "data"
            / "by_equipment_type"
            / f"{file_prefix}_training_dataset.csv"
        )
        row = data[data["data_split"] == "TEST"].iloc[0]

        def json_value(value):
            if pd.isna(value):
                return None
            return value.item() if isinstance(value, np.generic) else value

        request = PredictRequest(
            equipmentId=equipment_id,
            equipmentCode=str(row["equipment_id"]),
            equipmentType=equipment_type,
            readings={
                feature: json_value(row[feature])
                for feature in artifact["featureColumns"]
            },
        )
        response = service.predict(request)
        assert 0.0 <= response.failureProbability <= 1.0
        assert response.modelVersion == artifact["modelVersion"]
