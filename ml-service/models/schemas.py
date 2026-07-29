from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


EquipmentType = Literal["GENERATOR", "ATS", "MDP", "SDP", "UPS"]


class PredictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    equipmentId: int = Field(gt=0)
    equipmentCode: str = Field(min_length=1, max_length=50)
    equipmentType: EquipmentType
    readings: Dict[str, Any]


class PredictResponse(BaseModel):
    equipmentId: int
    equipmentCode: str
    equipmentType: EquipmentType
    failureProbability: float = Field(ge=0.0, le=1.0)
    predictedFailureType: Optional[str]
    recommendedActions: List[str]
    confidence: float = Field(ge=0.0, le=1.0)
    modelVersion: str


class ModelHealth(BaseModel):
    loaded: bool
    modelVersion: Optional[str] = None
    message: Optional[str] = None


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    serviceVersion: str
    models: Dict[str, ModelHealth]
