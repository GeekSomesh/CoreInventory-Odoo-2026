import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, saveDB } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

function enrich(t) {
    const lines = db.data.transferLines.filter(l => l.transfer_id === t.id).map(l => {
        const product = db.data.products.find(p => p.id === l.product_id);
        return { ...l, product_name: product?.name, sku: product?.sku, uom: product?.uom };
    });
    const fromLoc = db.data.locations.find(l => l.id === t.from_location_id);
    const toLoc = db.data.locations.find(l => l.id === t.to_location_id);
    return { ...t, lines, from_location_name: fromLoc?.full_path, to_location_name: toLoc?.full_path };
}

router.get('/', (req, res) => {
    const { status } = req.query;
    let items = db.data.transfers;
    if (status) items = items.filter(t => t.status === status);
    res.json(items.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(enrich));
});

router.post('/', async (req, res) => {
    const { from_location_id, to_location_id, scheduled_date, notes, lines } = req.body;
    if (!from_location_id || !to_location_id) return res.status(400).json({ error: 'Source and destination locations required' });
    const id = uuidv4();
    const ref = `INT-${String(db.data.transfers.length + 1).padStart(5, '0')}`;
    const t = { id, ref, from_location_id, to_location_id, scheduled_date: scheduled_date || null, notes: notes || '', status: 'draft', created_by: req.user.id, created_at: new Date().toISOString() };
    db.data.transfers.push(t);
    (lines || []).forEach(l => db.data.transferLines.push({ id: uuidv4(), transfer_id: id, product_id: l.product_id, qty: l.qty }));
    await saveDB();
    res.status(201).json(enrich(t));
});

router.get('/:id', (req, res) => {
    const t = db.data.transfers.find(t => t.id === req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(enrich(t));
});

router.put('/:id', async (req, res) => {
    const t = db.data.transfers.find(t => t.id === req.params.id);
    if (!t || t.status === 'done') return res.status(400).json({ error: 'Cannot edit' });
    const { from_location_id, to_location_id, scheduled_date, notes, status, lines } = req.body;
    Object.assign(t, { from_location_id, to_location_id, scheduled_date, notes });
    if (status) t.status = status;
    if (lines) {
        db.data.transferLines = db.data.transferLines.filter(l => l.transfer_id !== t.id);
        lines.forEach(l => db.data.transferLines.push({ id: uuidv4(), transfer_id: t.id, product_id: l.product_id, qty: l.qty }));
    }
    await saveDB();
    res.json(enrich(t));
});

router.post('/:id/validate', async (req, res) => {
    const t = db.data.transfers.find(t => t.id === req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    if (t.status === 'done') return res.status(400).json({ error: 'Already validated' });
    const lines = db.data.transferLines.filter(l => l.transfer_id === t.id);
    lines.forEach(line => {
        // Decrease from source
        const src = db.data.stockLevels.find(s => s.product_id === line.product_id && s.location_id === t.from_location_id);
        if (src) src.qty = Math.max(0, src.qty - line.qty);
        // Increase at dest
        const dst = db.data.stockLevels.find(s => s.product_id === line.product_id && s.location_id === t.to_location_id);
        if (dst) dst.qty += line.qty;
        else db.data.stockLevels.push({ id: uuidv4(), product_id: line.product_id, location_id: t.to_location_id, qty: line.qty });
        db.data.moveHistory.push({ id: uuidv4(), operation_type: 'transfer', ref: t.ref, product_id: line.product_id, from_location_id: t.from_location_id, to_location_id: t.to_location_id, qty: line.qty, user_id: req.user.id, created_at: new Date().toISOString() });
    });
    t.status = 'done'; t.validated_by = req.user.id; t.validated_at = new Date().toISOString();
    await saveDB();
    res.json(enrich(t));
});

export default router;
