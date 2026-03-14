import express from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/stats', (req, res) => {
  const products = db.data.products.filter(p => p.active !== false);
  const totalProducts = products.length;

  const lowStockItems = products.filter(p => {
    const total = db.data.stockLevels.filter(s => s.product_id === p.id).reduce((s, sl) => s + sl.qty, 0);
    return total <= p.reorder_min;
  }).length;

  const pendingReceipts = db.data.receipts.filter(r => !['done', 'cancelled'].includes(r.status)).length;
  const pendingDeliveries = db.data.deliveries.filter(d => !['done', 'cancelled'].includes(d.status)).length;
  const pendingTransfers = db.data.transfers.filter(t => !['done', 'cancelled'].includes(t.status)).length;

  const lowStockList = products
    .map(p => {
      const total_stock = db.data.stockLevels.filter(s => s.product_id === p.id).reduce((s, sl) => s + sl.qty, 0);
      return { ...p, total_stock };
    })
    .filter(p => p.total_stock <= p.reorder_min)
    .sort((a, b) => a.total_stock - b.total_stock)
    .slice(0, 10);

  const recentMoves = db.data.moveHistory
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8)
    .map(m => {
      const product = db.data.products.find(p => p.id === m.product_id);
      return { ...m, product_name: product?.name };
    });

  res.json({ totalProducts, lowStockItems, pendingReceipts, pendingDeliveries, pendingTransfers, lowStockList, recentMoves });
});

router.get('/trend', (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const relevant = db.data.moveHistory.filter(m => m.created_at >= thirtyDaysAgo);

  const byDay = {};
  relevant.forEach(m => {
    const date = m.created_at.split('T')[0];
    if (!byDay[date]) byDay[date] = { date, received: 0, delivered: 0, transferred: 0, adjusted: 0 };
    if (m.operation_type === 'receipt') byDay[date].received += m.qty;
    else if (m.operation_type === 'delivery') byDay[date].delivered += m.qty;
    else if (m.operation_type === 'transfer') byDay[date].transferred += m.qty;
    else if (m.operation_type === 'adjustment') byDay[date].adjusted += m.qty;
  });

  res.json(Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)));
});

router.get('/categories', (req, res) => {
  const result = db.data.categories.map(cat => {
    const catProducts = db.data.products.filter(p => p.category_id === cat.id && p.active !== false);
    const total_stock = catProducts.reduce((sum, p) => {
      return sum + db.data.stockLevels.filter(s => s.product_id === p.id).reduce((s, sl) => s + sl.qty, 0);
    }, 0);
    return { ...cat, product_count: catProducts.length, total_stock };
  });
  res.json(result.sort((a, b) => b.total_stock - a.total_stock));
});

export default router;
