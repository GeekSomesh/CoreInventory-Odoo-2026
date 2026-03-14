import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import type { Product, Receipt, Warehouse } from '../../types/api';
import { formatDate, formatDateTime } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';
import { operationProgressStep, operationStatusOptions } from './operationUtils';

interface EditableLine {
  id?: string;
  product_id: string;
  expected_qty: number;
  received_qty: number;
  location_id: string;
}

export default function ReceiptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [supplier, setSupplier] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Receipt['status']>('draft');
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);

  const isDone = receipt?.status === 'done';
  const step = operationProgressStep(status);

  const locationOptions = useMemo(() => warehouses.flatMap((warehouse) => warehouse.locations ?? []), [warehouses]);

  async function loadData() {
    if (!id) return;
    try {
      const [receiptRes, productsRes, warehousesRes] = await Promise.all([
        client.get<Receipt>(`/receipts/${id}`),
        client.get<Product[]>('/products'),
        client.get<Warehouse[]>('/warehouses'),
      ]);
      const currentReceipt = receiptRes.data;
      setReceipt(currentReceipt);
      setSupplier(currentReceipt.supplier);
      setScheduledDate(currentReceipt.scheduled_date?.slice(0, 10) ?? '');
      setNotes(currentReceipt.notes ?? '');
      setStatus(currentReceipt.status);
      setLines(
        currentReceipt.lines.map((line) => ({
          id: line.id,
          product_id: line.product_id,
          expected_qty: line.expected_qty,
          received_qty: line.received_qty,
          location_id: line.location_id ?? '',
        })),
      );
      setProducts(productsRes.data);
      setWarehouses(warehousesRes.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load receipt'));
      navigate('/receipts');
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
    setLines((value) => [
      ...value,
      { product_id: '', expected_qty: 1, received_qty: 0, location_id: '' },
    ]);
  }

  function removeLine(index: number) {
    setLines((value) => value.filter((_, lineIndex) => lineIndex !== index));
  }

  async function saveReceipt() {
    if (!id) return;
    const validLines = lines.filter((line) => line.product_id && line.expected_qty > 0);
    if (!validLines.length) {
      toast.error('Add at least one valid line');
      return;
    }
    setSaving(true);
    try {
      await client.put(`/receipts/${id}`, {
        supplier,
        scheduled_date: scheduledDate || null,
        notes,
        status,
        lines: validLines,
      });
      toast.success('Receipt updated');
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save receipt'));
    } finally {
      setSaving(false);
    }
  }

  async function validateReceipt() {
    if (!id) return;
    setValidating(true);
    try {
      await client.post(`/receipts/${id}/validate`);
      toast.success('Receipt validated');
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to validate receipt'));
    } finally {
      setValidating(false);
    }
  }

  if (!receipt) {
    return (
      <div className="page-container">
        <p style={{ color: 'var(--txt-muted)' }}>Loading receipt...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={`Receipt ${receipt.ref}`}
        subtitle={`Created ${formatDateTime(receipt.created_at)} by ${receipt.created_by}`}
        actions={(
          <>
            <Link className="btn btn-secondary" to="/receipts">
              <ArrowLeft size={16} />
              Back
            </Link>
            {!isDone ? (
              <button className="btn btn-primary" type="button" onClick={saveReceipt} disabled={saving}>
                <Save size={16} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            ) : null}
            {!isDone ? (
              <button className="btn btn-success" type="button" onClick={validateReceipt} disabled={validating}>
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
          <StatusBadge status={receipt.status} />
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
          <h3>Receipt Details</h3>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Supplier</label>
              <input
                className="form-input"
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                disabled={isDone}
              />
            </div>
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
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={status}
                onChange={(event) => setStatus(event.target.value as Receipt['status'])}
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
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-input"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isDone}
            />
          </div>
          <div style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
            Scheduled for: {formatDate(receipt.scheduled_date)} | Warehouse: {receipt.warehouse_name ?? receipt.warehouse_id}
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
                <th>Expected Qty</th>
                <th>Received Qty</th>
                <th>Destination</th>
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
                      value={line.expected_qty}
                      onChange={(event) => updateLine(index, { expected_qty: Number(event.target.value) })}
                      disabled={isDone}
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      value={line.received_qty}
                      onChange={(event) => updateLine(index, { received_qty: Number(event.target.value) })}
                      disabled={isDone}
                    />
                  </td>
                  <td>
                    <select
                      className="form-input"
                      value={line.location_id}
                      onChange={(event) => updateLine(index, { location_id: event.target.value })}
                      disabled={isDone}
                    >
                      <option value="">Select location</option>
                      {locationOptions.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.full_path}
                        </option>
                      ))}
                    </select>
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
