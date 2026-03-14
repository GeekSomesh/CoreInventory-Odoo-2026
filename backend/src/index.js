import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { initDB, storageMode } from './db.js';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import warehouseRoutes from './routes/warehouses.js';
import receiptRoutes from './routes/receipts.js';
import deliveryRoutes from './routes/deliveries.js';
import transferRoutes from './routes/transfers.js';
import adjustmentRoutes from './routes/adjustments.js';
import historyRoutes from './routes/history.js';
import dashboardRoutes from './routes/dashboard.js';
import { errorHandler } from './middleware/errorHandler.js';

export async function createApp() {
  await initDB();

  const app = express();

  app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok', storage: storageMode, time: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/warehouses', warehouseRoutes);
  app.use('/api/receipts', receiptRoutes);
  app.use('/api/deliveries', deliveryRoutes);
  app.use('/api/transfers', transferRoutes);
  app.use('/api/adjustments', adjustmentRoutes);
  app.use('/api/history', historyRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use(errorHandler);

  return app;
}

export async function startServer(port = process.env.PORT || 3001) {
  const app = await createApp();
  return app.listen(port, () => console.log(`✅ CoreInventory API → http://localhost:${port} (${storageMode})`));
}

const currentFile = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFile) {
  await startServer();
}
