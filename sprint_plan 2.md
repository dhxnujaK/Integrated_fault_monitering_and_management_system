# Integrated Fault Monitoring & Management System
## Revised Delivery and Integration Plan — Power Module

**Status:** Working source of truth
**Revised:** 2026-07-13
**Team:** Dhanuja · Nethmini · Achani · Onel
**Delivery model:** 5 sprints × 2 weeks
**Stack:** React + Vite · Spring Boot · Python FastAPI · MySQL · AWS

This revision replaces the original task-only plan. It records the work already present in the repository, resolves duplicated product surfaces, defines the contracts shared by the four developers, and redistributes incomplete Sprint 2–3 work before Sprint 4 begins.

---

## 1. Confirmed Product Decisions

1. **No separate Alarms page in the main navigation.**
   - The Dashboard shows a system-wide alarm summary and an expandable/filterable alarm centre.
   - Each subsystem page shows alarms only for the selected equipment.
   - Both views use the same backend alarm records and acknowledgement endpoint.

2. **Alarm lifecycle is explicit.**
   - A detected fault creates an `ACTIVE` alarm.
   - An Admin or Operator may acknowledge it, changing it to `ACKNOWLEDGED`.
   - Acknowledgement means the alarm was seen; it does not mean the fault is gone.
   - The alarm becomes `RESOLVED` automatically only after its triggering condition returns to normal.
   - If the condition returns after resolution, a new alarm occurrence is created.

3. **Equipment instances are configurable by an Admin.**
   - The supported equipment types are `GENERATOR`, `ATS`, `MDP`, `SDP`, and `UPS`.
   - The number, code, name, location, and enabled state of equipment instances are not hardcoded.
   - Equipment with historical readings, alarms, predictions, or tickets is disabled rather than deleted.
   - For this delivery, equipment configuration registers logical equipment and drives simulation. Real controller connection settings are future scope unless separately approved.

4. **Predictions and maintenance are contextual.**
   - A subsystem page shows the latest prediction for its selected equipment.
   - A Predictions view compares equipment and provides prediction history.
   - Tickets are managed centrally, but can be created from an alarm or prediction with the relationship pre-filled.

5. **Reports use one implementation.**
   - A Reports view builds cross-equipment or per-equipment reports.
   - A subsystem page may open Reports with its equipment preselected; it does not implement a second reporting workflow.

---

## 2. Repository Audit at Revision Time

| Area | Implemented | Missing or incomplete |
|---|---|---|
| Sprint 1 foundation | JPA entities/repositories, JWT authentication, protected React routing, FastAPI health and placeholder prediction | Automated tests cover only application startup; environment configuration still contains development defaults |
| Dhanuja Sprint 2–3 | Generator, ATS, MDP and SDP simulation; threshold checks and alarm creation for those types | UPS simulation/rules; equipment-driven simulation |
| Nethmini Sprint 2–3 | Authentication foundation | Generic monitoring APIs, persisted alarm acknowledgement and automatic alarm resolution |
| Backend REST API | Authentication endpoints | Equipment, dashboard, status, readings, alarms, acknowledgement, history and subsystem APIs |
| Current `Dev_main` UI | Builds successfully; complete mock visual shell | Operational pages still use mock/local state and do not consume live monitoring APIs |
| `Achani_New` | Live Generator, ATS, MDP and SDP pages; polling hook; shared cards/badges; subsystem alarm acknowledgement calls | Calls backend endpoints that do not exist; hardcodes equipment IDs in places; branch has no merge base with `Dev_main` |
| `Onel` | Alarm summary and subsystem alarm presentation | Uses mock local state and lowercase UI statuses; no backend calls |
| UPS | Mock visual page | No complete end-to-end simulation, rules, API or live UI |

Verification performed at revision time:

- Current React production build passes.
- Current Spring Boot test task passes against the configured local database.
- `origin/Achani_New` and `origin/Onel` were inspected without merging them.

### Branch integration rule

