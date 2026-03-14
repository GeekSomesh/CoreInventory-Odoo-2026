import { useEffect, useMemo, useState } from 'react';
import { Download, Filter, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import type { MoveHistoryItem, OperationType, PaginatedResponse, Product } from '../../types/api';
import { formatDateTime, formatQty, operationTypeLabel } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';

const operationTypeOptions: Array<{ value: OperationType | 'all'; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'receipt', label: 'Receipts' },
  { value: 'delivery', label: 'Deliveries' },
  { value: 'transfer', label: 'Transfers' },
  { value: 'adjustment', label: 'Adjustments' },
];

export default function MoveHistoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<MoveHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);

  const [productId, setProductId] = useState('all');
  const [operationType, setOperationType] = useState<OperationType | 'all'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function loadProducts() {
    try {
      const response = await client.get<Product[]>('/products');
      setProducts(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load product filter'));
    }
  }

  async function loadHistory(nextPage = page, nextLimit = limit) {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: nextPage, limit: nextLimit };
      if (productId !== 'all') params.product_id = productId;
      if (operationType !== 'all') params.operation_type = operationType;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      const response = await client.get<PaginatedResponse<MoveHistoryItem>>('/history', { params });
      setRows(response.data.data);
      setTotal(response.data.total);
      setPage(response.data.page);
      setLimit(response.data.limit);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load move history'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadHistory(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, operationType, fromDate, toDate]);

  async function exportCsv() {
    try {
      const response = await client.get('/history/export', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'stock-ledger.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to export CSV'));
    }
  }

  const summary = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        accumulator.totalQty += row.qty;
        accumulator.count += 1;
        return accumulator;
      },
      { totalQty: 0, count: 0 },
    );
  }, [rows]);

  return (
    <div className="page-container">
      <PageHeader
        title="Move History"
        subtitle="Ledger of every inventory movement across receipts, deliveries, transfers and adjustments."
        actions={(
          <>
            <button className="btn btn-secondary" type="button" onClick={() => loadHistory()}>
              <RefreshCcw size={16} />
              Refresh
            </button>
            <button className="btn btn-primary" type="button" onClick={exportCsv}>
              <Download size={16} />
              Export CSV
            </button>
          </>
        )}
      />

      <section className="section-card" style={{ marginBottom: 14 }}>
        <div className="section-card-header">
          <h3>Filters</h3>
          <Filter size={16} color="var(--txt-muted)" />
        </div>
        <div style={{ padding: 14, display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Product</label>
              <select className="form-input" value={productId} onChange={(event) => setProductId(event.target.value)}>
                <option value="all">All products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Operation Type</label>
              <select
                className="form-input"
                value={operationType}
                onChange={(event) => setOperationType(event.target.value as OperationType | 'all')}
              >
                {operationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input className="form-input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input className="form-input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </div>
          </div>
          <div style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
            Showing {summary.count} lines on current page. Sum quantity: {formatQty(summary.totalQty)}.
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-card-header">
          <h3>Ledger</h3>
          <span style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
            Total rows: {formatQty(total)}
          </span>
        </div>
        <div style={{ overflowX: 'auto', padding: 8 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Product</th>
                <th>From</th>
                <th>To</th>
                <th>Qty</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--txt-muted)' }}>
                    Loading ledger...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.created_at)}</td>
                    <td><span className={`op-${row.operation_type}`}>{operationTypeLabel(row.operation_type)}</span></td>
                    <td>{row.ref}</td>
                    <td>{row.product_name ?? row.product_id}</td>
                    <td>{row.from_location_name ?? row.from_location_id}</td>
                    <td>{row.to_location_name ?? row.to_location_id}</td>
                    <td>{formatQty(row.qty)}</td>
                    <td>{row.user_name ?? row.user_id}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--txt-muted)' }}>
                    No ledger data for selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px 14px' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--txt-muted)' }}>Rows</span>
            <select
              className="form-input"
              value={limit}
              style={{ maxWidth: 90 }}
              onChange={(event) => {
                const nextLimit = Number(event.target.value);
                setLimit(nextLimit);
                loadHistory(1, nextLimit);
              }}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              disabled={page <= 1}
              onClick={() => loadHistory(page - 1, limit)}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--txt-secondary)' }}>
              Page {page} / {totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              disabled={page >= totalPages}
              onClick={() => loadHistory(page + 1, limit)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
