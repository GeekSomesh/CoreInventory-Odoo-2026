import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, saveDB } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const { search, category_id, low_stock } = req.query;
  let products = db.data.products.filter(p => p.active !== false);
  if (search) products = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );
  if (category_id) products = products.filter(p => p.category_id === category_id);

  const enriched = products.map(p => {
    const stockByLocation = db.data.stockLevels
      .filter(sl => sl.product_id === p.id)
      .map(sl => {
        const loc = db.data.locations.find(l => l.id === sl.location_id);
        return { location: loc?.full_path || sl.location_id, qty: sl.qty };
      });
    const total_stock = stockByLocation.reduce((s, sl) => s + sl.qty, 0);
    const cat = db.data.categories.find(c => c.id === p.category_id);
    return { ...p, category_name: cat?.name, total_stock, stock_by_location: stockByLocation };
  });

  if (low_stock === 'true') return res.json(enriched.filter(p => p.total_stock <= p.reorder_min));
  res.json(enriched.sort((a, b) => a.name.localeCompare(b.name)));
});

router.post('/', async (req, res) => {
  const { name, sku, category_id, uom, reorder_min, reorder_max, initial_stock, location_id } = req.body;
  if (!name || !sku) return res.status(400).json({ error: 'Name and SKU required' });
  if (db.data.products.find(p => p.sku === sku)) return res.status(409).json({ error: 'SKU already exists' });
  const id = uuidv4();
  const product = {
    id, name, sku, category_id: category_id || null, uom: uom || 'Unit',
    reorder_min: reorder_min || 0, reorder_max: reorder_max || 0, active: true, created_at: new Date().toISOString()
  };
  db.data.products.push(product);
  if (initial_stock && location_id) {
    db.data.stockLevels.push({ id: uuidv4(), product_id: id, location_id, qty: Number(initial_stock) });
  }
  await saveDB();
  res.status(201).json(product);
});

router.put('/:id', async (req, res) => {
  const product = db.data.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  Object.assign(product, req.body);
  await saveDB();
  res.json(product);
});

router.delete('/:id', async (req, res) => {
  const product = db.data.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  product.active = false;
  await saveDB();
  res.json({ message: 'Product deactivated' });
});

router.get('/categories', (req, res) => {
  res.json(db.data.categories.sort((a, b) => a.name.localeCompare(b.name)));
});

router.post('/categories', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name required' });
  const cat = { id: uuidv4(), name, description: description || '', created_at: new Date().toISOString() };
  db.data.categories.push(cat);
  await saveDB();
  res.status(201).json(cat);
});

export default router;
