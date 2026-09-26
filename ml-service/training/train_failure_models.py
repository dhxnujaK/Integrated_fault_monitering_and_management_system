import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
MODEL_DIR = ROOT_DIR / "saved_models"
REPORT_DIR = ROOT_DIR / "reports"
TARGET_COLUMN = "target_failure_within_6_hours"
EQUIPMENT_FILES = {
    "GENERATOR": "generator_training_dataset.csv",
    "MDP": "mdp_training_dataset.csv",
    "SDP": "sdp_training_dataset.csv",
    "UPS": "ups_training_dataset.csv",
}


def build_preprocessor(frame: pd.DataFrame) -> ColumnTransformer:
    numeric_columns = [
        column
        for column in frame.columns
        if pd.api.types.is_numeric_dtype(frame[column])
        and not pd.api.types.is_bool_dtype(frame[column])
    ]
    categorical_columns = [
        column for column in frame.columns if column not in numeric_columns
    ]

    numeric_pipeline = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        [
            ("numeric", numeric_pipeline, numeric_columns),
            ("categorical", categorical_pipeline, categorical_columns),
        ]
    )


def candidate_pipelines(frame: pd.DataFrame) -> dict[str, Pipeline]:
    return {
        "logistic_regression": Pipeline(
            [
                ("preprocessor", build_preprocessor(frame)),
                (
                    "classifier",
                    LogisticRegression(
                        class_weight="balanced",
                        max_iter=2000,
                        random_state=42,
                        solver="liblinear",
                    ),
                ),
            ]
        ),
        "random_forest": Pipeline(
            [
                ("preprocessor", build_preprocessor(frame)),
                (
                    "classifier",
                    RandomForestClassifier(
                        n_estimators=120,
                        max_depth=16,
                        min_samples_leaf=2,
                        class_weight="balanced_subsample",
                        n_jobs=-1,
                        random_state=42,
                    ),
                ),
            ]
        ),
    }


def select_threshold(labels: pd.Series, probabilities: np.ndarray) -> float:
    precision, recall, thresholds = precision_recall_curve(labels, probabilities)
    if thresholds.size == 0:
        return 0.5
    beta_squared = 4.0
    denominator = beta_squared * precision[:-1] + recall[:-1]
    scores = np.divide(
        (1.0 + beta_squared) * precision[:-1] * recall[:-1],
        denominator,
        out=np.zeros_like(denominator),
        where=denominator != 0,
    )
    return float(thresholds[int(np.nanargmax(scores))])


def binary_metrics(
    labels: pd.Series, probabilities: np.ndarray, threshold: float
) -> dict[str, Any]:
    predictions = (probabilities >= threshold).astype(int)
    matrix = confusion_matrix(labels, predictions, labels=[0, 1])
    return {
        "prAuc": float(average_precision_score(labels, probabilities)),
        "failureRecall": float(recall_score(labels, predictions, zero_division=0)),
        "precision": float(precision_score(labels, predictions, zero_division=0)),
        "f1": float(f1_score(labels, predictions, zero_division=0)),
        "threshold": float(threshold),
        "confusionMatrix": matrix.astype(int).tolist(),
        "positiveRows": int(labels.sum()),
        "rows": int(len(labels)),
    }


