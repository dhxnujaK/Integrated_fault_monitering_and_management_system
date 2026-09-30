# Achani Frontend Runbook

Owner: Achani

This covers the React/Vite production build for the final sprint deployment rehearsal.

## Build

```powershell
cd Frontend\power-dashboard
npm ci
npm run build
```

The deployable static files are written to `Frontend/power-dashboard/dist/`.

## Runtime Configuration

Create the deployment environment with:

```text
VITE_API_BASE_URL=https://<spring-boot-backend-domain>
VITE_USE_MOCK_MONITORING=false
```

`VITE_USE_MOCK_MONITORING` must stay `false` or unset for production. Mock fixtures must not be displayed as live readings.

## Local Preview

```powershell
cd Frontend\power-dashboard
npm run build
npm run preview -- --host 0.0.0.0
```

## Health and Smoke Check

1. Open the hosted React URL.
2. Sign in as Admin.
3. Confirm dashboard, equipment pages, diagnosis, predictions, operations, tickets, and reports load from the Spring Boot backend.
4. Confirm API failures show error states instead of mock live readings.
5. Sign in as Operator and verify Admin-only controls are refused by the backend.

## Rollback

1. Restore the previous approved static build artifact.
2. Restore the previous environment values.
3. Redeploy the previous static files.
4. Re-run the smoke check above.
