# Model artifacts

`model_manifest.json` records the model version, selected estimator, threshold,
file size and SHA-256 checksum for every equipment model.

The `.joblib` files are not stored in ordinary git history. Deliver them with
the ML-service release and verify their checksums against the manifest before
deployment. Rebuild all artifacts with:

```bash
python training/train_failure_models.py
```
