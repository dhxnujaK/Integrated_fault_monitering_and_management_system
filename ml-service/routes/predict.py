from fastapi import APIRouter

from models.schemas import PredictRequest, PredictResponse
from services.predictor import predict_failure

router = APIRouter()


@router.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    return predict_failure(request)