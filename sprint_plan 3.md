# Final Sprint — Execution Plan

**Status:** Execution plan for the final sprint
**Supersedes:** scheduling in `sprint_plan 2.md` §9–§11, and `sprint_plan3_n.md`
**Keeps from `sprint_plan3_n.md`:** the two-part split and its gap audit, which was verified correct
**Contracts:** `sprint_plan 2.md` §5–§8 remain frozen except where §5 below records an approved amendment
**Team:** Dhanuja · Nethmini · Achani · Onel
**Duration:** 10 working days

---

## 1. Verified Current State

Checked against the working tree. The Sprint 2–3 monitoring foundation is **complete**:

| Capability | Evidence |
|---|---|
| Equipment model, seed, backfill (readings + alarms only) | `entity/Equipment.java`, `EquipmentSeeder`, `EquipmentBackfillRunner` |
| Equipment / dashboard / status / readings / alarm APIs | `EquipmentController`, `DashboardController`, `AlarmController`, `EquipmentAlarmController`, `MonitoringService` |
| Alarm lifecycle incl. **automatic resolve** | `AlarmService.synchronizeCondition` |
| Acknowledge with note + user | `AlarmService.acknowledge` |
| Threshold + rule-based detection, all 5 types | `DataSimulationService`, `AlarmService` (§5.4 rules) |
| Method-level security enabled | `SecurityConfig` `@EnableMethodSecurity` |
| Live React pages, shared API modules, polling | `pages/`, `api/`, `hooks/useEquipmentMonitoring.js` |
| **Training dataset — 362,880 rows, 60 cols, 7 units, Jan–Jun 2025** | `ml-service/data/` incl. per-type splits + `feature_config.json` |
| **Fault/solution catalogue — 13 types with root causes and actions** | `ml-service/data/fault_solution_catalog.csv` |

### What the proposal requires, and where it stands

The proposal's six functional features are the acceptance bar. Status:

| Proposal feature | Status |
|---|---|
| Real-Time Monitoring (5 subsystems) | Built |
| Automated Fault Detection (threshold + rule-based) | Built |
| **Fault Diagnosis & Root Cause Analysis** | Catalogue content exists; **no engine, no API, no UI** |
| **Corrective Action Recommendations** ("step-by-step") | Content exists as prose; **not ordered, not exposed** |
| **Real-Time Dashboard** ("indicators, **charts**, alerts") | Indicators and alerts built; **charts missing entirely** |
| Alarm Generation & Notification | Built (in-app) |

Note the proposal does **not** mention machine learning, tickets, reports or user management. Those come from `sprint_plan 2.md`. Tiering in §2 reflects that: proposal-required work outranks contract-only work.

### Remaining gaps

**Prediction:** model training, FastAPI inference, Spring Boot ML client, scheduler, prediction APIs and UI.
**Diagnosis:** engine, taxonomy reconciliation, API, UI.
**Application:** tickets, reports, thresholds, equipment admin, user management, charts, mock cleanup, deployment.
**Migration:** `EquipmentBackfillRunner` covers only readings and alarms — not predictions or tickets. `User` has no `enabled` field. Role annotations exist in `EquipmentController` only.

---

## 2. Scope Decision

**Assumption: one sprint, ten working days.**

| Tier | Contents |
|---|---|
| **A — must ship** | **Diagnosis engine + step-by-step corrective actions, exposed and displayed**; **dashboard charts**; ticket workflow end to end; role rules on every new endpoint; mock cleanup; Day 9 end-to-end fault fixture; manual deployment runbook |
| **B — should ship** | **ML forecasting** (6-hour target primary) persisted and displayed; CSV reports; equipment admin UI |
| **C — pre-cut** | 15-minute prediction target; PDF reports; threshold-editing UI; user-management UI; automated AWS provisioning |

**Why ML is Tier B, not Tier A.** The proposal's differentiator is explaining faults, not forecasting them. If the sprint compresses, a system that diagnoses root causes without a model still satisfies the proposal; a model that forecasts but cannot explain does not. Part A delivers diagnosis first and prediction second, in that order.

---

## 3. The Two Parts

| Part | Members | Owns |
|---|---|---|
| **A — Diagnosis & Prediction** | **Dhanuja** (Python: taxonomy, catalogue, models, FastAPI) · **Nethmini** (Java: diagnosis engine, ML integration, prediction/diagnosis UI) | Fault → root cause → actions, and reading trajectory → forecast |
| **B — Application & Visualization** | **Onel** (Java: tickets, reports, settings, users) · **Achani** (React: charts, tickets, reports, settings UI) | Operational workflows, admin, charts, cleanup |

