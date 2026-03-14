import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import type { Adjustment, Product, Warehouse } from '../../types/api';
import { formatDateTime, formatQty } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';
import { operationProgressStep, operationStatusOptions } from './operationUtils';

interface EditableLine {
  id?: string;
  product_id: string;
  change_qty: number;
  system_qty: number;
}

export default function AdjustmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [adjustment, setAdjustment] = useState<Adjustment | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [status, setStatus] = useState<Adjustment['status']>('draft');
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);

  const isDone = adjustment?.status === 'done';
  const step = operationProgressStep(status);
  const locationOptions = useMemo(() => warehouses.flatMap((warehouse) => warehouse.locations ?? []), [warehouses]);

  async function loadData() {
    if (!id) return;
    try {
      const [adjustmentRes, productsRes, warehousesRes] = await Promise.all([
        client.get<Adjustment>(`/adjustments/${id}`),
        client.get<Product[]>('/products'),
        client.get<Warehouse[]>('/warehouses'),
      ]);
      const currentAdjustment = adjustmentRes.data;
      setAdjustment(currentAdjustment);
      setLocationId(currentAdjustment.location_id);
      setNotes(currentAdjustment.notes ?? '');
      setStatus(currentAdjustment.status);
      setLines(
        currentAdjustment.lines.map((line) => ({
          id: line.id,
          product_id: line.product_id,
          change_qty: line.change_qty ?? line.delta,
          system_qty: line.system_qty,
        })),
      );
      setProducts(productsRes.data);
      setWarehouses(warehousesRes.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load adjustment'));
      navigate('/adjustments');
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateLine(index: number, patch: Partial<EditableLine>) {
    setLines((value) => value.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((value) => [...value, { product_id: '', change_qty: 0, system_qty: 0 }]);
  }

  function removeLine(index: number) {
    setLines((value) => value.filter((_, lineIndex) => lineIndex !== index));
  }

  async function saveAdjustment() {
    if (!id) return;
    const validLines = lines.filter((line) => line.product_id);
    if (!validLines.length) {
      toast.error('Add at least one valid line');
      return;
    }
    setSaving(true);
    try {
      await client.put(`/adjustments/${id}`, {
        location_id: locationId,
        notes,
        status,
        lines: validLines.map((line) => ({
          product_id: line.product_id,
          change_qty: line.change_qty,
        })),
      });
      toast.success('Adjustment updated');
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save adjustment'));
    } finally {
      setSaving(false);
    }
  }

  async function validateAdjustment() {
    if (!id) return;
    setValidating(true);
    try {
      await client.post(`/adjustments/${id}/validate`);
      toast.success('Adjustment validated');
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to validate adjustment'));
    } finally {
      setValidating(false);
    }
  }

  if (!adjustment) {
    return (
      <div className="page-container">
        <p style={{ color: 'var(--txt-muted)' }}>Loading adjustment...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={`Adjustment ${adjustment.ref}`}
        subtitle={`Created ${formatDateTime(adjustment.created_at)} by ${adjustment.created_by}`}
        actions={(
          <>
            <Link className="btn btn-secondary" to="/adjustments">
              <ArrowLeft size={16} />
              Back
            </Link>
            {!isDone ? (
              <button className="btn btn-primary" type="button" onClick={saveAdjustment} disabled={saving}>
                <Save size={16} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            ) : null}
            {!isDone ? (
              <button className="btn btn-success" type="button" onClick={validateAdjustment} disabled={validating}>
                <CheckCircle2 size={16} />
                {validating ? 'Validating...' : 'Validate'}
              </button>
            ) : null}
          </>
        )}
      />

      <section className="section-card" style={{ marginBottom: 14 }}>
        <div className="section-card-header">
          <h3>Workflow</h3>
          <StatusBadge status={adjustment.status} />
        </div>
        <div style={{ padding: 16 }}>
          <div className="stepper">
            {['Draft', 'Waiting', 'Ready', 'Done'].map((label, index) => (
              <div key={label} className="stepper-step">
                <div className={`stepper-dot ${index < step ? 'done' : ''} ${index === step ? 'active' : ''}`}>
                  {index + 1}
                </div>
                {index < 3 ? <div className={`stepper-line ${index < step ? 'done' : ''}`} /> : null}
                <span className="stepper-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card" style={{ marginBottom: 14 }}>
        <div className="section-card-header">
          <h3>Adjustment Details</h3>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Location</label>
              <select
                className="form-input"
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
                disabled={isDone}
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
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={status}
                onChange={(event) => setStatus(event.target.value as Adjustment['status'])}
                disabled={isDone}
              >
                {operationStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input
                className="form-input"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={isDone}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-card-header">
          <h3>Line Items</h3>
          {!isDone ? (
            <button className="btn btn-secondary btn-sm" type="button" onClick={addLine}>
              Add Line
            </button>
          ) : null}
        </div>
        <div style={{ padding: 8, overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>System Qty</th>
                <th>Adjustment Qty (+/-)</th>
                <th>Result Qty</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const delta = line.change_qty;
                const resultQty = Math.max(0, line.system_qty + delta);
                return (
                  <tr key={`${line.id ?? 'new'}-${index}`}>
                    <td>
                      <select
                        className="form-input"
                        value={line.product_id}
                        onChange={(event) => updateLine(index, { product_id: event.target.value })}
                        disabled={isDone}
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{formatQty(line.system_qty)}</td>
                    <td>
                      <input
                        className="form-input"
                        type="number"
                        value={line.change_qty}
                        onChange={(event) => updateLine(index, { change_qty: Number(event.target.value) })}
                        disabled={isDone}
                      />
                    </td>
                    <td>
                      <span style={{ color: delta >= 0 ? 'var(--clr-success)' : 'var(--clr-danger)' }}>
                        {formatQty(resultQty)}
                      </span>
                    </td>
                    <td>
                      {!isDone ? (
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeLine(index)}>
                          Remove
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
