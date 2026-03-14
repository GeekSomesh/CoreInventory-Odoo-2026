# CoreInventory Backend

Backend service for CoreInventory built with Node.js and Express.

## Stack

- Node.js (ES modules)
- Express
- JWT authentication
- LowDB and PostgreSQL dual storage adapter

## Scripts

```powershell
npm install
npm run db:init
npm run seed
npm run start
```

Additional:

```powershell
npm run dev
```

## Environment

Create `.env` from `.env.example`.

Required values:

```env
PORT=3001
JWT_SECRET=<secret>
DB_CLIENT=postgres
DATABASE_URL=postgres://postgres:<password>@localhost:5432/coreinventory
DB_SSL=false
```

For local JSON mode:

```env
DB_CLIENT=lowdb
```

## API Modules

- `/api/auth`
- `/api/products`
- `/api/warehouses`
- `/api/receipts`
- `/api/deliveries`
- `/api/transfers`
- `/api/adjustments`
- `/api/history`
- `/api/dashboard`
- `/api/automation`

Health:
- `GET /api/health`

## Storage Model

The backend keeps a common `db.data` model in memory.

Persistence adapter:
- LowDB: writes to `data/coreinventory.json`
- PostgreSQL: writes to normalized relational tables and reloads snapshot at startup

## Seeding

Seed script loads curated data from:
- `data/curated/users.json`
- `data/curated/categories.json`
- `data/curated/warehouses.json`
- `data/curated/products.json`
- `data/curated/operations.json`
- `data/curated/history.json`

Run:

```powershell
npm run seed
```

## Automation Endpoint

`POST /api/automation/delivery`

Implements full fallback flow:
1. Consume warehouse stock.
2. Create internal transfer(s) when warehouse stock is insufficient.
3. Create receipt(s) for final shortfall.
4. Validate generated documents and post ledger moves.

Response includes:
- Generated delivery document
- Generated transfer documents
- Generated receipt documents
- Execution summary counts and quantities
