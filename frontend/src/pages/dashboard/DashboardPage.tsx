import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Boxes,
  Clock3,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import client from '../../api/client';
import MetricCard from '../../components/ui/MetricCard';
import PageHeader from '../../components/ui/PageHeader';
import type {
  DashboardCategorySummary,
  DashboardStats,
  DashboardTrendPoint,
  OperationType,
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

const chartPalette = ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<DashboardTrendPoint[]>([]);
  const [categories, setCategories] = useState<DashboardCategorySummary[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedType, setSelectedType] = useState<OperationType | 'all'>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [statsRes, trendRes, categoryRes, warehouseRes] = await Promise.all([
        client.get<DashboardStats>('/dashboard/stats'),
        client.get<DashboardTrendPoint[]>('/dashboard/trend'),
        client.get<DashboardCategorySummary[]>('/dashboard/categories'),
        client.get<Warehouse[]>('/warehouses'),
      ]);
      setStats(statsRes.data);
      setTrend(trendRes.data);
      setCategories(categoryRes.data);
      setWarehouses(warehouseRes.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load dashboard'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredRecentMoves = useMemo(() => {
    if (!stats) return [];
    return stats.recentMoves.filter((move) => {
      if (selectedType !== 'all' && move.operation_type !== selectedType) return false;
      return true;
    });
  }, [selectedType, stats]);

  const filteredLowStock = useMemo(() => {
    let list = stats?.lowStockList ?? [];
    if (selectedCategory !== 'all') {
      list = list.filter((item) => item.category_id === selectedCategory);
    }
    return list;
  }, [selectedCategory, stats?.lowStockList]);

  return (
    <div className="page-container">
      <PageHeader
        title="Inventory Command Center"
        subtitle="Live snapshot of products, operations, and warehouse risk alerts."
        actions={
          <button className="btn btn-secondary" onClick={loadDashboard} type="button">
            Refresh
          </button>
        }
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {typeFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`filter-pill ${selectedType === filter.value ? 'active' : ''}`}
            onClick={() => setSelectedType(filter.value)}
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
          value={stats?.totalProducts ?? 0}
          hint="Active catalog SKUs"
          accent="rgba(99, 102, 241, 0.22)"
        />
        <MetricCard
          icon={<AlertTriangle size={20} />}
          label="Low Stock"
          value={stats?.lowStockItems ?? 0}
          hint="Below reorder threshold"
          accent="rgba(239, 68, 68, 0.22)"
        />
        <MetricCard
          icon={<ArrowDownToLine size={20} />}
          label="Pending Receipts"
          value={stats?.pendingReceipts ?? 0}
          hint="Incoming shipments"
          accent="rgba(34, 197, 94, 0.22)"
        />
        <MetricCard
          icon={<ArrowUpFromLine size={20} />}
          label="Pending Deliveries"
          value={stats?.pendingDeliveries ?? 0}
          hint="Outbound dispatches"
          accent="rgba(6, 182, 212, 0.22)"
        />
        <MetricCard
          icon={<ArrowLeftRight size={20} />}
          label="Pending Transfers"
          value={stats?.pendingTransfers ?? 0}
          hint="Internal moves"
          accent="rgba(245, 158, 11, 0.22)"
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
          <div style={{ height: 280, padding: '10px 16px 6px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="receivedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="deliveryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="received"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#receivedGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="delivered"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#deliveryGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="section-card" style={{ minHeight: 320 }}>
          <div className="section-card-header">
            <h3>Category Distribution</h3>
          </div>
          <div style={{ height: 280, padding: '10px 8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="total_stock"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={52}
                  paddingAngle={2}
                >
                  {categories.map((entry, index) => (
                    <Cell key={entry.id} fill={chartPalette[index % chartPalette.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="section-card" style={{ marginBottom: 16 }}>
        <div className="section-card-header">
          <h3>Operations Comparison</h3>
        </div>
        <div style={{ height: 240, padding: '10px 16px 6px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend.slice(-12)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                }}
              />
              <Bar dataKey="received" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="delivered" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="transferred" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 14 }}>
        <section className="section-card">
          <div className="section-card-header">
            <h3>Recent Activity Feed</h3>
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
                  filteredRecentMoves.map((move) => (
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
              filteredLowStock.map((product) => {
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
    </div>
  );
}