Each part owns a full vertical, split by layer inside the lane. `ml-service/**` sits with Dhanuja.

### Accepted staffing risks

1. **Onel writes Spring Boot for the first time** — scoped to repo patterns (`EquipmentController`/`EquipmentService` are templates), §7.7 frozen. **Nethmini reviews.**
2. **Nethmini writes React for the first time** — two panels and one page on Achani's existing components. **Achani reviews.**
3. **Nethmini carries four items** (migration, diagnosis engine, ML integration, UI). Her Tier A work lands first; the ML integration is Tier B and cuttable.

**Day 5 fallback:** if a stretch is too slow, swap that slice — Achani takes App-lane backend, or Onel takes back FastAPI. Decide at Day 5, not Day 9.

### Shared frontend layer

**Achani owns `App.jsx`, navigation, `api/axios.js` and all shared components** — including the chart component both lanes use. One Day 1 route commit serves both lanes.

---

## 4. Anti-Overlap Rules

**You commit only to files you own.** Need a change elsewhere — ask the owner.

### Backend

| Path | Owner |
|---|---|
| `ml-service/**` incl. `data/`, `scripts/`, models | **Dhanuja only** |
| `data/fault_code_map.json`, `diagnosis-catalog.json` | **Dhanuja** (content) |
| `diagnosis/**` engine, `DiagnosisController`, coverage test | **Nethmini** (machinery) |
| `ml/MlClient`, `ml/PredictionScheduler`, `service/PredictionService`, `controller/PredictionController`, `dto/Prediction*` | Nethmini |
| `entity/User.java`, `EquipmentBackfillRunner.java`, all existing monitoring code | **Nethmini — nobody else edits** |
| `service/TicketService`, `controller/TicketController`, `dto/Ticket*` | **Onel** (reviewed by Nethmini) |
| `service/ReportService`, `controller/ReportController` | Onel |
| `service/ThresholdService`, `controller/SettingsController`, `controller/UserController` | Onel |

### Frontend

| Path | Owner |
|---|---|
| `App.jsx`, navigation, shared states, `api/axios.js`, shared components, **`components/TrendChart.jsx`** | **Achani** |
| `api/predictionApi.js`, `api/diagnosisApi.js`, `components/DiagnosisPanel.jsx`, `components/PredictionPanel.jsx`, `pages/PredictionsPage.jsx` | Nethmini (reviewed by Achani) |
| `api/ticketApi.js`, `reportApi.js`, `settingsApi.js`; `pages/TicketsPage.jsx`, `ReportsPage.jsx`, `SettingsPage.jsx` | Achani |

### Conflict points — resolved Day 1, then frozen

1. **`App.jsx`** — Achani adds all new routes as shells in **one Day 1 commit**, then frozen.
2. **`Prediction.java`** — Nethmini adds `equipmentId` + `modelVersion`.
3. **`MaintenanceTicket.java`** — Onel adds `equipmentId`.
4. **`User.java`** — Nethmini adds `enabled` (default `true`).
5. **`EquipmentBackfillRunner.java`** — **Nethmini extends it for predictions *and* tickets in one commit.** Onel supplies the ticket repository finder; he does not edit the runner.
6. **`fault_code_map.json`** — Dhanuja authors it Day 1 (§5). Everything in Part A depends on it.
7. **Model artifacts** — Dhanuja's handoff is a **running FastAPI endpoint**, not code. Nethmini never edits Python; Dhanuja never writes Java.

---

## 5. Frozen Contracts and Amendments

- **Prediction endpoints** (§7.6): `GET /api/predictions/latest`, `GET /api/equipment/{equipmentId}/predictions?page=&size=`
- **FastAPI request/response** (§7.6): camelCase, `equipmentId`/`equipmentCode`/`equipmentType`; response `failureProbability`, `predictedFailureType`, `recommendedActions`, `confidence`, `modelVersion`
- **Tickets** (§7.7): four endpoints; `OPEN → IN_PROGRESS → CLOSED` only

⚠️ **`ml-service` violates §7.6 today** — `predictor.py` and `schemas.py` use snake_case and `subsystem` keys. Dhanuja's Day 1 correction is a prerequisite for the whole lane.

### Amendment — report formats

§7.8 freezes `format=PDF|CSV`, but PDF is Tier C. The endpoint keeps the parameter and returns **`501 Not Implemented`** with an explicit message for `PDF`. It must not silently return CSV, and the UI must not offer PDF while it 501s.

