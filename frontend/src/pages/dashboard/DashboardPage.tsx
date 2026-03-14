import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Boxes,
  Clock3,
  RefreshCcw,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import client from '../../api/client';
import MetricCard from '../../components/ui/MetricCard';
import PageHeader from '../../components/ui/PageHeader';
import InsightModal, { type InsightMetric, type InsightSection, type InsightTone } from '../../components/ui/InsightModal';
import type {
  Adjustment,
  DashboardCategorySummary,
  DashboardTrendPoint,
  Delivery,
  MoveHistoryItem,
  OperationStatus,
  OperationType,
  PaginatedResponse,
  Product,
  Receipt,
  Transfer,
  Warehouse,
} from '../../types/api';
import { formatDateTime, formatQty, operationTypeLabel } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';

const typeFilters: Array<{ label: string; value: OperationType | 'all' }> = [
  { label: 'All Documents', value: 'all' },
  { label: 'Receipts', value: 'receipt' },
  { label: 'Deliveries', value: 'delivery' },
  { label: 'Internal', value: 'transfer' },
  { label: 'Adjustments', value: 'adjustment' },
];

const seriesColor = {
  received: '#22c55e',
  delivered: '#6366f1',
  transferred: '#06b6d4',
  adjusted: '#f59e0b',
};

interface InsightState {
  title: string;
  subtitle?: string;
  loading: boolean;
  metrics: InsightMetric[];
  sections: InsightSection[];
}

interface DashboardSnapshot {
  trend: DashboardTrendPoint[];
  categories: DashboardCategorySummary[];
  warehouses: Warehouse[];
  products: Product[];
  recentHistory: MoveHistoryItem[];
  receipts: Receipt[];
  deliveries: Delivery[];
  transfers: Transfer[];
  adjustments: Adjustment[];
  refreshedAt: string;
}

