# CoreInventory Frontend

Frontend application for CoreInventory built with React, TypeScript, and Vite.

## Stack

- React 19
- TypeScript
- Vite
- Zustand (auth state persistence)
- Axios (API client)
- Recharts (dashboard charts)
- Framer Motion (UI transitions)

## Start

```powershell
npm install
npm run dev
```

Dev server:
- `http://localhost:5173`

## Build and Lint

```powershell
npm run lint
npm run build
npm run preview
```

## API Base URL

Configured in:
- `src/api/client.ts`

Default:
- `http://localhost:3001/api`

## Main Feature Areas

- Dashboard and operational insights
- Product management
- Receipts, deliveries, transfers, adjustments
- Move history ledger
- Warehouse and profile settings
- Automation page for delivery fulfillment fallback workflow

## Notes

- Authentication token is stored in local storage key `ci_token`.
- Persisted auth profile is stored in local storage key `ci-auth`.
- If backend profile fields change, refresh session by relogin or clearing persisted auth keys.