def train_type_pipeline(
    data: pd.DataFrame, feature_columns: list[str]
) -> tuple[Pipeline | None, str | None, dict[str, Any]]:
    positive = data[
        (data[TARGET_COLUMN] == 1) & data["target_failure_type"].notna()
    ].copy()
    if positive.empty:
        return None, None, {}

    default_type = str(positive["target_failure_type"].mode().iloc[0])
    classes = sorted(positive["target_failure_type"].unique().tolist())
    if len(classes) == 1:
        return None, default_type, {"classes": classes, "testMacroF1": 1.0}

    train = positive[positive["data_split"] == "TRAIN"]
    validation = positive[positive["data_split"] == "VALIDATION"]
    test = positive[positive["data_split"] == "TEST"]
    training_data = pd.concat([train, validation], ignore_index=True)
    pipeline = Pipeline(
        [
            ("preprocessor", build_preprocessor(training_data[feature_columns])),
            (
                "classifier",
                LogisticRegression(
                    class_weight="balanced",
                    max_iter=2000,
                    random_state=42,
                    solver="liblinear",
                ),
            ),
        ]
    )
    pipeline.fit(
        training_data[feature_columns], training_data["target_failure_type"]
    )
    test_predictions = pipeline.predict(test[feature_columns])
    metrics = {
        "classes": classes,
        "testMacroF1": float(
            f1_score(
                test["target_failure_type"],
                test_predictions,
                average="macro",
                zero_division=0,
            )
        ),
        "testRows": int(len(test)),
    }
    return pipeline, default_type, metrics