- Do not merge `Achani_New` directly because it has no common Git ancestor with `Dev_main`.
- Create a clean branch from the latest `Dev_main`, then selectively reapply or cherry-pick the frontend-only work after the shared API contract is approved.
- Do not bring Achani's H2, security, or backend configuration changes into the integration branch without backend-owner review.
- Onel must rebase or merge the latest `Dev_main` before adapting the alarm UI, and must replace mock state with the shared API client.

---

## 3. Target Architecture and Ownership Boundaries

```text
React frontend
  -> calls only the documented Spring Boot /api endpoints

Spring Boot backend
  -> owns authentication, equipment, readings, alarms, predictions,
     tickets, settings, reports and database persistence
  -> calls FastAPI internally for prediction

FastAPI ML service
  -> accepts the documented prediction request
  -> never connects directly to React or MySQL

MySQL
  -> system of record for equipment and all operational history
```

No developer may introduce a second API shape, enum spelling, equipment list, or alarm lifecycle inside their feature. Shared behaviour belongs in the shared layer described below.

### Integration invariants

1. `equipmentId` is an additive, nullable relationship during migration. Existing `subsystemType` and `subsystemId` remain populated and compatible until historical records are backfilled.
2. Seeded `equipmentCode` values must exactly match the current subsystem IDs: `GENERATOR-01`, `ATS-01`, `MDP-01`, `SDP-01`, `SDP-02`, `UPS-01`, and `UPS-02`.
3. The unresolved alarm deduplication key transitions from legacy `alarmCode + subsystemId` to `alarmCode + equipmentId` only after `equipmentId` has been backfilled.
4. Nethmini owns persisted lifecycle transitions: users acknowledge `ACTIVE -> ACKNOWLEDGED`; the backend automatically resolves `ACTIVE` or `ACKNOWLEDGED -> RESOLVED` when the triggering condition clears. There is no manual resolve action.
5. DTO fields are endpoint-scoped. Status responses use `activeAlarmCount` and `acknowledgedAlarmCount`; dashboard totals use their documented summary fields; alarm-list responses use the Section 7.5 alarm object. Fixtures must match the endpoint they emulate.

---

## 4. Shared Artifacts Between Developers

Every shared artifact has one primary owner. Consumers review its contract before implementation. After approval, breaking changes require approval from the owner and all affected consumers.

| Shared artifact | Primary owner | Required consumers/reviewers | Must be delivered before |
|---|---|---|---|
| Equipment entity, repository and seed data | Dhanuja | Nethmini, Achani, Onel | Any dynamic subsystem API or UI |
| Sensor field names and units | Dhanuja | Nethmini, Achani, Onel | Simulator, status UI and ML work |
| REST paths, DTOs, enums and errors | Nethmini | Achani and Onel; Dhanuja for sensor payloads | Frontend API integration |
| Alarm lifecycle and threshold evaluation framework | Nethmini | Dhanuja and Onel | Alarm acknowledgement/history UI |
| React API client, polling hook and shared async states | Achani | Onel; Nethmini reviews API alignment | Any live subsystem page |
| React status, reading and alarm components | Achani | Onel | UPS, Dashboard and prediction UI |
| Dashboard alarm-centre behaviour | Onel | Achani and Nethmini | Sprint 2–3 integration demo |
| ML request/response and `feature_config.json` | Onel | Dhanuja and Nethmini | Model training export and scheduler |
| Environment variable names and deployment configuration | Onel | All developers | Deployment rehearsal |
| End-to-end test fixtures and demo scenario | Nethmini | All developers | Every sprint demo |

### Required handoff format

For each shared endpoint or component, the owner must provide:

1. Contract or prop definition.
2. Valid example.
3. Empty/error example.
4. Acceptance test or reproducible check.
5. Named consumer who reviewed it.

“Backend finished” is not a valid handoff until the consuming frontend can run against it.

---

## 5. Shared Domain Model

### 5.1 Equipment

`equipment` is the source of truth for every configured device.

