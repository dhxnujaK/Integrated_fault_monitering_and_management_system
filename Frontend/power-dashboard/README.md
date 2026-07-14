# Power Dashboard

## Alarm-flow verification before backend integration

The alarm UI is designed for the shared Spring Boot contract in `sprint_plan 2.md`:

- `GET /api/alarms?status=&unresolved=&equipmentType=&equipmentId=&severity=&from=&to=&page=&size=`;
- `PUT /api/alarms/{alarmId}/acknowledge` with `{ "note": "" }`.

The remaining Sprint 2–3 live monitoring screens also use:

- `GET /api/dashboard/summary`;
- `GET /api/equipment?type=UPS&enabled=true`;
- `GET /api/equipment/{equipmentId}/status`;
- `GET /api/equipment/{equipmentId}/readings?limit=1`.

Dashboard summary/alarm data refreshes every 10 seconds. The UPS equipment, status, and latest-reading data refreshes every 5 seconds. An acknowledgement immediately refreshes the dashboard alarm data instead of waiting for polling.

To verify the frontend before those endpoints are merged, create a local `.env.local` file containing:

```text
VITE_USE_MOCK_MONITORING=true
```

Then run `npm run dev` and sign in. The monitoring mock is used only when that flag is exactly `true`; it is never the production default.

Check the following:

1. Dashboard > Alarm Summary: click an Active UPS or Generator alarm. You should land on that equipment page with its **Active** tab selected.
2. On the equipment page, click **Acknowledge**. The item must immediately disappear from Active and the **Acknowledged** tab must open with that item present.
3. Return to Dashboard: the acknowledged alarm is still shown as unresolved, with status **Acknowledged**.
4. Open the MDP page and choose **History**. The resolved mock alarm displays its created and closed timestamps.
5. Open UPS Status. The UPS cards and the selected-unit values are loaded through the equipment/status/reading contract, not the old hardcoded fleet values. Select each UPS card and confirm the contextual alarm list changes with the selection.

For Nethmini's backend integration, remove the local flag (or use `false`) and repeat the same checks with the Spring Boot API running. The backend is responsible for automatically setting `RESOLVED` and `resolvedAt` once the triggering condition clears.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
