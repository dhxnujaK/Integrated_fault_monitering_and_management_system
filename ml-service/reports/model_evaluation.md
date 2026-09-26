# Six-Hour Failure Prediction Model Report

Generated: 2026-07-28T18:03:25.890983+00:00

The models were trained on simulator-generated realistic training data. The metrics validate the software pipeline and do not represent field deployment accuracy.

The existing chronological TRAIN, VALIDATION and TEST partitions were used. Active-fault rows and blank prediction targets were excluded. Candidate selection used validation PR-AUC, thresholds used validation F2, and TEST was evaluated once.

| Equipment | Selected model | Test PR-AUC | Failure recall | Precision | F1 | Threshold |
|---|---|---:|---:|---:|---:|---:|
| GENERATOR | random_forest | 0.9392 | 0.9217 | 0.8275 | 0.8721 | 0.4223 |
| MDP | logistic_regression | 0.8988 | 0.8194 | 1.0000 | 0.9008 | 0.9913 |
| SDP | logistic_regression | 0.9239 | 0.9100 | 0.8198 | 0.8626 | 0.8833 |
| UPS | logistic_regression | 0.9364 | 1.0000 | 0.7226 | 0.8389 | 0.6691 |

## Fault-Type Models

Generator and UPS use a secondary classifier when a six-hour failure is predicted. MDP and SDP have one forecastable fault type and use that type directly.

## Detailed Metrics

See `model_evaluation.json` for candidate metrics, confusion matrices, row counts and fault-type classifier results.
