# Integrated Fault Monitoring & Management System
## Remaining Implementation Plan — ML and Web Application

**Status:** Working plan for the remaining implementation
**Based on:** `sprint_plan 2.md`, the current repository implementation, and the agreed API contracts
**Delivery model:** Sprint 4 and Sprint 5, two weeks each
**Members:** Member 1, Member 2, Member 3, Member 4

---

## 1. Current Project Status

The following Sprint 2–3 foundation is already available in the repository:

- Spring Boot authentication, equipment persistence, equipment APIs, dashboard summary, status, readings and alarm APIs.
- Generator, ATS, MDP, SDP and UPS simulation and threshold evaluation.
- Alarm lifecycle: `ACTIVE`, `ACKNOWLEDGED` and automatic `RESOLVED` transitions.
- React live monitoring pages for Generator, ATS, MDP, SDP and UPS.
- Shared frontend API modules, polling and alarm acknowledgement integration.
- FastAPI health endpoint and a placeholder `/predict` endpoint.
- Backend tests pass and the React production build passes.

The remaining work is not to rebuild the monitoring foundation. It is to complete the ML prediction workflow and the outstanding Web application workflows described below.

### Main gaps found during the audit

- The ML service still returns dummy prediction values and has no trained model files or `feature_config.json`.
- Spring Boot has `Prediction` persistence but no ML client, scheduler or prediction REST endpoints.
- The React application has no Predictions page or prediction panels on subsystem pages.
- Maintenance ticket entities exist, but ticket service, controller, API client and UI are missing.
- Report generation and PDF/CSV download are missing; the current report action is only a UI placeholder.
- Settings are currently local visual controls, not persisted threshold/equipment/user administration.
- User-management APIs and admin-only settings controls are missing.
- Remaining mock operational data must be removed or isolated from the production path.
- Deployment configuration, environment documentation and final end-to-end verification are incomplete.

---

## 2. Shared Rules for Sprint 4 and Sprint 5

1. The Spring Boot backend is the only service called by React. React must never call FastAPI directly.
2. FastAPI is responsible only for model loading, feature validation and prediction inference.
3. All prediction, ticket, report, settings and user endpoints must follow the contracts in `sprint_plan 2.md`.
4. Use `equipmentId` as the relationship key and preserve `equipmentCode` and `equipmentType` for display.
5. API JSON fields use camelCase. Stored enum values remain uppercase.
6. A failed prediction must not stop monitoring or predictions for other equipment.
7. Every shared handoff must include the contract, a valid example, an empty/error example and a reproducible test.
8. No direct commits to `main`; work must be completed on feature branches and reviewed before merging.

---

# Section A — ML Implementation

## Sprint 4 — Train and Integrate Predictive Maintenance

**Duration:** Weeks 7–8  
**Goal:** Produce reliable, versioned predictions for every enabled equipment item and make them available through Spring Boot.

### Member 1 — Dataset Preparation and Model Training

**Tasks**

1. Collect and inspect historical readings and known failure/alarm records for Generator, ATS, MDP, SDP and UPS.
2. Clean the data and document missing values, outliers, units and equipment-specific fields.
3. Create the agreed features, including rolling mean/std, rate of change and time features where the data supports them.
4. Create failure labels using the agreed failure window and document the labelling assumptions.
5. Train and evaluate one model per supported equipment type.
6. Record precision, recall, F1-score and ROC-AUC for every model.
7. Export versioned model files to `ml-service/saved_models/`.
8. Create `ml-service/feature_config.json` containing the exact features required by each model.
9. Provide Member 2 with the model files, feature configuration, metrics and sample requests.

**Handoff acceptance**

- Every supported equipment type has a model or an explicitly documented reason why it is not yet supported.
- Model files load successfully with the selected Python dependencies.
- Feature names, order, units and missing-value handling are documented.
- A repeatable training/evaluation command is available.

### Member 2 — FastAPI Prediction Service and Spring Boot ML Integration

**FastAPI tasks**

1. Replace the placeholder predictor with startup model loading and model-version tracking.
2. Load and validate `feature_config.json`.
3. Implement inference using the supplied readings and return the agreed response:

   - `failureProbability`
   - `predictedFailureType`
   - `recommendedActions`
   - `confidence`
   - `modelVersion`

