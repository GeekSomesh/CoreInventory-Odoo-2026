import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, MapPin, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import type { Warehouse } from '../../types/api';
import { formatDate } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';

interface WarehouseFormState {
  name: string;
  short_code: string;
  address: string;
}

const emptyForm: WarehouseFormState = {
  name: '',
  short_code: '',
  address: '',
};

export default function WarehousePage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<WarehouseFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [newLocationByWarehouse, setNewLocationByWarehouse] = useState<Record<string, string>>({});

  async function loadWarehouses() {
    setLoading(true);
    try {
      const response = await client.get<Warehouse[]>('/warehouses');
      setWarehouses(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load warehouses'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWarehouses();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setForm(emptyForm);
  }

  async function createWarehouse(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await client.post('/warehouses', form);
      toast.success('Warehouse created');
      closeDrawer();
      await loadWarehouses();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create warehouse'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleWarehouse(warehouse: Warehouse) {
    try {
      await client.put(`/warehouses/${warehouse.id}`, { active: !warehouse.active });
      toast.success(`Warehouse ${warehouse.active ? 'deactivated' : 'activated'}`);
      await loadWarehouses();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update warehouse'));
    }
  }

  async function addLocation(warehouseId: string) {
    const name = (newLocationByWarehouse[warehouseId] ?? '').trim();
    if (!name) {
      toast.error('Enter location name');
      return;
    }
    try {
      await client.post(`/warehouses/${warehouseId}/locations`, { name });
      setNewLocationByWarehouse((value) => ({ ...value, [warehouseId]: '' }));
      toast.success('Location added');
      await loadWarehouses();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add location'));
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Warehouses"
        subtitle="Manage warehouse network, activation status, and internal locations."
        actions={(
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            New Warehouse
          </button>
        )}
      />

      <div style={{ display: 'grid', gap: 12 }}>
        {loading ? (
          <section className="section-card" style={{ padding: 20, color: 'var(--txt-muted)' }}>
            Loading warehouses...
          </section>
        ) : warehouses.length ? (
          warehouses.map((warehouse) => (
            <section key={warehouse.id} className="section-card">
              <div className="section-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: 'rgba(99,102,241,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3>{warehouse.name}</h3>
                    <p style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>{warehouse.short_code}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className={`badge ${warehouse.active ? 'badge-done' : 'badge-cancelled'}`}>
                    {warehouse.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => toggleWarehouse(warehouse)}>
                    {warehouse.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
              <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                <div style={{ color: 'var(--txt-secondary)', fontSize: '0.85rem' }}>
                  <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  {warehouse.address || 'No address provided'}
                  <span style={{ marginLeft: 12, color: 'var(--txt-muted)' }}>
                    Created: {formatDate(warehouse.created_at)}
                  </span>
                </div>
                <div className="glass-card-strong" style={{ padding: 12 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--txt-muted)', marginBottom: 8 }}>
                    Locations ({warehouse.locations?.length ?? 0})
                  </div>
                  <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
                    {(warehouse.locations ?? []).map((location) => (
                      <div key={location.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>{location.name}</span>
                        <span style={{ color: 'var(--txt-muted)' }}>{location.full_path}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-input"
                      placeholder="New location name"
                      value={newLocationByWarehouse[warehouse.id] ?? ''}
                      onChange={(event) => setNewLocationByWarehouse((value) => ({ ...value, [warehouse.id]: event.target.value }))}
                    />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => addLocation(warehouse.id)}>
                      Add Location
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ))
        ) : (
          <section className="section-card" style={{ padding: 20, color: 'var(--txt-muted)' }}>
            No warehouses found.
          </section>
        )}
      </div>

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
                  <h3>Create Warehouse</h3>
                  <p style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
                    Add warehouse name, code and address.
                  </p>
                </div>
                <button type="button" className="btn btn-ghost btn-icon" onClick={closeDrawer}>
                  <X size={16} />
                </button>
              </div>
              <form className="drawer-body" onSubmit={createWarehouse} style={{ display: 'grid', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Warehouse Name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Short Code</label>
                  <input
                    className="form-input"
                    value={form.short_code}
                    onChange={(event) => setForm((value) => ({ ...value, short_code: event.target.value.toUpperCase() }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={form.address}
                    onChange={(event) => setForm((value) => ({ ...value, address: event.target.value }))}
                  />
                </div>
                <div className="drawer-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeDrawer}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Create Warehouse'}
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

