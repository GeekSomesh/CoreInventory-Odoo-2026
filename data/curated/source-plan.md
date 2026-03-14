## Planned Dataset Combination

This curated layer is structured to absorb a hybrid external dataset strategy:

- `product_master`
  - Target tables: `categories`, `products`
  - Expected source shape: JSONL or CSV catalog exports
- `inventory_events`
  - Target tables: `receipts`, `deliveries`, `transfers`, `move_history`
  - Expected source shape: warehouse movement/event ledgers
- `demand`
  - Target fields: `reorder_min`, `reorder_max`, replenishment policy inputs
  - Expected source shape: sales or demand time series

The current JSON files in this folder are a schema-aligned manufacturing sample. The next ETL step is to load raw source files into `data/raw/`, normalize them into these curated shapes, and then seed or stage them into PostgreSQL.
