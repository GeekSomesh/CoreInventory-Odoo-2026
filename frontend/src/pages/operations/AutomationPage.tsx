import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import type { AutomationDeliveryResponse, Product, Warehouse } from '../../types/api';
import { formatDate, formatQty } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';

interface AutomationLineForm {
  product_id: string;
  demand_qty: number;
  location_id: string;
}

interface AutomationFormState {
  customer: string;
  warehouse_id: string;
  scheduled_date: string;
  supplier: string;
  notes: string;
  lines: AutomationLineForm[];
}

const emptyForm: AutomationFormState = {
  customer: '',
  warehouse_id: '',
  scheduled_date: '',
  supplier: 'AUTO-PROCUREMENT',
  notes: '',
  lines: [{ product_id: '', demand_qty: 1, location_id: '' }],
};

export default function AutomationPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [running, setRunning] = useState(false);
  const [form, setForm] = useState<AutomationFormState>(emptyForm);
  const [result, setResult] = useState<AutomationDeliveryResponse | null>(null);

  const selectedWarehouse = useMemo(
    () => warehouses.find((warehouse) => warehouse.id === form.warehouse_id) ?? null,
    [form.warehouse_id, warehouses],
  );

  const warehouseLocations = useMemo(
    () => selectedWarehouse?.locations ?? [],
    [selectedWarehouse],
  );

  async function loadLookups() {
    setLoadingLookups(true);
    try {
      const [productsRes, warehousesRes] = await Promise.all([
        client.get<Product[]>('/products'),
        client.get<Warehouse[]>('/warehouses'),
      ]);
      setProducts(productsRes.data);
      setWarehouses(warehousesRes.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load automation lookups'));
    } finally {
      setLoadingLookups(false);
    }
  }

  useEffect(() => {
    void loadLookups();
  }, []);

  function updateLine(index: number, patch: Partial<AutomationLineForm>) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    }));
  }

  function addLine() {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, { product_id: '', demand_qty: 1, location_id: '' }],
    }));
  }

  function removeLine(index: number) {
    setForm((current) => ({
      ...current,
      lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  }

  async function runAutomation(event: React.FormEvent) {
    event.preventDefault();

    const validLines = form.lines
      .map((line) => ({ ...line, demand_qty: Number(line.demand_qty) }))
      .filter((line) => line.product_id && line.demand_qty > 0);

    if (!form.customer.trim() || !form.warehouse_id) {
      toast.error('Customer and warehouse are required');
      return;
    }

    if (!validLines.length) {
      toast.error('Add at least one valid automation line');
      return;
    }

    setRunning(true);
    try {
      const response = await client.post<AutomationDeliveryResponse>('/automation/delivery', {
        customer: form.customer.trim(),
        warehouse_id: form.warehouse_id,
        scheduled_date: form.scheduled_date || null,
        supplier: form.supplier.trim() || 'AUTO-PROCUREMENT',
        notes: form.notes,
        lines: validLines,
      });
      setResult(response.data);
      toast.success(`Automation completed: ${response.data.delivery.ref}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Automation failed'));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Automation"
        subtitle="Auto-fulfill delivery demand via stock, transfer, then receipt fallback."
        actions={(
          <button className="btn btn-secondary" type="button" onClick={() => setForm(emptyForm)}>
            Reset
          </button>
        )}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        <section className="section-card">
          <div className="section-card-header">
            <h3>Automation Request</h3>
            <span style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
              Delivery -&gt; Transfer -&gt; Receipt
            </span>
          </div>

          <form onSubmit={runAutomation} style={{ padding: 16, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Customer</label>
                <input
                  className="form-input"
                  value={form.customer}
                  onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))}
                  placeholder="Customer name"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Warehouse</label>
                <select
                  className="form-input"
                  value={form.warehouse_id}
                  onChange={(event) => setForm((current) => ({ ...current, warehouse_id: event.target.value }))}
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
                  onChange={(event) => setForm((current) => ({ ...current, scheduled_date: event.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Supplier Fallback</label>
                <input
                  className="form-input"
                  value={form.supplier}
                  onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input
                  className="form-input"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional context for generated docs"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: '0.95rem' }}>Demand Lines</h4>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}>
                  <Plus size={14} />
                  Add Line
                </button>
              </div>

              {form.lines.map((line, index) => (
                <div key={`line-${index}`} className="glass-card-strong" style={{ padding: 10, display: 'grid', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 8, alignItems: 'end' }}>
                    <div className="form-group">
                      <label className="form-label">Product</label>
                      <select
                        className="form-input"
                        value={line.product_id}
                        onChange={(event) => updateLine(index, { product_id: event.target.value })}
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Qty</label>
                      <input
                        className="form-input"
                        type="number"
                        min={1}
                        value={line.demand_qty}
                        onChange={(event) => updateLine(index, { demand_qty: Number(event.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Preferred Location</label>
                      <select
                        className="form-input"
                        value={line.location_id}
                        onChange={(event) => updateLine(index, { location_id: event.target.value })}
                        disabled={!warehouseLocations.length}
                      >
                        <option value="">Auto choose</option>
                        {warehouseLocations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.full_path}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={() => removeLine(index)}
                      disabled={form.lines.length === 1}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn btn-primary" type="submit" disabled={running || loadingLookups} style={{ justifyContent: 'center' }}>
              <Sparkles size={16} />
              {running ? 'Running Automation...' : 'Run Automation'}
            </button>
          </form>
        </section>

        <section className="section-card">
          <div className="section-card-header">
            <h3>Execution Result</h3>
            {result ? (
              <Link className="btn btn-secondary btn-sm" to={`/deliveries/${result.delivery.id}`}>
                Open Delivery
              </Link>
            ) : null}
          </div>

          <div style={{ padding: 16, display: 'grid', gap: 10 }}>
            {result ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="glass-card-strong" style={{ padding: 10 }}>
                    <div style={{ color: 'var(--txt-muted)', fontSize: '0.72rem' }}>Delivery</div>
                    <div style={{ fontWeight: 700 }}>{result.delivery.ref}</div>
                    <div style={{ color: 'var(--txt-muted)', fontSize: '0.75rem' }}>
                      {formatDate(result.delivery.scheduled_date)}
                    </div>
                  </div>
                  <div className="glass-card-strong" style={{ padding: 10 }}>
                    <div style={{ color: 'var(--txt-muted)', fontSize: '0.72rem' }}>Requested Qty</div>
                    <div style={{ fontWeight: 700 }}>{formatQty(result.summary.requested_qty)}</div>
                    <div style={{ color: 'var(--txt-muted)', fontSize: '0.75rem' }}>
                      {result.summary.requested_lines} lines
                    </div>
                  </div>
                </div>

                <div className="glass-card-strong" style={{ padding: 10, display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>Auto Transfer</span>
                    <strong>{result.summary.transfer_docs} docs / {formatQty(result.summary.transfer_qty)} qty</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>Auto Receipt</span>
                    <strong>{result.summary.receipt_docs} docs / {formatQty(result.summary.receipt_qty)} qty</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>Delivery Lines</span>
                    <strong>{result.summary.delivery_lines}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--txt-muted)' }}>
                    Generated Documents
                  </div>
                  {result.transfers.map((transfer) => (
                    <Link key={transfer.id} to={`/transfers/${transfer.id}`} className="btn btn-secondary btn-sm" style={{ justifyContent: 'space-between' }}>
                      <span>{transfer.ref}</span>
                      <span>{formatQty(transfer.lines.reduce((sum, line) => sum + line.qty, 0))}</span>
                    </Link>
                  ))}
                  {result.receipts.map((receipt) => (
                    <Link key={receipt.id} to={`/receipts/${receipt.id}`} className="btn btn-secondary btn-sm" style={{ justifyContent: 'space-between' }}>
                      <span>{receipt.ref}</span>
                      <span>{formatQty(receipt.lines.reduce((sum, line) => sum + line.expected_qty, 0))}</span>
                    </Link>
                  ))}
                  {!result.transfers.length && !result.receipts.length ? (
                    <div style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
                      No support docs needed. Delivery fulfilled from in-warehouse stock.
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--txt-muted)', fontSize: '0.82rem' }}>
                Run automation to generate and validate delivery support documents automatically.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
