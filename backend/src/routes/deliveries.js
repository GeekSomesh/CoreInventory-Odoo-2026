import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, saveDB } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

function enrich(d) {
    const lines = db.data.deliveryLines.filter(l => l.delivery_id === d.id).map(l => {
        const product = db.data.products.find(p => p.id === l.product_id);
        const location = db.data.locations.find(loc => loc.id === l.location_id);
        return { ...l, product_name: product?.name, sku: product?.sku, uom: product?.uom, location_name: location?.full_path };
    });
    const wh = db.data.warehouses.find(w => w.id === d.warehouse_id);
    return { ...d, lines, warehouse_name: wh?.name };
}

router.get('/', (req, res) => {
    const { status, search } = req.query;
    let items = db.data.deliveries;
    if (status) items = items.filter(d => d.status === status);
    if (search) items = items.filter(d => d.ref.includes(search) || d.customer.toLowerCase().includes(search.toLowerCase()));
    res.json(items.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(enrich));
});

router.post('/', async (req, res) => {
    const { customer, warehouse_id, scheduled_date, notes, lines } = req.body;
    if (!customer || !warehouse_id) return res.status(400).json({ error: 'Customer and warehouse required' });
    const id = uuidv4();
    const ref = `DEL-${String(db.data.deliveries.length + 1).padStart(5, '0')}`;
    const d = { id, ref, customer, warehouse_id, scheduled_date: scheduled_date || null, notes: notes || '', status: 'draft', created_by: req.user.id, created_at: new Date().toISOString() };
    db.data.deliveries.push(d);
    (lines || []).forEach(l => db.data.deliveryLines.push({ id: uuidv4(), delivery_id: id, product_id: l.product_id, demand_qty: l.demand_qty, done_qty: 0, location_id: l.location_id || null }));
    await saveDB();
    res.status(201).json(enrich(d));
});

router.get('/:id', (req, res) => {
    const d = db.data.deliveries.find(d => d.id === req.params.id);
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json(enrich(d));
});

router.put('/:id', async (req, res) => {
    const d = db.data.deliveries.find(d => d.id === req.params.id);
    if (!d || d.status === 'done') return res.status(400).json({ error: 'Cannot edit' });
    const { customer, scheduled_date, notes, status, lines } = req.body;
    Object.assign(d, { customer, scheduled_date, notes });
    if (status) d.status = status;
    if (lines) {
        db.data.deliveryLines = db.data.deliveryLines.filter(l => l.delivery_id !== d.id);
        lines.forEach(l => db.data.deliveryLines.push({ id: uuidv4(), delivery_id: d.id, product_id: l.product_id, demand_qty: l.demand_qty, done_qty: l.done_qty || 0, location_id: l.location_id || null }));
    }
    await saveDB();
    res.json(enrich(d));
});

router.post('/:id/validate', async (req, res) => {
    const d = db.data.deliveries.find(d => d.id === req.params.id);
    if (!d) return res.status(404).json({ error: 'Not found' });
    if (d.status === 'done') return res.status(400).json({ error: 'Already validated' });
    const lines = db.data.deliveryLines.filter(l => l.delivery_id === d.id);
    lines.forEach(line => {
        const qty = line.done_qty || line.demand_qty;
        if (line.location_id) {
            const sl = db.data.stockLevels.find(s => s.product_id === line.product_id && s.location_id === line.location_id);
            if (sl) sl.qty = Math.max(0, sl.qty - qty);
        }
        db.data.moveHistory.push({ id: uuidv4(), operation_type: 'delivery', ref: d.ref, product_id: line.product_id, from_location_id: line.location_id || 'WAREHOUSE', to_location_id: 'CUSTOMER', qty, user_id: req.user.id, created_at: new Date().toISOString() });
    });
    d.status = 'done'; d.validated_by = req.user.id; d.validated_at = new Date().toISOString();
    await saveDB();
    res.json(enrich(d));
});

export default router;