### New frozen artifact — fault code map (Day 1, blocking)

The dataset's 13 `failure_type` values and the 23 alarm codes the system raises have **only two exact matches**. Without reconciliation, diagnosis and prediction will disagree about what a fault is called.

```json
{ "datasetFailureType": "GEN_OVERHEAT", "alarmCodes": ["GEN_HIGH_TEMP"], "predictable": true }
{ "datasetFailureType": "FIRE_ALARM",
  "alarmCodes": ["GEN_FIRE","ATS_FIRE","MDP_FIRE","SDP_FIRE"], "predictable": false }
{ "datasetFailureType": null, "alarmCodes": ["GEN_CRITICAL_FUEL"], "predictable": false }
```

Known reconciliations Dhanuja must resolve:

| Kind | Cases |
|---|---|
| Exact match | `GEN_LOW_FUEL`, `MDP_PHASE_IMBALANCE` |
| One-character mismatch | `ATS_TRANSFER_FAILURE` (data) vs `ATS_TRANSFER_FAIL` (code) |
| Renamed | `GEN_OVERHEAT`↔`GEN_HIGH_TEMP`, `GEN_VOLTAGE_INSTABILITY`↔`GEN_VOLTAGE_ABNORMAL`, `UPS_OVERLOAD`↔`UPS_HIGH_LOAD`, `UPS_INPUT_POWER_LOSS`↔`UPS_ON_BATTERY`, `UPS_BATTERY_DEGRADATION`↔`UPS_BATTERY_LOW`/`UPS_BATTERY_CRITICAL` |
| Dataset-only | `MDP_SUPPLY_LOSS`, `SDP_SUPPLY_LOSS`, `SDP_BREAKER_TRIP` |
| Code-only (diagnosis, never predicted) | `GEN_CRITICAL_FUEL`, `GEN_FAULT`, `ATS_MAINS_VOLTAGE`, `MDP_PHASE_VOLTAGE`, `SDP_PHASE_VOLTAGE` |
| Collapsed | one `FIRE_ALARM` / `INTRUDER_ALARM` vs per-equipment variants |

### Diagnosis contract

Derived from `fault_solution_catalog.csv`, extended to cover **every** alarm code:

```json
{
  "key": "GEN_LOW_FUEL",
  "kind": "ALARM_CODE",
  "observablePattern": "Fuel level declines below 20% and continues toward the critical range.",
  "probableCauses": ["Fuel consumed during extended operation", "Fuel not replenished after testing"],
  "correctiveActions": [
    { "step": 1, "action": "Refill the day tank" },
    { "step": 2, "action": "Inspect the supply line" },
    { "step": 3, "action": "Update the refuelling schedule" }
  ]
}
```

`correctiveActions` **must be ordered** — the proposal says "step-by-step." A coverage test fails on any alarm code or predicted failure type with no entry. FastAPI's `recommendedActions` reads this same file; there is exactly one catalogue.

---

## 6. Cross-Cutting Rules From Day 1

**Security ships with the endpoint.** Every new endpoint declares its role rule in the *same PR*, with one authorization test proving an Operator is refused where required. A PR without one is returned unreviewed. Baseline per §12: settings, thresholds, users, equipment config are `ADMIN`; tickets, reports, alarms, predictions are `ADMIN, OPERATOR`. Day 8 becomes a sweep, not the first pass.

**Migration acceptance criteria** for `Prediction.equipmentId`, `Prediction.modelVersion`, `MaintenanceTicket.equipmentId`, `User.enabled`:

1. Nullable, or safe default (`User.enabled = true`); no existing row invalidated.
2. Legacy `subsystemType`/`subsystemId` remain populated and readable.
3. `EquipmentBackfillRunner` populates the relationship for all existing rows, joining `equipmentCode = subsystemId`.
4. Startup logs backfilled count per entity; a second startup backfills zero.
5. Rollback documented — dropping the column restores prior behaviour.

Day 1 is not signed off until a restart shows zero unbackfilled rows across readings, alarms, predictions and tickets.

**ML modelling discipline — mandatory, not optional.** The dataset is severely imbalanced:

| Target | Positive rate |
|---|---|
| `failure_within_15_min` | 0.08% (279 rows) |
| `failure_within_60_min` | 0.31% (1,116) |
| `failure_within_6_hours` | **1.32% (4,789) — primary target** |

