import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import type { Product, Transfer, Warehouse } from '../../types/api';
import { formatDate, formatDateTime } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';
import { operationProgressStep, operationStatusOptions } from './operationUtils';

interface EditableLine {
  id?: string;
  product_id: string;
  qty: number;
}

export default function TransferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [status, setStatus] = useState<Transfer['status']>('draft');
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);

  const isDone = transfer?.status === 'done';
  const step = operationProgressStep(status);
  const locationOptions = useMemo(() => warehouses.flatMap((warehouse) => warehouse.locations ?? []), [warehouses]);

  async function loadData() {
    if (!id) return;
    try {
      const [transferRes, productsRes, warehousesRes] = await Promise.all([
        client.get<Transfer>(`/transfers/${id}`),
        client.get<Product[]>('/products'),
        client.get<Warehouse[]>('/warehouses'),
      ]);
      const currentTransfer = transferRes.data;
      setTransfer(currentTransfer);
      setFromLocation(currentTransfer.from_location_id);
      setToLocation(currentTransfer.to_location_id);
      setScheduledDate(currentTransfer.scheduled_date?.slice(0, 10) ?? '');
      setNotes(currentTransfer.notes ?? '');
      setStatus(currentTransfer.status);
      setLines(
        currentTransfer.lines.map((line) => ({
          id: line.id,
          product_id: line.product_id,
          qty: line.qty,
        })),
      );
      setProducts(productsRes.data);
      setWarehouses(warehousesRes.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load transfer'));
      navigate('/transfers');
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
    setLines((value) => [...value, { product_id: '', qty: 1 }]);
  }

  function removeLine(index: number) {
    setLines((value) => value.filter((_, lineIndex) => lineIndex !== index));
  }

  async function saveTransfer() {
    if (!id) return;
    const validLines = lines.filter((line) => line.product_id && line.qty > 0);
    if (!validLines.length) {
      toast.error('Add at least one valid line');
      return;
    }
    if (!fromLocation || !toLocation || fromLocation === toLocation) {
      toast.error('Choose different source and destination locations');
      return;
    }
    setSaving(true);
    try {
      await client.put(`/transfers/${id}`, {
        from_location_id: fromLocation,
        to_location_id: toLocation,
        scheduled_date: scheduledDate || null,
        notes,
        status,
        lines: validLines,
      });
      toast.success('Transfer updated');
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save transfer'));
    } finally {
      setSaving(false);
    }
  }

  async function validateTransfer() {
    if (!id) return;
    setValidating(true);
    try {
      await client.post(`/transfers/${id}/validate`);
      toast.success('Transfer validated');
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to validate transfer'));
    } finally {
      setValidating(false);
    }
  }

  if (!transfer) {
    return (
      <div className="page-container">
        <p style={{ color: 'var(--txt-muted)' }}>Loading transfer...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={`Transfer ${transfer.ref}`}
        subtitle={`Created ${formatDateTime(transfer.created_at)} by ${transfer.created_by}`}
        actions={(
          <>
            <Link className="btn btn-secondary" to="/transfers">
              <ArrowLeft size={16} />
              Back
            </Link>
            {!isDone ? (
              <button className="btn btn-primary" type="button" onClick={saveTransfer} disabled={saving}>
                <Save size={16} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            ) : null}
            {!isDone ? (
              <button className="btn btn-success" type="button" onClick={validateTransfer} disabled={validating}>
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
          <StatusBadge status={transfer.status} />
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
          <h3>Transfer Details</h3>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">From Location</label>
              <select
                className="form-input"
                value={fromLocation}
                onChange={(event) => setFromLocation(event.target.value)}
                disabled={isDone}
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
                value={toLocation}
                onChange={(event) => setToLocation(event.target.value)}
                disabled={isDone}
              >
                <option value="">Select destination</option>
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
                onChange={(event) => setStatus(event.target.value as Transfer['status'])}
                disabled={isDone}
              >
                {operationStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
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
                value={scheduledDate}
                onChange={(event) => setScheduledDate(event.target.value)}
                disabled={isDone}
              />
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
          <div style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
            Scheduled for: {formatDate(transfer.scheduled_date)}
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
                <th>Quantity</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
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
                  <td>
                    <input
                      className="form-input"
                      type="number"
                      min={1}
                      value={line.qty}
                      onChange={(event) => updateLine(index, { qty: Number(event.target.value) })}
                      disabled={isDone}
                    />
                  </td>
                  <td>
                    {!isDone ? (
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeLine(index)}>
                        Remove
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