4. Return clear validation errors for missing or invalid features.
5. Add recommendation mapping for the supported predicted failure types.
6. Add health information showing whether required models are loaded.
7. Add tests for valid requests, missing features, unknown equipment types and model-loading failure.

**Spring Boot tasks**

1. Create an ML client that calls FastAPI `POST /predict` with timeout and retry handling.
2. Create a scheduled prediction job for every enabled equipment item.
3. Save prediction results, timestamp, equipment relationship and model version in the database.
4. Continue processing other equipment if one reading or ML request fails.
5. Implement:

   - `GET /api/predictions/latest`
   - `GET /api/equipment/{equipmentId}/predictions?page=&size=`

6. Add backend tests for scheduler behaviour, persistence, API responses and ML-service failure handling.

**Handoff acceptance**

- A real model response travels from FastAPI to Spring Boot and is persisted.
- The prediction APIs return the exact contract required by the React application.
- FastAPI is not exposed as a frontend dependency.

### Sprint 4 ML integration test

Configure one enabled equipment item, generate a reading, run the prediction scheduler, verify the stored prediction and retrieve it through both prediction APIs. Repeat with the ML service unavailable and confirm monitoring continues normally.

---

## Sprint 5 — ML Reliability, Evaluation and Production Readiness

**Duration:** Weeks 9–10  
**Goal:** Make the ML workflow maintainable, observable and safe to deploy.

### Member 1 — Model Quality and Maintenance

**Tasks**

1. Review Sprint 4 model metrics and improve weak equipment-specific models.
2. Verify feature distributions and prediction behaviour against normal, warning and critical readings.
3. Add model metadata: training date, model version, feature list and evaluation metrics.
4. Add a documented retraining procedure and model replacement procedure.
5. Test model compatibility with the deployed Python environment.
6. Prepare representative demo data for low-, medium- and high-risk predictions.

**Completion criteria**

- The team can explain the input features, labels, model version and limitations for each model.
- A model can be replaced without changing the React application or the Spring Boot API contract.

### Member 2 — ML Operations and Final Integration

**Tasks**

1. Add configuration for the FastAPI URL, request timeout, retry count and prediction schedule.
2. Add structured logs for model loading, inference failures and prediction persistence failures.
3. Add health checks for FastAPI, required model files and the Spring Boot-to-FastAPI connection.
4. Confirm prediction history pagination and latest-prediction queries under realistic data volume.
5. Add integration tests covering all five equipment types and disabled equipment.
6. Document local startup, environment variables and production startup for the ML service.
7. Support deployment rehearsal and rollback verification.

**Completion criteria**

- ML failures are visible to operators/developers and do not break live monitoring.
- Predictions are reproducible for the documented sample inputs.
- Deployment health checks identify missing models or unreachable services.

---

# Section B — Web Application Implementation

## Sprint 4 — Prediction Web Workflow

**Duration:** Weeks 7–8  
**Goal:** Display persisted predictions in the existing monitoring application using the shared Spring Boot APIs.

### Member 3 — Backend Prediction and Web Integration Support

**Tasks**

1. Review the prediction response and history contracts with Members 1 and 2.
2. Verify the backend prediction DTOs include equipment information, timestamps, probability, failure type, actions, confidence and model version.
3. Add or correct backend pagination, empty responses and error responses needed by the UI.
4. Provide seeded/demo prediction fixtures only for tests; do not leave them in the production data path.
5. Add API tests and an end-to-end fixture for latest prediction and prediction history.
6. Review frontend API usage and confirm that all prediction requests go through Spring Boot.

### Member 4 — Prediction User Interface

**Tasks**

1. Create `predictionApi.js` for the agreed backend endpoints.
2. Create a reusable prediction panel for probability, predicted failure type, recommended actions, confidence and model version.
3. Add the latest prediction to Generator, ATS, MDP, SDP and UPS pages.
4. Create `/predictions` with cross-equipment comparison and prediction history access.
5. Add loading, empty, offline and error states.
6. Poll predictions every 60 seconds and refetch immediately after relevant actions.
7. Add warning styling for high-risk predictions using one shared probability threshold helper.
8. Add Predictions to the navigation and protected routing.

