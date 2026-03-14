# CoreInventory IMS (Odoo-style Flow)

CoreInventory is a modular inventory management system with:
- Node.js + Express backend (`backend/`) using lowdb JSON storage
- React + TypeScript + Vite frontend (`frontend/`) with modern glass UI and animated flows
- End-to-end modules for auth, dashboard, products, receipts, deliveries, transfers, adjustments, move history, and warehouse/profile settings

## Run Backend

```powershell
cd backend
npm install
npm run seed
npm run start
```

Backend URL: `http://localhost:3001`

## Run Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Demo Credentials

- `manager@coreinventory.com` / `manager123`
- `staff@coreinventory.com` / `staff123`

## Quality Checks

Frontend:

```powershell
npm run lint
npm run build
```

Backend seed:

```powershell
npm run seed
```
