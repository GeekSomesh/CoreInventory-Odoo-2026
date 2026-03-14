import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import type { Product, Transfer, Warehouse } from '../../types/api';
import { formatDate, formatQty } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';
import { operationStatusOptions } from './operationUtils';

interface CreateLine {
  product_id: string;
  qty: number;
}

interface TransferFormState {
  from_location_id: string;
  to_location_id: string;
  scheduled_date: string;
  notes: string;
  lines: CreateLine[];
}

const emptyForm: TransferFormState = {
  from_location_id: '',
  to_location_id: '',
  scheduled_date: '',
  notes: '',
  lines: [{ product_id: '', qty: 1 }],
};

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TransferFormState>(emptyForm);

  const locationOptions = useMemo(() => warehouses.flatMap((warehouse) => warehouse.locations ?? []), [warehouses]);

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

  async function loadTransfers() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await client.get<Transfer[]>('/transfers', { params });
      setTransfers(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load transfers'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function updateLine(index: number, patch: Partial<CreateLine>) {
    setForm((value) => ({
      ...value,
      lines: value.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    }));
  }

  function addLine() {
    setForm((value) => ({ ...value, lines: [...value.lines, { product_id: '', qty: 1 }] }));
  }

  function removeLine(index: number) {
    setForm((value) => ({ ...value, lines: value.lines.filter((_, lineIndex) => lineIndex !== index) }));
  }

  function openCreate() {
    setForm(emptyForm);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setForm(emptyForm);
  }

  async function createTransfer(event: React.FormEvent) {
    event.preventDefault();
    const validLines = form.lines.filter((line) => line.product_id && line.qty > 0);
    if (!validLines.length) {
      toast.error('Add at least one valid line');
      return;
    }
    if (!form.from_location_id || !form.to_location_id || form.from_location_id === form.to_location_id) {
      toast.error('Choose different source and destination locations');
      return;
    }
    setSaving(true);
    try {
      await client.post('/transfers', {
        from_location_id: form.from_location_id,
        to_location_id: form.to_location_id,
        scheduled_date: form.scheduled_date || null,
        notes: form.notes,
        lines: validLines,
      });
      toast.success('Transfer created');
      closeDrawer();
      await loadTransfers();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create transfer'));
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(transfer: Transfer, status: string) {
    try {
      await client.put(`/transfers/${transfer.id}`, {
        from_location_id: transfer.from_location_id,
        to_location_id: transfer.to_location_id,
        scheduled_date: transfer.scheduled_date,
        notes: transfer.notes ?? '',
        status,
        lines: transfer.lines,
      });
      toast.success(`Transfer moved to ${status}`);
      await loadTransfers();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update status'));
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Internal Transfers"
        subtitle="Move stock between locations without changing global quantity."
        actions={(
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            New Transfer
          </button>
        )}
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
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
          <h3>Transfer Documents</h3>
          <span style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
            {transfers.length} records
          </span>
        </div>
        <div style={{ overflowX: 'auto', padding: 8 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>From</th>
                <th>To</th>
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
                    Loading transfers...
                  </td>
                </tr>
              ) : transfers.length ? (
                transfers.map((transfer) => (
                  <tr key={transfer.id}>
                    <td>{transfer.ref}</td>
                    <td>{transfer.from_location_name ?? transfer.from_location_id}</td>
                    <td>{transfer.to_location_name ?? transfer.to_location_id}</td>
                    <td>{formatDate(transfer.scheduled_date)}</td>
                    <td>{formatQty(transfer.lines.length)}</td>
                    <td><StatusBadge status={transfer.status} /></td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        {transfer.status !== 'done' ? (
                          <select
                            className="form-input"
                            style={{ maxWidth: 120, padding: '4px 8px', fontSize: '0.75rem' }}
                            value={transfer.status}
                            onChange={(event) => setStatus(transfer, event.target.value)}
                          >
                            {operationStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        <Link className="btn btn-secondary btn-sm" to={`/transfers/${transfer.id}`}>
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--txt-muted)' }}>
                    No transfers found.
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
                  <h3>Create Transfer</h3>
                  <p style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
                    Select source, destination and transfer lines.
                  </p>
                </div>
                <button type="button" className="btn btn-ghost btn-icon" onClick={closeDrawer}>
                  <X size={16} />
                </button>
              </div>
              <form className="drawer-body" onSubmit={createTransfer} style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">From Location</label>
                    <select
                      className="form-input"
                      value={form.from_location_id}
                      onChange={(event) => setForm((value) => ({ ...value, from_location_id: event.target.value }))}
                      required
                    >
                      <option value="">Select source</option>
                      {locationOptions.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.full_path}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Location</label>
                    <select
                      className="form-input"
                      value={form.to_location_id}
                      onChange={(event) => setForm((value) => ({ ...value, to_location_id: event.target.value }))}
                      required
                    >
                      <option value="">Select destination</option>
                      {locationOptions.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.full_path}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Scheduled Date</label>
                    <input
                      className="form-input"
                      type="date"
                      value={form.scheduled_date}
                      onChange={(event) => setForm((value) => ({ ...value, scheduled_date: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <input
                      className="form-input"
                      value={form.notes}
                      onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="divider" />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Lines</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}>
                    Add Line
                  </button>
                </div>
                {form.lines.map((line, index) => (
                  <div key={index} className="glass-card-strong" style={{ padding: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.7fr auto', gap: 8 }}>
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
                        value={line.qty}
                        onChange={(event) => updateLine(index, { qty: Number(event.target.value) })}
                      />
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
                    {saving ? 'Saving...' : 'Create Transfer'}
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
