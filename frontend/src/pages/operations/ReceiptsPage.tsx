import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import type { Product, Receipt, Warehouse } from '../../types/api';
import { formatDate, formatQty } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';
import { operationStatusOptions } from './operationUtils';

interface CreateLine {
  product_id: string;
  expected_qty: number;
  location_id: string;
}

interface ReceiptFormState {
  supplier: string;
  warehouse_id: string;
  scheduled_date: string;
  notes: string;
  lines: CreateLine[];
}

const emptyForm: ReceiptFormState = {
  supplier: '',
  warehouse_id: '',
  scheduled_date: '',
  notes: '',
  lines: [{ product_id: '', expected_qty: 1, location_id: '' }],
};

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ReceiptFormState>(emptyForm);

  const locationOptions = useMemo(() => {
    return warehouses.flatMap((warehouse) => warehouse.locations ?? []);
  }, [warehouses]);

  async function loadLookups() {
    try {
      const [productRes, warehouseRes] = await Promise.all([
        client.get<Product[]>('/products'),
        client.get<Warehouse[]>('/warehouses'),
      ]);
      setProducts(productRes.data);
      setWarehouses(warehouseRes.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load lookups'));
    }
  }

  async function loadReceipts() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const response = await client.get<Receipt[]>('/receipts', { params });
      setReceipts(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load receipts'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function updateLine(index: number, patch: Partial<CreateLine>) {
    setForm((value) => ({
      ...value,
      lines: value.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    }));
  }

  function addLine() {
    setForm((value) => ({
      ...value,
      lines: [...value.lines, { product_id: '', expected_qty: 1, location_id: '' }],
    }));
  }

  function removeLine(index: number) {
    setForm((value) => ({
      ...value,
      lines: value.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  }

  function openCreate() {
    setForm(emptyForm);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setForm(emptyForm);
  }

  async function createReceipt(event: React.FormEvent) {
    event.preventDefault();
    const validLines = form.lines.filter((line) => line.product_id && line.expected_qty > 0);
    if (!validLines.length) {
      toast.error('Add at least one valid line');
      return;
    }
    setSaving(true);
    try {
      await client.post('/receipts', {
        supplier: form.supplier,
        warehouse_id: form.warehouse_id,
        scheduled_date: form.scheduled_date || null,
        notes: form.notes,
        lines: validLines,
      });
      toast.success('Receipt created');
      closeDrawer();
      await loadReceipts();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create receipt'));
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(receipt: Receipt, status: string) {
    try {
      await client.put(`/receipts/${receipt.id}`, {
        supplier: receipt.supplier,
        scheduled_date: receipt.scheduled_date,
        notes: receipt.notes ?? '',
        lines: receipt.lines,
        status,
      });
      toast.success(`Receipt moved to ${status}`);
      await loadReceipts();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update status'));
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Receipts"
        subtitle="Create incoming stock documents and validate them to increase inventory."
        actions={(
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            New Receipt
          </button>
        )}
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div className="search-bar" style={{ minWidth: 280 }}>
          <Search size={16} color="var(--txt-muted)" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by ref or supplier"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                loadReceipts();
              }
            }}
          />
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={loadReceipts}>
          Search
        </button>
        <button
          type="button"
          className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All
        </button>
        {operationStatusOptions.map((status) => (
          <button
            key={status}
            type="button"
            className={`filter-pill ${statusFilter === status ? 'active' : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      <section className="section-card">
        <div className="section-card-header">
          <h3>Incoming Documents</h3>
          <span style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
            {receipts.length} records
          </span>
        </div>
        <div style={{ overflowX: 'auto', padding: 8 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Supplier</th>
                <th>Warehouse</th>
                <th>Scheduled</th>
                <th>Lines</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--txt-muted)' }}>
                    Loading receipts...
                  </td>
                </tr>
              ) : receipts.length ? (
                receipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td>{receipt.ref}</td>
                    <td>{receipt.supplier}</td>
                    <td>{receipt.warehouse_name ?? '-'}</td>
                    <td>{formatDate(receipt.scheduled_date)}</td>
                    <td>{formatQty(receipt.lines.length)}</td>
                    <td><StatusBadge status={receipt.status} /></td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        {receipt.status !== 'done' ? (
                          <select
                            className="form-input"
                            style={{ maxWidth: 120, padding: '4px 8px', fontSize: '0.75rem' }}
                            value={receipt.status}
                            onChange={(event) => setStatus(receipt, event.target.value)}
                          >
                            {operationStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        <Link className="btn btn-secondary btn-sm" to={`/receipts/${receipt.id}`}>
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--txt-muted)' }}>
                    No receipts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AnimatePresence>
        {drawerOpen ? (
          <>
            <motion.div
              className="drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
            />
            <motion.aside
              className="drawer"
              initial={{ x: 560 }}
              animate={{ x: 0 }}
              exit={{ x: 560 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            >
              <div className="drawer-header">
                <div>
                  <h3>Create Receipt</h3>
                  <p style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
                    Add supplier, warehouse and incoming lines.
                  </p>
                </div>
                <button type="button" className="btn btn-ghost btn-icon" onClick={closeDrawer}>
                  <X size={16} />
                </button>
              </div>
              <form className="drawer-body" onSubmit={createReceipt} style={{ display: 'grid', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Supplier</label>
                  <input
                    className="form-input"
                    value={form.supplier}
                    onChange={(event) => setForm((value) => ({ ...value, supplier: event.target.value }))}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Warehouse</label>
                    <select
                      className="form-input"
                      value={form.warehouse_id}
                      onChange={(event) => setForm((value) => ({ ...value, warehouse_id: event.target.value }))}
                      required
                    >
                      <option value="">Select warehouse</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Scheduled Date</label>
                    <input
                      className="form-input"
                      type="date"
                      value={form.scheduled_date}
                      onChange={(event) => setForm((value) => ({ ...value, scheduled_date: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-input"
                    value={form.notes}
                    onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="divider" />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Lines</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}>
                    Add Line
                  </button>
                </div>
                {form.lines.map((line, index) => (
                  <div key={index} className="glass-card-strong" style={{ padding: 10, display: 'grid', gap: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.7fr 1fr auto', gap: 8 }}>
                      <select
                        className="form-input"
                        value={line.product_id}
                        onChange={(event) => updateLine(index, { product_id: event.target.value })}
                      >
                        <option value="">Product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </select>
                      <input
                        className="form-input"
                        type="number"
                        min={1}
                        value={line.expected_qty}
                        onChange={(event) => updateLine(index, { expected_qty: Number(event.target.value) })}
                      />
                      <select
                        className="form-input"
                        value={line.location_id}
                        onChange={(event) => updateLine(index, { location_id: event.target.value })}
                      >
                        <option value="">Destination</option>
                        {locationOptions.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.full_path}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeLine(index)}>
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="drawer-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeDrawer}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Create Receipt'}
                  </button>
                </div>
              </form>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