1. **Report PR-AUC and per-class recall. Accuracy and ROC-AUC are banned as headline metrics** — always predicting "no failure" scores 99.92% accuracy on the 15-minute target.
2. Use the dataset's own `data_split` column. Do not re-split.
3. Apply class weighting or resampling; state which.
4. **Filter rows where prediction targets are blank** — 6,312 rows (1.74%) are blank during an active fault, exactly matching `target_fault_active = 1`. `read_csv` turns these into `NaN`; unfiltered they corrupt training silently.
5. **`FIRE_ALARM` and `INTRUDER_ALARM` are excluded from forecasting** — the catalogue states they have no telemetry precursor. Report them as diagnosis-only rather than as poor model performance.
6. The dataset is **synthetic**. Metrics demonstrate the pipeline, not real-world accuracy. State this in the report and the demo.

---

## 7. Part A — Diagnosis & Prediction

### Dhanuja — Python: taxonomy, catalogue, models, FastAPI

| Days | Work | Tier |
|---|---|---|
| 1 | **`fault_code_map.json`** (§5) — reconcile all 13 dataset types against all 23 alarm codes. **Blocks Nethmini; nothing else starts until it lands** | A |
| 1–2 | Correct `ml-service` to §7.6 (camelCase, equipment keys). Publish sample request/response | A |
| 2–3 | **Extend `fault_solution_catalog.csv` into `diagnosis-catalog.json`** — every alarm code covered, causes split into a list, actions split into **ordered steps** | A |
| 3–4 | Heuristic predictor + model-loading scaffold + validation errors + `/health` model status. **Unblocks Nethmini's ML slice** | A |
| 4–7 | Train per equipment type on the 6-hour target under all six §6 rules; record PR-AUC and per-class recall; export to `saved_models/` | B |
| 7–8 | Time-to-failure regression and risk-level classification if the 6-hour models are sound | B |
| 8–9 | Model report incl. synthetic-data caveat; FastAPI tests (valid, missing features, unknown type, model-load failure) | A |

### Nethmini — Java engine, ML integration, UI

| Days | Work | Tier |
|---|---|---|
| 1 | Four entity changes + **extend `EquipmentBackfillRunner` to predictions and tickets**; all five §6 criteria met | A |
| 1–3 | **Diagnosis engine**: load the catalogue, resolve via `fault_code_map`, `GET /api/diagnosis` + `GET /api/equipment/{id}/diagnosis`, embed causes and ordered actions in alarm responses, coverage test | A |
| 3–5 | `DiagnosisPanel` UI on equipment pages and alarm views — **this is the proposal's headline feature; it ships before any ML work** | A |
| 5–7 | `MlClient` with timeout/retry, `PredictionScheduler` over enabled equipment, persistence with model version, both §7.6 endpoints, role rules included | B |
| 7–8 | Tests: scheduler, persistence, pagination, **ML service unavailable** | B |
| 8–9 | `PredictionPanel` (probability, type, time-to-failure, confidence, model version) + `/predictions` page, 60s polling | B |
| ongoing | Review Onel's backend PRs; owner of existing monitoring code | A |

---

## 8. Part B — Application & Visualization

### Onel — Java backend

| Days | Work | Tier |
|---|---|---|
| 1 | `MaintenanceTicket.equipmentId` (§6 criteria); supply the ticket finder to Nethmini; publish ticket DTOs with valid + error examples | A |
| 1–4 | `TicketService` + `TicketController` (§7.7); validate linked alarm/prediction belongs to the equipment; enforce transitions; **role rules + authorization test in the same PR** | A |
| 4–6 | Report queries by equipment/type and date range; **CSV** export; `format=PDF` returns `501` | B |
| 6–8 | Persisted thresholds, validation, atomic update; `ADMIN` only | B |
| 8 | User-management API against the new `User.enabled`; `ADMIN` only | C |
| 8–9 | Authorization sweep across all new endpoints | A |
| 9–10 | Coordinate deployment | A |

### Achani — React

| Days | Work | Tier |
|---|---|---|
| 1 | **All routes + nav in one commit**, then `App.jsx` frozen | A |
| 1–2 | Shared loading / empty / error / offline / **permission-denied** states — serves both lanes | A |
| 2–4 | **`TrendChart` component + reading-history charts on all five equipment pages**, using the existing readings endpoint. Proposal-required — "indicators, charts, and alerts" | A |
| 4–6 | `/tickets`: list, create form, filters, permitted status updates, create-from-alarm with relationship pre-filled | A |
| 6–7 | `/reports`: equipment/type selector, date range, format selector — **CSV only; PDF hidden while it 501s** | B |
| 7–8 | `/settings`: **equipment administration tab only**. Threshold and user tabs not rendered until Tier C — no dead tabs | B/C |
| 8–9 | Mock cleanup: `VITE_USE_MOCK_MONITORING=false` default, no fixture rendered as a live reading, API errors surface as errors | A |
| ongoing | Review Nethmini's UI PRs | A |