| Field | Type | Rules |
|---|---|---|
| `id` | `BIGINT` | Database-generated primary key |
| `equipment_code` | `VARCHAR(50)` | Required, unique, stable; e.g. `UPS-04` |
| `equipment_type` | enum | `GENERATOR`, `ATS`, `MDP`, `SDP`, `UPS` |
| `display_name` | `VARCHAR(120)` | Required user-facing name |
| `location` | `VARCHAR(200)` | Required |
| `description` | `VARCHAR(500)` | Optional |
| `enabled` | boolean | Defaults to `true` |
| `created_at` | timestamp | Server-generated |
| `updated_at` | timestamp | Server-generated |

`sensor_readings`, `alarms`, `predictions`, and `maintenance_tickets` must reference `equipment.id`. `equipmentCode` and `equipmentType` may be included in response DTOs for display, but the numeric equipment ID is the relationship key.

### 5.2 Shared enums

All API enum values are uppercase.

```text
EquipmentType: GENERATOR | ATS | MDP | SDP | UPS
OverallStatus: NORMAL | WARNING | CRITICAL | OFFLINE
AlarmSeverity: WARNING | CRITICAL
AlarmStatus: ACTIVE | ACKNOWLEDGED | RESOLVED
TicketStatus: OPEN | IN_PROGRESS | CLOSED
TicketPriority: LOW | MEDIUM | HIGH
Role: ADMIN | OPERATOR
```

The frontend must not translate stored values to lowercase. It may map enum values to labels or CSS classes in one shared presentation helper.

### 5.3 Sensor payloads

The `latestReading` and reading-history `data` object use these exact keys.

**Generator:** `voltage_L1`, `voltage_L2`, `voltage_L3`, `current_L1`, `current_L2`, `current_L3`, `fuel_level_pct`, `frequency_hz`, `running_status`, `breaker_status`, `room_temperature_c`, `intruder_alarm`, `fire_alarm`.

**ATS:** `active_source`, `mains_voltage`, `generator_voltage`, `transfer_status`, `breaker_status`, `last_transfer_at`, `room_temperature_c`, `intruder_alarm`, `fire_alarm`.

**MDP:** `voltage_R`, `voltage_Y`, `voltage_B`, `current_R`, `current_Y`, `current_B`, `main_breaker_status`, `room_temperature_c`, `intruder_alarm`, `fire_alarm`.

**SDP:** `voltage_R`, `voltage_Y`, `voltage_B`, `current_R`, `current_Y`, `current_B`, `breaker_status`, `room_temperature_c`, `intruder_alarm`, `fire_alarm`.

**UPS:** `operational_status`, `battery_charge_pct`, `battery_voltage_v`, `input_voltage_v`, `output_voltage_v`, `load_pct`, `estimated_runtime_min`, `temperature_c`, `fault_code`.

Unless a key contains an explicit unit suffix, voltage is measured in volts, current in amperes, frequency in hertz, temperature in degrees Celsius, runtime in minutes, and percentage fields range from 0 to 100. Missing values are `null`; the simulator and API must not substitute zero for missing data.

### 5.4 Alarm rule contract

These are the initial rules used by the simulator, backend, frontend labels and later threshold settings.

