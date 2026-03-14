import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../../data');
mkdirSync(dataDir, { recursive: true });

const defaultData = {
  users: [], categories: [], warehouses: [], locations: [], products: [],
  stockLevels: [], receipts: [], receiptLines: [], deliveries: [], deliveryLines: [],
  transfers: [], transferLines: [], adjustments: [], adjustmentLines: [], moveHistory: []
};

const adapter = new JSONFile(join(dataDir, 'coreinventory.json'));
export const db = new Low(adapter, defaultData);

export async function initDB() {
  await db.read();
  db.data ||= defaultData;
  await db.write();
  console.log('✅ Database (lowdb JSON) initialized');
}

export async function saveDB() {
  await db.write();
}