function shortDate(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${month}/${day}`;
}

function tooltipValueFormatter(value: unknown): string {
  if (Array.isArray(value)) return formatQty(Number(value[0] ?? 0));
  return formatQty(Number(value ?? 0));
}

function isOpenStatus(status: OperationStatus): boolean {
  return !['done', 'cancelled'].includes(status);
}

function statusLabel(status: OperationStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function toneForStatus(status: OperationStatus): InsightTone {
  if (status === 'done') return 'success';
  if (status === 'ready') return 'info';
  if (status === 'waiting') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'default';
}

function toneForOperation(type: OperationType): InsightTone {
  if (type === 'receipt') return 'success';
  if (type === 'delivery') return 'info';
  if (type === 'transfer') return 'warning';
  return 'danger';
}

function safeDate(value: string | null | undefined): string {
  return value ?? '';
}

function sortByNewest<T extends { created_at: string; scheduled_date?: string | null }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    return safeDate(right.scheduled_date || right.created_at).localeCompare(safeDate(left.scheduled_date || left.created_at));
  });
}

function sortBySoonest<T extends { created_at: string; scheduled_date?: string | null }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    return safeDate(left.scheduled_date || left.created_at).localeCompare(safeDate(right.scheduled_date || right.created_at));
  });
}

function sumNumbers(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

export default function DashboardPage() {
  const [trend, setTrend] = useState<DashboardTrendPoint[]>([]);
  const [categories, setCategories] = useState<DashboardCategorySummary[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentHistory, setRecentHistory] = useState<MoveHistoryItem[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [selectedType, setSelectedType] = useState<OperationType | 'all'>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [insight, setInsight] = useState<InsightState | null>(null);

  const loadDashboard = useCallback(async (): Promise<DashboardSnapshot | null> => {
    setLoading(true);
    try {
      const [
        trendRes,
        categoryRes,
        warehouseRes,
        productsRes,
        historyRes,
        receiptsRes,
        deliveriesRes,
        transfersRes,
        adjustmentsRes,
      ] = await Promise.all([
        client.get<DashboardTrendPoint[]>('/dashboard/trend'),
        client.get<DashboardCategorySummary[]>('/dashboard/categories'),
        client.get<Warehouse[]>('/warehouses'),
        client.get<Product[]>('/products'),
        client.get<PaginatedResponse<MoveHistoryItem>>('/history', { params: { page: 1, limit: 60 } }),
        client.get<Receipt[]>('/receipts'),
        client.get<Delivery[]>('/deliveries'),
        client.get<Transfer[]>('/transfers'),
        client.get<Adjustment[]>('/adjustments'),
      ]);

      const snapshot: DashboardSnapshot = {
        trend: trendRes.data,
        categories: categoryRes.data,
        warehouses: warehouseRes.data,
        products: productsRes.data,
        recentHistory: historyRes.data.data,
        receipts: receiptsRes.data,
        deliveries: deliveriesRes.data,
        transfers: transfersRes.data,
        adjustments: adjustmentsRes.data,
        refreshedAt: new Date().toISOString(),
      };

      setTrend(snapshot.trend);
      setCategories(snapshot.categories);
      setWarehouses(snapshot.warehouses);
      setProducts(snapshot.products);
      setRecentHistory(snapshot.recentHistory);
      setReceipts(snapshot.receipts);
      setDeliveries(snapshot.deliveries);
      setTransfers(snapshot.transfers);
      setAdjustments(snapshot.adjustments);
      setLastUpdated(snapshot.refreshedAt);

      return snapshot;
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load dashboard'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const categoryNameById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.name]));
  }, [categories]);

  const productById = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  const selectedWarehouseModel = useMemo(() => {
    return warehouses.find((warehouse) => warehouse.id === selectedWarehouse) ?? null;
  }, [selectedWarehouse, warehouses]);

  const selectedWarehouseCode = selectedWarehouseModel?.short_code ?? null;
  const selectedWarehouseLocationIds = useMemo(() => {
    return new Set((selectedWarehouseModel?.locations ?? []).map((location) => location.id));
  }, [selectedWarehouseModel]);

  const scopeLabel = useMemo(() => {
    const warehouseLabel = selectedWarehouseModel?.name ?? 'All Warehouses';
    const categoryLabel = selectedCategory === 'all' ? 'All Categories' : categoryNameById.get(selectedCategory) ?? 'All Categories';
    return `${warehouseLabel} | ${categoryLabel}`;
  }, [categoryNameById, selectedCategory, selectedWarehouseModel]);

  const getScopedStock = useCallback((product: Product) => {
    if (!selectedWarehouseCode) return product.total_stock ?? sumNumbers((product.stock_by_location ?? []).map((row) => row.qty));
    return (product.stock_by_location ?? [])
      .filter((row) => row.location.startsWith(`${selectedWarehouseCode}/`))
      .reduce((sum, row) => sum + row.qty, 0);
  }, [selectedWarehouseCode]);

  const productMatchesScope = useCallback((product: Product) => {
    if (selectedCategory !== 'all' && product.category_id !== selectedCategory) return false;
    if (!selectedWarehouseCode) return true;
    return (product.stock_by_location ?? []).some((row) => row.location.startsWith(`${selectedWarehouseCode}/`));
  }, [selectedCategory, selectedWarehouseCode]);

  const moveMatchesWarehouse = useCallback((move: MoveHistoryItem) => {
    if (!selectedWarehouseCode) return true;
    const values = [move.from_location_name, move.to_location_name, move.from_location_id, move.to_location_id];
    return values.some((value) => typeof value === 'string' && value.startsWith(`${selectedWarehouseCode}/`));
  }, [selectedWarehouseCode]);

  const moveMatchesCategory = useCallback((move: MoveHistoryItem) => {
    if (selectedCategory === 'all') return true;
    return productById.get(move.product_id)?.category_id === selectedCategory;
  }, [productById, selectedCategory]);

  const receiptMatchesScope = useCallback((receipt: Receipt) => {
    if (selectedWarehouse !== 'all' && receipt.warehouse_id !== selectedWarehouse) return false;
    if (selectedCategory !== 'all') {
      return receipt.lines.some((line) => productById.get(line.product_id)?.category_id === selectedCategory);
    }
    return true;
  }, [productById, selectedCategory, selectedWarehouse]);

  const deliveryMatchesScope = useCallback((delivery: Delivery) => {
    if (selectedWarehouse !== 'all' && delivery.warehouse_id !== selectedWarehouse) return false;
    if (selectedCategory !== 'all') {
      return delivery.lines.some((line) => productById.get(line.product_id)?.category_id === selectedCategory);
    }
    return true;
  }, [productById, selectedCategory, selectedWarehouse]);

  const transferMatchesScope = useCallback((transfer: Transfer) => {
    if (selectedWarehouse !== 'all') {
      const warehouseMatch =
        selectedWarehouseLocationIds.has(transfer.from_location_id)
        || selectedWarehouseLocationIds.has(transfer.to_location_id)
        || Boolean(selectedWarehouseCode && (
          transfer.from_location_name?.startsWith(`${selectedWarehouseCode}/`)
          || transfer.to_location_name?.startsWith(`${selectedWarehouseCode}/`)
        ));
      if (!warehouseMatch) return false;
    }
    if (selectedCategory !== 'all') {
      return transfer.lines.some((line) => productById.get(line.product_id)?.category_id === selectedCategory);
    }
    return true;
  }, [productById, selectedCategory, selectedWarehouse, selectedWarehouseCode, selectedWarehouseLocationIds]);

  const adjustmentMatchesScope = useCallback((adjustment: Adjustment) => {
    if (selectedWarehouse !== 'all') {
      const warehouseMatch =
        selectedWarehouseLocationIds.has(adjustment.location_id)
        || Boolean(selectedWarehouseCode && adjustment.location_name?.startsWith(`${selectedWarehouseCode}/`));
      if (!warehouseMatch) return false;
    }
    if (selectedCategory !== 'all') {
      return adjustment.lines.some((line) => productById.get(line.product_id)?.category_id === selectedCategory);
    }
    return true;
  }, [productById, selectedCategory, selectedWarehouse, selectedWarehouseCode, selectedWarehouseLocationIds]);

  const scopedProducts = useMemo(() => {
    return products.filter(productMatchesScope);
  }, [productMatchesScope, products]);

  const scopedMovesBase = useMemo(() => {
    return recentHistory.filter((move) => moveMatchesWarehouse(move) && moveMatchesCategory(move));
  }, [moveMatchesCategory, moveMatchesWarehouse, recentHistory]);

  const filteredRecentMoves = useMemo(() => {
    return scopedMovesBase.filter((move) => selectedType === 'all' || move.operation_type === selectedType);
  }, [scopedMovesBase, selectedType]);

  const filteredLowStock = useMemo(() => {
    return scopedProducts
      .map((product) => ({ ...product, total_stock: getScopedStock(product) }))
      .filter((product) => (product.total_stock ?? 0) <= product.reorder_min)
      .sort((left, right) => (left.total_stock ?? 0) - (right.total_stock ?? 0));
  }, [getScopedStock, scopedProducts]);

  const scopedReceipts = useMemo(() => {
    return receipts.filter(receiptMatchesScope);
  }, [receiptMatchesScope, receipts]);

  const scopedDeliveries = useMemo(() => {
    return deliveries.filter(deliveryMatchesScope);
  }, [deliveries, deliveryMatchesScope]);

  const scopedTransfers = useMemo(() => {
    return transfers.filter(transferMatchesScope);
  }, [transferMatchesScope, transfers]);

  const scopedAdjustments = useMemo(() => {
    return adjustments.filter(adjustmentMatchesScope);
  }, [adjustmentMatchesScope, adjustments]);

  const openReceipts = useMemo(() => scopedReceipts.filter((item) => isOpenStatus(item.status)), [scopedReceipts]);
  const openDeliveries = useMemo(() => scopedDeliveries.filter((item) => isOpenStatus(item.status)), [scopedDeliveries]);
  const openTransfers = useMemo(() => scopedTransfers.filter((item) => isOpenStatus(item.status)), [scopedTransfers]);
  const openAdjustments = useMemo(() => scopedAdjustments.filter((item) => isOpenStatus(item.status)), [scopedAdjustments]);

  const categoryBars = useMemo(() => {
    const byCategory = new Map<string, { name: string; total_stock: number; product_count: number }>();

    scopedProducts.forEach((product) => {
      const name = product.category_name ?? categoryNameById.get(product.category_id ?? '') ?? 'Uncategorized';
      const current = byCategory.get(name) ?? { name, total_stock: 0, product_count: 0 };
      current.total_stock += getScopedStock(product);
      current.product_count += 1;
      byCategory.set(name, current);
    });

    return [...byCategory.values()]
      .sort((left, right) => right.total_stock - left.total_stock)
      .slice(0, 7);
  }, [categoryNameById, getScopedStock, scopedProducts]);

  const latestTrendPoint = trend.length ? trend[trend.length - 1] : null;

  const totalInventoryUnits = useMemo(() => {
    return scopedProducts.reduce((sum, product) => sum + getScopedStock(product), 0);
  }, [getScopedStock, scopedProducts]);

  const openDocumentsTotal = openReceipts.length + openDeliveries.length + openTransfers.length + openAdjustments.length;

  function closeInsight() {
    setInsight(null);
  }

  function openInsightShell(title: string, subtitle?: string) {
    setInsight({ title, subtitle, loading: true, metrics: [], sections: [] });
  }

  function setInsightData(title: string, subtitle: string | undefined, metrics: InsightMetric[], sections: InsightSection[]) {
    setInsight({ title, subtitle, loading: false, metrics, sections });
  }

  function moveRows(type?: OperationType, limit = 6): InsightSection {
    const rows = scopedMovesBase
      .filter((move) => !type || move.operation_type === type)
      .slice(0, limit)
      .map((move) => ({
        title: move.product_name ?? move.product_id,
        meta: `${operationTypeLabel(move.operation_type)} | ${move.ref} | ${formatDateTime(move.created_at)}`,
        value: formatQty(move.qty),
        auxiliary: `${move.from_location_name ?? move.from_location_id} -> ${move.to_location_name ?? move.to_location_id}`,
        tone: toneForOperation(move.operation_type),
      }));

    return {
      title: type ? `${operationTypeLabel(type)} Ledger` : 'Recent Movement',
      caption: 'Latest posted lines inside current scope',
      items: rows,
    };
  }

  function statusMetrics<T extends { status: OperationStatus }>(items: T[]): InsightMetric[] {
    return [
      { label: 'Open', value: formatQty(items.filter((item) => isOpenStatus(item.status)).length) },
      { label: 'Ready', value: formatQty(items.filter((item) => item.status === 'ready').length), tone: 'info' },
      { label: 'Waiting', value: formatQty(items.filter((item) => item.status === 'waiting').length), tone: 'warning' },
      { label: 'Draft', value: formatQty(items.filter((item) => item.status === 'draft').length) },
    ];
  }

  function buildCatalogInsight() {
    const distributedRows = [...scopedProducts]
      .sort((left, right) => (right.stock_by_location?.length ?? 0) - (left.stock_by_location?.length ?? 0))
      .slice(0, 6)
      .map((product) => ({
        title: `${product.name} (${product.sku})`,
        meta: `${product.category_name ?? 'Uncategorized'} | ${product.stock_by_location?.length ?? 0} locations`,
        value: formatQty(getScopedStock(product)),
        auxiliary: `Reorder ${formatQty(product.reorder_min)} / ${formatQty(product.reorder_max)}`,
      }));

    const stockRows = [...scopedProducts]
      .sort((left, right) => getScopedStock(right) - getScopedStock(left))
      .slice(0, 6)
      .map((product) => ({
        title: `${product.name} (${product.sku})`,
        meta: `${product.category_name ?? 'Uncategorized'} | ${product.uom}`,
        value: formatQty(getScopedStock(product)),
        auxiliary: `${product.stock_by_location?.length ?? 0} active locations`,
      }));

    setInsightData(
      'Catalog Footprint',
      scopeLabel,
      [
        { label: 'Active SKUs', value: formatQty(scopedProducts.length) },
        { label: 'Inventory Units', value: formatQty(totalInventoryUnits), tone: 'info' },
        { label: 'Categories', value: formatQty(new Set(scopedProducts.map((product) => product.category_id ?? product.category_name ?? 'uncategorized')).size) },
        { label: 'Low Stock', value: formatQty(filteredLowStock.length), tone: filteredLowStock.length ? 'warning' : 'success' },
      ],
      [
        { title: 'Top Stocked SKUs', caption: 'Largest on-hand positions', items: stockRows },
        { title: 'Coverage', caption: 'Products spread across the most locations', items: distributedRows },
      ],
    );
  }

  function buildLowStockInsight() {
    const shortageTotal = filteredLowStock.reduce((sum, product) => sum + Math.max(product.reorder_min - (product.total_stock ?? 0), 0), 0);
    const categoryExposure = new Map<string, { count: number; shortage: number }>();

    filteredLowStock.forEach((product) => {
      const key = product.category_name ?? 'Uncategorized';
      const current = categoryExposure.get(key) ?? { count: 0, shortage: 0 };
      current.count += 1;
      current.shortage += Math.max(product.reorder_min - (product.total_stock ?? 0), 0);
      categoryExposure.set(key, current);
    });

    const exposureRows: InsightSection['items'] = [...categoryExposure.entries()]
      .sort((left, right) => right[1].shortage - left[1].shortage)
      .slice(0, 6)
      .map(([name, exposure]) => ({
        title: name,
        meta: `${formatQty(exposure.count)} SKUs under reorder`,
        value: formatQty(exposure.shortage),
        auxiliary: 'Shortfall to minimum',
        tone: exposure.shortage > 0 ? 'danger' : 'warning',
      }));

    const skuRows: InsightSection['items'] = filteredLowStock.slice(0, 7).map((product) => {
      const stock = product.total_stock ?? 0;
      const shortage = Math.max(product.reorder_min - stock, 0);
      return {
        title: `${product.name} (${product.sku})`,
        meta: `${product.category_name ?? 'Uncategorized'} | Min ${formatQty(product.reorder_min)}`,
        value: formatQty(stock),
        auxiliary: shortage ? `Short ${formatQty(shortage)}` : 'At threshold',
        tone: stock <= 0 ? 'danger' : 'warning',
      };
    });

    setInsightData(
      'Low Stock Risk',
      scopeLabel,
      [
        { label: 'At Risk', value: formatQty(filteredLowStock.length), tone: filteredLowStock.length ? 'warning' : 'success' },
        { label: 'Critical', value: formatQty(filteredLowStock.filter((product) => (product.total_stock ?? 0) <= 0).length), tone: 'danger' },
        { label: 'Shortfall', value: formatQty(shortageTotal), tone: shortageTotal ? 'danger' : 'success' },
        { label: 'Categories', value: formatQty(categoryExposure.size) },
      ],
      [
        { title: 'Urgent SKUs', caption: 'Immediate replenishment candidates', items: skuRows },
        { title: 'Category Exposure', caption: 'Risk concentration by category', items: exposureRows },
      ],
    );
  }

  function buildReceiptInsight() {
    const inboundRows = sortBySoonest(openReceipts).slice(0, 7).map((receipt) => ({
      title: receipt.ref,
      meta: `${receipt.supplier} | ${receipt.warehouse_name ?? receipt.warehouse_id} | ${statusLabel(receipt.status)}`,
      value: formatQty(sumNumbers(receipt.lines.map((line) => line.expected_qty))),
      auxiliary: receipt.scheduled_date ? formatDateTime(receipt.scheduled_date) : 'Unscheduled',
      tone: toneForStatus(receipt.status),
    }));

    setInsightData(
      'Receipt Queue',
      scopeLabel,
      [
        ...statusMetrics(scopedReceipts).slice(0, 3),
        { label: 'Suppliers', value: formatQty(new Set(openReceipts.map((receipt) => receipt.supplier)).size) },
      ],
      [
        { title: 'Inbound Queue', caption: 'Next purchase receipts to process', items: inboundRows },
        moveRows('receipt'),
      ],
    );
  }

  function buildDeliveryInsight() {
    const dispatchRows = sortBySoonest(openDeliveries).slice(0, 7).map((delivery) => ({
      title: delivery.ref,
      meta: `${delivery.customer} | ${delivery.warehouse_name ?? delivery.warehouse_id} | ${statusLabel(delivery.status)}`,
      value: formatQty(sumNumbers(delivery.lines.map((line) => line.demand_qty))),
      auxiliary: delivery.scheduled_date ? formatDateTime(delivery.scheduled_date) : 'Unscheduled',
      tone: toneForStatus(delivery.status),
    }));

    setInsightData(
      'Delivery Queue',
      scopeLabel,
      [
        ...statusMetrics(scopedDeliveries).slice(0, 3),
        { label: 'Customers', value: formatQty(new Set(openDeliveries.map((delivery) => delivery.customer)).size) },
      ],
      [
        { title: 'Dispatch Queue', caption: 'Open outbound commitments', items: dispatchRows },
        moveRows('delivery'),
      ],
    );
  }

  function buildTransferInsight() {
    const laneRows = sortBySoonest(openTransfers).slice(0, 7).map((transfer) => ({
      title: transfer.ref,
      meta: `${transfer.from_location_name ?? transfer.from_location_id} -> ${transfer.to_location_name ?? transfer.to_location_id}`,
      value: formatQty(sumNumbers(transfer.lines.map((line) => line.qty))),
      auxiliary: `${statusLabel(transfer.status)} | ${transfer.scheduled_date ? formatDateTime(transfer.scheduled_date) : 'Unscheduled'}`,
      tone: toneForStatus(transfer.status),
    }));

    setInsightData(
      'Internal Transfer Queue',
      scopeLabel,
      [
        ...statusMetrics(scopedTransfers).slice(0, 3),
        { label: 'Active Lanes', value: formatQty(new Set(openTransfers.map((transfer) => `${transfer.from_location_id}:${transfer.to_location_id}`)).size) },
      ],
      [
        { title: 'Open Lanes', caption: 'Internal moves pending validation', items: laneRows },
        moveRows('transfer'),
      ],
    );
  }

  function buildAdjustmentInsight() {
    const adjustmentRows = sortByNewest(scopedAdjustments).slice(0, 7).map((adjustment) => ({
      title: adjustment.ref,
      meta: `${adjustment.location_name ?? adjustment.location_id} | ${statusLabel(adjustment.status)}`,
      value: formatQty(sumNumbers(adjustment.lines.map((line) => Math.abs(line.change_qty ?? line.delta ?? 0)))),
      auxiliary: `${adjustment.lines.length} lines`,
      tone: toneForStatus(adjustment.status),
    }));

    setInsightData(
      'Adjustment Review',
      scopeLabel,
      [
        ...statusMetrics(scopedAdjustments).slice(0, 3),
        { label: 'Affected SKUs', value: formatQty(new Set(scopedAdjustments.flatMap((adjustment) => adjustment.lines.map((line) => line.product_id))).size) },
      ],
      [
        { title: 'Adjustment Docs', caption: 'Recent corrections and recounts', items: adjustmentRows },
        moveRows('adjustment'),
      ],
    );
  }

  function buildAllDocumentsInsight() {
    const pipelineRows = [
      ...sortBySoonest(openReceipts).slice(0, 3).map((receipt) => ({
        title: receipt.ref,
        meta: `${receipt.supplier} | Receipt`,
        value: formatQty(sumNumbers(receipt.lines.map((line) => line.expected_qty))),
        auxiliary: receipt.scheduled_date ? formatDateTime(receipt.scheduled_date) : 'Unscheduled',
        tone: 'success' as InsightTone,
      })),
      ...sortBySoonest(openDeliveries).slice(0, 2).map((delivery) => ({
        title: delivery.ref,
        meta: `${delivery.customer} | Delivery`,
        value: formatQty(sumNumbers(delivery.lines.map((line) => line.demand_qty))),
        auxiliary: delivery.scheduled_date ? formatDateTime(delivery.scheduled_date) : 'Unscheduled',
        tone: 'info' as InsightTone,
      })),
      ...sortBySoonest(openTransfers).slice(0, 2).map((transfer) => ({
        title: transfer.ref,
        meta: `${transfer.from_location_name ?? transfer.from_location_id} -> ${transfer.to_location_name ?? transfer.to_location_id}`,
        value: formatQty(sumNumbers(transfer.lines.map((line) => line.qty))),
        auxiliary: transfer.scheduled_date ? formatDateTime(transfer.scheduled_date) : 'Unscheduled',
        tone: 'warning' as InsightTone,
      })),
    ];

    setInsightData(
      'Document Pulse',
      scopeLabel,
      [
        { label: 'Open Docs', value: formatQty(openDocumentsTotal) },
        { label: 'Receipts', value: formatQty(openReceipts.length), tone: 'success' },
        { label: 'Deliveries', value: formatQty(openDeliveries.length), tone: 'info' },
        { label: 'Transfers', value: formatQty(openTransfers.length), tone: 'warning' },
      ],
      [
        { title: 'Open Pipeline', caption: 'Highest priority documents in scope', items: pipelineRows },
        moveRows(undefined, 7),
      ],
    );
  }

  function openTypeInsight(type: OperationType | 'all') {
    setSelectedType(type);

    const title = type === 'all' ? 'Document Pulse' : `${operationTypeLabel(type)} Insight`;
    openInsightShell(title, scopeLabel);

    if (type === 'all') {
      buildAllDocumentsInsight();
      return;
    }

    if (type === 'receipt') {
      buildReceiptInsight();
      return;
    }

    if (type === 'delivery') {
      buildDeliveryInsight();
      return;
    }

    if (type === 'transfer') {
      buildTransferInsight();
      return;
    }

    buildAdjustmentInsight();
  }

  async function handleRefreshClick() {
    openInsightShell('Refreshing Snapshot', scopeLabel);
    const snapshot = await loadDashboard();
    if (!snapshot) {
      closeInsight();
      return;
    }

    const scopedProductsAfterRefresh = snapshot.products.filter((product) => {
      if (selectedCategory !== 'all' && product.category_id !== selectedCategory) return false;
      if (!selectedWarehouseCode) return true;
      return (product.stock_by_location ?? []).some((row) => row.location.startsWith(`${selectedWarehouseCode}/`));
    });

    const lowStockAfterRefresh = scopedProductsAfterRefresh
      .map((product) => ({
        ...product,
        total_stock: !selectedWarehouseCode
          ? product.total_stock ?? sumNumbers((product.stock_by_location ?? []).map((row) => row.qty))
          : (product.stock_by_location ?? [])
            .filter((row) => row.location.startsWith(`${selectedWarehouseCode}/`))
            .reduce((sum, row) => sum + row.qty, 0),
      }))
      .filter((product) => (product.total_stock ?? 0) <= product.reorder_min)
      .sort((left, right) => (left.total_stock ?? 0) - (right.total_stock ?? 0));

    const scopedMovesAfterRefresh = snapshot.recentHistory.filter((move) => {
      const warehouseOkay = !selectedWarehouseCode || [move.from_location_name, move.to_location_name, move.from_location_id, move.to_location_id]
        .some((value) => typeof value === 'string' && value.startsWith(`${selectedWarehouseCode}/`));
      const categoryOkay = selectedCategory === 'all' || snapshot.products.find((product) => product.id === move.product_id)?.category_id === selectedCategory;
      return warehouseOkay && categoryOkay;
    });

    const productCategoryMap = new Map(snapshot.products.map((product) => [product.id, product.category_id]));
    const receiptOpenAfterRefresh = snapshot.receipts.filter((item) => {
      if (!isOpenStatus(item.status)) return false;
      if (selectedWarehouse !== 'all' && item.warehouse_id !== selectedWarehouse) return false;
      if (selectedCategory !== 'all') {
        return item.lines.some((line) => productCategoryMap.get(line.product_id) === selectedCategory);
      }
      return true;
    }).length;
    const deliveryOpenAfterRefresh = snapshot.deliveries.filter((item) => {
      if (!isOpenStatus(item.status)) return false;
      if (selectedWarehouse !== 'all' && item.warehouse_id !== selectedWarehouse) return false;
      if (selectedCategory !== 'all') {
        return item.lines.some((line) => productCategoryMap.get(line.product_id) === selectedCategory);
      }
      return true;
    }).length;
    const transferOpenAfterRefresh = snapshot.transfers.filter((item) => {
      if (!isOpenStatus(item.status)) return false;
      if (selectedWarehouse !== 'all') {
        const warehouseMatch =
          selectedWarehouseLocationIds.has(item.from_location_id)
          || selectedWarehouseLocationIds.has(item.to_location_id)
          || Boolean(selectedWarehouseCode && (
            item.from_location_name?.startsWith(`${selectedWarehouseCode}/`)
            || item.to_location_name?.startsWith(`${selectedWarehouseCode}/`)
          ));
        if (!warehouseMatch) return false;
      }
      if (selectedCategory !== 'all') {
        return item.lines.some((line) => productCategoryMap.get(line.product_id) === selectedCategory);
      }
      return true;
    }).length;
    const adjustmentOpenAfterRefresh = snapshot.adjustments.filter((item) => {
      if (!isOpenStatus(item.status)) return false;
      if (selectedWarehouse !== 'all') {
        const warehouseMatch =
          selectedWarehouseLocationIds.has(item.location_id)
          || Boolean(selectedWarehouseCode && item.location_name?.startsWith(`${selectedWarehouseCode}/`));
        if (!warehouseMatch) return false;
      }
      if (selectedCategory !== 'all') {
        return item.lines.some((line) => productCategoryMap.get(line.product_id) === selectedCategory);
      }
      return true;
    }).length;
    const openDocsAfterRefresh =
      receiptOpenAfterRefresh
      + deliveryOpenAfterRefresh
      + transferOpenAfterRefresh
      + adjustmentOpenAfterRefresh;

    setInsightData(
      'Snapshot Refreshed',
      `${scopeLabel} | ${formatDateTime(snapshot.refreshedAt)}`,
      [
        { label: 'Active SKUs', value: formatQty(scopedProductsAfterRefresh.length) },
        { label: 'Low Stock', value: formatQty(lowStockAfterRefresh.length), tone: lowStockAfterRefresh.length ? 'warning' : 'success' },
        { label: 'Open Docs', value: formatQty(openDocsAfterRefresh) },
        { label: 'Recent Moves', value: formatQty(scopedMovesAfterRefresh.length), tone: 'info' },
      ],
      [
        {
          title: 'Recent Movement',
          caption: 'Latest posted lines after refresh',
          items: scopedMovesAfterRefresh.slice(0, 5).map((move) => ({
            title: move.product_name ?? move.product_id,
            meta: `${operationTypeLabel(move.operation_type)} | ${move.ref} | ${formatDateTime(move.created_at)}`,
            value: formatQty(move.qty),
            auxiliary: `${move.from_location_name ?? move.from_location_id} -> ${move.to_location_name ?? move.to_location_id}`,
            tone: toneForOperation(move.operation_type),
          })),
        },
        {
          title: 'Immediate Risk',
          caption: 'Fastest signal after refresh',
          items: lowStockAfterRefresh.slice(0, 5).map((product) => ({
            title: `${product.name} (${product.sku})`,
            meta: `${product.category_name ?? 'Uncategorized'} | Reorder ${formatQty(product.reorder_min)}`,
            value: formatQty(product.total_stock ?? 0),
            auxiliary: (product.total_stock ?? 0) > 0 ? 'Low stock' : 'Out of stock',
            tone: (product.total_stock ?? 0) > 0 ? 'warning' : 'danger',
          })),
        },
      ],
    );
  }

  const totalProductsValue = scopedProducts.length;
  const lowStockValue = filteredLowStock.length;
  const pendingReceiptsValue = openReceipts.length;
  const pendingDeliveriesValue = openDeliveries.length;
  const pendingTransfersValue = openTransfers.length;

  return (
    <div className="page-container">
      <PageHeader
        title="Inventory Command Center"
        subtitle="Live snapshot of products, operations, and warehouse risk alerts."
        actions={(
          <button className="btn btn-secondary" onClick={handleRefreshClick} type="button">
            <RefreshCcw size={16} />
            Refresh
          </button>
        )}
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {typeFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`filter-pill ${selectedType === filter.value ? 'active' : ''}`}
            onClick={() => openTypeInsight(filter.value)}
          >
            {filter.label}
          </button>
        ))}
        <select
          className="form-input"
          value={selectedWarehouse}
          onChange={(event) => setSelectedWarehouse(event.target.value)}
          style={{ maxWidth: 220 }}
        >
          <option value="all">All Warehouses</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
        <select
          className="form-input"
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
          style={{ maxWidth: 240 }}
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <MetricCard
          icon={<Boxes size={20} />}
          label="Total Products"
          value={totalProductsValue}
          hint="Active catalog SKUs"
          accent="rgba(99, 102, 241, 0.22)"
          onClick={() => {
            openInsightShell('Catalog Footprint', scopeLabel);
            buildCatalogInsight();
          }}
        />
        <MetricCard
          icon={<AlertTriangle size={20} />}
          label="Low Stock"
          value={lowStockValue}
          hint="Below reorder threshold"
          accent="rgba(239, 68, 68, 0.22)"
          onClick={() => {
            openInsightShell('Low Stock Risk', scopeLabel);
            buildLowStockInsight();
          }}
        />
        <MetricCard
          icon={<ArrowDownToLine size={20} />}
          label="Pending Receipts"
          value={pendingReceiptsValue}
          hint="Incoming shipments"
          accent="rgba(34, 197, 94, 0.22)"
          onClick={() => {
            openInsightShell('Receipt Queue', scopeLabel);
            buildReceiptInsight();
          }}
        />
        <MetricCard
          icon={<ArrowUpFromLine size={20} />}
          label="Pending Deliveries"
          value={pendingDeliveriesValue}
          hint="Outbound dispatches"
          accent="rgba(6, 182, 212, 0.22)"
          onClick={() => {
            openInsightShell('Delivery Queue', scopeLabel);
            buildDeliveryInsight();
          }}
        />
        <MetricCard
          icon={<ArrowLeftRight size={20} />}
          label="Pending Transfers"
          value={pendingTransfersValue}
          hint="Internal moves"
          accent="rgba(245, 158, 11, 0.22)"
          onClick={() => {
            openInsightShell('Internal Transfer Queue', scopeLabel);
            buildTransferInsight();
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.2fr',
          gap: 14,
          marginBottom: 16,
          alignItems: 'stretch',
        }}
      >
        <section className="section-card" style={{ minHeight: 320 }}>
          <div className="section-card-header">
            <h3>30 Day Stock Movement</h3>
          </div>
          <div style={{ padding: '8px 14px 0', color: 'var(--txt-muted)', fontSize: '0.78rem' }}>
            {latestTrendPoint ? (
              <span>
                Latest {latestTrendPoint.date} - Received {formatQty(latestTrendPoint.received)}, Delivered {formatQty(latestTrendPoint.delivered)}, Internal {formatQty(latestTrendPoint.transferred)}, Adjusted {formatQty(latestTrendPoint.adjusted)}
              </span>
            ) : (
              <span>No trend data available</span>
            )}
          </div>
          <div style={{ height: 282, padding: '0 10px 8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="receivedArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={seriesColor.received} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={seriesColor.received} stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="deliveredArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={seriesColor.delivered} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={seriesColor.delivered} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                <XAxis dataKey="date" tickFormatter={shortDate} stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(9, 15, 33, 0.96)',
                    border: '1px solid rgba(148,163,184,0.25)',
                    borderRadius: 10,
                    color: '#e2e8f0',
                    fontSize: 12,
                  }}
                  formatter={tooltipValueFormatter}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="received" stroke={seriesColor.received} fill="url(#receivedArea)" strokeWidth={2} />
                <Area type="monotone" dataKey="delivered" stroke={seriesColor.delivered} fill="url(#deliveredArea)" strokeWidth={2} />
                <Area type="monotone" dataKey="transferred" stroke={seriesColor.transferred} fillOpacity={0} strokeWidth={2} />
                <Area type="monotone" dataKey="adjusted" stroke={seriesColor.adjusted} fillOpacity={0} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="section-card" style={{ minHeight: 320 }}>
          <div className="section-card-header">
            <h3>Category Distribution</h3>
          </div>
          <div style={{ padding: '8px 14px 0', color: 'var(--txt-muted)', fontSize: '0.78rem' }}>
            Top categories by current stock volume
          </div>
          <div style={{ height: 282, padding: '0 10px 8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBars} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} width={110} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(9, 15, 33, 0.96)',
                    border: '1px solid rgba(148,163,184,0.25)',
                    borderRadius: 10,
                    color: '#e2e8f0',
                    fontSize: 12,
                  }}
                  formatter={tooltipValueFormatter}
                />
                <Bar dataKey="total_stock" fill="#6366f1" radius={[0, 8, 8, 0]} name="Total Stock" />
                <Bar dataKey="product_count" fill="#06b6d4" radius={[0, 8, 8, 0]} name="Product Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="section-card" style={{ marginBottom: 16 }}>
        <div className="section-card-header">
          <h3>Operations Comparison</h3>
          {lastUpdated ? (
            <span style={{ color: 'var(--txt-muted)', fontSize: '0.78rem' }}>
              Updated {formatDateTime(lastUpdated)}
            </span>
          ) : null}
        </div>
        <div style={{ padding: '8px 14px 0', color: 'var(--txt-muted)', fontSize: '0.78rem' }}>
          Last 12 timeline points grouped by operation type
        </div>
        <div style={{ height: 262, padding: '0 10px 8px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend.slice(-12)} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
              <XAxis dataKey="date" tickFormatter={shortDate} stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(9, 15, 33, 0.96)',
                  border: '1px solid rgba(148,163,184,0.25)',
                  borderRadius: 10,
                  color: '#e2e8f0',
                  fontSize: 12,
                }}
                formatter={tooltipValueFormatter}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="received" fill={seriesColor.received} radius={[4, 4, 0, 0]} />
              <Bar dataKey="delivered" fill={seriesColor.delivered} radius={[4, 4, 0, 0]} />
              <Bar dataKey="transferred" fill={seriesColor.transferred} radius={[4, 4, 0, 0]} />
              <Bar dataKey="adjusted" fill={seriesColor.adjusted} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 14 }}>
        <section className="section-card">
          <div className="section-card-header">
            <h3>Recent Activity Feed</h3>
            <span style={{ color: 'var(--txt-muted)', fontSize: '0.78rem' }}>
              {selectedType === 'all' ? 'All operations' : operationTypeLabel(selectedType)}
            </span>
          </div>
          <div style={{ padding: 12, overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--txt-muted)' }}>
                      Loading activity feed...
                    </td>
                  </tr>
                ) : filteredRecentMoves.length ? (
                  filteredRecentMoves.slice(0, 8).map((move) => (
                    <tr key={move.id}>
                      <td>
                        <span className={`op-${move.operation_type}`}>{operationTypeLabel(move.operation_type)}</span>
                      </td>
                      <td>{move.ref}</td>
                      <td>{move.product_name ?? move.product_id}</td>
                      <td>{formatQty(move.qty)}</td>
                      <td>{formatDateTime(move.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--txt-muted)' }}>
                      No activity for selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section-card">
          <div className="section-card-header">
            <h3>Low Stock Alerts</h3>
          </div>
          <div style={{ padding: 14, display: 'grid', gap: 10 }}>
            {filteredLowStock.length ? (
              filteredLowStock.slice(0, 8).map((product) => {
                const stock = product.total_stock ?? 0;
                const critical = stock <= 0;
                return (
                  <div
                    key={product.id}
                    className="glass-card-strong"
                    style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{product.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--txt-muted)' }}>
                        Reorder Min: {formatQty(product.reorder_min)}
                      </div>
                    </div>
                    <span className={`badge ${critical ? 'badge-critical' : 'badge-low'}`}>
                      {critical ? 'OUT' : 'LOW'} - {formatQty(stock)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="empty-state" style={{ padding: '40px 16px' }}>
                <Clock3 size={20} />
                <p>No low stock items under current filters.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <InsightModal
        open={Boolean(insight)}
        title={insight?.title ?? ''}
        subtitle={insight?.subtitle}
        loading={insight?.loading ?? false}
        metrics={insight?.metrics ?? []}
        sections={insight?.sections ?? []}
        onClose={closeInsight}
      />
    </div>
  );
}
