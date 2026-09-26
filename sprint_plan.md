# Integrated Fault Monitoring & Management System
## Sprint Coordination Document — Power Module

> Superseded by `sprint_plan 2.md`, the working source of truth for Sprint 2–3 integration, shared contracts, and ownership.

**Team:** Dhanuja · Nethmini · Achani · Onel  
**Sprints:** 5 × 2 weeks = 10 weeks  
**Stack:** React + Tailwind · Spring Boot · Python FastAPI · MySQL · AWS

---

## 1. Environment & Ports

| Service | Tech | Local Port | Notes |
|---------|------|-----------|-------|
| React frontend | React + Tailwind (Vite) | 3000 | Axios base URL → `http://localhost:8080` |
| Spring Boot backend | Java 17, Spring Boot 3.x | 8080 | JWT secured |
| Python ML service | Python 3.11, FastAPI | 8000 | Internal only — called by Spring Boot |
| MySQL | MySQL 8.x | 3306 | DB name: `fault_monitor_db` |

Spring Boot `application.properties`:
```
spring.datasource.url=jdbc:mysql://localhost:3306/fault_monitor_db
spring.datasource.username=root
spring.datasource.password=<password>
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
jwt.secret=<256-bit-secret>
jwt.expiration=86400000
ml.service.url=http://localhost:8000
```

---

## 2. Database Schema

