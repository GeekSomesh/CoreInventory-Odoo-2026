import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDB } from './db.js';

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

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

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

const PORT = process.env.PORT || 3001;

await initDB();
app.listen(PORT, () => console.log(`✅ CoreInventory API → http://localhost:${PORT}`));
