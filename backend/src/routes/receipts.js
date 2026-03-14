import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, saveDB } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

function enrichReceipt(r) {
    const lines = db.data.receiptLines.filter(l => l.receipt_id === r.id).map(l => {
        const product = db.data.products.find(p => p.id === l.product_id);
        const location = db.data.locations.find(loc => loc.id === l.location_id);
        return { ...l, product_name: product?.name, sku: product?.sku, uom: product?.uom, location_name: location?.full_path };
    });
    const wh = db.data.warehouses.find(w => w.id === r.warehouse_id);
    return { ...r, lines, warehouse_name: wh?.name };
}

router.get('/', (req, res) => {
    const { status, search } = req.query;
    let items = db.data.receipts;
    if (status) items = items.filter(r => r.status === status);
    if (search) items = items.filter(r => r.ref.includes(search) || r.supplier.toLowerCase().includes(search.toLowerCase()));
    res.json(items.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(enrichReceipt));
});

router.post('/', async (req, res) => {
    const { supplier, warehouse_id, scheduled_date, notes, lines } = req.body;
    if (!supplier || !warehouse_id) return res.status(400).json({ error: 'Supplier and warehouse required' });
    const id = uuidv4();
    const ref = `REC-${String(db.data.receipts.length + 1).padStart(5, '0')}`;
    const r = { id, ref, supplier, warehouse_id, scheduled_date: scheduled_date || null, notes: notes || '', status: 'draft', created_by: req.user.id, created_at: new Date().toISOString() };
    db.data.receipts.push(r);
    (lines || []).forEach(l => db.data.receiptLines.push({ id: uuidv4(), receipt_id: id, product_id: l.product_id, expected_qty: l.expected_qty, received_qty: 0, location_id: l.location_id || null }));
    await saveDB();
    res.status(201).json(enrichReceipt(r));
});

router.get('/:id', (req, res) => {
    const r = db.data.receipts.find(r => r.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json(enrichReceipt(r));
});

router.put('/:id', async (req, res) => {
    const r = db.data.receipts.find(r => r.id === req.params.id);
    if (!r || r.status === 'done') return res.status(400).json({ error: 'Cannot edit' });
    const { supplier, scheduled_date, notes, status, lines } = req.body;
    Object.assign(r, { supplier, scheduled_date, notes });
    if (status) r.status = status;
    if (lines) {
        db.data.receiptLines = db.data.receiptLines.filter(l => l.receipt_id !== r.id);
        lines.forEach(l => db.data.receiptLines.push({ id: uuidv4(), receipt_id: r.id, product_id: l.product_id, expected_qty: l.expected_qty, received_qty: l.received_qty || 0, location_id: l.location_id || null }));
    }
    await saveDB();
    res.json(enrichReceipt(r));
});

router.post('/:id/validate', async (req, res) => {
    const r = db.data.receipts.find(r => r.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (r.status === 'done') return res.status(400).json({ error: 'Already validated' });
    const lines = db.data.receiptLines.filter(l => l.receipt_id === r.id);
    lines.forEach(line => {
        const qty = line.received_qty || line.expected_qty;
        if (!line.location_id) return;
        const sl = db.data.stockLevels.find(s => s.product_id === line.product_id && s.location_id === line.location_id);
        if (sl) sl.qty += qty;
        else db.data.stockLevels.push({ id: uuidv4(), product_id: line.product_id, location_id: line.location_id, qty });
        db.data.moveHistory.push({ id: uuidv4(), operation_type: 'receipt', ref: r.ref, product_id: line.product_id, from_location_id: 'VENDOR', to_location_id: line.location_id, qty, user_id: req.user.id, created_at: new Date().toISOString() });
    });
    r.status = 'done'; r.validated_by = req.user.id; r.validated_at = new Date().toISOString();
    await saveDB();
    res.json(enrichReceipt(r));
});

export default router;
