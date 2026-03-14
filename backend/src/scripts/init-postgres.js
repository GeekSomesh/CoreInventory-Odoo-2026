import 'dotenv/config';
import { closeDB, initDB, storageMode } from '../db.js';

if (storageMode !== 'postgres') {
  console.error('Set DB_CLIENT=postgres and DATABASE_URL before running db:init.');
  process.exit(1);
}

await initDB();
await closeDB();

console.log('PostgreSQL schema initialized for CoreInventory.');
