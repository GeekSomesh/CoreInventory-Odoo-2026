import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const curatedDir = join(__dirname, '../../../data/curated');

function readJson(filename) {
  return JSON.parse(readFileSync(join(curatedDir, filename), 'utf8'));
}

function readOptionalJson(filename, fallback) {
  const fullPath = join(curatedDir, filename);
  if (!existsSync(fullPath)) {
    return fallback;
  }
  return JSON.parse(readFileSync(fullPath, 'utf8'));
}

export function loadCuratedData() {
  return {
    users: readJson('users.json'),
    categories: readJson('categories.json'),
    warehouses: readJson('warehouses.json'),
    products: readJson('products.json'),
    operations: readJson('operations.json'),
    history: readOptionalJson('history.json', []),
  };
}