| Type | Condition | Alarm code | Severity |
|---|---|---|---|
| Generator | `fuel_level_pct < 20` | `GEN_LOW_FUEL` | `WARNING` |
| Generator | `fuel_level_pct < 10` | `GEN_CRITICAL_FUEL` | `CRITICAL` |
| Generator | Any phase voltage outside 207–253 V | `GEN_VOLTAGE_ABNORMAL` | `WARNING` |
| Generator | `room_temperature_c > 45` | `GEN_HIGH_TEMP` | `WARNING` |
| Generator | `fire_alarm = true` | `GEN_FIRE` | `CRITICAL` |
| Generator | `intruder_alarm = true` | `GEN_INTRUDER` | `WARNING` |
| Generator | `running_status = FAULT` | `GEN_FAULT` | `CRITICAL` |
| ATS | `transfer_status = FAILED` | `ATS_TRANSFER_FAIL` | `CRITICAL` |
| ATS | `mains_voltage` outside 207–253 V | `ATS_MAINS_VOLTAGE` | `WARNING` |
| ATS | `fire_alarm = true` | `ATS_FIRE` | `CRITICAL` |
| ATS | `intruder_alarm = true` | `ATS_INTRUDER` | `WARNING` |
| MDP | Any phase voltage outside 207–253 V | `MDP_PHASE_VOLTAGE` | `WARNING` |
| MDP | Maximum phase voltage minus minimum phase voltage > 5 V | `MDP_PHASE_IMBALANCE` | `WARNING` |
| MDP | `fire_alarm = true` | `MDP_FIRE` | `CRITICAL` |
| MDP | `intruder_alarm = true` | `MDP_INTRUDER` | `WARNING` |
| SDP | Any phase voltage outside 207–253 V | `SDP_PHASE_VOLTAGE` | `WARNING` |
| SDP | `fire_alarm = true` | `SDP_FIRE` | `CRITICAL` |
| SDP | `intruder_alarm = true` | `SDP_INTRUDER` | `WARNING` |
| UPS | `battery_charge_pct < 40` | `UPS_BATTERY_LOW` | `WARNING` |
| UPS | `battery_charge_pct < 20` | `UPS_BATTERY_CRITICAL` | `CRITICAL` |
| UPS | `load_pct > 80` | `UPS_HIGH_LOAD` | `WARNING` |
| UPS | `operational_status = ON_BATTERY` | `UPS_ON_BATTERY` | `WARNING` |
| UPS | `operational_status = FAULT` | `UPS_FAULT` | `CRITICAL` |

When both low and critical rules match, the critical alarm determines `overallStatus`; each alarm code still has its own lifecycle. Numeric thresholds become Admin-configurable in Sprint 5. Boolean and state-based conditions remain fixed unless a later contract explicitly makes them configurable.

---

## 6. API Conventions Shared by Frontend and Backend

- Base URL in development: `http://localhost:8080`.
- All endpoints except `POST /api/auth/login` require `Authorization: Bearer <token>`.
- JSON property names use `camelCase`; sensor keys retain the exact names in Section 5.3.
- Dates use ISO-8601 UTC, for example `2026-07-13T15:30:00Z`.
- `401` means unauthenticated; `403` means authenticated but not permitted.
- `404` is returned for an unknown equipment or record ID.
- Validation failures use `400`; duplicate equipment codes use `409`.
- Collection filters are optional unless stated otherwise.
- Paginated endpoints return `items`, `page`, `size`, `totalItems`, and `totalPages`.
- The backend is the only source of computed `overallStatus` and alarm counts.

### Standard error response

```json
{
  "timestamp": "2026-07-13T15:30:00Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "The request could not be processed.",
  "fieldErrors": {
    "equipmentCode": "Equipment code is required."
  }
}
```

### Standard page response

```json
{
  "items": [],
  "page": 0,
  "size": 20,
  "totalItems": 0,
  "totalPages": 0
}
```

---

## 7. Agreed REST API Contract

### 7.1 Authentication

| Method | Path | Access | Contract |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | `{ username, password }` → `{ token, username, role }` |
| `POST` | `/api/auth/logout` | Authenticated | `204 No Content`; client deletes token |
| `GET` | `/api/auth/me` | Authenticated | `{ id, username, role }` |

### 7.2 Equipment administration

| Method | Path | Access | Contract |
|---|---|---|---|
| `GET` | `/api/equipment?type=&enabled=` | Admin, Operator | List equipment for navigation, selectors and filters |
| `GET` | `/api/equipment/{equipmentId}` | Admin, Operator | Equipment details |
| `POST` | `/api/equipment` | Admin | Create equipment |
| `PUT` | `/api/equipment/{equipmentId}` | Admin | Update display name, location and description |
| `PATCH` | `/api/equipment/{equipmentId}/enabled` | Admin | `{ enabled: false }`; never hard-delete operational history |

**Equipment response:**

