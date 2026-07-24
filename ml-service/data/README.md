# ML datasets

The large training CSVs are **not** committed to git (too heavy). They are shared
out-of-band via Google Drive and reproducible from `../scripts/generate_training_dataset.mjs`.

| File | In git? | Source |
|---|---|---|
| `fault_solution_catalog.csv` | ✅ tracked | small; diagnosis content |
| `feature_config.json` | ✅ tracked | small; per-type feature lists |
| `fault_code_map.json` | ✅ tracked | dataset↔alarm-code reconciliation (frozen Day 1) |
| `expressway_power_training_dataset.csv` (96 MB) | ❌ Drive / regenerate | combined training set |
| `by_equipment_type/*.csv` (73 MB) | ❌ Drive / regenerate | per-type splits |
| `../../outputs/` | ❌ regenerate | dataset overview + validation |

Owner: Dhanuja. To regenerate: `node ml-service/scripts/generate_training_dataset.mjs`.
