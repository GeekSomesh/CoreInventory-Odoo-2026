import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search, Tag, X } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import type { Category, Location, Product, Warehouse } from '../../types/api';
import { formatQty } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';

interface ProductFormState {
  id?: string;
  name: string;
  sku: string;
  category_id: string;
  uom: string;
  reorder_min: number;
  reorder_max: number;
  initial_stock: number;
  location_id: string;
}

const emptyForm: ProductFormState = {
  name: '',
  sku: '',
  category_id: '',
  uom: 'pcs',
  reorder_min: 0,
  reorder_max: 0,
  initial_stock: 0,
  location_id: '',
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const [productsRes, categoriesRes, warehousesRes] = await Promise.all([
        client.get<Product[]>('/products'),
        client.get<Category[]>('/products/categories'),
        client.get<Warehouse[]>('/warehouses'),
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      setLocations(
        warehousesRes.data.flatMap((warehouse) => warehouse.locations ?? []),
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load products'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = !search
        || product.name.toLowerCase().includes(search.toLowerCase())
        || product.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
      const stock = product.total_stock ?? 0;
      const matchesStock = !onlyLowStock || stock <= product.reorder_min;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [categoryFilter, onlyLowStock, products, search]);

  function openCreate() {
    setForm(emptyForm);
    setDrawerOpen(true);
  }

  function openEdit(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      sku: product.sku,
      category_id: product.category_id ?? '',
      uom: product.uom,
      reorder_min: product.reorder_min,
      reorder_max: product.reorder_max,
      initial_stock: product.total_stock ?? 0,
      location_id: '',
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setForm(emptyForm);
  }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (form.id) {
        await client.put(`/products/${form.id}`, {
          name: form.name,
          sku: form.sku,
          category_id: form.category_id || null,
          uom: form.uom,
          reorder_min: Number(form.reorder_min),
          reorder_max: Number(form.reorder_max),
        });
        toast.success('Product updated');
      } else {
        await client.post('/products', {
          name: form.name,
          sku: form.sku,
          category_id: form.category_id || null,
          uom: form.uom,
          reorder_min: Number(form.reorder_min),
          reorder_max: Number(form.reorder_max),
          initial_stock: Number(form.initial_stock) || 0,
          location_id: form.location_id || null,
        });
        toast.success('Product created');
      }
      closeDrawer();
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save product'));
    } finally {
      setSaving(false);
    }
  }

  async function deactivateProduct(id: string) {
    try {
      await client.delete(`/products/${id}`);
      toast.success('Product deactivated');
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to deactivate product'));
    }
  }

  async function createCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!newCategory.trim()) return;
    try {
      await client.post('/products/categories', { name: newCategory.trim() });
      toast.success('Category created');
      setNewCategory('');
      setShowCategoryForm(false);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create category'));
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Products"
        subtitle="Manage SKUs, stock, categories, and reorder rules."
        actions={(
          <>
            <button className="btn btn-secondary" type="button" onClick={() => setShowCategoryForm((value) => !value)}>
              <Tag size={16} />
              Category
            </button>
            <button className="btn btn-primary" type="button" onClick={openCreate}>
              <Plus size={16} />
              New Product
            </button>
          </>
        )}
      />

      {showCategoryForm ? (
        <form
          onSubmit={createCategory}
          className="glass-card-strong"
          style={{ padding: 12, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}
        >
          <input
            className="form-input"
            placeholder="Category name"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            style={{ maxWidth: 280 }}
          />
          <button className="btn btn-primary btn-sm" type="submit">
            Save
          </button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowCategoryForm(false)}>
            Cancel
          </button>
        </form>
      ) : null}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div className="search-bar" style={{ minWidth: 280 }}>
          <Search size={16} color="var(--txt-muted)" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by product or SKU"
          />
        </div>
        <select
          className="form-input"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          style={{ maxWidth: 220 }}
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={`filter-pill ${onlyLowStock ? 'active' : ''}`}
          onClick={() => setOnlyLowStock((value) => !value)}
        >
          Low stock only
        </button>
      </div>

      <section className="section-card">
        <div className="section-card-header">
          <h3>Catalog</h3>
          <span style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
            {filteredProducts.length} items
          </span>
        </div>
        <div style={{ overflowX: 'auto', padding: 8 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>UoM</th>
                <th>Total Stock</th>
                <th>Reorder</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--txt-muted)' }}>
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length ? (
                filteredProducts.map((product) => {
                  const stock = product.total_stock ?? 0;
                  const isLow = stock <= product.reorder_min;
                  return (
                    <tr key={product.id}>
                      <td>{product.sku}</td>
                      <td>
                        <div>{product.name}</div>
                        <div style={{ color: 'var(--txt-muted)', fontSize: '0.75rem' }}>
                          {product.stock_by_location?.slice(0, 2).map((item) => `${item.location}: ${formatQty(item.qty)}`).join(' | ') || '-'}
                        </div>
                      </td>
                      <td>{product.category_name ?? '-'}</td>
                      <td>{product.uom}</td>
                      <td>{formatQty(stock)}</td>
                      <td>
                        {formatQty(product.reorder_min)} / {formatQty(product.reorder_max)}
                      </td>
                      <td>
                        <span className={`badge ${isLow ? 'badge-low' : 'badge-done'}`}>
                          {isLow ? 'LOW STOCK' : 'HEALTHY'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm" type="button" onClick={() => openEdit(product)}>
                            Edit
                          </button>
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => deactivateProduct(product.id)}>
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--txt-muted)' }}>
                    No products found for current filters.
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
                  <h3 style={{ fontSize: '1rem' }}>{form.id ? 'Edit Product' : 'Create Product'}</h3>
                  <p style={{ color: 'var(--txt-muted)', fontSize: '0.8rem' }}>
                    Configure SKU, category and reorder thresholds.
                  </p>
                </div>
                <button className="btn btn-ghost btn-icon" type="button" onClick={closeDrawer}>
                  <X size={16} />
                </button>
              </div>

              <form className="drawer-body" onSubmit={saveProduct} style={{ display: 'grid', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input
                    className="form-input"
                    value={form.sku}
                    onChange={(event) => setForm((value) => ({ ...value, sku: event.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={form.category_id}
                    onChange={(event) => setForm((value) => ({ ...value, category_id: event.target.value }))}
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Unit of Measure</label>
                    <input
                      className="form-input"
                      value={form.uom}
                      onChange={(event) => setForm((value) => ({ ...value, uom: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Stock</label>
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      value={form.initial_stock}
                      onChange={(event) => setForm((value) => ({ ...value, initial_stock: Number(event.target.value) }))}
                      disabled={Boolean(form.id)}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Reorder Min</label>
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      value={form.reorder_min}
                      onChange={(event) => setForm((value) => ({ ...value, reorder_min: Number(event.target.value) }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reorder Max</label>
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      value={form.reorder_max}
                      onChange={(event) => setForm((value) => ({ ...value, reorder_max: Number(event.target.value) }))}
                    />
                  </div>
                </div>
                {!form.id ? (
                  <div className="form-group">
                    <label className="form-label">Initial Location</label>
                    <select
                      className="form-input"
                      value={form.location_id}
                      onChange={(event) => setForm((value) => ({ ...value, location_id: event.target.value }))}
                    >
                      <option value="">Select location</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.full_path}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="drawer-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeDrawer}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Product'}
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

