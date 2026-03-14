# CoreInventory IMS

CoreInventory is a modular inventory management system with:
- Node.js + Express backend (`backend/`)
- React + TypeScript + Vite frontend (`frontend/`)
- end-to-end modules for auth, dashboard, products, receipts, deliveries, transfers, adjustments, move history, and warehouse/profile settings

The backend now supports two storage modes behind the same API:
- `lowdb` JSON for lightweight local demo runs
- `postgres` for relational persistence

Curated seed data lives in `data/curated/` and is used by the backend seed script in either mode.

## Public Dataset Curation

This repo now includes a curation step that merges public source datasets into the app schema:
- Amazon Reviews 2023 `Industrial_and_Scientific` metadata
- Amazon Reviews 2023 `Tools_and_Home_Improvement` metadata
- UCI `Online Retail II` transaction history

Run the curator from the repo root:

```powershell
python scripts/curate_public_dataset.py
```

That refreshes:
- `data/curated/products.json`
- `data/curated/operations.json`
- `data/curated/history.json`
- `data/curated/source-manifest.json`

Then reseed the backend:

```powershell
cd backend
npm run seed
```

## Backend Setup

1. Install dependencies:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

2. Choose a storage mode in `backend/.env`:

- JSON demo mode:

```env
DB_CLIENT=lowdb
```

- PostgreSQL mode:

```env
DB_CLIENT=postgres
DATABASE_URL=postgres://postgres:postgres@localhost:5432/coreinventory
```

3. Seed and run:

```powershell
npm run seed
npm run start
```

Optional PostgreSQL schema init:

```powershell
npm run db:init
```

Backend URL: `http://localhost:3001`

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Demo Credentials

- `manager@coreinventory.com` / `manager123`
- `staff@coreinventory.com` / `staff123`

## Data Layout

- `data/curated/`: schema-aligned curated seed data
- `data/raw/`: drop-zone for larger external datasets before ETL/staging
- `data/coreinventory.json`: lowdb snapshot when running JSON mode

## Checks

Frontend:

```powershell
npm run lint
npm run build
```

Backend:

```powershell
cd backend
npm run seed
```