```json
{
  "id": 12,
  "equipmentCode": "GENERATOR-01",
  "equipmentType": "GENERATOR",
  "displayName": "Main Standby Generator",
  "location": "Operations Building",
  "description": "Primary standby generator",
  "enabled": true
}
```

`equipmentCode` and `equipmentType` are immutable after creation because readings, rules and integrations depend on them.

### 7.3 Dashboard

| Method | Path | Access | Contract |
|---|---|---|---|
| `GET` | `/api/dashboard/summary` | Admin, Operator | Status summary for every enabled equipment item plus alarm totals |
| `GET` | `/api/alarms?status=&unresolved=&equipmentType=&equipmentId=&severity=&from=&to=&page=&size=` | Admin, Operator | Powers Dashboard alarm summary, expanded alarm centre and history |

The Dashboard initially shows the newest unresolved alarms, prioritised by `CRITICAL` before `WARNING`, then newest first. “View all” exposes the filters and pagination without adding a separate Alarms navigation item.

**Dashboard summary response:**

```json
{
  "equipment": [
    {
      "equipmentId": 12,
      "equipmentCode": "GENERATOR-01",
      "equipmentType": "GENERATOR",
      "displayName": "Main Standby Generator",
      "overallStatus": "WARNING",
      "recordedAt": "2026-07-13T15:30:00Z",
      "unresolvedAlarmCount": 2
    }
  ],
  "alarmTotals": {
    "active": 3,
    "acknowledged": 1,
    "criticalUnresolved": 1,
    "warningUnresolved": 3
  }
}
```

`unresolved=true` means both `ACTIVE` and `ACKNOWLEDGED`. Supplying both `status` and `unresolved` is a `400` validation error.

### 7.4 Equipment status, readings and contextual alarms

| Method | Path | Access | Contract |
|---|---|---|---|
| `GET` | `/api/equipment/{equipmentId}/status` | Admin, Operator | Latest reading and computed state |
| `GET` | `/api/equipment/{equipmentId}/readings?limit=50` | Admin, Operator | Newest readings first; `limit` range 1–500 |
| `GET` | `/api/equipment/{equipmentId}/alarms?unresolved=true` | Admin, Operator | Alarms belonging only to that equipment |

**Status response:**

```json
{
  "equipmentId": 12,
  "equipmentCode": "GENERATOR-01",
  "equipmentType": "GENERATOR",
  "displayName": "Main Standby Generator",
  "recordedAt": "2026-07-13T15:30:00Z",
  "overallStatus": "WARNING",
  "activeAlarmCount": 2,
  "acknowledgedAlarmCount": 1,
  "latestReading": {}
}
```

`OFFLINE` is returned when enabled equipment has never produced a reading or its latest reading is older than the agreed offline timeout. The initial timeout is 30 seconds for five-second simulation intervals.

**Reading-history item:**

```json
{
  "id": 8001,
  "equipmentId": 12,
  "recordedAt": "2026-07-13T15:30:00Z",
  "data": {}
}
```

### 7.5 Alarm actions and lifecycle

| Method | Path | Access | Contract |
|---|---|---|---|
| `PUT` | `/api/alarms/{alarmId}/acknowledge` | Admin, Operator | `{ note }` → updated alarm |
| Resolution | Internal service action | System | Condition clears → `RESOLVED`, `resolvedAt` set |

**Alarm response:**

```json
{
  "id": 41,
  "equipmentId": 12,
  "equipmentCode": "GENERATOR-01",
  "equipmentType": "GENERATOR",
  "alarmCode": "GEN_LOW_FUEL",
  "alarmMessage": "Generator fuel level is below 20%.",
  "severity": "WARNING",
  "status": "ACKNOWLEDGED",
  "triggeredAt": "2026-07-13T15:20:00Z",
  "acknowledgedAt": "2026-07-13T15:22:00Z",
  "acknowledgedBy": {
    "id": 2,
    "username": "operator1"
  },
  "acknowledgementNote": "Technician notified.",
  "resolvedAt": null
}
```

Deduplication applies to unresolved occurrences: the same `alarmCode + equipmentId` cannot have more than one `ACTIVE` or `ACKNOWLEDGED` occurrence. Acknowledging an alarm must not create a duplicate while the condition remains abnormal.

