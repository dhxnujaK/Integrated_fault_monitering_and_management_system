import json
from pathlib import Path
from typing import Any, Dict, Optional

import joblib
import pandas as pd

from models.schemas import HealthResponse, ModelHealth, PredictRequest, PredictResponse


SERVICE_VERSION = "1.0.0"
SUPPORTED_MODEL_TYPES = ("GENERATOR", "MDP", "SDP", "UPS")
ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_DIR = ROOT_DIR / "saved_models"
DEFAULT_CATALOG_PATH = ROOT_DIR / "data" / "diagnosis-catalog.json"
DEFAULT_FEATURE_CONFIG_PATH = ROOT_DIR / "data" / "feature_config.json"


class PredictionError(Exception):
    pass


class ModelUnavailableError(PredictionError):
    pass


class MissingFeaturesError(PredictionError):
    def __init__(self, features: list[str]):
        super().__init__("Missing required model features")
        self.features = features


class InvalidFeaturesError(PredictionError):
    pass


class PredictionService:
    def __init__(
        self,
        model_dir: Path = DEFAULT_MODEL_DIR,
        catalog_path: Path = DEFAULT_CATALOG_PATH,
        feature_config_path: Path = DEFAULT_FEATURE_CONFIG_PATH,
    ):
        self.model_dir = Path(model_dir)
        self.catalog_path = Path(catalog_path)
        self.feature_config_path = Path(feature_config_path)
        self.models: Dict[str, Dict[str, Any]] = {}
        self.load_errors: Dict[str, str] = {}
        self.catalog = self._load_catalog()
        self.configured_features = self._load_feature_config()
        self.reload_models()

    def _load_catalog(self) -> Dict[str, Dict[str, Any]]:
        with self.catalog_path.open(encoding="utf-8") as catalog_file:
            document = json.load(catalog_file)
        return {
            entry["datasetFailureType"]: entry
            for entry in document["entries"]
            if entry.get("datasetFailureType")
        }

    def _load_feature_config(self) -> Dict[str, list[str]]:
        with self.feature_config_path.open(encoding="utf-8") as config_file:
            document = json.load(config_file)
        return document["feature_columns_by_equipment_type"]

    def reload_models(self) -> None:
        self.models.clear()
        self.load_errors.clear()
        manifest_path = self.model_dir / "model_manifest.json"
        if not manifest_path.exists():
            self.load_errors["manifest"] = f"Model manifest not found at {manifest_path}"
            return

        try:
            with manifest_path.open(encoding="utf-8") as manifest_file:
                manifest = json.load(manifest_file)
        except (OSError, ValueError) as exc:
            self.load_errors["manifest"] = str(exc)
            return

        for equipment_type, metadata in manifest.get("models", {}).items():
            artifact_path = self.model_dir / metadata["artifact"]
            try:
                artifact = joblib.load(artifact_path)
                expected_features = [
                    feature
                    for feature in self.configured_features[equipment_type]
                    if feature not in artifact.get("droppedAllMissingFeatures", [])
                ]
                if artifact["featureColumns"] != expected_features:
                    raise ValueError(
                        "Model feature order does not match feature_config.json"
                    )
                self.models[equipment_type] = artifact
            except Exception as exc:
                self.load_errors[equipment_type] = str(exc)

    def health(self) -> HealthResponse:
        health_models: Dict[str, ModelHealth] = {}
        for equipment_type in SUPPORTED_MODEL_TYPES:
            artifact = self.models.get(equipment_type)
            health_models[equipment_type] = ModelHealth(
                loaded=artifact is not None,
                modelVersion=artifact.get("modelVersion") if artifact else None,
                message=(
                    self.load_errors.get(equipment_type)
                    or self.load_errors.get("manifest")
                ),
            )

        return HealthResponse(
            status="ok" if all(model.loaded for model in health_models.values()) else "degraded",
            serviceVersion=SERVICE_VERSION,
            models=health_models,
        )

    def predict(self, request: PredictRequest) -> PredictResponse:
        artifact = self.models.get(request.equipmentType)
        if artifact is None:
            raise ModelUnavailableError(
                f"No loaded six-hour model for equipment type {request.equipmentType}"
            )

        feature_columns = artifact["featureColumns"]
        missing_features = [
            feature for feature in feature_columns if feature not in request.readings
        ]
        if missing_features:
            raise MissingFeaturesError(missing_features)

        frame = pd.DataFrame(
            [{feature: request.readings.get(feature) for feature in feature_columns}]
        )
        try:
            probability = float(
                artifact["failurePipeline"].predict_proba(frame)[0, 1]
            )
        except (TypeError, ValueError) as exc:
            raise InvalidFeaturesError(str(exc)) from exc
        threshold = float(artifact["threshold"])
        predicted_type: Optional[str] = None

        failure_predicted = probability >= threshold
        if failure_predicted:
            type_pipeline = artifact.get("typePipeline")
            if type_pipeline is not None:
                try:
                    predicted_type = str(type_pipeline.predict(frame)[0])
                except (TypeError, ValueError) as exc:
                    raise InvalidFeaturesError(str(exc)) from exc
            else:
                predicted_type = artifact.get("defaultFailureType")

        recommendations: list[str] = []
        if predicted_type:
            diagnosis = self.catalog.get(predicted_type)
            if diagnosis:
                recommendations = [
                    action["action"] for action in diagnosis["correctiveActions"]
                ]

        return PredictResponse(
            equipmentId=request.equipmentId,
            equipmentCode=request.equipmentCode,
            equipmentType=request.equipmentType,
            failureProbability=round(probability, 6),
            predictedFailureType=predicted_type,
            recommendedActions=recommendations,
            confidence=round(
                probability if failure_predicted else 1.0 - probability,
                6,
            ),
            modelVersion=artifact["modelVersion"],
        )


prediction_service = PredictionService()
