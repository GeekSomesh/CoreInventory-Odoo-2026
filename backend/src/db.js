import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { Pool } from 'pg';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { createDefaultData, schemaStatements, tableSpecs } from './postgres/schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../../data');
mkdirSync(dataDir, { recursive: true });

const requestedClient = (process.env.DB_CLIENT || (process.env.DATABASE_URL ? 'postgres' : 'lowdb')).toLowerCase();

if (requestedClient === 'postgres' && !process.env.DATABASE_URL) {
  throw new Error('DB_CLIENT=postgres requires DATABASE_URL to be set.');
}

export const storageMode = requestedClient;

const jsonAdapter = new JSONFile(join(dataDir, 'coreinventory.json'));
const lowdbInstance = new Low(jsonAdapter, createDefaultData());
const postgresPool = storageMode === 'postgres'
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    })
  : null;

export const db = storageMode === 'postgres'
  ? { data: createDefaultData() }
  : lowdbInstance;

let saveQueue = Promise.resolve();

function normalizeRow(row, spec) {
  const normalized = { ...row };

  for (const column of spec.numerics || []) {
    if (normalized[column] !== null && normalized[column] !== undefined) {
      normalized[column] = Number(normalized[column]);
    }
  }

  for (const column of spec.booleans || []) {
    if (normalized[column] !== null && normalized[column] !== undefined) {
      normalized[column] = Boolean(normalized[column]);
    }
  }

  return normalized;
}

async function ensurePostgresSchema() {
  const client = await postgresPool.connect();
  try {
    for (const statement of schemaStatements) {
      await client.query(statement);
    }
  } finally {
    client.release();
  }
}

async function loadPostgresSnapshot() {
  const nextData = createDefaultData();

  for (const spec of tableSpecs) {
    const result = await postgresPool.query(`SELECT ${spec.columns.join(', ')} FROM ${spec.table}`);
    nextData[spec.key] = result.rows.map((row) => normalizeRow(row, spec));
  }

  db.data = nextData;
}

function chunkRows(rows, size = 200) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

async function insertRows(client, spec, rows) {
  if (!rows.length) {
    return;
  }

  for (const chunk of chunkRows(rows)) {
    const values = [];
    const placeholders = chunk.map((row, rowIndex) => {
      const rowPlaceholders = spec.columns.map((column, columnIndex) => {
        values.push(row[column] ?? null);
        return `$${rowIndex * spec.columns.length + columnIndex + 1}`;
      });
      return `(${rowPlaceholders.join(', ')})`;
    });

    await client.query(
      `INSERT INTO ${spec.table} (${spec.columns.join(', ')}) VALUES ${placeholders.join(', ')}`,
      values,
    );
  }
}

async function savePostgresSnapshot() {
  const client = await postgresPool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`TRUNCATE TABLE ${tableSpecs.map((spec) => spec.table).join(', ')}`);
    for (const spec of tableSpecs) {
      await insertRows(client, spec, db.data[spec.key] || []);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function initDB() {
  if (storageMode === 'postgres') {
    await ensurePostgresSchema();
    await loadPostgresSnapshot();
    console.log('Database (PostgreSQL) initialized');
    return;
  }

  await db.read();
  db.data ||= createDefaultData();
  await db.write();
  console.log('Database (lowdb JSON) initialized');
}

export async function saveDB() {
  saveQueue = saveQueue.catch(() => undefined).then(async () => {
    if (storageMode === 'postgres') {
      await savePostgresSnapshot();
      return;
    }

    await db.write();
  });

  return saveQueue;
}

export async function closeDB() {
  if (postgresPool) {
    await postgresPool.end();
  }
}