### 7.6 Predictions

| Method | Path | Access | Contract |
|---|---|---|---|
| `GET` | `/api/predictions/latest` | Admin, Operator | Latest prediction for every enabled equipment item |
| `GET` | `/api/equipment/{equipmentId}/predictions?page=&size=` | Admin, Operator | Prediction history for one equipment item |

Spring Boot calls FastAPI internally using:

```json
{
  "equipmentId": 12,
  "equipmentCode": "GENERATOR-01",
  "equipmentType": "GENERATOR",
  "recordedAt": "2026-07-13T15:30:00Z",
  "readings": {}
}
```

FastAPI returns:

```json
{
  "failureProbability": 0.72,
  "predictedFailureType": "Fuel System Degradation",
  "recommendedActions": ["Inspect fuel injectors", "Check the fuel filter"],
  "confidence": 0.85,
  "modelVersion": "generator-1.0"
}
```

### 7.7 Maintenance tickets

| Method | Path | Access | Contract |
|---|---|---|---|
| `POST` | `/api/tickets` | Admin, Operator | Create; equipment required, alarm/prediction optional |
| `GET` | `/api/tickets?status=&equipmentType=&equipmentId=&page=&size=` | Admin, Operator | Filtered ticket list |
| `GET` | `/api/tickets/{ticketId}` | Admin, Operator | Ticket details |
| `PUT` | `/api/tickets/{ticketId}` | Admin, Operator | Update description, priority or permitted status transition |

Permitted transitions are `OPEN → IN_PROGRESS → CLOSED`. Reopening a closed ticket is future scope.

**Create-ticket request:**

```json
{
  "equipmentId": 12,
  "title": "Inspect generator fuel system",
  "description": "Created after repeated low-fuel alarms.",
  "priority": "HIGH",
  "alarmId": 41,
  "predictionId": null
}
```

The backend sets `status`, `createdBy`, `createdAt`, and `updatedAt`. If `alarmId` or `predictionId` is supplied, it must belong to the same equipment.

### 7.8 Reports, thresholds and users

| Method | Path | Access | Contract |
|---|---|---|---|
| `GET` | `/api/reports?equipmentId=&equipmentType=&from=&to=&format=PDF|CSV` | Admin, Operator | Authenticated file download |
| `GET` | `/api/settings/thresholds?equipmentType=` | Admin | Threshold configuration |
| `PUT` | `/api/settings/thresholds` | Admin | Validate and update threshold set atomically |
| `GET` | `/api/users` | Admin | User list without password hashes |
| `POST` | `/api/users` | Admin | Create Admin or Operator |
| `PATCH` | `/api/users/{userId}/enabled` | Admin | Enable/disable user |

**Threshold-rule response/update item:**

```json
{
  "equipmentType": "GENERATOR",
  "alarmCode": "GEN_LOW_FUEL",
  "severity": "WARNING",
  "enabled": true,
  "parameters": {
    "metric": "fuel_level_pct",
    "operator": "LT",
    "value": 20,
    "unit": "%"
  }
}
```

The settings update sends the complete edited list for one equipment type. The backend validates the list and applies it atomically; a partially invalid list changes nothing.

---

## 8. Shared Frontend Contract

### 8.1 Route and page ownership

| Route | Responsibility |
|---|---|
| `/dashboard` | Fleet status, latest alarms, expanded alarm centre, urgent actions |
| `/generator` | Select configured Generator; show live status, readings, local alarms and latest prediction |
| `/ats` | Same pattern for ATS |
| `/mdp` | Same pattern for MDP |
| `/sdp` | Same pattern for SDP |
| `/ups` | Same pattern for UPS |
| `/predictions` | Cross-equipment prediction comparison and history access |
| `/tickets` | Maintenance ticket workflow |
| `/reports` | Report builder and download |
| `/settings` | Admin-only equipment, thresholds and users |

### 8.2 Shared frontend modules

