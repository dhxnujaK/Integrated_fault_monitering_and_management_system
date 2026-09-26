from fastapi import APIRouter, HTTPException

from models.schemas import HealthResponse, PredictRequest, PredictResponse
from services.predictor import (
    InvalidFeaturesError,
    MissingFeaturesError,
    ModelUnavailableError,
    prediction_service,
)


router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return prediction_service.health()


@router.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest) -> PredictResponse:
    try:
        return prediction_service.predict(request)
    except MissingFeaturesError as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "MISSING_FEATURES",
                "message": str(exc),
                "missingFeatures": exc.features,
            },
        ) from exc
    except InvalidFeaturesError as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_FEATURES",
                "message": str(exc),
            },
        ) from exc
    except ModelUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail={"code": "MODEL_UNAVAILABLE", "message": str(exc)},
        ) from exc
