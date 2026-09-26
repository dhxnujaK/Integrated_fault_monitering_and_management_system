# Onel Deployment Runbook

This runbook covers the Spring Boot backend delivered by Onel. The frontend and ML service have separate owners and deployment steps.

## Build

From `backend/`:

```powershell
.\mvnw.cmd clean package -DskipTests
```

The deployable artifact is `backend/target/backend-0.0.1-SNAPSHOT.jar`.

## Runtime Configuration

Set these environment variables in the deployment environment:

| Variable | Required | Purpose |
|---|---:|---|
| `DB_URL` | Yes | MySQL JDBC URL |
| `DB_USERNAME` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `JWT_SECRET` | Yes | Base64 JWT signing secret; use a unique production secret |
| `JPA_DDL_AUTO` | No | Defaults to `update`; use the approved production migration policy |
| `ML_SERVICE_URL` | No | Defaults to `http://localhost:8000` |
| `ML_PREDICTION_ENABLED` | No | Defaults to `false` |
| `SIMULATION_ENABLED` | No | Defaults to `false`; keep disabled in production |

The backend listens on port `8080` by default.

## Start

```powershell
java -jar backend\target\backend-0.0.1-SNAPSHOT.jar
```

## Health Check

Confirm that port `8080` is listening and that authentication responds:

```powershell
Test-NetConnection localhost -Port 8080
Invoke-WebRequest http://localhost:8080/api/auth/me -UseBasicParsing
```

The unauthenticated request should return `401 Unauthorized`. This confirms that the application and security filter are running.

Then log in through `POST /api/auth/login` and verify an authenticated `GET /api/auth/me` returns the current user.

## Backend Smoke Checks

After authentication, verify:

1. `GET /api/equipment` returns configured equipment.
2. `GET /api/tickets` is available to Admin and Operator users.
3. `GET /api/reports/alarms?format=CSV` returns a CSV download.
4. `GET /api/equipment/{equipmentId}/thresholds` is available to Admin users.
5. `GET /api/users` is available to Admin users and denied to Operators.

## Rollback

1. Stop the running backend process.
2. Restore the previously approved JAR artifact.
3. Restore the previous environment configuration if it changed.
4. Start the restored JAR.
5. Repeat the health and smoke checks before routing traffic back.

Do not delete or recreate the production database during rollback. Threshold and ticket data are persistent application data.