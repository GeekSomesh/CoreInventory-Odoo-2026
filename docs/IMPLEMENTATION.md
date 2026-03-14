# CoreInventory Implementation Guide

This document describes how CoreInventory is implemented across backend and frontend modules, including stock mutation rules and automation workflow behavior.

## 1. Domain Model

Core entities:
- User
- Category
- Warehouse
- Location
- Product
- StockLevel
- Receipt and ReceiptLine
- Delivery and DeliveryLine
- Transfer and TransferLine
- Adjustment and AdjustmentLine
- MoveHistory

All operational documents use statuses:
- `draft`
- `waiting`
- `ready`
- `done`
- `cancelled`

## 2. Backend Implementation

Backend entry point:
- `backend/src/index.js`

It initializes storage, sets up middleware, and mounts all route modules under `/api`.

## 2.1 Storage Adapter

File:
- `backend/src/db.js`

Modes:
- `lowdb`: JSON file persistence (`data/coreinventory.json`)
- `postgres`: relational persistence through `pg`

Important design choice:
- Route handlers operate on a common in-memory contract (`db.data`) regardless of storage mode.
- `saveDB()` persists current snapshot using the selected adapter.

PostgreSQL schema:
- `backend/src/postgres/schema.js`

## 2.2 Authentication

File:
- `backend/src/routes/auth.js`

Endpoints:
- `POST /api/auth/login`
- `POST /api/auth/otp/request`
- `POST /api/auth/otp/verify`
- `POST /api/auth/otp/reset`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `PUT /api/auth/password`

Behavior:
- JWT is used for session access.
- `authMiddleware` verifies token and injects `req.user`.

## 2.3 Inventory Operations

### Receipts

File:
- `backend/src/routes/receipts.js`

Core behavior:
- Create receipt with lines.
- Validate receipt:
  - Increase stock in line location.
  - Post `receipt` move-history rows (`VENDOR` -> location).
  - Mark document `done`.

### Deliveries

File:
- `backend/src/routes/deliveries.js`

Core behavior:
- Create delivery with demand lines.
- Validate delivery:
  - Reduce stock from line location.
  - Post `delivery` move-history rows (location -> `CUSTOMER`).
  - Mark document `done`.

### Transfers

File:
- `backend/src/routes/transfers.js`

Core behavior:
- Create transfer with source and destination.
- Validate transfer:
  - Decrease source stock.
  - Increase destination stock.
  - Post `transfer` move-history rows (source -> destination).
  - Mark document `done`.

### Adjustments

File:
- `backend/src/routes/adjustments.js`

Core behavior:
- Supports recount model and delta model (`change_qty`).
- Validation sets final counted quantity in location.
- Posts `adjustment` move-history with absolute delta quantity.

## 2.4 Dashboard and Reporting

Files:
- `backend/src/routes/dashboard.js`
- `backend/src/routes/history.js`

Dashboard aggregates:
- Product count
- Low stock count/list
- Pending docs
- Recent moves
- Trend and category summaries

History module:
- Paginated move-history query
- Filter by product/type/date
- CSV export

## 2.5 Automation Workflow

File:
- `backend/src/routes/automation.js`

Endpoint:
- `POST /api/automation/delivery`

Input:
- Customer
- Warehouse
- Optional schedule/notes/supplier
- Demand lines (product + quantity + optional preferred location)

Execution flow per requested line:
1. Allocate from selected warehouse locations first.
2. If insufficient, pull stock from external locations and create transfer plans.
3. If still insufficient, create receipt plans for remaining shortfall.
4. Materialize transfer docs and validate them (`done`).
5. Materialize receipt docs and validate them (`done`).
6. Create final delivery and validate it (`done`).
7. Persist stock changes and move-history records.

Response:
- Created delivery object
- Created transfer objects
- Created receipt objects
- Summary metrics (requested, transferred, received, delivered)

## 3. Frontend Implementation

Frontend entry point:
- `frontend/src/App.tsx`

App shell:
- Sidebar navigation in `components/layout/Sidebar.tsx`
- Top bar in `components/layout/TopBar.tsx`

State management:
- `zustand` auth store in `store/authStore.ts`

API client:
- Axios instance in `api/client.ts`

## 3.1 Page Modules

- Dashboard: `pages/dashboard/DashboardPage.tsx`
- Products: `pages/products/ProductsPage.tsx`
- Receipts: list + detail pages
- Deliveries: list + detail pages
- Transfers: list + detail pages
- Adjustments: list + detail pages
- Move history: `pages/history/MoveHistoryPage.tsx`
- Settings: warehouse and profile pages
- Automation: `pages/operations/AutomationPage.tsx`

## 3.2 Alerts and Notification Panel

Top bar bell panel (`TopBar.tsx`) currently aggregates:
- Low stock products
- Near-due and overdue pending deliveries
- Near-due and overdue pending receipts
- Near-due and overdue pending transfers

Rows are actionable and route to corresponding pages/documents.

## 3.3 Automation Page UX

Page:
- `pages/operations/AutomationPage.tsx`

User flow:
1. Select customer, warehouse, and demand lines.
2. Submit automation request.
3. View execution summary and generated document references.
4. Navigate directly to generated transfer/receipt/delivery documents.

## 4. Data and Seeding

Curated data is loaded from:
- `data/curated/users.json`
- `data/curated/categories.json`
- `data/curated/warehouses.json`
- `data/curated/products.json`
- `data/curated/operations.json`
- `data/curated/history.json`

Seeder:
- `backend/src/seed.js`

Behavior:
- Rebuilds DB snapshot with deterministic baseline data.

## 5. Stock Integrity Rules

Core invariant:
- Any stock-changing operation must update both:
  - `stockLevels`
  - `moveHistory`

Operation mapping:
- Receipt: `+stock` at destination
- Delivery: `-stock` from source
- Transfer: `-source`, `+destination`
- Adjustment: set to counted quantity, ledger stores delta

Automation preserves this invariant by generating actual docs and posting corresponding ledger rows instead of applying direct hidden mutations.

## 6. Validation and Build

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

## 7. Extension Points

Recommended next implementation upgrades:
- Extract automation planning into standalone service module with unit tests.
- Add transactional boundaries for postgres mode to protect multi-document automation commits.
- Add idempotency key support for automation endpoint.
- Add role-based permissions per operation module.
- Add integration tests for stock mutation invariants across all operation routes.
