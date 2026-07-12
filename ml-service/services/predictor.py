from models.schemas import PredictRequest, PredictResponse


def predict_failure(request: PredictRequest) -> PredictResponse:
    return PredictResponse(
        subsystem=request.subsystem,
        subsystemId=request.subsystemId,
        failure_probability=0.1,
        predicted_failure_type="None",
        recommended_actions=[],
        confidence=0.0,
    )