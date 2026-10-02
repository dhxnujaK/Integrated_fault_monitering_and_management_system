# Final Deployment Rehearsal

Coordinator: Onel

This file ties the service-owner runbooks together for Sprint Plan 3 Day 10.

## Owner Runbooks

- Backend: `docs/onel-deployment-runbook.md`
- ML service: `docs/dhanuja-ml-service-runbook.md`
- Frontend: `docs/achani-frontend-runbook.md`

## Rehearsal Order

1. Start MySQL or the approved rehearsal database.
2. Start FastAPI and confirm `/health`.
3. Start Spring Boot with `ML_SERVICE_URL` pointing to FastAPI.
4. Run Spring Boot health and smoke checks from `docs/onel-deployment-runbook.md`.
5. Build and host the React production bundle with `VITE_API_BASE_URL` pointing to Spring Boot.
6. Run the Day 9 fixture through backend tests:

```powershell
cd backend
.\mvnw.cmd -Dtest=Day9EndToEndFixtureTests test
```

7. Run full backend tests and frontend build.
8. Stop the ML service and confirm monitoring, alarms, diagnosis, tickets, and CSV reports continue working.

## Final Acceptance Checklist

- Admin and Operator can log in.
- Live status, readings, alarms, charts, diagnosis, predictions, tickets, and CSV reports are available.
- Alarm-to-ticket creation opens with the alarm relationship pre-filled.
- Ticket lifecycle moves `OPEN -> IN_PROGRESS -> CLOSED`.
- PDF is not offered while the backend returns `501`.
- Operator is refused Admin-only equipment/threshold actions.
- Rollback steps have been tested for backend, ML service, and frontend.
