import express from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const { product_id, operation_type, from_date, to_date, page = 1, limit = 50 } = req.query;
  let items = db.data.moveHistory;
  if (product_id) items = items.filter(m => m.product_id === product_id);
  if (operation_type) items = items.filter(m => m.operation_type === operation_type);
  if (from_date) items = items.filter(m => m.created_at >= from_date);
  if (to_date) items = items.filter(m => m.created_at <= to_date + 'T23:59:59');

  const total = items.length;
  const paginated = items
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice((page - 1) * limit, page * limit)
    .map(m => {
      const product = db.data.products.find(p => p.id === m.product_id);
      const user = db.data.users.find(u => u.id === m.user_id);
      const fromLoc = db.data.locations.find(l => l.id === m.from_location_id);
      const toLoc = db.data.locations.find(l => l.id === m.to_location_id);
      return { ...m, product_name: product?.name, sku: product?.sku, user_name: user?.name, from_location_name: fromLoc?.full_path || m.from_location_id, to_location_name: toLoc?.full_path || m.to_location_id };
    });

  res.json({ data: paginated, total, page: parseInt(page), limit: parseInt(limit) });
});

router.get('/export', (req, res) => {
  const rows = db.data.moveHistory
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(m => {
      const product = db.data.products.find(p => p.id === m.product_id);
      const user = db.data.users.find(u => u.id === m.user_id);
      return [m.created_at, m.operation_type, m.ref, product?.name || '', product?.sku || '', m.from_location_id || '', m.to_location_id || '', m.qty, user?.name || ''].join(',');
    });
  const csv = ['Date,Type,Reference,Product,SKU,From,To,Qty,User', ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=stock-ledger.csv');
  res.send(csv);
});

export default router;