### `users`
```sql
CREATE TABLE users (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('ADMIN', 'OPERATOR') NOT NULL DEFAULT 'OPERATOR',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `sensor_readings`
```sql
CREATE TABLE sensor_readings (
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    subsystem_type ENUM('GENERATOR','ATS','MDP','SDP','UPS') NOT NULL,
    subsystem_id   VARCHAR(50) NOT NULL,
    reading_data   JSON NOT NULL,
    recorded_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_subsystem_time (subsystem_type, recorded_at)
);
```
`subsystem_id` values: `"GENERATOR-01"`, `"ATS-01"`, `"MDP-01"`, `"SDP-01"`, `"SDP-02"`, `"UPS-01"`, `"UPS-02"`

### `alarms`
```sql
CREATE TABLE alarms (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    subsystem_type   ENUM('GENERATOR','ATS','MDP','SDP','UPS') NOT NULL,
    subsystem_id     VARCHAR(50) NOT NULL,
    alarm_code       VARCHAR(100) NOT NULL,
    alarm_message    VARCHAR(500) NOT NULL,
    severity         ENUM('WARNING','CRITICAL') NOT NULL,
    status           ENUM('ACTIVE','ACKNOWLEDGED','RESOLVED') NOT NULL DEFAULT 'ACTIVE',
    triggered_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at  TIMESTAMP NULL,
    acknowledged_by  BIGINT NULL REFERENCES users(id),
    resolved_at      TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_subsystem (subsystem_type, status)
);
```

### `predictions`
```sql
CREATE TABLE predictions (
    id                    BIGINT PRIMARY KEY AUTO_INCREMENT,
    subsystem_type        ENUM('GENERATOR','ATS','MDP','SDP','UPS') NOT NULL,
    subsystem_id          VARCHAR(50) NOT NULL,
    failure_probability   DOUBLE NOT NULL,
    predicted_failure_type VARCHAR(200),
    recommended_actions   TEXT,
    confidence            DOUBLE,
    predicted_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_subsystem_time (subsystem_type, predicted_at)
);
```

### `maintenance_tickets`
```sql
CREATE TABLE maintenance_tickets (
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    subsystem_type ENUM('GENERATOR','ATS','MDP','SDP','UPS') NOT NULL,
    subsystem_id   VARCHAR(50) NOT NULL,
    title          VARCHAR(200) NOT NULL,
    description    TEXT,
    status         ENUM('OPEN','IN_PROGRESS','CLOSED') NOT NULL DEFAULT 'OPEN',
    priority       ENUM('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
    created_by     BIGINT NOT NULL REFERENCES users(id),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    alarm_id       BIGINT NULL REFERENCES alarms(id),
    prediction_id  BIGINT NULL REFERENCES predictions(id)
);
```

---

## 3. Subsystem Data Structures

These are the JSON shapes stored in `sensor_readings.reading_data` and used across the whole system. Everyone must use these exact field names.

### Generator
```json
{
  "voltage_L1": 230.5,
  "voltage_L2": 229.8,
  "voltage_L3": 231.2,
  "current_L1": 45.2,
  "current_L2": 44.8,
  "current_L3": 45.5,
  "fuel_level_pct": 75.0,
  "frequency_hz": 50.1,
  "running_status": "RUNNING",
  "breaker_status": "CLOSED",
  "room_temperature_c": 28.5,
  "intruder_alarm": false,
  "fire_alarm": false
}
```
`running_status`: `"RUNNING"` | `"STOPPED"` | `"FAULT"`  
`breaker_status`: `"OPEN"` | `"CLOSED"`

### ATS
```json
{
  "active_source": "MAINS",
  "mains_voltage": 230.2,
  "generator_voltage": 229.8,
  "transfer_status": "NORMAL",
  "breaker_status": "CLOSED",
  "last_transfer_at": "2024-01-15T10:30:00",
  "room_temperature_c": 26.0,
  "intruder_alarm": false,
  "fire_alarm": false
}
```
`active_source`: `"MAINS"` | `"GENERATOR"`  
`transfer_status`: `"NORMAL"` | `"TRANSFERRING"` | `"FAILED"`

### MDP
```json
{
  "voltage_R": 230.1,
  "voltage_Y": 229.5,
  "voltage_B": 230.8,
  "current_R": 80.2,
  "current_Y": 79.8,
  "current_B": 80.5,
  "main_breaker_status": "CLOSED",
  "room_temperature_c": 27.0,
  "intruder_alarm": false,
  "fire_alarm": false
}
```

### SDP
```json
{
  "voltage_R": 228.5,
  "voltage_Y": 229.0,
  "voltage_B": 228.8,
  "current_R": 30.2,
  "current_Y": 29.8,
  "current_B": 30.1,
  "breaker_status": "CLOSED",
  "room_temperature_c": 25.5,
  "intruder_alarm": false,
  "fire_alarm": false
}
```

### UPS
```json
{
  "operational_status": "ONLINE",
  "battery_charge_pct": 85.0,
  "battery_voltage_v": 48.2,
  "input_voltage_v": 230.0,
  "output_voltage_v": 230.0,
  "load_pct": 45.0,
  "estimated_runtime_min": 120,
  "temperature_c": 27.5,
  "fault_code": null
}
```
`operational_status`: `"ONLINE"` | `"ON_BATTERY"` | `"FAULT"` | `"OFFLINE"`

---

## 4. Alarm Thresholds

These are hardcoded defaults. Sprint 5 makes them configurable from the Settings page.

### Generator
| Condition | Alarm Code | Severity |
|-----------|-----------|---------|
| `fuel_level_pct` < 20 | `GEN_LOW_FUEL` | WARNING |
| `fuel_level_pct` < 10 | `GEN_CRITICAL_FUEL` | CRITICAL |
| Any phase voltage outside 230 ± 10% (207–253 V) | `GEN_VOLTAGE_ABNORMAL` | WARNING |
| `room_temperature_c` > 45 | `GEN_HIGH_TEMP` | WARNING |
| `fire_alarm` = true | `GEN_FIRE` | CRITICAL |
| `intruder_alarm` = true | `GEN_INTRUDER` | WARNING |
| `running_status` = FAULT | `GEN_FAULT` | CRITICAL |

### ATS
| Condition | Alarm Code | Severity |
|-----------|-----------|---------|
| `transfer_status` = FAILED | `ATS_TRANSFER_FAIL` | CRITICAL |
| `mains_voltage` outside 207–253 V | `ATS_MAINS_VOLTAGE` | WARNING |
| `fire_alarm` = true | `ATS_FIRE` | CRITICAL |
| `intruder_alarm` = true | `ATS_INTRUDER` | WARNING |

### MDP
| Condition | Alarm Code | Severity |
|-----------|-----------|---------|
| Any phase voltage outside 207–253 V | `MDP_PHASE_VOLTAGE` | WARNING |
| Phase imbalance > 5 V difference between phases | `MDP_PHASE_IMBALANCE` | WARNING |
| `fire_alarm` = true | `MDP_FIRE` | CRITICAL |
| `intruder_alarm` = true | `MDP_INTRUDER` | WARNING |

### SDP
| Condition | Alarm Code | Severity |
|-----------|-----------|---------|
| Any phase voltage outside 207–253 V | `SDP_PHASE_VOLTAGE` | WARNING |
| `fire_alarm` = true | `SDP_FIRE` | CRITICAL |
| `intruder_alarm` = true | `SDP_INTRUDER` | WARNING |

### UPS
| Condition | Alarm Code | Severity |
|-----------|-----------|---------|
| `battery_charge_pct` < 40 | `UPS_BATTERY_LOW` | WARNING |
| `battery_charge_pct` < 20 | `UPS_BATTERY_CRITICAL` | CRITICAL |
| `load_pct` > 80 | `UPS_HIGH_LOAD` | WARNING |
| `operational_status` = ON_BATTERY | `UPS_ON_BATTERY` | WARNING |
| `operational_status` = FAULT | `UPS_FAULT` | CRITICAL |

**Alarm deduplication rule:** Do not create a new alarm if an alarm with the same `alarm_code` + `subsystem_id` + `status = ACTIVE` already exists.

---

## 5. API Contract

All endpoints (except `/api/auth/login`) require header: `Authorization: Bearer <token>`

### Auth
| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|---------|
| POST | `/api/auth/login` | `{ "username": "", "password": "" }` | `{ "token": "", "username": "", "role": "" }` |
| POST | `/api/auth/logout` | — | `200 OK` |
| GET | `/api/auth/me` | — | `{ "id": 1, "username": "", "role": "" }` |

### Generator
| Method | Endpoint | Response |
|--------|----------|---------|
| GET | `/api/generator/status` | `{ "subsystemId": "GENERATOR-01", "latestReading": {...}, "activeAlarmCount": 2, "overallStatus": "WARNING" }` |
| GET | `/api/generator/readings?limit=50` | `[ { "id": 1, "recordedAt": "", "data": {...} } ]` |
| GET | `/api/generator/alarms` | `[ AlarmObject ]` |

### ATS
| Method | Endpoint | Response |
|--------|----------|---------|
| GET | `/api/ats/status` | `{ "subsystemId": "ATS-01", "latestReading": {...}, "activeAlarmCount": 0, "overallStatus": "NORMAL" }` |
| GET | `/api/ats/readings?limit=50` | `[ ReadingObject ]` |
| GET | `/api/ats/alarms` | `[ AlarmObject ]` |

### MDP
| Method | Endpoint |
|--------|----------|
| GET | `/api/mdp/status` |
| GET | `/api/mdp/readings?limit=50` |
| GET | `/api/mdp/alarms` |

### SDP
| Method | Endpoint |
|--------|----------|
| GET | `/api/sdp` → list of SDP IDs |
| GET | `/api/sdp/{sdpId}/status` |
| GET | `/api/sdp/{sdpId}/readings?limit=50` |
| GET | `/api/sdp/{sdpId}/alarms` |

### UPS
| Method | Endpoint |
|--------|----------|
| GET | `/api/ups` → list of UPS IDs |
| GET | `/api/ups/{upsId}/status` |
| GET | `/api/ups/{upsId}/readings?limit=50` |
| GET | `/api/ups/{upsId}/alarms` |

### Alarms (global)
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/alarms?status=ACTIVE&subsystem=GENERATOR` | Both params optional |
| PUT | `/api/alarms/{id}/acknowledge` | Body: `{ "note": "" }` → returns updated AlarmObject |
| GET | `/api/alarms/history?from=2024-01-01&to=2024-01-31&subsystem=GENERATOR&page=0&size=20` | Paginated |

### Predictions
| Method | Endpoint |
|--------|----------|
| GET | `/api/predictions` → latest prediction for each subsystem |
| GET | `/api/predictions/{subsystem}` → e.g. `/api/predictions/GENERATOR` |

### Reports
| Method | Endpoint |
|--------|----------|
| GET | `/api/reports/{subsystem}?from=2024-01-01&to=2024-01-31&format=PDF` | Returns file download |

### Maintenance Tickets
| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/api/tickets` | `{ "subsystemType": "GENERATOR", "subsystemId": "GENERATOR-01", "title": "", "description": "", "priority": "HIGH", "alarmId": null, "predictionId": null }` |
| GET | `/api/tickets?status=OPEN&subsystem=GENERATOR` | — |
| GET | `/api/tickets/{id}` | — |
| PUT | `/api/tickets/{id}` | `{ "status": "IN_PROGRESS", "description": "" }` |

### Settings (Admin only)
| Method | Endpoint |
|--------|----------|
| GET | `/api/settings/thresholds` |
| PUT | `/api/settings/thresholds` → body: updated threshold map |
| GET | `/api/users` |
| POST | `/api/users` → body: `{ "username": "", "password": "", "role": "" }` |

### Common Response Objects

**AlarmObject:**
```json
{
  "id": 1,
  "subsystemType": "GENERATOR",
  "subsystemId": "GENERATOR-01",
  "alarmCode": "GEN_LOW_FUEL",
  "alarmMessage": "Generator fuel level is below 20%",
  "severity": "WARNING",
  "status": "ACTIVE",
  "triggeredAt": "2024-01-15T10:30:00",
  "acknowledgedAt": null,
  "acknowledgedBy": null
}
```

**StatusObject (used by all subsystem /status endpoints):**
```json
{
  "subsystemId": "GENERATOR-01",
  "latestReading": { ...reading_data fields... },
  "recordedAt": "2024-01-15T10:30:00",
  "activeAlarmCount": 2,
  "overallStatus": "WARNING"
}
```
`overallStatus`: `"NORMAL"` | `"WARNING"` | `"CRITICAL"` — derived from active alarms (no alarms = NORMAL, any WARNING = WARNING, any CRITICAL = CRITICAL)

---

## 6. ML Service Contract

The ML service is called **only by Spring Boot**. The React frontend never calls it directly.

**POST `/predict`**

Request:
```json
{
  "subsystem": "GENERATOR",
  "subsystemId": "GENERATOR-01",
  "readings": {
    "voltage_L1": 230.5,
    "voltage_L2": 229.8,
    "voltage_L3": 231.2,
    "current_L1": 45.2,
    "fuel_level_pct": 75.0,
    "frequency_hz": 50.1,
    "room_temperature_c": 28.5
  }
}
```

Response:
```json
{
  "subsystem": "GENERATOR",
  "subsystemId": "GENERATOR-01",
  "failure_probability": 0.72,
  "predicted_failure_type": "Fuel System Degradation",
  "recommended_actions": [
    "Inspect fuel injectors",
    "Check fuel filter — replace if blocked",
    "Test fuel pump pressure"
  ],
  "confidence": 0.85
}
```

**GET `/health`** → `{ "status": "ok" }`

Spring Boot calls `/predict` once per minute via a `@Scheduled` task for each active subsystem. If the ML service is down, Spring Boot logs the error and skips — it does not crash.

---

## 7. Sprint Plans

### Sprint 1 — Foundation & Infrastructure
**Duration:** Weeks 1–2  
**Goal:** All four layers scaffolded, DB ready, JWT auth working, dev environments running

---

#### Dhanuja — Database Setup

**Deliverables:**
- MySQL database `fault_monitor_db` created and running
- All tables created (schema from Section 2)
- JPA entity classes in Spring Boot project
- Spring Boot datasource configured and connecting

**Tasks:**
1. Install MySQL 8 locally, create database `fault_monitor_db` and a dedicated user
2. Write and run the full schema SQL (all 5 tables from Section 2)
3. In the Spring Boot project (created by Nethmini), create entity classes:
   - `User.java` — maps to `users` table
   - `SensorReading.java` — maps to `sensor_readings`, store `reading_data` as `String` (JSON)
   - `Alarm.java` — maps to `alarms`, use `@Enumerated(EnumType.STRING)` for all enums
   - `Prediction.java` — maps to `predictions`
   - `MaintenanceTicket.java` — maps to `maintenance_tickets`
4. Create repository interfaces: `UserRepository`, `AlarmRepository`, `SensorReadingRepository`, `PredictionRepository`, `MaintenanceTicketRepository` (extend `JpaRepository`)
5. Verify Spring Boot starts without errors and Hibernate auto-creates/validates tables

**Depends on:** Nethmini creating the Spring Boot project first (coordinate on Day 1)

---

#### Nethmini — Spring Boot Setup + JWT Auth

**Deliverables:**
- Spring Boot project initialized and pushed to repo
- JWT login/logout working and testable via Postman

**Tasks:**
1. Create Spring Boot project via Spring Initializr with dependencies: Spring Web, Spring Security, Spring Data JPA, MySQL Driver, Lombok. Add `jjwt` (0.11.x) manually to `pom.xml`
2. Push project to shared repo so Dhanuja can add entities
3. Create `JwtUtil.java` — `generateToken(username)`, `extractUsername(token)`, `validateToken(token)`
4. Create `JwtAuthFilter.java` — extends `OncePerRequestFilter`, reads `Authorization` header, sets `SecurityContextHolder`
5. Create `SecurityConfig.java` — permit `/api/auth/**`, require auth on all others, add `JwtAuthFilter`
6. Create `UserDetailsServiceImpl.java` — loads user from DB via `UserRepository`
7. Create `AuthController.java`:
   - `POST /api/auth/login` → validates credentials, returns `{ token, username, role }`
   - `POST /api/auth/logout` → returns 200 (stateless JWT, no server-side invalidation needed for now)
   - `GET /api/auth/me` → returns current user from JWT context
8. Seed one default admin user in `data.sql` or `CommandLineRunner`: username `admin`, password `admin123` (BCrypt hashed)

---

#### Achani — React Setup + Auth UI

**Deliverables:**
- React project initialized, Tailwind configured
- Login page working against the real `/api/auth/login`
- Protected routing in place

**Tasks:**
1. Initialize React project with Vite: `npm create vite@latest frontend -- --template react`
2. Install: `tailwindcss`, `axios`, `react-router-dom`, `react-hot-toast`
3. Configure Tailwind (`tailwind.config.js`, import in `index.css`)
4. Create `src/api/axios.js` — Axios instance with `baseURL: http://localhost:8080`, request interceptor to attach `Authorization: Bearer <token>` from localStorage, response interceptor to redirect to `/login` on 401
5. Create `AuthContext.jsx` — stores `{ user, token }`, provides `login()` and `logout()` functions
6. Create `LoginPage.jsx` — username + password form, calls `POST /api/auth/login`, stores token, redirects to dashboard
7. Create `ProtectedRoute.jsx` — wraps routes, redirects to `/login` if no token
8. Create `MainLayout.jsx` — sidebar with navigation links: Dashboard, Generator, ATS, MDP, SDP, UPS, Alarms, Predictions, Tickets, Reports, Settings. Empty placeholder pages for each route.
9. Setup `App.jsx` with React Router: `/login` (public), everything else wrapped in `ProtectedRoute`

---

#### Onel — Python FastAPI Skeleton

**Deliverables:**
- FastAPI project running on port 8000
- `/health` endpoint returning `{ "status": "ok" }`
- Placeholder `/predict` returning dummy data
- Project structure ready for real model in Sprint 4

**Tasks:**
1. Create project directory `ml-service/`, set up `venv`, install: `fastapi`, `uvicorn`, `pydantic`, `pandas`, `scikit-learn`, `joblib`, `numpy`
2. Create `requirements.txt`
3. Project structure:
   ```
   ml-service/
   ├── main.py
   ├── routes/
   │   └── predict.py
   ├── models/
   │   └── schemas.py      ← Pydantic request/response models
   ├── services/
   │   └── predictor.py    ← model loading + inference logic
   └── saved_models/       ← .pkl files go here in Sprint 4
   ```
4. In `schemas.py`, create Pydantic models matching Section 6 (ML Service Contract)
5. In `main.py`: create FastAPI app, configure CORS (`allow_origins=["http://localhost:8080"]`), include routers, add `GET /health`
6. In `predict.py`: implement `POST /predict` — for now return dummy response `{ failure_probability: 0.1, predicted_failure_type: "None", recommended_actions: [] }`
7. Verify FastAPI starts: `uvicorn main:app --reload --port 8000`, check `http://localhost:8000/docs`

---

### Sprint 2 — Generator & ATS (End-to-End)
**Duration:** Weeks 3–4  
**Goal:** Generator and ATS fully working — simulated data flowing through backend to frontend with live alarm detection

---

#### Dhanuja — Mock Data Simulator (Generator + ATS)

**Deliverables:**
- Spring Boot generates realistic Generator and ATS readings every 5 seconds
- Readings saved to `sensor_readings` table
- `AlarmService` called after each reading to check thresholds

**Tasks:**
1. Create `DataSimulationService.java` with `@Service` and `@EnableScheduling` on config class
2. Implement `simulateGenerator()` annotated with `@Scheduled(fixedRate = 5000)`:
   - Base values: voltage ~230V (±5V random variation), current ~45A (±3A), fuel 100% (decrements 0.01% per tick), frequency ~50Hz (±0.5Hz), temp ~28°C (±2°C)
   - Occasionally inject fault: every 500 ticks randomly drop fuel by 5% (to simulate realistic drain)
   - Set `running_status = "RUNNING"`, `breaker_status = "CLOSED"`, alarms = false
   - Build JSON string from the data structure in Section 3, save `SensorReading` entity with `subsystem_type = GENERATOR`, `subsystem_id = "GENERATOR-01"`
   - Call `alarmService.checkGenerator(readingData)`
3. Implement `simulateATS()` annotated with `@Scheduled(fixedRate = 5000)`:
   - `active_source` defaults to `"MAINS"`, `transfer_status = "NORMAL"`
   - Simulate mains voltage ~230V. Every 200 ticks, randomly flip to `"GENERATOR"` for 10 ticks then flip back (simulates transfer test)
   - Save reading and call `alarmService.checkATS(readingData)`

---

#### Nethmini — REST APIs + Alarm Logic (Generator + ATS)

**Deliverables:**
- `AlarmService` with threshold checks for Generator and ATS
- Full REST API for Generator and ATS
- Alarm acknowledge endpoint

**Tasks:**
1. Create `AlarmService.java`:
   - Define threshold constants at the top of the class (matching Section 4)
   - `checkGenerator(Map<String, Object> data)` — checks each condition from Section 4 Generator table. For each triggered condition, check if an ACTIVE alarm with that `alarm_code` + `subsystem_id` already exists. If not, create and save a new `Alarm` entity.
   - `checkATS(Map<String, Object> data)` — same pattern for ATS thresholds
2. Create `GeneratorController.java`:
   - `GET /api/generator/status` — fetch latest reading from `sensor_readings`, count active alarms, compute `overallStatus`, return `StatusObject`
   - `GET /api/generator/readings?limit=50` — fetch latest N readings ordered by `recorded_at DESC`
   - `GET /api/generator/alarms` — fetch alarms where `subsystem_type = GENERATOR` and `status = ACTIVE`
3. Create `ATSController.java` — same pattern for ATS
4. Create `AlarmController.java`:
   - `GET /api/alarms?status=&subsystem=` — dynamic query with optional filters
   - `PUT /api/alarms/{id}/acknowledge` — set `status = ACKNOWLEDGED`, `acknowledged_at = now()`, `acknowledged_by = current user id`
   - `GET /api/alarms/history` — paginated query across all statuses

---

#### Achani — React Dashboard (Generator + ATS)

**Deliverables:**
- Generator and ATS pages showing live data
- Auto-refresh every 5 seconds

**Tasks:**
1. Create `src/hooks/usePolling.js` — custom hook: `usePolling(fetchFn, intervalMs)` calls `fetchFn` on mount and every `intervalMs` ms, returns `{ data, loading, error }`
2. Create `GeneratorPage.jsx`:
   - Top status bar: running status badge (green/red), active alarm count badge
   - Readings grid: 6 cards showing V_L1, V_L2, V_L3, Current_L1/L2/L3
   - Fuel level: horizontal progress bar (red < 20%, amber < 40%, green otherwise)
   - Frequency, temperature cards
   - Breaker status, intruder/fire alarm indicators
   - Uses `usePolling(() => api.get('/api/generator/status'), 5000)`
3. Create `ATSPage.jsx`:
   - Active source indicator (MAINS / GENERATOR) with large colored badge
   - Mains voltage card, Generator voltage card
   - Transfer status indicator
   - Last transfer timestamp
4. Create reusable `StatusBadge.jsx` — props: `status` (`NORMAL`|`WARNING`|`CRITICAL`) → green/amber/red pill
5. Create reusable `ReadingCard.jsx` — props: `label`, `value`, `unit` → consistent card style

---

#### Onel — React Alarm Panel

**Deliverables:**
- Alarms page showing all active alarms
- Acknowledge working and reflecting immediately

**Tasks:**
1. Create `AlarmsPage.jsx`:
   - Fetch `GET /api/alarms?status=ACTIVE` every 10 seconds
   - Table columns: Subsystem, Alarm Code, Message, Severity, Triggered At, Action
   - Severity column: red badge for CRITICAL, amber for WARNING
   - Acknowledge button per row — calls `PUT /api/alarms/{id}/acknowledge`, then re-fetches list
2. Add subsystem filter dropdown (All, Generator, ATS, MDP, SDP, UPS)
3. Show alarm count badge in the sidebar nav link (e.g. "Alarms (3)")
4. Create reusable `SeverityBadge.jsx` — props: `severity` → colored pill

---

### Sprint 3 — MDP, SDP & UPS (End-to-End)
**Duration:** Weeks 5–6  
**Goal:** Remaining three subsystems working end-to-end

---

#### Dhanuja — Mock Simulator (MDP + SDP)

**Tasks:**
1. Add `simulateMDP()` to `DataSimulationService`:
   - Simulate 3-phase: R/Y/B voltages ~230V (±5V each independently)
   - Currents ~80A per phase (±3A)
   - Phase imbalance: every 300 ticks, inject ±15V on one phase to trigger `MDP_PHASE_IMBALANCE`
2. Add `simulateSDP()` — runs for both `SDP-01` and `SDP-02`:
   - Slightly lower voltages ~228V (SDP is downstream of MDP)
   - Currents ~30A per phase
3. Add `checkMDP(data)` and `checkSDP(data, subsystemId)` to `AlarmService` (Section 4 thresholds)
4. Phase imbalance check: `Math.max(V_R, V_Y, V_B) - Math.min(V_R, V_Y, V_B) > 5`

---

#### Nethmini — Mock Simulator (UPS) + All Remaining APIs

**Tasks:**
1. Add `simulateUPS()` — runs for both `UPS-01` and `UPS-02`:
   - `operational_status = "ONLINE"`, battery starts at 85%, slowly charges to 100%, occasionally drops to `ON_BATTERY` for 20 ticks (simulate brief mains outage)
   - Load % ~45% with ±5% variation
   - Runtime inversely proportional to battery %
2. Add `checkUPS(data, subsystemId)` to `AlarmService`
3. Create `MDPController.java` — `GET /api/mdp/status`, `/readings`, `/alarms`
4. Create `SDPController.java` — `GET /api/sdp` (returns list of IDs), `GET /api/sdp/{sdpId}/status`, `/readings`, `/alarms`
5. Create `UPSController.java` — `GET /api/ups` (returns list of IDs), `GET /api/ups/{upsId}/status`, `/readings`, `/alarms`

---

#### Achani — React Dashboard (MDP + SDP)

**Tasks:**
1. Create `MDPPage.jsx`:
   - Three-phase voltage bar chart (R/Y/B as horizontal bars, nominal line at 230V)
   - Three-phase current cards
   - Main breaker status, temperature, intruder/fire indicators
2. Create `SDPPage.jsx`:
   - Tab or dropdown to select between SDP-01 and SDP-02
   - Same layout as MDP but per selected SDP
3. Update sidebar to show `overallStatus` color dot next to each subsystem name (fetch all statuses on layout load)

---

#### Onel — React Dashboard (UPS) + Alarm History

**Tasks:**
1. Create `UPSPage.jsx`:
   - Cards for UPS-01 and UPS-02 side by side
   - Per unit: battery charge % (circular or bar progress), load %, operational status badge, estimated runtime, output voltage
2. Create `AlarmHistoryPage.jsx`:
   - Fetch `GET /api/alarms/history` with pagination
   - Date range pickers (from / to)
   - Subsystem filter dropdown
   - Status filter (ACTIVE / ACKNOWLEDGED / RESOLVED / All)
   - Table: Subsystem, Message, Severity, Status, Triggered, Acknowledged By

---

### Sprint 4 — ML Predictive Maintenance
**Duration:** Weeks 7–8  
**Goal:** Trained ML model integrated, predictions visible on dashboard

---

#### Dhanuja — ML Model Training

**Deliverables:**
- Trained model per subsystem saved as `.pkl` in `ml-service/saved_models/`
- `feature_config.json` documenting exact input features per model

**Tasks:**
1. Load historical CSV data from expressway controllers into a Pandas DataFrame
2. Exploratory analysis: check nulls, distributions, outliers
3. Feature engineering:
   - Rolling mean and std over last 10 readings per subsystem
   - Rate of change: `(current - previous) / interval`
   - Time features: hour of day, day of week
4. Label engineering: mark rows within 24h before a known failure as `failure = 1`, others as `0`
5. Train one model per subsystem (Random Forest or XGBoost — whichever gives better F1)
6. Evaluate: print classification report (precision, recall, F1, AUC-ROC)
7. Export: `joblib.dump(model, 'saved_models/generator_model.pkl')` for each subsystem
8. Create `feature_config.json`:
   ```json
   {
     "GENERATOR": ["voltage_L1", "voltage_L2", "voltage_L3", "current_L1", "fuel_level_pct", "frequency_hz", "room_temperature_c"]
   }
   ```
   (List only the features the model was trained on — Onel's predictor service must use these exact features)

---

#### Nethmini — FastAPI `/predict` Endpoint (Real Model)

**Tasks:**
1. In `predictor.py`, load all `.pkl` model files at application startup using `@app.on_event("startup")`
2. Load `feature_config.json` to know which fields to extract per subsystem
3. Implement inference logic: extract features from request `readings` dict using `feature_config`, run `model.predict_proba()`, return probability of class `1` (failure)
4. Map probability to `predicted_failure_type` using a simple lookup (e.g. > 0.7 for Generator → "Fuel System Degradation")
5. Map to `recommended_actions` list from a predefined lookup per alarm type
6. Update `POST /predict` to use real model; handle `subsystem` not having a model (return `failure_probability: 0.0`)
7. Test each subsystem via `/docs` interactive UI

---

#### Achani — Spring Boot ML Integration

**Tasks:**
1. Create `MLService.java` — uses `RestTemplate` to call `POST http://localhost:8000/predict`
2. Create `PredictionScheduler.java` with `@Scheduled(fixedRate = 60000)`:
   - For each subsystem (`GENERATOR-01`, `ATS-01`, `MDP-01`, `SDP-01`, `SDP-02`, `UPS-01`, `UPS-02`):
     - Fetch the latest `SensorReading` from DB
     - Build the ML request payload (extract `reading_data` fields)
     - Call `mlService.predict(request)`
     - Save result as `Prediction` entity to DB
   - Wrap in try-catch — if ML service unreachable, log warning and continue
3. Create `PredictionController.java`:
   - `GET /api/predictions` — fetch latest prediction per subsystem (one per subsystem_id)
   - `GET /api/predictions/{subsystem}` — fetch latest N predictions for a subsystem

---

#### Onel — React Predictions UI

**Tasks:**
1. Create reusable `PredictionPanel.jsx` — props: `subsystem`, `subsystemId`
   - Fetch `GET /api/predictions/{subsystem}` every 60 seconds
   - Failure probability bar: green (< 30%), amber (30–70%), red (> 70%)
   - Predicted failure type text
   - Recommended actions as a numbered list
2. Embed `PredictionPanel` at the bottom of each subsystem page (GeneratorPage, ATSPage, etc.)
3. Create standalone `PredictionsPage.jsx` — shows prediction panels for all subsystems in a grid
4. Add warning indicator to sidebar nav if any subsystem has `failure_probability > 0.7`

---

### Sprint 5 — Reports, Tickets, Settings & Deployment
**Duration:** Weeks 9–10  
**Goal:** All features complete, system live on AWS

---

#### Dhanuja — Report Export

**Tasks:**
1. Add `iTextPDF` (or Apache PDFBox) to `pom.xml`
2. Create `ReportService.java`:
   - `generatePDF(subsystem, from, to)` — queries sensor readings + alarms for date range, builds PDF with: title header, summary stats (avg voltage, peak current, alarm count), readings table, alarms table
   - `generateCSV(subsystem, from, to)` — writes sensor readings as CSV rows
3. Create `ReportController.java`: `GET /api/reports/{subsystem}?from=&to=&format=PDF|CSV` — sets `Content-Disposition: attachment` header, streams file
4. In React, add "Export Report" button to each subsystem page:
   - Date range picker (from / to)
   - Format selector (PDF / CSV)
   - On click: `window.open('/api/reports/{subsystem}?...')` with auth token (or use Axios blob download)

---

#### Nethmini — Maintenance Tickets

**Tasks:**
1. Verify `MaintenanceTicket` entity exists (Dhanuja created it in Sprint 1) — add service and controller
2. Create `TicketService.java` — CRUD operations
3. Create `TicketController.java` with all 4 endpoints from Section 5 API Contract
4. Create `TicketsPage.jsx` in React:
   - Table: Subsystem, Title, Priority, Status, Created At, Actions
   - "Create Ticket" button → opens modal form (title, description, priority dropdown, subsystem dropdown)
   - Status update: dropdown on each row (OPEN → IN_PROGRESS → CLOSED)
5. Add "Create Ticket" button to `AlarmsPage` (pre-fills `alarmId`)
6. Add "Create Ticket" button to `PredictionPanel` (pre-fills `predictionId`)

---

#### Achani — Settings Page

**Tasks:**
1. Create `ThresholdConfig` entity: `id`, `subsystem_type`, `alarm_code`, `threshold_value`, `threshold_type` (ENUM: MIN, MAX)
2. Create `ThresholdRepository`, `ThresholdService`
3. Modify `AlarmService` to read thresholds from DB on startup (cache in a Map, reload on PUT)
4. Create `SettingsController.java`: `GET /api/settings/thresholds`, `PUT /api/settings/thresholds`
5. Create `SettingsPage.jsx`:
   - Organized by subsystem (tabs or accordion)
   - Editable number inputs per threshold with current values pre-filled
   - Save button per subsystem section
6. User management section (admin only): table of users, "Add User" form (username, password, role)

---

#### Onel — AWS Deployment

**Deliverables:**
- All services running on AWS, accessible via public URL

**Tasks:**
1. **RDS:** Create MySQL 8 RDS instance (db.t3.micro), configure security group to allow port 3306 only from Spring Boot EC2. Run schema SQL. Update Spring Boot `application.properties` with RDS endpoint.
2. **Spring Boot EC2:** Launch EC2 (t3.small), install Java 17. Build Spring Boot jar (`mvn package`), upload via SCP. Run as service with `systemd`. Security group: allow 8080 from frontend domain and FastAPI EC2 only.
3. **FastAPI EC2:** Launch EC2 (t3.small), install Python 3.11. Upload ML service + model files. Run with `uvicorn` via `systemd`. Security group: allow 8000 from Spring Boot EC2 only (not public).
4. **React (S3 + CloudFront):** Build React (`npm run build`), upload `dist/` to S3 bucket with static website hosting enabled. Create CloudFront distribution pointing to S3. Update Axios `baseURL` to Spring Boot EC2 public IP/domain before building.
5. **Integration test:** Login → view Generator page (live data) → trigger acknowledge on alarm → check predictions → export report PDF. Verify all flows end-to-end.

---

## 8. Workload Summary

| | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 | Sprint 5 |
|--|----------|----------|----------|----------|----------|
| **Dhanuja** | DB schema + JPA entities | Mock simulator Gen+ATS | Mock simulator MDP+SDP | ML model training | Report export |
| **Nethmini** | Spring Boot + JWT auth | APIs + alarm logic Gen+ATS | Mock sim UPS + APIs MDP/SDP/UPS | FastAPI real predict endpoint | Maintenance tickets |
| **Achani** | React setup + login + routing | Dashboard Gen+ATS pages | Dashboard MDP+SDP pages | Spring Boot ML integration | Settings page |
| **Onel** | FastAPI skeleton | Alarm panel UI | UPS page + alarm history | Predictions UI | AWS deployment |

---

## 9. Integration Points (Where Team Members Touch Each Other's Work)

| Sprint | Integration | Who |
|--------|------------|-----|
| 1 | Nethmini creates Spring Boot project on Day 1 — Dhanuja adds entities to it | Nethmini → Dhanuja |
| 1 | Achani's login page calls Nethmini's `/api/auth/login` | Achani ↔ Nethmini |
| 2 | Dhanuja's simulator calls Nethmini's `AlarmService` | Dhanuja → Nethmini |
| 2 | Achani's dashboard calls Nethmini's `/api/generator/status` | Achani → Nethmini |
| 3 | Same pattern: Dhanuja simulator → Nethmini alarm service | Dhanuja → Nethmini |
| 4 | Dhanuja exports `.pkl` models → Onel loads them in FastAPI | Dhanuja → Onel (Nethmini) |
| 4 | Achani's Spring Boot scheduler calls Onel's `/predict` | Achani → Onel |
| 4 | Onel's React panel calls Achani's `/api/predictions` | Onel → Achani |
| 5 | Onel deploys all services — needs final builds from everyone | All → Onel |

**Shared repo structure:**
```
project-root/
├── backend/          ← Spring Boot (Nethmini owns, everyone commits)
├── frontend/         ← React (Achani owns)
├── ml-service/       ← FastAPI (Onel owns, Dhanuja adds models)
└── docs/             ← this document, DB schema SQL
```

Use feature branches. No direct commits to `main`. PR reviewed by at least one other member before merging.