def train_equipment_model(
    equipment_type: str,
    feature_columns: list[str],
    model_version_date: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    data_path = DATA_DIR / "by_equipment_type" / EQUIPMENT_FILES[equipment_type]
    data = pd.read_csv(data_path)
    eligible = data[
        (data["target_fault_active"] == 0) & data[TARGET_COLUMN].notna()
    ].copy()

    train = eligible[eligible["data_split"] == "TRAIN"]
    validation = eligible[eligible["data_split"] == "VALIDATION"]
    test = eligible[eligible["data_split"] == "TEST"]
    usable_feature_columns = [
        column for column in feature_columns if train[column].notna().any()
    ]
    dropped_feature_columns = sorted(set(feature_columns) - set(usable_feature_columns))

    candidates = candidate_pipelines(train[usable_feature_columns])
    validation_results: dict[str, dict[str, Any]] = {}
    best_name = ""
    best_pipeline: Pipeline | None = None
    best_score = -1.0
    best_threshold = 0.5

    for candidate_name, pipeline in candidates.items():
        pipeline.fit(
            train[usable_feature_columns], train[TARGET_COLUMN].astype(int)
        )
        probabilities = pipeline.predict_proba(
            validation[usable_feature_columns]
        )[:, 1]
        threshold = select_threshold(
            validation[TARGET_COLUMN].astype(int), probabilities
        )
        metrics = binary_metrics(
            validation[TARGET_COLUMN].astype(int), probabilities, threshold
        )
        validation_results[candidate_name] = metrics
        if metrics["prAuc"] > best_score:
            best_name = candidate_name
            best_pipeline = pipeline
            best_score = metrics["prAuc"]
            best_threshold = threshold

    if best_pipeline is None:
        raise RuntimeError(f"No model candidate trained for {equipment_type}")

    test_probabilities = best_pipeline.predict_proba(
        test[usable_feature_columns]
    )[:, 1]
    test_metrics = binary_metrics(
        test[TARGET_COLUMN].astype(int), test_probabilities, best_threshold
    )

    final_pipeline = clone(candidates[best_name])
    final_training = pd.concat([train, validation], ignore_index=True)
    final_pipeline.fit(
        final_training[usable_feature_columns],
        final_training[TARGET_COLUMN].astype(int),
    )

    type_pipeline, default_type, type_metrics = train_type_pipeline(
        eligible, usable_feature_columns
    )
    model_version = (
        f"{equipment_type.lower()}-failure-6h-{model_version_date}-v1"
    )
    artifact = {
        "equipmentType": equipment_type,
        "modelVersion": model_version,
        "targetColumn": TARGET_COLUMN,
        "featureColumns": usable_feature_columns,
        "threshold": best_threshold,
        "failurePipeline": final_pipeline,
        "typePipeline": type_pipeline,
        "defaultFailureType": default_type,
        "selectedCandidate": best_name,
        "droppedAllMissingFeatures": dropped_feature_columns,
    }
    report = {
        "modelVersion": model_version,
        "selectedCandidate": best_name,
        "validationCandidates": validation_results,
        "test": test_metrics,
        "faultTypeModel": type_metrics,
        "trainingRows": int(len(train)),
        "validationRows": int(len(validation)),
        "testRows": int(len(test)),
        "droppedAllMissingFeatures": dropped_feature_columns,
    }
    return artifact, report


def write_markdown_report(
    reports: dict[str, dict[str, Any]], generated_at: str
) -> None:
    lines = [
        "# Six-Hour Failure Prediction Model Report",
        "",
        f"Generated: {generated_at}",
        "",
        "The models were trained on simulator-generated realistic training data. "
        "The metrics validate the software pipeline and do not represent field deployment accuracy.",
        "",
        "The existing chronological TRAIN, VALIDATION and TEST partitions were used. "
        "Active-fault rows and blank prediction targets were excluded. Candidate selection "
        "used validation PR-AUC, thresholds used validation F2, and TEST was evaluated once.",
        "",
        "| Equipment | Selected model | Test PR-AUC | Failure recall | Precision | F1 | Threshold |",
        "|---|---|---:|---:|---:|---:|---:|",
    ]
    for equipment_type, report in reports.items():
        test = report["test"]
        lines.append(
            f"| {equipment_type} | {report['selectedCandidate']} | "
            f"{test['prAuc']:.4f} | {test['failureRecall']:.4f} | "
            f"{test['precision']:.4f} | {test['f1']:.4f} | "
            f"{test['threshold']:.4f} |"
        )

    lines.extend(
        [
            "",
            "## Fault-Type Models",
            "",
            "Generator and UPS use a secondary classifier when a six-hour failure is predicted. "
            "MDP and SDP have one forecastable fault type and use that type directly.",
            "",
            "## Detailed Metrics",
            "",
            "See `model_evaluation.json` for candidate metrics, confusion matrices, row counts "
            "and fault-type classifier results.",
            "",
        ]
    )
    (REPORT_DIR / "model_evaluation.md").write_text(
        "\n".join(lines), encoding="utf-8"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--version-date",
        default=datetime.now(timezone.utc).strftime("%Y%m%d"),
        help="Date component used in model versions (YYYYMMDD).",
    )
    args = parser.parse_args()

    with (DATA_DIR / "feature_config.json").open(encoding="utf-8") as config_file:
        config = json.load(config_file)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).isoformat()
    reports: dict[str, dict[str, Any]] = {}
    manifest: dict[str, Any] = {
        "generatedAt": generated_at,
        "target": TARGET_COLUMN,
        "models": {},
    }

    for equipment_type in EQUIPMENT_FILES:
        print(f"Training {equipment_type}...")
        artifact, report = train_equipment_model(
            equipment_type,
            config["feature_columns_by_equipment_type"][equipment_type],
            args.version_date,
        )
        artifact_name = f"{equipment_type.lower()}_failure_6h.joblib"
        joblib.dump(artifact, MODEL_DIR / artifact_name, compress=3)
        artifact_path = MODEL_DIR / artifact_name
        artifact_hash = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
        reports[equipment_type] = report
        manifest["models"][equipment_type] = {
            "artifact": artifact_name,
            "modelVersion": artifact["modelVersion"],
            "threshold": artifact["threshold"],
            "selectedCandidate": artifact["selectedCandidate"],
            "sizeBytes": artifact_path.stat().st_size,
            "sha256": artifact_hash,
        }
        print(
            f"  selected={report['selectedCandidate']} "
            f"test_pr_auc={report['test']['prAuc']:.4f} "
            f"test_recall={report['test']['failureRecall']:.4f}"
        )

    (MODEL_DIR / "model_manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    (REPORT_DIR / "model_evaluation.json").write_text(
        json.dumps(
            {
                "generatedAt": generated_at,
                "target": TARGET_COLUMN,
                "equipment": reports,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    write_markdown_report(reports, generated_at)


if __name__ == "__main__":
    main()