---

## 9. Checkpoints

| When | Gate |
|---|---|
| **End Day 1** | `fault_code_map.json` merged; routes merged and `App.jsx` frozen; four entity changes merged with §6 criteria met; restart shows zero unbackfilled rows; `ml-service` matches §7.6. **Hard gate.** |
| **End Day 3** | Diagnosis engine live — an alarm returns probable causes and ordered corrective actions through the API. Coverage test green across all alarm codes. |
| **End Day 5** | `DiagnosisPanel` visible in the UI. Ticket API creating and transitioning tickets. Charts rendering. **Proposal-required scope is now complete — everything after this is Tier B.** Go/no-go on the §3 staffing fallback. |
| **End Day 8** | Predictions persisted and displayed with model version; `/tickets` complete; CSV report downloading. Cut Tier C now if either lane is behind. |
| **Day 9** | **End-to-end simulated-fault fixture passes** (below). |
| **Day 10** | Deployment rehearsal, regression, demo. |

If Day 5 slips, both lanes drop Tier B and converge on Tier A.

### Day 9 — required end-to-end fixture

A reproducible test owned by Nethmini per `sprint_plan 2.md` §4, required to pass before Day 10:

```text
drive simulator into a fault condition
  → alarm becomes ACTIVE
  → diagnosis returns probable causes and ordered corrective actions
  → prediction shows elevated risk for that equipment
  → ticket created from the alarm with the relationship pre-filled
  → ticket advances OPEN → IN_PROGRESS → CLOSED
  → CSV report exported covering the window
  → condition returns to normal
  → alarm auto-resolves
```

Negative path: with the ML service stopped, monitoring, alarms, **diagnosis**, tickets and reports all continue working.

### Deployment (Day 9–10, all four)

Onel coordinates. Each service owner supplies their own build, environment-variable documentation, health check and rollback steps. Manual deployment is the target; automation is Tier C.

---

## 10. Definition of Done

1. Log in as Admin, then as Operator.
2. View live status, readings and alarms for all five equipment types.
3. **See reading-history charts on every equipment page.**
4. Acknowledge an alarm; watch it auto-resolve when the condition clears.
5. **Open any alarm and see its probable causes and numbered corrective actions.**
6. View the latest prediction with model version and time-to-failure.
7. Compare enabled equipment on `/predictions`; open prediction history.
8. Create a ticket from an alarm, relationship pre-filled.
9. Move the ticket `OPEN → IN_PROGRESS → CLOSED`.
10. Download a CSV report; confirm PDF is not offered while unimplemented.
11. Confirm an Operator is refused every Admin-only action.
12. Stop the ML service — monitoring, alarms, **diagnosis**, tickets and reports keep working.
13. The Day 9 fixture passes end to end.

Plus: backend tests pass, frontend build passes, diagnosis coverage test passes, model report states PR-AUC and the synthetic-data caveat, no mock operational data in the production path.

---

## 11. Risks

| Risk | Control |
|---|---|
| Model looks excellent but is useless | §6 bans accuracy/ROC-AUC as headline metrics; PR-AUC and per-class recall required; 6-hour target primary |
| Blank targets corrupt training | §6 rule 4 — filter the 6,312 rows where `target_fault_active = 1` |
| Diagnosis and prediction disagree on fault names | `fault_code_map.json` is a Day 1 blocking artifact; coverage test enforces it |
| Diagnosis slips behind ML and the proposal's core promise is unmet | Diagnosis is Tier A and lands Day 3–5; ML is Tier B and starts after |
| Charts forgotten again | Tier A, Days 2–4, DoD item 3 |
| Synthetic metrics presented as real accuracy | Caveat required in the model report and the demo |
| Day 1 schema changes leave orphaned rows | Five §6 criteria; Day 1 gate requires a clean restart |
| `EquipmentBackfillRunner` edited by two people | Nethmini owns it outright; Onel supplies a finder only |
| New endpoints ship under-protected | Role rule + authorization test in the same PR |
| Three people on unfamiliar stacks | Named reviewer each; Day 5 swap-back trigger |
| Nethmini carries four items | Tier A work first; her ML integration is Tier B and cuttable |
