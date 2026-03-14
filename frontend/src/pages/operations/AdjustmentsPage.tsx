import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import type { Adjustment, Product, Warehouse } from '../../types/api';
import { formatDate, formatQty } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';
import { operationStatusOptions } from './operationUtils';

interface CreateLine {
  product_id: string;
  change_qty: number;
}

interface AdjustmentFormState {
  location_id: string;
  notes: string;
  lines: CreateLine[];
}

const emptyForm: AdjustmentFormState = {
  location_id: '',
  notes: '',
  lines: [{ product_id: '', change_qty: 0 }],
};

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AdjustmentFormState>(emptyForm);

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

  async function loadAdjustments() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await client.get<Adjustment[]>('/adjustments', { params });
      setAdjustments(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load adjustments'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadAdjustments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function updateLine(index: number, patch: Partial<CreateLine>) {
    setForm((value) => ({
      ...value,
      lines: value.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    }));
  }

  function addLine() {
    setForm((value) => ({ ...value, lines: [...value.lines, { product_id: '', change_qty: 0 }] }));
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

  async function createAdjustment(event: React.FormEvent) {
    event.preventDefault();
    const validLines = form.lines.filter((line) => line.product_id);
    if (!validLines.length) {
      toast.error('Add at least one line');
      return;
    }
    if (!form.location_id) {
      toast.error('Select adjustment location');
      return;
    }
    setSaving(true);
    try {
      await client.post('/adjustments', {
        location_id: form.location_id,
        notes: form.notes,
        lines: validLines,
      });
      toast.success('Adjustment created');
      closeDrawer();
      await loadAdjustments();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create adjustment'));
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(adjustment: Adjustment, status: string) {
    try {
      await client.put(`/adjustments/${adjustment.id}`, {
        notes: adjustment.notes ?? '',
        status,
        lines: adjustment.lines.map((line) => ({
          product_id: line.product_id,
          change_qty: line.change_qty ?? line.delta,
        })),
      });
      toast.success(`Adjustment moved to ${status}`);
      await loadAdjustments();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update status'));
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Inventory Adjustments"
        subtitle="Apply stock corrections by quantity delta (+/-) and log every change."
        actions={(
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            New Adjustment
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
          <h3>Adjustment Documents</h3>
          <span style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
            {adjustments.length} records
          </span>
        </div>
        <div style={{ overflowX: 'auto', padding: 8 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Location</th>
                <th>Created</th>
                <th>Lines</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--txt-muted)' }}>
                    Loading adjustments...
                  </td>
                </tr>
              ) : adjustments.length ? (
                adjustments.map((adjustment) => (
                  <tr key={adjustment.id}>
                    <td>{adjustment.ref}</td>
                    <td>{adjustment.location_name ?? adjustment.location_id}</td>
                    <td>{formatDate(adjustment.created_at)}</td>
                    <td>{formatQty(adjustment.lines.length)}</td>
                    <td><StatusBadge status={adjustment.status} /></td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        {adjustment.status !== 'done' ? (
                          <select
                            className="form-input"
                            style={{ maxWidth: 120, padding: '4px 8px', fontSize: '0.75rem' }}
                            value={adjustment.status}
                            onChange={(event) => setStatus(adjustment, event.target.value)}
                          >
                            {operationStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        <Link className="btn btn-secondary btn-sm" to={`/adjustments/${adjustment.id}`}>
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--txt-muted)' }}>
                    No adjustments found.
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
                  <h3>Create Adjustment</h3>
                  <p style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
                    Enter adjustment quantity: negative for damaged/loss, positive for found stock.
                  </p>
                </div>
                <button type="button" className="btn btn-ghost btn-icon" onClick={closeDrawer}>
                  <X size={16} />
                </button>
              </div>
              <form className="drawer-body" onSubmit={createAdjustment} style={{ display: 'grid', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <select
                    className="form-input"
                    value={form.location_id}
                    onChange={(event) => setForm((value) => ({ ...value, location_id: event.target.value }))}
                    required
                  >
                    <option value="">Select location</option>
                    {locationOptions.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.full_path}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input
                    className="form-input"
                    value={form.notes}
                    onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))}
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
                        value={line.change_qty}
                        onChange={(event) => updateLine(index, { change_qty: Number(event.target.value) })}
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
                    {saving ? 'Saving...' : 'Create Adjustment'}
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
