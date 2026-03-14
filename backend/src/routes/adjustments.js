import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, saveDB } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function normalizeLine(rawLine, locationId) {
    const sl = db.data.stockLevels.find(s => s.product_id === rawLine.product_id && s.location_id === locationId);
    const systemQty = toNumber(sl?.qty, 0);

    const hasChangeQty = rawLine.change_qty !== undefined && rawLine.change_qty !== null && rawLine.change_qty !== '';
    const hasCountedQty = rawLine.counted_qty !== undefined && rawLine.counted_qty !== null && rawLine.counted_qty !== '';

    let countedQty;
    let changeQty;

    if (hasChangeQty) {
        changeQty = toNumber(rawLine.change_qty, 0);
        countedQty = Math.max(0, systemQty + changeQty);
        changeQty = countedQty - systemQty;
    } else {
        countedQty = Math.max(0, toNumber(hasCountedQty ? rawLine.counted_qty : systemQty, systemQty));
        changeQty = countedQty - systemQty;
    }

    return {
        product_id: rawLine.product_id,
        system_qty: systemQty,
        counted_qty: countedQty,
        change_qty: changeQty,
    };
}

function enrich(a) {
    const lines = db.data.adjustmentLines.filter(l => l.adjustment_id === a.id).map(l => {
        const product = db.data.products.find(p => p.id === l.product_id);
        const delta = l.change_qty ?? (l.counted_qty - l.system_qty);
        return { ...l, product_name: product?.name, sku: product?.sku, uom: product?.uom, delta, resulting_qty: l.counted_qty };
    });
    const loc = db.data.locations.find(l => l.id === a.location_id);
    return { ...a, lines, location_name: loc?.full_path };
}

router.get('/', (req, res) => {
    const { status } = req.query;
    let items = db.data.adjustments;
    if (status) items = items.filter(a => a.status === status);
    res.json(items.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(enrich));
});

router.post('/', async (req, res) => {
    const { location_id, notes, lines } = req.body;
    if (!location_id) return res.status(400).json({ error: 'Location required' });
    const id = uuidv4();
    const ref = `ADJ-${String(db.data.adjustments.length + 1).padStart(5, '0')}`;
    const a = { id, ref, location_id, notes: notes || '', status: 'draft', created_by: req.user.id, created_at: new Date().toISOString() };
    db.data.adjustments.push(a);
    (lines || []).forEach(l => {
        if (!l.product_id) return;
        const normalized = normalizeLine(l, location_id);
        db.data.adjustmentLines.push({ id: uuidv4(), adjustment_id: id, ...normalized });
    });
    await saveDB();
    res.status(201).json(enrich(a));
});

router.get('/:id', (req, res) => {
    const a = db.data.adjustments.find(a => a.id === req.params.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json(enrich(a));
});

router.put('/:id', async (req, res) => {
    const a = db.data.adjustments.find(a => a.id === req.params.id);
    if (!a || a.status === 'done') return res.status(400).json({ error: 'Cannot edit' });
    const { location_id, notes, status, lines } = req.body;
    if (location_id) a.location_id = location_id;
    a.notes = notes;
    if (status) a.status = status;
    if (lines) {
        db.data.adjustmentLines = db.data.adjustmentLines.filter(l => l.adjustment_id !== a.id);
        lines.forEach(l => {
            if (!l.product_id) return;
            const normalized = normalizeLine(l, a.location_id);
            db.data.adjustmentLines.push({ id: uuidv4(), adjustment_id: a.id, ...normalized });
        });
    }
    await saveDB();
    res.json(enrich(a));
});

router.post('/:id/validate', async (req, res) => {
    const a = db.data.adjustments.find(a => a.id === req.params.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    if (a.status === 'done') return res.status(400).json({ error: 'Already validated' });
    const lines = db.data.adjustmentLines.filter(l => l.adjustment_id === a.id);
    lines.forEach(line => {
        const systemQty = toNumber(line.system_qty, 0);
        const countedQty = Math.max(0, toNumber(line.counted_qty, systemQty));
        const delta = countedQty - systemQty;
        const sl = db.data.stockLevels.find(s => s.product_id === line.product_id && s.location_id === a.location_id);
        if (sl) sl.qty = countedQty;
        else db.data.stockLevels.push({ id: uuidv4(), product_id: line.product_id, location_id: a.location_id, qty: countedQty });
        db.data.moveHistory.push({ id: uuidv4(), operation_type: 'adjustment', ref: a.ref, product_id: line.product_id, from_location_id: delta < 0 ? a.location_id : 'ADJUSTMENT', to_location_id: delta >= 0 ? a.location_id : 'ADJUSTMENT', qty: Math.abs(delta), user_id: req.user.id, created_at: new Date().toISOString() });
    });
    a.status = 'done'; a.validated_by = req.user.id; a.validated_at = new Date().toISOString();
    await saveDB();
    res.json(enrich(a));
});

export default router;