**Sprint 4 Web acceptance**

- A user can open every equipment page and see its latest persisted prediction.
- A user can compare all enabled equipment on `/predictions`.
- No mock prediction is displayed as real data when the API is unavailable.
- Frontend build and API tests pass.

---

## Sprint 5 — Maintenance, Administration, Reports and Deployment

**Duration:** Weeks 9–10  
**Goal:** Complete the operational web workflows and prepare the whole system for delivery.

### Member 3 — Backend Operational Workflows

**Maintenance tickets**

1. Implement `TicketService` and `TicketController`.
2. Implement:

   - `POST /api/tickets`
   - `GET /api/tickets`
   - `GET /api/tickets/{ticketId}`
   - `PUT /api/tickets/{ticketId}`

3. Validate that linked alarms and predictions belong to the selected equipment.
4. Enforce `OPEN -> IN_PROGRESS -> CLOSED` transitions and role permissions.

**Reports**

5. Implement report queries for selected equipment/type and date range.
6. Generate authenticated PDF and CSV downloads through `GET /api/reports`.
7. Include readings, alarm totals, key summary values and report time range.

**Settings and users**

8. Implement persisted threshold configuration with validation and atomic updates.
9. Implement equipment administration: create, update and enable/disable without deleting history.
10. Implement admin-only user list, user creation and enable/disable operations.
11. Add authorization tests for Admin and Operator access.

### Member 4 — Web UI, Cleanup and Release Support

**Tasks**

1. Create `/tickets` with ticket list, creation form, filtering and permitted status updates.
2. Add “Create Ticket” actions to alarm and prediction views with relationships pre-filled.
3. Create `/reports` with equipment/type selector, date range, format selector and authenticated download.
4. Replace the current settings placeholder with admin-only equipment, threshold and user-management screens.
5. Add missing navigation and protected routes for Predictions, Tickets and Reports.
6. Remove or isolate mock operational fixtures and ensure API errors do not silently fall back to fake readings.
7. Add shared loading, empty, error, offline and permission-denied states.
8. Update environment configuration for local, test and production API URLs.
9. Prepare the production frontend build and deployment instructions.
10. Deploy or rehearse the deployment architecture:
    - MySQL on AWS RDS with access restricted to the backend service.
    - Spring Boot on a protected EC2 instance or approved equivalent.
    - FastAPI and model files on a protected service instance; port 8000 must not be publicly exposed.
    - React production build hosted through S3 and CloudFront, or the approved equivalent.
    - HTTPS, CORS, secrets and environment variables configured for the deployed domains.
11. Add service health checks, startup instructions, logs, backup guidance and rollback instructions.
12. Execute the final cross-browser and responsive UI check.

### Sprint 5 Web acceptance

- A user can create and update a maintenance ticket from an alarm or prediction.
- An authorized user can download PDF and CSV reports for a selected date range.
- Only Admin users can change thresholds, configure equipment or manage users.
- Operational history is preserved when equipment is disabled.
- The production frontend contains no unintentional mock monitoring data.
- RDS, Spring Boot, FastAPI and the React hosting service can be started, checked and rolled back using the documented procedure.
- The frontend build, backend tests and end-to-end workflow pass.

---

## 3. Final End-to-End Definition of Done

The project is complete when the team can demonstrate the following sequence:

1. Log in as Admin or Operator.
2. View live status, readings and alarms for all five equipment types.
3. Acknowledge an alarm and verify automatic resolution after the condition clears.
4. Generate and view a real ML prediction for enabled equipment.
5. Open prediction history and create a maintenance ticket from a prediction or alarm.
6. Update the ticket through its permitted lifecycle.
7. Generate and download a PDF and CSV report.
8. Log in as Admin and update a threshold, equipment configuration and user status.
9. Verify an Operator cannot access Admin-only actions.
10. Run the deployed health checks and confirm that a temporary ML-service failure does not stop monitoring.

All four members must review the final integration result. Each feature must have tests, documented environment variables and a reproducible local or deployed verification procedure.