Achani owns the shared implementation; Onel consumes it instead of duplicating it.

- `api/equipmentApi.js`
- `api/alarmApi.js`
- `api/predictionApi.js`
- `api/ticketApi.js`
- `api/reportApi.js`
- `hooks/usePolling.js`
- `components/StatusBadge.jsx`
- `components/SeverityBadge.jsx`
- `components/ReadingCard.jsx`
- `components/AlarmPanel.jsx`
- `components/EquipmentSelector.jsx`
- shared loading, empty, error and offline states

Polling requirements:

- Status and contextual alarms: every 5 seconds.
- Dashboard summary: every 10 seconds.
- Predictions: every 60 seconds.
- A successful mutation triggers an immediate refetch; the UI must not wait for the next interval.
- Polling stops on unmount and must not update stale state.
- A failed request shows an error/offline state; it must not silently display fallback values as real readings.

---

## 9. Sprint 2–3 Gap-Closure Sprint

**Goal:** Merge one end-to-end operational slice for all five equipment types, using approved shared contracts and no mock operational data.

### P0 backlog and redistributed ownership

| Order | Owner | Work | Depends on | Reviewer |
|---|---|---|---|---|
| 1 | Dhanuja | Add `Equipment` entity/repository/seed data; relate operational records to equipment; make existing Generator/ATS/MDP/SDP simulation iterate over enabled equipment | Section 5 contract | Nethmini |
| 2 | Nethmini | Implement shared DTOs, validation, errors, equipment service/controllers, generic status/readings endpoints and dashboard summary | Equipment persistence | Achani |
| 3 | Nethmini | Refactor `AlarmService` to deduplicate unresolved alarms, acknowledge with note/current user, auto-resolve cleared conditions, and provide global/contextual queries | Equipment model | Dhanuja and Onel |
| 4 | Dhanuja | Add UPS simulation and UPS threshold evaluation using the shared framework | Alarm framework | Nethmini |
| 5 | Achani | Create a clean branch from current `Dev_main`; port only the useful `Achani_New` frontend pages/components; replace hardcoded IDs with equipment API data | Equipment/status API contract | Nethmini |
| 6 | Achani | Centralise frontend API modules, enum presentation, polling and immediate-refetch behaviour | Shared DTOs | Onel |
| 7 | Onel | Adapt the Dashboard alarm summary/centre and subsystem `AlarmPanel` to the real alarm API; remove local alarm fixtures and lowercase statuses | Alarm API and Achani components | Achani |
| 8 | Onel | Implement the live UPS page using equipment selection, status, readings and contextual alarms | UPS backend and shared components | Dhanuja |
| 9 | Nethmini | Add repository/service/controller tests for status and alarm lifecycle; provide a repeatable demo fixture | All backend P0 work | Dhanuja |
| 10 | All | End-to-end test: configure equipment → receive simulated reading → trigger alarm → acknowledge → condition clears → auto-resolve | All P0 items | Cross-review |

### P1 if capacity remains

- Reading-history charts using the generic readings endpoint.
- Dashboard status sorting and saved alarm filters.
- Additional equipment form validation and duplicate-code guidance.

### Merge order

1. Approve this contract and create issues/tasks from the P0 backlog.
2. Merge equipment persistence and shared backend DTOs.
3. Merge generic status/readings and alarm lifecycle APIs with tests.
4. Merge Achani's clean frontend integration branch.
5. Merge Onel's alarm-centre and UPS work after shared components are available.
6. Run the end-to-end scenario before declaring Sprint 2–3 complete.

Parallel development may use fixtures that exactly match Section 7. Fixtures must be deleted or isolated from production paths before merge.

---

## 10. Sprint 4 — Predictive Maintenance

**Goal:** Produce persisted, versioned predictions for every enabled equipment item and display them using one shared contract.

