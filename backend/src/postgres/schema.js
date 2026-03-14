export function createDefaultData() {
  return {
    users: [],
    categories: [],
    warehouses: [],
    locations: [],
    products: [],
    stockLevels: [],
    receipts: [],
    receiptLines: [],
    deliveries: [],
    deliveryLines: [],
    transfers: [],
    transferLines: [],
    adjustments: [],
    adjustmentLines: [],
    moveHistory: [],
  };
}

export const tableSpecs = [
  {
    key: 'users',
    table: 'users',
    columns: ['id', 'name', 'email', 'password_hash', 'role', 'avatar', 'created_at'],
  },
  {
    key: 'categories',
    table: 'categories',
    columns: ['id', 'name', 'description', 'created_at'],
  },
  {
    key: 'warehouses',
    table: 'warehouses',
    columns: ['id', 'name', 'short_code', 'address', 'active', 'created_at'],
    booleans: ['active'],
  },
  {
    key: 'locations',
    table: 'locations',
    columns: ['id', 'warehouse_id', 'name', 'full_path', 'type', 'active'],
    booleans: ['active'],
  },
  {
    key: 'products',
    table: 'products',
    columns: ['id', 'name', 'sku', 'category_id', 'uom', 'reorder_min', 'reorder_max', 'active', 'created_at'],
    numerics: ['reorder_min', 'reorder_max'],
    booleans: ['active'],
  },
  {
    key: 'stockLevels',
    table: 'stock_levels',
    columns: ['id', 'product_id', 'location_id', 'qty'],
    numerics: ['qty'],
  },
  {
    key: 'receipts',
    table: 'receipts',
    columns: ['id', 'ref', 'supplier', 'warehouse_id', 'scheduled_date', 'notes', 'status', 'created_by', 'created_at', 'validated_by', 'validated_at'],
  },
  {
    key: 'receiptLines',
    table: 'receipt_lines',
    columns: ['id', 'receipt_id', 'product_id', 'expected_qty', 'received_qty', 'location_id'],
    numerics: ['expected_qty', 'received_qty'],
  },
  {
    key: 'deliveries',
    table: 'deliveries',
    columns: ['id', 'ref', 'customer', 'warehouse_id', 'scheduled_date', 'notes', 'status', 'created_by', 'created_at', 'validated_by', 'validated_at'],
  },
  {
    key: 'deliveryLines',
    table: 'delivery_lines',
    columns: ['id', 'delivery_id', 'product_id', 'demand_qty', 'done_qty', 'location_id'],
    numerics: ['demand_qty', 'done_qty'],
  },
  {
    key: 'transfers',
    table: 'transfers',
    columns: ['id', 'ref', 'from_location_id', 'to_location_id', 'scheduled_date', 'notes', 'status', 'created_by', 'created_at', 'validated_by', 'validated_at'],
  },
  {
    key: 'transferLines',
    table: 'transfer_lines',
    columns: ['id', 'transfer_id', 'product_id', 'qty'],
    numerics: ['qty'],
  },
  {
    key: 'adjustments',
    table: 'adjustments',
    columns: ['id', 'ref', 'location_id', 'notes', 'status', 'created_by', 'created_at', 'validated_by', 'validated_at'],
  },
  {
    key: 'adjustmentLines',
    table: 'adjustment_lines',
    columns: ['id', 'adjustment_id', 'product_id', 'system_qty', 'counted_qty', 'change_qty'],
    numerics: ['system_qty', 'counted_qty', 'change_qty'],
  },
  {
    key: 'moveHistory',
    table: 'move_history',
    columns: ['id', 'operation_type', 'ref', 'product_id', 'from_location_id', 'to_location_id', 'qty', 'user_id', 'created_at'],
    numerics: ['qty'],
  },
];

export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email)`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories (name)`,
  `CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_code TEXT NOT NULL,
    address TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_short_code ON warehouses (short_code)`,
  `CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL,
    name TEXT NOT NULL,
    full_path TEXT NOT NULL,
    type TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_full_path ON locations (full_path)`,
  `CREATE INDEX IF NOT EXISTS idx_locations_warehouse ON locations (warehouse_id)`,
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    category_id TEXT,
    uom TEXT NOT NULL,
    reorder_min NUMERIC NOT NULL DEFAULT 0,
    reorder_max NUMERIC NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products (sku)`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id)`,
  `CREATE TABLE IF NOT EXISTS stock_levels (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    qty NUMERIC NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_stock_levels_product ON stock_levels (product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stock_levels_location ON stock_levels (location_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_levels_product_location ON stock_levels (product_id, location_id)`,
  `CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    ref TEXT NOT NULL,
    supplier TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    scheduled_date TEXT,
    notes TEXT,
    status TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    validated_by TEXT,
    validated_at TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_ref ON receipts (ref)`,
  `CREATE TABLE IF NOT EXISTS receipt_lines (
    id TEXT PRIMARY KEY,
    receipt_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    expected_qty NUMERIC NOT NULL DEFAULT 0,
    received_qty NUMERIC NOT NULL DEFAULT 0,
    location_id TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_receipt_lines_receipt ON receipt_lines (receipt_id)`,
  `CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    ref TEXT NOT NULL,
    customer TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    scheduled_date TEXT,
    notes TEXT,
    status TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    validated_by TEXT,
    validated_at TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_ref ON deliveries (ref)`,
  `CREATE TABLE IF NOT EXISTS delivery_lines (
    id TEXT PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    demand_qty NUMERIC NOT NULL DEFAULT 0,
    done_qty NUMERIC NOT NULL DEFAULT 0,
    location_id TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_delivery_lines_delivery ON delivery_lines (delivery_id)`,
  `CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    ref TEXT NOT NULL,
    from_location_id TEXT NOT NULL,
    to_location_id TEXT NOT NULL,
    scheduled_date TEXT,
    notes TEXT,
    status TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    validated_by TEXT,
    validated_at TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_ref ON transfers (ref)`,
  `CREATE TABLE IF NOT EXISTS transfer_lines (
    id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    qty NUMERIC NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_transfer_lines_transfer ON transfer_lines (transfer_id)`,
  `CREATE TABLE IF NOT EXISTS adjustments (
    id TEXT PRIMARY KEY,
    ref TEXT NOT NULL,
    location_id TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    validated_by TEXT,
    validated_at TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_adjustments_ref ON adjustments (ref)`,
  `CREATE TABLE IF NOT EXISTS adjustment_lines (
    id TEXT PRIMARY KEY,
    adjustment_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    system_qty NUMERIC NOT NULL DEFAULT 0,
    counted_qty NUMERIC NOT NULL DEFAULT 0,
    change_qty NUMERIC NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_adjustment_lines_adjustment ON adjustment_lines (adjustment_id)`,
  `CREATE TABLE IF NOT EXISTS move_history (
    id TEXT PRIMARY KEY,
    operation_type TEXT NOT NULL,
    ref TEXT NOT NULL,
    product_id TEXT NOT NULL,
    from_location_id TEXT,
    to_location_id TEXT,
    qty NUMERIC NOT NULL DEFAULT 0,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_move_history_product ON move_history (product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_move_history_created_at ON move_history (created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_move_history_operation_type ON move_history (operation_type)`,
];
