import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, saveDB } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
    const warehouses = db.data.warehouses.map(w => ({
        ...w, locations: db.data.locations.filter(l => l.warehouse_id === w.id)
    }));
    res.json(warehouses);
});

router.post('/', async (req, res) => {
    const { name, short_code, address } = req.body;
    if (!name || !short_code) return res.status(400).json({ error: 'Name and short code required' });
    const id = uuidv4();
    const wh = { id, name, short_code, address: address || '', active: true, created_at: new Date().toISOString() };
    db.data.warehouses.push(wh);
    ['Main Store', 'Receiving Area', 'Shipping Bay'].forEach(loc => {
        db.data.locations.push({ id: uuidv4(), warehouse_id: id, name: loc, full_path: `${short_code}/${loc.replace(/ /g, '_')}`, type: 'internal', active: true });
    });
    await saveDB();
    res.status(201).json(wh);
});

router.put('/:id', async (req, res) => {
    const wh = db.data.warehouses.find(w => w.id === req.params.id);
    if (!wh) return res.status(404).json({ error: 'Not found' });
    Object.assign(wh, req.body);
    await saveDB();
    res.json(wh);
});

router.post('/:id/locations', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Location name required' });
    const wh = db.data.warehouses.find(w => w.id === req.params.id);
    if (!wh) return res.status(404).json({ error: 'Warehouse not found' });
    const loc = { id: uuidv4(), warehouse_id: req.params.id, name, full_path: `${wh.short_code}/${name.replace(/ /g, '_')}`, type: 'internal', active: true };
    db.data.locations.push(loc);
    await saveDB();
    res.status(201).json(loc);
});

export default router;