| Owner | Work | Shared handoff |
|---|---|---|
| Dhanuja | Prepare datasets, features, labels, evaluation and model exports per supported equipment type | Model files plus exact `feature_config.json` |
| Onel | Own FastAPI model loading, validation, inference, health status and recommendation mapping | Section 7.6 response plus model version |
| Nethmini | Implement Spring Boot ML client, retry/timeout handling, enabled-equipment scheduler, persistence and prediction APIs | FastAPI contract consumed; REST contract produced |
| Achani | Implement latest prediction on subsystem pages and cross-equipment Predictions view | Consumes Spring Boot prediction APIs only |

Definition of done:

- React never calls FastAPI directly.
- A failed ML call does not stop monitoring or other equipment predictions.
- Prediction history records model version and timestamp.
- Model input validation reports missing features clearly.
- Green/amber/red probability thresholds are defined once and reused.

---

## 11. Sprint 5 — Maintenance, Administration, Reports and Deployment

**Goal:** Complete operational workflows, administration and a reproducible deployment.

| Owner | Work | Shared handoff |
|---|---|---|
| Dhanuja | Report query/aggregation service and PDF/CSV generation | Report endpoint and sample files |
| Nethmini | Ticket service/API, threshold persistence, and user-management API | Ticket/settings/user contracts |
| Achani | Admin Settings UI for equipment, thresholds and users; Reports UI | Consumes equipment/settings/report contracts |
| Onel | Tickets UI, create-ticket actions from alarms/predictions, deployment configuration and runbook | Consumes ticket contract; produces deployment handoff |
| All | Security review, integration regression, deployment rehearsal and final demonstration | Signed Definition of Done |

The deployment owner coordinates deployment; each service owner remains responsible for a working build, environment-variable documentation, health check, and rollback instructions.

---

## 12. Role Permissions

| Capability | Admin | Operator |
|---|---:|---:|
| View dashboard, readings, alarms and predictions | Yes | Yes |
| Acknowledge alarms | Yes | Yes |
| Create and update maintenance tickets | Yes | Yes |
| Export reports | Yes | Yes |
| Configure equipment and thresholds | Yes | No |
| Create or disable users | Yes | No |

Frontend route visibility improves usability, but backend authorization is mandatory and is the source of truth.

---

## 13. Definition of Done for Every Shared Feature

- [ ] Contract is documented and reviewed by producer and consumer.
- [ ] Implementation contains no hardcoded equipment-instance list.
- [ ] Happy path, empty state, validation error, authorization error and unavailable-service state are handled.
- [ ] Backend tests pass.
- [ ] Frontend production build passes.
- [ ] No mock operational data is used in the production path.
- [ ] API enums, dates and field names match this document.
- [ ] At least one reviewer from the consuming side approves the change.
- [ ] Feature is demonstrated end-to-end against the latest `Dev_main`.
- [ ] Documentation and environment variables are updated.

---

## 14. Integration Risks and Controls

| Risk | Impact | Control |
|---|---|---|
| Frontend branches implement different shapes | Rework and runtime failures | Section 7 is frozen before integration; consumer reviews backend DTOs |
| `Achani_New` unrelated history | Unsafe merge and overwritten backend work | Reapply frontend work from a clean `Dev_main` branch |
| Mock UI appears complete | Missing backend work is overlooked | End-to-end Definition of Done; no mock operational data in production path |
| Acknowledged alarms are duplicated | Alarm flood while fault remains | Deduplicate both `ACTIVE` and `ACKNOWLEDGED` occurrences until resolved |
| Equipment instances are hardcoded | Admin configuration does not propagate | All schedulers, pages, filters and selectors query enabled equipment |
| Shared components are copied | Behaviour and styling diverge | Achani owns shared components; Onel imports and reviews them |
| Deployment left to one person at the end | Late environment failures | Deployment rehearsal in Sprint 4; every service owner supplies health checks |

---

## 15. Current Non-Goals

- Direct integration with physical controller protocols, IP addresses or register maps.
- Mobile application.
- SMS/email/push notification delivery.
- Bulk alarm acknowledgement.
- Ticket assignment scheduling and technician rosters.
- Reopening closed tickets.
- Multi-site tenancy.

These may be added later through a new approved contract and sprint scope; they must not be introduced informally into shared work.
