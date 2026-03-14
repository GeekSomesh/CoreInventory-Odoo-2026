import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, saveDB } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

function nextRef(prefix, collectionLength) {
  return `${prefix}-${String(collectionLength + 1).padStart(5, '0')}`;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stockKey(productId, locationId) {
  return `${productId}|${locationId}`;
}

function pickWarehouseLocation(locations, hints) {
  for (const hint of hints) {
    const found = locations.find((location) => {
      const content = `${location.name || ''} ${location.full_path || ''}`.toLowerCase();
      return content.includes(hint);
    });
    if (found) return found;
  }
  return locations[0] ?? null;
}

function enrichDelivery(delivery) {
  const warehouse = db.data.warehouses.find((item) => item.id === delivery.warehouse_id);
  const lines = db.data.deliveryLines.filter((item) => item.delivery_id === delivery.id).map((line) => {
    const product = db.data.products.find((item) => item.id === line.product_id);
    const location = db.data.locations.find((item) => item.id === line.location_id);
    return {
      ...line,
      product_name: product?.name,
      sku: product?.sku,
      uom: product?.uom,
      location_name: location?.full_path,
    };
  });
  return { ...delivery, warehouse_name: warehouse?.name, lines };
}

function enrichTransfer(transfer) {
  const fromLocation = db.data.locations.find((item) => item.id === transfer.from_location_id);
  const toLocation = db.data.locations.find((item) => item.id === transfer.to_location_id);
  const lines = db.data.transferLines.filter((item) => item.transfer_id === transfer.id).map((line) => {
    const product = db.data.products.find((item) => item.id === line.product_id);
    return {
      ...line,
      product_name: product?.name,
      sku: product?.sku,
      uom: product?.uom,
    };
  });
  return {
    ...transfer,
    from_location_name: fromLocation?.full_path,
    to_location_name: toLocation?.full_path,
    lines,
  };
}

function enrichReceipt(receipt) {
  const warehouse = db.data.warehouses.find((item) => item.id === receipt.warehouse_id);
  const lines = db.data.receiptLines.filter((item) => item.receipt_id === receipt.id).map((line) => {
    const product = db.data.products.find((item) => item.id === line.product_id);
    const location = db.data.locations.find((item) => item.id === line.location_id);
    return {
      ...line,
      product_name: product?.name,
      sku: product?.sku,
      uom: product?.uom,
      location_name: location?.full_path,
    };
  });
  return { ...receipt, warehouse_name: warehouse?.name, lines };
}

router.post('/delivery', async (req, res) => {
  const { customer, warehouse_id, scheduled_date, notes, supplier, lines = [] } = req.body;

  if (!customer || !warehouse_id) {
    return res.status(400).json({ error: 'Customer and warehouse are required' });
  }

  const requestedLines = Array.isArray(lines) ? lines : [];
  const normalizedDemandLines = requestedLines
    .map((line) => ({
      product_id: line.product_id,
      demand_qty: toNumber(line.demand_qty, 0),
      preferred_location_id: line.location_id || null,
    }))
    .filter((line) => line.product_id && line.demand_qty > 0);

  if (!normalizedDemandLines.length) {
    return res.status(400).json({ error: 'At least one valid line is required' });
  }

  const warehouse = db.data.warehouses.find((item) => item.id === warehouse_id);
  if (!warehouse) {
    return res.status(404).json({ error: 'Warehouse not found' });
  }

  const warehouseLocations = db.data.locations.filter((item) => item.warehouse_id === warehouse_id && item.active !== false);
  if (!warehouseLocations.length) {
    return res.status(400).json({ error: 'Selected warehouse has no active locations' });
  }

  const locationById = new Map(db.data.locations.map((item) => [item.id, item]));
  const productById = new Map(db.data.products.map((item) => [item.id, item]));
  for (const demandLine of normalizedDemandLines) {
    if (!productById.has(demandLine.product_id)) {
      return res.status(400).json({ error: `Product not found for line ${demandLine.product_id}` });
    }
  }

  const deliveryBufferLocation = pickWarehouseLocation(warehouseLocations, ['shipping', 'main store', 'main_store']);
  const receiptLocation = pickWarehouseLocation(warehouseLocations, ['receiving', 'main store', 'main_store', 'shipping']);
  if (!deliveryBufferLocation || !receiptLocation) {
    return res.status(400).json({ error: 'Unable to resolve buffer locations in the selected warehouse' });
  }

  const warehouseLocationIds = new Set(warehouseLocations.map((item) => item.id));
  const plannedStock = new Map();
  for (const stock of db.data.stockLevels) {
    plannedStock.set(stockKey(stock.product_id, stock.location_id), toNumber(stock.qty, 0));
  }

  function getPlannedQty(productId, locationId) {
    return plannedStock.get(stockKey(productId, locationId)) || 0;
  }

  function setPlannedQty(productId, locationId, qty) {
    plannedStock.set(stockKey(productId, locationId), Math.max(0, qty));
  }

  function adjustActualStock(productId, locationId, delta) {
    const nextQty = Math.max(0, getPlannedQty(productId, locationId) + delta);
    setPlannedQty(productId, locationId, nextQty);
    const stock = db.data.stockLevels.find((item) => item.product_id === productId && item.location_id === locationId);
    if (stock) {
      stock.qty = nextQty;
      return;
    }
    db.data.stockLevels.push({
      id: uuidv4(),
      product_id: productId,
      location_id: locationId,
      qty: nextQty,
    });
  }

  const deliveryPlan = [];
  const transferPlan = new Map();
  const receiptPlan = new Map();

  function addDeliveryPlanLine(productId, locationId, qty) {
    const existing = deliveryPlan.find((line) => line.product_id === productId && line.location_id === locationId);
    if (existing) {
      existing.qty += qty;
      return;
    }
    deliveryPlan.push({ product_id: productId, location_id: locationId, qty });
  }

  function addTransferPlanLine(fromLocationId, toLocationId, productId, qty) {
    const key = `${fromLocationId}|${toLocationId}`;
    if (!transferPlan.has(key)) {
      transferPlan.set(key, { from_location_id: fromLocationId, to_location_id: toLocationId, lines: new Map() });
    }
    const entry = transferPlan.get(key);
    entry.lines.set(productId, (entry.lines.get(productId) || 0) + qty);
  }

  function addReceiptPlanLine(locationId, productId, qty) {
    const key = `${locationId}|${productId}`;
    receiptPlan.set(key, (receiptPlan.get(key) || 0) + qty);
  }

  for (const line of normalizedDemandLines) {
    const productId = line.product_id;
    let remaining = line.demand_qty;

    const preferredLocationId = line.preferred_location_id && warehouseLocationIds.has(line.preferred_location_id)
      ? line.preferred_location_id
      : null;

    const inWarehouseSources = [...warehouseLocations].sort((left, right) => {
      if (preferredLocationId && left.id === preferredLocationId) return -1;
      if (preferredLocationId && right.id === preferredLocationId) return 1;
      return getPlannedQty(productId, right.id) - getPlannedQty(productId, left.id);
    });

    for (const source of inWarehouseSources) {
      if (remaining <= 0) break;
      const available = getPlannedQty(productId, source.id);
      if (available <= 0) continue;
      const qty = Math.min(available, remaining);
      setPlannedQty(productId, source.id, available - qty);
      addDeliveryPlanLine(productId, source.id, qty);
      remaining -= qty;
    }

    if (remaining > 0) {
      const externalSources = db.data.stockLevels
        .filter((stock) => stock.product_id === productId && !warehouseLocationIds.has(stock.location_id))
        .sort((left, right) => getPlannedQty(productId, right.location_id) - getPlannedQty(productId, left.location_id));

      for (const stock of externalSources) {
        if (remaining <= 0) break;
        const available = getPlannedQty(productId, stock.location_id);
        if (available <= 0) continue;
        const qty = Math.min(available, remaining);

        setPlannedQty(productId, stock.location_id, available - qty);
        setPlannedQty(productId, deliveryBufferLocation.id, getPlannedQty(productId, deliveryBufferLocation.id) + qty);
        addTransferPlanLine(stock.location_id, deliveryBufferLocation.id, productId, qty);

        setPlannedQty(productId, deliveryBufferLocation.id, getPlannedQty(productId, deliveryBufferLocation.id) - qty);
        addDeliveryPlanLine(productId, deliveryBufferLocation.id, qty);
        remaining -= qty;
      }
    }

    if (remaining > 0) {
      addReceiptPlanLine(receiptLocation.id, productId, remaining);
      setPlannedQty(productId, receiptLocation.id, getPlannedQty(productId, receiptLocation.id) + remaining);
      setPlannedQty(productId, receiptLocation.id, getPlannedQty(productId, receiptLocation.id) - remaining);
      addDeliveryPlanLine(productId, receiptLocation.id, remaining);
      remaining = 0;
    }
  }

  const now = new Date().toISOString();
  const deliveryRef = nextRef('DEL', db.data.deliveries.length);

  const createdTransfers = [];
  for (const entry of transferPlan.values()) {
    const transfer = {
      id: uuidv4(),
      ref: nextRef('INT', db.data.transfers.length),
      from_location_id: entry.from_location_id,
      to_location_id: entry.to_location_id,
      scheduled_date: scheduled_date || null,
      notes: `AUTO transfer for ${deliveryRef}`,
      status: 'done',
      created_by: req.user.id,
      created_at: now,
      validated_by: req.user.id,
      validated_at: now,
    };
    db.data.transfers.push(transfer);

    for (const [productId, qty] of entry.lines.entries()) {
      db.data.transferLines.push({
        id: uuidv4(),
        transfer_id: transfer.id,
        product_id: productId,
        qty,
      });

      adjustActualStock(productId, entry.from_location_id, -qty);
      adjustActualStock(productId, entry.to_location_id, qty);

      db.data.moveHistory.push({
        id: uuidv4(),
        operation_type: 'transfer',
        ref: transfer.ref,
        product_id: productId,
        from_location_id: entry.from_location_id,
        to_location_id: entry.to_location_id,
        qty,
        user_id: req.user.id,
        created_at: now,
      });
    }

    createdTransfers.push(enrichTransfer(transfer));
  }

  const createdReceipts = [];
  const receiptEntries = [...receiptPlan.entries()].map(([key, qty]) => {
    const [locationId, productId] = key.split('|');
    return { location_id: locationId, product_id: productId, qty };
  });

  if (receiptEntries.length) {
    const receipt = {
      id: uuidv4(),
      ref: nextRef('REC', db.data.receipts.length),
      supplier: supplier || 'AUTO-PROCUREMENT',
      warehouse_id,
      scheduled_date: scheduled_date || null,
      notes: `AUTO receipt for ${deliveryRef}`,
      status: 'done',
      created_by: req.user.id,
      created_at: now,
      validated_by: req.user.id,
      validated_at: now,
    };
    db.data.receipts.push(receipt);

    for (const line of receiptEntries) {
      db.data.receiptLines.push({
        id: uuidv4(),
        receipt_id: receipt.id,
        product_id: line.product_id,
        expected_qty: line.qty,
        received_qty: line.qty,
        location_id: line.location_id,
      });

      adjustActualStock(line.product_id, line.location_id, line.qty);
      db.data.moveHistory.push({
        id: uuidv4(),
        operation_type: 'receipt',
        ref: receipt.ref,
        product_id: line.product_id,
        from_location_id: 'VENDOR',
        to_location_id: line.location_id,
        qty: line.qty,
        user_id: req.user.id,
        created_at: now,
      });
    }

    createdReceipts.push(enrichReceipt(receipt));
  }

  const delivery = {
    id: uuidv4(),
    ref: deliveryRef,
    customer,
    warehouse_id,
    scheduled_date: scheduled_date || null,
    notes: notes || 'AUTO delivery workflow',
    status: 'done',
    created_by: req.user.id,
    created_at: now,
    validated_by: req.user.id,
    validated_at: now,
  };
  db.data.deliveries.push(delivery);

  for (const line of deliveryPlan) {
    db.data.deliveryLines.push({
      id: uuidv4(),
      delivery_id: delivery.id,
      product_id: line.product_id,
      demand_qty: line.qty,
      done_qty: line.qty,
      location_id: line.location_id,
    });

    adjustActualStock(line.product_id, line.location_id, -line.qty);
    db.data.moveHistory.push({
      id: uuidv4(),
      operation_type: 'delivery',
      ref: delivery.ref,
      product_id: line.product_id,
      from_location_id: line.location_id,
      to_location_id: 'CUSTOMER',
      qty: line.qty,
      user_id: req.user.id,
      created_at: now,
    });
  }

  await saveDB();

  const transferQty = createdTransfers.reduce(
    (sum, transfer) => sum + transfer.lines.reduce((lineSum, line) => lineSum + toNumber(line.qty, 0), 0),
    0,
  );
  const receiptQty = createdReceipts.reduce(
    (sum, receipt) => sum + receipt.lines.reduce((lineSum, line) => lineSum + toNumber(line.expected_qty, 0), 0),
    0,
  );
  const demandQty = normalizedDemandLines.reduce((sum, line) => sum + toNumber(line.demand_qty, 0), 0);

  res.status(201).json({
    delivery: enrichDelivery(delivery),
    transfers: createdTransfers,
    receipts: createdReceipts,
    summary: {
      requested_lines: normalizedDemandLines.length,
      requested_qty: demandQty,
      transfer_docs: createdTransfers.length,
      transfer_qty: transferQty,
      receipt_docs: createdReceipts.length,
      receipt_qty: receiptQty,
      delivery_lines: deliveryPlan.length,
      delivery_qty: demandQty,
    },
  });
});

export default router;
