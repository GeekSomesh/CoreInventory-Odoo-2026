import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDB, db, saveDB, storageMode } from './db.js';
import { createDefaultData } from './postgres/schema.js';
import { loadCuratedData } from './curation/loadCuratedData.js';

await initDB();

const curated = loadCuratedData();

console.log(`Seeding CoreInventory using ${storageMode} storage...`);

function mulberry32(seed) {
  return function next() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoOffset(days, hours = 0) {
  return new Date(Date.now() + days * 86400000 + hours * 3600000).toISOString();
}

function dateOffset(days) {
  return isoOffset(days).split('T')[0];
}

function quantityFor(product, operationType, random) {
  const ranges = {
    kg: { receipt: [50, 180], delivery: [15, 60], transfer: [10, 50], adjustment: [1, 8] },
    m: { receipt: [80, 220], delivery: [20, 90], transfer: [30, 120], adjustment: [2, 12] },
    pcs: { receipt: [20, 140], delivery: [8, 65], transfer: [10, 80], adjustment: [1, 6] },
    rolls: { receipt: [10, 60], delivery: [4, 25], transfer: [4, 20], adjustment: [1, 4] },
    sets: { receipt: [6, 35], delivery: [3, 12], transfer: [3, 10], adjustment: [1, 2] },
    pairs: { receipt: [12, 80], delivery: [8, 30], transfer: [8, 24], adjustment: [1, 3] },
  };

  const [min, max] = (ranges[product.uom] || ranges.pcs)[operationType];
  return Math.max(1, Math.round(min + random() * (max - min)));
}

function resolveTransferDestination(product, sourcePath) {
  if (product.category === 'Finished Goods') {
    return 'WH1/Shipping';
  }
  if (product.category === 'Packaging') {
    return sourcePath === 'WH3/Production' ? 'WH1/Shipping' : 'WH3/Production';
  }
  if (product.category === 'Electronics') {
    return sourcePath === 'WH1/Main_Store' ? 'WH1/Rack_A' : 'WH1/Main_Store';
  }
  if (product.category === 'Tools & Equipment') {
    return 'WH2/Storage';
  }
  return 'WH3/Production';
}

function createHistoricalMoves({ products, usersByEmail, locationsByPath, productsBySku, curatedHistory }) {
  if (Array.isArray(curatedHistory) && curatedHistory.length) {
    return curatedHistory.map((move) => ({
      id: uuidv4(),
      operation_type: move.operation_type,
      ref: move.ref,
      product_id: productsBySku.get(move.sku)?.id || null,
      from_location_id: locationsByPath.get(move.from_location)?.id || move.from_location || null,
      to_location_id: locationsByPath.get(move.to_location)?.id || move.to_location || null,
      qty: Number(move.qty) || 0,
      user_id: usersByEmail.get(move.user_email)?.id || usersByEmail.get('manager@coreinventory.com').id,
      created_at: move.created_at || new Date().toISOString(),
    })).filter((move) => move.product_id);
  }

  const random = mulberry32(20260314);
  const moves = [];
  const counters = { receipt: 1, delivery: 1, transfer: 1, adjustment: 1 };
  const operationTypes = ['receipt', 'transfer', 'delivery', 'adjustment'];
  const prefixes = { receipt: 'REC-H', delivery: 'DEL-H', transfer: 'INT-H', adjustment: 'ADJ-H' };
  const managerId = usersByEmail.get('manager@coreinventory.com').id;
  const staffId = usersByEmail.get('staff@coreinventory.com').id;

  for (let daysAgo = 29; daysAgo >= 0; daysAgo -= 1) {
    const eventsToday = daysAgo % 5 === 0 ? 2 : 1;

    for (let eventIndex = 0; eventIndex < eventsToday; eventIndex += 1) {
      const operationType = operationTypes[(daysAgo + eventIndex) % operationTypes.length];
      const productTemplate = products[(daysAgo * 3 + eventIndex * 7) % products.length];
      const product = productsBySku.get(productTemplate.sku);
      const baseLocationPath = productTemplate.stock_by_location[0]?.location || 'WH1/Main_Store';
      const baseLocation = locationsByPath.get(baseLocationPath);
      const qty = quantityFor(productTemplate, operationType, random);

      let fromLocationId = baseLocation?.id || 'WAREHOUSE';
      let toLocationId = baseLocation?.id || 'WAREHOUSE';

      if (operationType === 'receipt') {
        fromLocationId = 'VENDOR';
      }
      if (operationType === 'delivery') {
        toLocationId = 'CUSTOMER';
      }
      if (operationType === 'transfer') {
        const destinationPath = resolveTransferDestination(productTemplate, baseLocationPath);
        toLocationId = locationsByPath.get(destinationPath)?.id || baseLocation?.id || 'WAREHOUSE';
        if (toLocationId === fromLocationId) {
          toLocationId = locationsByPath.get('WH1/Shipping')?.id || 'WAREHOUSE';
        }
      }
      if (operationType === 'adjustment') {
        const increase = random() > 0.5;
        fromLocationId = increase ? 'ADJUSTMENT' : baseLocation?.id || 'ADJUSTMENT';
        toLocationId = increase ? baseLocation?.id || 'ADJUSTMENT' : 'ADJUSTMENT';
      }

      moves.push({
        id: uuidv4(),
        operation_type: operationType,
        ref: `${prefixes[operationType]}-${String(counters[operationType]).padStart(5, '0')}`,
        product_id: product.id,
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        qty,
        user_id: operationType === 'delivery' ? staffId : managerId,
        created_at: isoOffset(-daysAgo, eventIndex * 2),
      });

      counters[operationType] += 1;
    }
  }

  return moves;
}

function clearData() {
  db.data = createDefaultData();
}

clearData();

const usersByEmail = new Map();
for (const user of curated.users) {
  const record = {
    id: uuidv4(),
    name: user.name,
    email: user.email,
    password_hash: bcrypt.hashSync(user.password, 10),
    role: user.role,
    avatar: user.avatar ?? null,
    created_at: new Date().toISOString(),
  };
  db.data.users.push(record);
  usersByEmail.set(record.email, record);
}

const categoriesByName = new Map();
for (const category of curated.categories) {
  const record = {
    id: uuidv4(),
    name: category.name,
    description: category.description || '',
    created_at: new Date().toISOString(),
  };
  db.data.categories.push(record);
  categoriesByName.set(record.name, record);
}

const warehousesByCode = new Map();
const locationsByPath = new Map();
for (const warehouse of curated.warehouses) {
  const warehouseRecord = {
    id: uuidv4(),
    name: warehouse.name,
    short_code: warehouse.short_code,
    address: warehouse.address || '',
    active: true,
    created_at: new Date().toISOString(),
  };
  db.data.warehouses.push(warehouseRecord);
  warehousesByCode.set(warehouseRecord.short_code, warehouseRecord);

  for (const location of warehouse.locations) {
    const locationRecord = {
      id: uuidv4(),
      warehouse_id: warehouseRecord.id,
      name: location.name,
      full_path: location.full_path,
      type: location.type || 'internal',
      active: true,
    };
    db.data.locations.push(locationRecord);
    locationsByPath.set(locationRecord.full_path, locationRecord);
  }
}

const productsBySku = new Map();
for (const product of curated.products) {
  const productRecord = {
    id: uuidv4(),
    name: product.name,
    sku: product.sku,
    category_id: categoriesByName.get(product.category)?.id || null,
    uom: product.uom,
    reorder_min: product.reorder_min || 0,
    reorder_max: product.reorder_max || 0,
    active: true,
    created_at: new Date().toISOString(),
  };
  db.data.products.push(productRecord);
  productsBySku.set(productRecord.sku, productRecord);

  for (const stockRow of product.stock_by_location || []) {
    const location = locationsByPath.get(stockRow.location);
    if (!location) {
      continue;
    }
    db.data.stockLevels.push({
      id: uuidv4(),
      product_id: productRecord.id,
      location_id: location.id,
      qty: Number(stockRow.qty) || 0,
    });
  }
}

db.data.moveHistory = createHistoricalMoves({
  products: curated.products,
  usersByEmail,
  locationsByPath,
  productsBySku,
  curatedHistory: curated.history,
});

for (const receipt of curated.operations.receipts || []) {
  const record = {
    id: uuidv4(),
    ref: receipt.ref,
    supplier: receipt.supplier,
    warehouse_id: warehousesByCode.get(receipt.warehouse)?.id || null,
    scheduled_date: dateOffset(receipt.scheduled_in_days || 0),
    notes: receipt.notes || '',
    status: receipt.status || 'draft',
    created_by: usersByEmail.get(receipt.created_by)?.id || usersByEmail.get('manager@coreinventory.com').id,
    created_at: new Date().toISOString(),
  };
  db.data.receipts.push(record);

  for (const line of receipt.lines || []) {
    db.data.receiptLines.push({
      id: uuidv4(),
      receipt_id: record.id,
      product_id: productsBySku.get(line.sku)?.id || null,
      expected_qty: Number(line.expected_qty) || 0,
      received_qty: Number(line.received_qty) || 0,
      location_id: locationsByPath.get(line.location)?.id || null,
    });
  }
}

for (const delivery of curated.operations.deliveries || []) {
  const record = {
    id: uuidv4(),
    ref: delivery.ref,
    customer: delivery.customer,
    warehouse_id: warehousesByCode.get(delivery.warehouse)?.id || null,
    scheduled_date: dateOffset(delivery.scheduled_in_days || 0),
    notes: delivery.notes || '',
    status: delivery.status || 'draft',
    created_by: usersByEmail.get(delivery.created_by)?.id || usersByEmail.get('manager@coreinventory.com').id,
    created_at: new Date().toISOString(),
  };
  db.data.deliveries.push(record);

  for (const line of delivery.lines || []) {
    db.data.deliveryLines.push({
      id: uuidv4(),
      delivery_id: record.id,
      product_id: productsBySku.get(line.sku)?.id || null,
      demand_qty: Number(line.demand_qty) || 0,
      done_qty: Number(line.done_qty) || 0,
      location_id: locationsByPath.get(line.location)?.id || null,
    });
  }
}

for (const transfer of curated.operations.transfers || []) {
  const record = {
    id: uuidv4(),
    ref: transfer.ref,
    from_location_id: locationsByPath.get(transfer.from_location)?.id || null,
    to_location_id: locationsByPath.get(transfer.to_location)?.id || null,
    scheduled_date: dateOffset(transfer.scheduled_in_days || 0),
    notes: transfer.notes || '',
    status: transfer.status || 'draft',
    created_by: usersByEmail.get(transfer.created_by)?.id || usersByEmail.get('manager@coreinventory.com').id,
    created_at: new Date().toISOString(),
  };
  db.data.transfers.push(record);

  for (const line of transfer.lines || []) {
    db.data.transferLines.push({
      id: uuidv4(),
      transfer_id: record.id,
      product_id: productsBySku.get(line.sku)?.id || null,
      qty: Number(line.qty) || 0,
    });
  }
}

for (const adjustment of curated.operations.adjustments || []) {
  const adjustmentLocation = locationsByPath.get(adjustment.location);
  const record = {
    id: uuidv4(),
    ref: adjustment.ref,
    location_id: adjustmentLocation?.id || null,
    notes: adjustment.notes || '',
    status: adjustment.status || 'draft',
    created_by: usersByEmail.get(adjustment.created_by)?.id || usersByEmail.get('manager@coreinventory.com').id,
    created_at: new Date().toISOString(),
  };
  db.data.adjustments.push(record);

  for (const line of adjustment.lines || []) {
    const productId = productsBySku.get(line.sku)?.id || null;
    const stockLevel = db.data.stockLevels.find((item) => item.product_id === productId && item.location_id === adjustmentLocation?.id);
    const systemQty = Number(stockLevel?.qty || 0);
    const hasChangeQty = line.change_qty !== undefined && line.change_qty !== null;
    const changeQty = hasChangeQty ? Number(line.change_qty) || 0 : (Number(line.counted_qty) || systemQty) - systemQty;
    const countedQty = hasChangeQty ? Math.max(0, systemQty + changeQty) : Math.max(0, Number(line.counted_qty) || systemQty);

    db.data.adjustmentLines.push({
      id: uuidv4(),
      adjustment_id: record.id,
      product_id: productId,
      system_qty: systemQty,
      counted_qty: countedQty,
      change_qty: countedQty - systemQty,
    });
  }
}

await saveDB();

console.log('Seed complete.');
console.log('  manager@coreinventory.com / manager123');
console.log('  staff@coreinventory.com / staff123');
