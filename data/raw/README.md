Place large external source datasets here before staging them into PostgreSQL.

Recommended source groups for this project:
- `product_master/`: catalog-style JSONL or CSV files
- `inventory_events/`: warehouse movement ledgers
- `demand/`: sales or demand time-series for reorder policy derivation

Suggested working formats:
- JSONL for raw product/event payloads
- CSV for flat exports
- Parquet if the source is already columnar and large

The current repository seed uses `data/curated/` as a schema-aligned curated sample. Raw source files are intentionally kept separate so the ETL path into PostgreSQL stays repeatable.
