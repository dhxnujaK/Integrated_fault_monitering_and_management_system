from typing import Dict, List, Literal

from pydantic import BaseModel, Field


SubsystemName = Literal["GENERATOR", "ATS", "MDP", "SDP", "UPS"]


class PredictRequest(BaseModel):
    subsystem: SubsystemName
    subsystemId: str = Field(..., alias="subsystemId")
    readings: Dict[str, object]


class PredictResponse(BaseModel):
    subsystem: SubsystemName
    subsystemId: str = Field(..., alias="subsystemId")
    failure_probability: float
    predicted_failure_type: str
    recommended_actions: List[str]
    confidence: float


class HealthResponse(BaseModel):
    status: str