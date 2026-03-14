import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDB, db, saveDB } from './db.js';

await initDB();

console.log('🌱 Seeding CoreInventory...');

// Clear
db.data.users = []; db.data.categories = []; db.data.warehouses = []; db.data.locations = [];
db.data.products = []; db.data.stockLevels = []; db.data.receipts = []; db.data.receiptLines = [];
db.data.deliveries = []; db.data.deliveryLines = []; db.data.transfers = []; db.data.transferLines = [];
db.data.adjustments = []; db.data.adjustmentLines = []; db.data.moveHistory = [];

// Users
const managerId = uuidv4(), staffId = uuidv4();
db.data.users.push({ id: managerId, name: 'Alex Manager', email: 'manager@coreinventory.com', password_hash: bcrypt.hashSync('manager123', 10), role: 'manager', avatar: null, created_at: new Date().toISOString() });
db.data.users.push({ id: staffId, name: 'Sam Staff', email: 'staff@coreinventory.com', password_hash: bcrypt.hashSync('staff123', 10), role: 'staff', avatar: null, created_at: new Date().toISOString() });

// Categories
const catNames = ['Raw Materials', 'Finished Goods', 'Electronics', 'Packaging', 'Tools & Equipment'];
const catIds = catNames.map(name => { const id = uuidv4(); db.data.categories.push({ id, name, description: '', created_at: new Date().toISOString() }); return id; });

// Warehouses
const wh1 = uuidv4(), wh2 = uuidv4(), wh3 = uuidv4();
db.data.warehouses.push({ id: wh1, name: 'Main Warehouse', short_code: 'WH1', address: '123 Industrial Zone, Sector 7', active: true, created_at: new Date().toISOString() });
db.data.warehouses.push({ id: wh2, name: 'North Depot', short_code: 'WH2', address: '456 North Road, Warehouse District', active: true, created_at: new Date().toISOString() });
db.data.warehouses.push({ id: wh3, name: 'Production Facility', short_code: 'WH3', address: '789 Factory Lane, Industrial Park', active: true, created_at: new Date().toISOString() });

// Locations
const locs = [
    { id: uuidv4(), wh: wh1, name: 'Main Store', path: 'WH1/Main_Store' },
    { id: uuidv4(), wh: wh1, name: 'Receiving Area', path: 'WH1/Receiving' },
    { id: uuidv4(), wh: wh1, name: 'Rack A', path: 'WH1/Rack_A' },
    { id: uuidv4(), wh: wh1, name: 'Rack B', path: 'WH1/Rack_B' },
    { id: uuidv4(), wh: wh1, name: 'Shipping Bay', path: 'WH1/Shipping' },
    { id: uuidv4(), wh: wh2, name: 'Storage Floor', path: 'WH2/Storage' },
    { id: uuidv4(), wh: wh2, name: 'Cold Storage', path: 'WH2/Cold_Storage' },
    { id: uuidv4(), wh: wh3, name: 'Production Floor', path: 'WH3/Production' },
    { id: uuidv4(), wh: wh3, name: 'Quality Control', path: 'WH3/QC_Area' },
];
locs.forEach(l => db.data.locations.push({ id: l.id, warehouse_id: l.wh, name: l.name, full_path: l.path, type: 'internal', active: true }));

