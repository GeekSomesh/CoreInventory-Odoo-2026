# CoreInventory

CoreInventory is a modular Inventory Management System (IMS) built to manage stock operations across warehouses with a single workflow-oriented interface.  
The project includes full operational modules for products, receipts, deliveries, internal transfers, adjustments, analytics, and automated fulfillment fallback.

## 1. Solution Scope

CoreInventory is designed for:
- Inventory managers who need stock visibility and control.
- Warehouse operators who execute receipts, dispatches, transfers, and adjustments.

Primary objective:
- Replace manual tracking with a consistent digital process backed by API-driven operations and a central stock ledger.

## 2. Key Capabilities

- Authentication and profile management.
- Product and category management with reorder thresholds.
- Receipt workflow (incoming stock).
- Delivery workflow (outgoing stock).
- Internal transfer workflow (location-to-location movement).
- Stock adjustment workflow (reconciliation with physical count).
- Move history ledger with filtering and CSV export.
- Dashboard metrics and operation insights.
- Alert panel for low stock and near-due operations.
- Automation module:
  - Creates delivery.
  - Uses in-warehouse stock first.
  - Creates internal transfers if required.
  - Creates receipts for remaining shortfall.
  - Validates generated documents and updates stock automatically.

## 3. Technology Stack

### Frontend
- React 19
- TypeScript
- Vite
- Zustand
- Recharts
- Framer Motion
- Axios

### Backend
- Node.js
- Express
- JWT authentication
- Dual storage engine:
  - LowDB (JSON file mode)
  - PostgreSQL

### Data
- Curated seed data from public sources.
- Deterministic seeding workflow.

## 4. Architecture

High-level flow:
1. React frontend calls REST APIs on `http://localhost:3001/api`.
2. Express routes perform validation and execute domain workflow logic.
3. Storage adapter persists state in either LowDB or PostgreSQL behind the same in-memory data contract.
4. Stock changes are recorded in both stock-level records and move-history ledger entries.

Core backend modules:
- `auth`
- `products`
- `warehouses`
- `receipts`
- `deliveries`
- `transfers`
- `adjustments`
- `history`
- `dashboard`
- `automation`

## 5. Repository Layout

```text
CoreInventory-Odoo-2026/
  backend/
    src/
      routes/
      middleware/
      postgres/
      scripts/
  frontend/
    src/
      components/
      pages/
      store/
      types/
  data/
    curated/
    raw/
    coreinventory.json
  scripts/
    curate_public_dataset.py
```

## 6. Setup and Run

## 6.1 Prerequisites

- Node.js 20+
- npm
- PostgreSQL (optional but recommended)
- Python 3.10+ (only for data curation script)

## 6.2 Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Configure `backend/.env`:

LowDB mode:
```env
DB_CLIENT=lowdb
```

PostgreSQL mode:
```env
DB_CLIENT=postgres
DATABASE_URL=postgres://postgres:<password>@localhost:5432/coreinventory
DB_SSL=false
```

Initialize and seed:

```powershell
npm run db:init
npm run seed
npm run start
```

Backend base URL:
- `http://localhost:3001`

Health endpoint:
- `GET /api/health`

## 6.3 Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL:
- `http://localhost:5173`

## 7. Demo Accounts

- Manager: `manager@coreinventory.com` / `manager123`
- Staff: `staff@coreinventory.com` / `staff123`

Seeded manager display name:
- `Praman`

## 8. Data Curation Pipeline

The repository includes a curation script that merges public datasets into the app schema.

Sources currently referenced:
- Amazon Reviews 2023 (`Industrial_and_Scientific`)
- Amazon Reviews 2023 (`Tools_and_Home_Improvement`)
- UCI Online Retail II

Run from repository root:

```powershell
python scripts/curate_public_dataset.py
```

Generated curated files:
- `data/curated/products.json`
- `data/curated/operations.json`
- `data/curated/history.json`
- `data/curated/source-manifest.json`

Then reseed:

```powershell
cd backend
npm run seed
```

## 9. Automation Workflow

API endpoint:
- `POST /api/automation/delivery`

Behavior:
1. Receives customer demand lines for a target warehouse.
2. Allocates available quantity from selected warehouse locations.
3. If short, pulls from other locations through generated transfer documents.
4. If still short, creates receipt document(s) for remaining quantity.
5. Creates and validates delivery for full requested quantity.
6. Persists all generated docs and move-history entries.

The frontend Automation page is available in sidebar:
- `Operations -> Automation`

## 10. Quality Checks

Frontend:

```powershell
cd frontend
npm run lint
npm run build
```

Backend syntax check:

```powershell
node --check backend/src/index.js
node --check backend/src/routes/automation.js
```

## 11. Documentation

- Product overview and setup: this file.
- Implementation details: `docs/IMPLEMENTATION.md`
- Frontend notes: `frontend/README.md`
- Backend notes: `backend/README.md`

## 12. Operational Notes

- Do not commit local runtime logs such as `frontend-dev.log` or `backend-dev.log`.
- Re-seeding overwrites application records with curated seed state.
- When switching storage mode, restart backend after updating `.env`.