// Products
const prods = [
    { name: 'Steel Rods', sku: 'SR-001', cat: 0, uom: 'kg', min: 50, max: 500 },
    { name: 'Aluminum Sheets', sku: 'AL-002', cat: 0, uom: 'kg', min: 30, max: 300 },
    { name: 'Copper Wire', sku: 'CW-003', cat: 0, uom: 'm', min: 100, max: 1000 },
    { name: 'Iron Bolts M8', sku: 'IB-004', cat: 0, uom: 'pcs', min: 200, max: 2000 },
    { name: 'Carbon Fiber Panel', sku: 'CF-005', cat: 0, uom: 'pcs', min: 10, max: 100 },
    { name: 'Circuit Board v2', sku: 'CB-006', cat: 2, uom: 'pcs', min: 20, max: 200 },
    { name: 'Power Supply Unit', sku: 'PS-007', cat: 2, uom: 'pcs', min: 10, max: 100 },
    { name: 'HDMI Cable 2m', sku: 'HC-008', cat: 2, uom: 'pcs', min: 50, max: 500 },
    { name: 'Industrial Sensor', sku: 'IS-009', cat: 2, uom: 'pcs', min: 15, max: 150 },
    { name: 'LED Driver Module', sku: 'LD-010', cat: 2, uom: 'pcs', min: 25, max: 250 },
    { name: 'Steel Frame Assembly', sku: 'FA-011', cat: 1, uom: 'pcs', min: 5, max: 50 },
    { name: 'Gear Mechanism Set', sku: 'GM-012', cat: 1, uom: 'sets', min: 10, max: 100 },
    { name: 'Hydraulic Pump Unit', sku: 'HP-013', cat: 1, uom: 'pcs', min: 5, max: 30 },
    { name: 'Cardboard Box Large', sku: 'CB-014', cat: 3, uom: 'pcs', min: 100, max: 1000 },
    { name: 'Bubble Wrap Roll', sku: 'BW-015', cat: 3, uom: 'rolls', min: 20, max: 200 },
    { name: 'Packing Tape', sku: 'PT-016', cat: 3, uom: 'rolls', min: 50, max: 500 },
    { name: 'Torque Wrench', sku: 'TW-017', cat: 4, uom: 'pcs', min: 5, max: 20 },
    { name: 'Drill Bit Set', sku: 'DB-018', cat: 4, uom: 'sets', min: 10, max: 50 },
    { name: 'Safety Gloves L', sku: 'SG-019', cat: 4, uom: 'pairs', min: 30, max: 200 },
    { name: 'Hard Hat Yellow', sku: 'HH-020', cat: 4, uom: 'pcs', min: 20, max: 100 },
];
const stockQtys = [320, 180, 750, 1200, 45, 85, 32, 220, 12, 140, 28, 42, 8, 650, 85, 380, 12, 25, 95, 55];
const prodIds = prods.map((p, i) => {
    const id = uuidv4();
    db.data.products.push({ id, name: p.name, sku: p.sku, category_id: catIds[p.cat], uom: p.uom, reorder_min: p.min, reorder_max: p.max, active: true, created_at: new Date().toISOString() });
    db.data.stockLevels.push({ id: uuidv4(), product_id: id, location_id: locs[i % 5].id, qty: stockQtys[i] });
    if (i % 3 === 0) db.data.stockLevels.push({ id: uuidv4(), product_id: id, location_id: locs[5].id, qty: Math.floor(stockQtys[i] * 0.3) });
    return id;
});

// Historical moves (50 entries over 30 days)
const opTypes = ['receipt', 'delivery', 'transfer', 'adjustment'];
const prefixes = { receipt: 'REC', delivery: 'DEL', transfer: 'INT', adjustment: 'ADJ' };
for (let i = 0; i < 50; i++) {
    const type = opTypes[i % 4];
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
    db.data.moveHistory.push({
        id: uuidv4(), operation_type: type, ref: `${prefixes[type]}-${String(i + 1).padStart(5, '0')}`,
        product_id: prodIds[i % prodIds.length],
        from_location_id: type === 'receipt' ? 'VENDOR' : locs[i % 5].id,
        to_location_id: type === 'delivery' ? 'CUSTOMER' : locs[(i + 1) % 5].id,
        qty: Math.floor(10 + Math.random() * 100), user_id: managerId, created_at: createdAt
    });
}

// Pending operations
const rec1 = uuidv4();
db.data.receipts.push({ id: rec1, ref: 'REC-00051', supplier: 'SteelTech Suppliers', warehouse_id: wh1, scheduled_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], status: 'waiting', created_by: managerId, created_at: new Date().toISOString() });
db.data.receiptLines.push({ id: uuidv4(), receipt_id: rec1, product_id: prodIds[0], expected_qty: 500, received_qty: 0, location_id: locs[1].id });
db.data.receiptLines.push({ id: uuidv4(), receipt_id: rec1, product_id: prodIds[1], expected_qty: 200, received_qty: 0, location_id: locs[1].id });

const rec2 = uuidv4();
db.data.receipts.push({ id: rec2, ref: 'REC-00052', supplier: 'ElectroParts Inc.', warehouse_id: wh1, scheduled_date: new Date().toISOString().split('T')[0], status: 'ready', created_by: staffId, created_at: new Date().toISOString() });
db.data.receiptLines.push({ id: uuidv4(), receipt_id: rec2, product_id: prodIds[5], expected_qty: 100, received_qty: 0, location_id: locs[2].id });

const del1 = uuidv4();
db.data.deliveries.push({ id: del1, ref: 'DEL-00051', customer: 'BuildCorp Ltd.', warehouse_id: wh1, scheduled_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], status: 'waiting', created_by: managerId, created_at: new Date().toISOString() });
db.data.deliveryLines.push({ id: uuidv4(), delivery_id: del1, product_id: prodIds[11], demand_qty: 30, done_qty: 0, location_id: locs[0].id });

const tr1 = uuidv4();
db.data.transfers.push({ id: tr1, ref: 'INT-00051', from_location_id: locs[0].id, to_location_id: locs[7].id, scheduled_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], status: 'draft', created_by: staffId, created_at: new Date().toISOString() });
db.data.transferLines.push({ id: uuidv4(), transfer_id: tr1, product_id: prodIds[0], qty: 50 });

await saveDB();
console.log('🎉 Seed complete!');
console.log('  manager@coreinventory.com / manager123');
console.log('  staff@coreinventory.com / staff123');
