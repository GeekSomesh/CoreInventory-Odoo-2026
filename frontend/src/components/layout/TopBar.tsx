import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Loader2, Menu, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import type { Delivery, OperationStatus, Product, Receipt, Transfer } from '../../types/api';
import { formatDate } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';
import { useAuthStore } from '../../store/authStore';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/receipts': 'Receipts',
  '/deliveries': 'Delivery Orders',
  '/transfers': 'Internal Transfers',
  '/adjustments': 'Inventory Adjustments',
  '/history': 'Move History',
  '/settings/warehouses': 'Warehouses',
  '/settings/profile': 'My Profile',
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const UPCOMING_WINDOW_DAYS = 3;
const OVERDUE_WINDOW_DAYS = 7;

interface LowStockAlert {
  id: string;
  title: string;
  subtitle: string;
  urgencyText: string;
  urgencyTone: 'warning' | 'danger';
}

interface DueAlert {
  id: string;
  ref: string;
  subtitle: string;
  scheduleText: string;
  urgencyText: string;
  urgencyTone: 'warning' | 'danger' | 'info';
  route: string;
}

function isOpenOperation(status: OperationStatus): boolean {
  return !['done', 'cancelled'].includes(status);
}

function lineTotal(value: number[] | undefined): number {
  if (!value?.length) return 0;
  return value.reduce((sum, qty) => sum + qty, 0);
}

function dueMeta(scheduledDate: string): { include: boolean; urgencyText: string; urgencyTone: 'warning' | 'danger' | 'info' } {
  const dueMs = new Date(scheduledDate).getTime();
  if (Number.isNaN(dueMs)) {
    return { include: false, urgencyText: '', urgencyTone: 'info' };
  }

  const deltaMs = dueMs - Date.now();
  const upcomingLimit = UPCOMING_WINDOW_DAYS * MS_PER_DAY;
  const overdueLimit = OVERDUE_WINDOW_DAYS * MS_PER_DAY;

  if (deltaMs > upcomingLimit || deltaMs < -overdueLimit) {
    return { include: false, urgencyText: '', urgencyTone: 'info' };
  }

  if (deltaMs < 0) {
    const overdueDays = Math.max(1, Math.ceil(Math.abs(deltaMs) / MS_PER_DAY));
    return { include: true, urgencyText: `Overdue ${overdueDays}d`, urgencyTone: 'danger' };
  }

  const daysLeft = Math.floor(deltaMs / MS_PER_DAY);
  if (daysLeft === 0) return { include: true, urgencyText: 'Due today', urgencyTone: 'danger' };
  if (daysLeft === 1) return { include: true, urgencyText: 'Due tomorrow', urgencyTone: 'warning' };
  return { include: true, urgencyText: `Due in ${daysLeft}d`, urgencyTone: 'info' };
}

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const title = routeTitles[location.pathname] || 'CoreInventory';

  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [deliveryAlerts, setDeliveryAlerts] = useState<DueAlert[]>([]);
  const [receiptAlerts, setReceiptAlerts] = useState<DueAlert[]>([]);
  const [transferAlerts, setTransferAlerts] = useState<DueAlert[]>([]);

  const bellRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const totalAlerts = useMemo(() => {
    return lowStockAlerts.length + deliveryAlerts.length + receiptAlerts.length + transferAlerts.length;
  }, [deliveryAlerts.length, lowStockAlerts.length, receiptAlerts.length, transferAlerts.length]);

  async function loadAlerts(silent = false) {
    if (!silent) setLoadingAlerts(true);

    try {
      const [productsRes, deliveriesRes, receiptsRes, transfersRes] = await Promise.all([
        client.get<Product[]>('/products'),
        client.get<Delivery[]>('/deliveries'),
        client.get<Receipt[]>('/receipts'),
        client.get<Transfer[]>('/transfers'),
      ]);

      const lowStock = productsRes.data
        .filter((product) => (product.total_stock ?? 0) <= product.reorder_min)
        .sort((left, right) => {
          const leftGap = left.reorder_min - (left.total_stock ?? 0);
          const rightGap = right.reorder_min - (right.total_stock ?? 0);
          return rightGap - leftGap;
        })
        .slice(0, 6)
        .map((product) => {
          const stock = product.total_stock ?? 0;
          const shortage = Math.max(product.reorder_min - stock, 0);
          const isOut = stock <= 0;
          return {
            id: product.id,
            title: `${product.name} (${product.sku})`,
            subtitle: `Stock ${stock} | Min ${product.reorder_min}`,
            urgencyText: isOut ? 'Out of stock' : `Short ${shortage}`,
            urgencyTone: isOut ? 'danger' : 'warning',
          } as LowStockAlert;
        });

      const deliveries = deliveriesRes.data
        .filter((item) => isOpenOperation(item.status) && item.scheduled_date)
        .map((item) => {
          const meta = dueMeta(item.scheduled_date as string);
          if (!meta.include) return null;
          const qty = lineTotal(item.lines.map((line) => line.demand_qty));
          return {
            id: item.id,
            ref: item.ref,
            subtitle: `${item.customer} | Qty ${qty}`,
            scheduleText: formatDate(item.scheduled_date),
            urgencyText: meta.urgencyText,
            urgencyTone: meta.urgencyTone,
            route: `/deliveries/${item.id}`,
          } as DueAlert;
        })
        .filter(Boolean) as DueAlert[];

      const receipts = receiptsRes.data
        .filter((item) => isOpenOperation(item.status) && item.scheduled_date)
        .map((item) => {
          const meta = dueMeta(item.scheduled_date as string);
          if (!meta.include) return null;
          const qty = lineTotal(item.lines.map((line) => line.expected_qty));
          return {
            id: item.id,
            ref: item.ref,
            subtitle: `${item.supplier} | Qty ${qty}`,
            scheduleText: formatDate(item.scheduled_date),
            urgencyText: meta.urgencyText,
            urgencyTone: meta.urgencyTone,
            route: `/receipts/${item.id}`,
          } as DueAlert;
        })
        .filter(Boolean) as DueAlert[];

      const transfers = transfersRes.data
        .filter((item) => isOpenOperation(item.status) && item.scheduled_date)
        .map((item) => {
          const meta = dueMeta(item.scheduled_date as string);
          if (!meta.include) return null;
          const qty = lineTotal(item.lines.map((line) => line.qty));
          return {
            id: item.id,
            ref: item.ref,
            subtitle: `${item.from_location_name ?? item.from_location_id} -> ${item.to_location_name ?? item.to_location_id} | Qty ${qty}`,
            scheduleText: formatDate(item.scheduled_date),
            urgencyText: meta.urgencyText,
            urgencyTone: meta.urgencyTone,
            route: `/transfers/${item.id}`,
          } as DueAlert;
        })
        .filter(Boolean) as DueAlert[];

      const sortByUrgency = (left: DueAlert, right: DueAlert) => {
        const weight = (tone: DueAlert['urgencyTone']) => {
          if (tone === 'danger') return 3;
          if (tone === 'warning') return 2;
          return 1;
        };
        return weight(right.urgencyTone) - weight(left.urgencyTone);
      };

      setLowStockAlerts(lowStock);
      setDeliveryAlerts(deliveries.sort(sortByUrgency).slice(0, 6));
      setReceiptAlerts(receipts.sort(sortByUrgency).slice(0, 6));
      setTransferAlerts(transfers.sort(sortByUrgency).slice(0, 6));
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      if (!silent) toast.error(getErrorMessage(error, 'Failed to load alerts'));
    } finally {
      if (!silent) setLoadingAlerts(false);
    }
  }

  useEffect(() => {
    void loadAlerts(true);

    const interval = setInterval(() => {
      void loadAlerts(true);
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (bellRef.current && !bellRef.current.contains(target)) setBellOpen(false);
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setBellOpen(false);
        setProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    setBellOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  function openRoute(route: string) {
    navigate(route);
    setBellOpen(false);
  }

  async function handleBellToggle() {
    const nextOpen = !bellOpen;
    setBellOpen(nextOpen);
    setProfileOpen(false);

    if (!nextOpen) return;

    const stale = !lastUpdated || Date.now() - new Date(lastUpdated).getTime() > 45_000;
    if (stale) await loadAlerts(true);
  }

  function badgeClass(tone: 'danger' | 'warning' | 'info') {
    if (tone === 'danger') return 'badge badge-critical';
    if (tone === 'warning') return 'badge badge-low';
    return 'badge badge-ready';
  }

  return (
    <div style={{
      height: 'var(--topbar-h)',
      background: 'rgba(10,14,26,0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--glass-border)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16,
      position: 'sticky', top: 0, zIndex: 'var(--z-topbar)',
      flexShrink: 0,
    }}>
      <button onClick={onMenuClick} className="btn btn-ghost btn-icon" style={{ marginRight: 4 }} type="button">
        <Menu size={20} />
      </button>

      <div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--txt-primary)', fontFamily: 'Space Grotesk' }}>
          {title}
        </h1>
      </div>

      <div style={{ flex: 1 }} />

      <div ref={bellRef} style={{ position: 'relative' }}>
        <button
          className="btn btn-ghost btn-icon"
          style={{ position: 'relative' }}
          type="button"
          onClick={() => void handleBellToggle()}
          aria-label="Open alerts"
        >
          <Bell size={18} />
          {totalAlerts > 0 ? (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--clr-danger)',
              boxShadow: '0 0 6px var(--clr-danger)',
            }} />
          ) : null}
        </button>

        {bellOpen ? (
          <div className="topbar-dropdown-panel" style={{ width: 430 }}>
            <div className="topbar-dropdown-header">
              <div>
                <div className="topbar-dropdown-title">Alerts</div>
                <div className="topbar-dropdown-subtitle">
                  {totalAlerts} active | {lastUpdated ? formatDate(lastUpdated) : 'Just now'}
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" type="button" onClick={() => void loadAlerts()}>
                {loadingAlerts ? <Loader2 size={16} className="spin" /> : <RefreshCcw size={16} />}
              </button>
            </div>

            <div className="topbar-dropdown-body">
              <section className="topbar-alert-section">
                <div className="topbar-alert-section-title">Low Stock ({lowStockAlerts.length})</div>
                {lowStockAlerts.length ? (
                  lowStockAlerts.map((alert) => (
                    <button key={alert.id} type="button" className="topbar-alert-row" onClick={() => openRoute('/products')}>
                      <div className="topbar-alert-main">
                        <div className="topbar-alert-title">{alert.title}</div>
                        <div className="topbar-alert-meta">{alert.subtitle}</div>
                      </div>
                      <span className={badgeClass(alert.urgencyTone)}>{alert.urgencyText}</span>
                    </button>
                  ))
                ) : (
                  <div className="topbar-alert-empty">No low stock alerts.</div>
                )}
              </section>

              <section className="topbar-alert-section">
                <div className="topbar-alert-section-title">Deliveries Due ({deliveryAlerts.length})</div>
                {deliveryAlerts.length ? (
                  deliveryAlerts.map((alert) => (
                    <button key={alert.id} type="button" className="topbar-alert-row" onClick={() => openRoute(alert.route)}>
                      <div className="topbar-alert-main">
                        <div className="topbar-alert-title">{alert.ref}</div>
                        <div className="topbar-alert-meta">{alert.subtitle}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className={badgeClass(alert.urgencyTone)}>{alert.urgencyText}</div>
                        <div className="topbar-alert-date">{alert.scheduleText}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="topbar-alert-empty">No near-due deliveries.</div>
                )}
              </section>

              <section className="topbar-alert-section">
                <div className="topbar-alert-section-title">Receipts Due ({receiptAlerts.length})</div>
                {receiptAlerts.length ? (
                  receiptAlerts.map((alert) => (
                    <button key={alert.id} type="button" className="topbar-alert-row" onClick={() => openRoute(alert.route)}>
                      <div className="topbar-alert-main">
                        <div className="topbar-alert-title">{alert.ref}</div>
                        <div className="topbar-alert-meta">{alert.subtitle}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className={badgeClass(alert.urgencyTone)}>{alert.urgencyText}</div>
                        <div className="topbar-alert-date">{alert.scheduleText}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="topbar-alert-empty">No near-due receipts.</div>
                )}
              </section>

              <section className="topbar-alert-section">
                <div className="topbar-alert-section-title">Transfers Due ({transferAlerts.length})</div>
                {transferAlerts.length ? (
                  transferAlerts.map((alert) => (
                    <button key={alert.id} type="button" className="topbar-alert-row" onClick={() => openRoute(alert.route)}>
                      <div className="topbar-alert-main">
                        <div className="topbar-alert-title">{alert.ref}</div>
                        <div className="topbar-alert-meta">{alert.subtitle}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className={badgeClass(alert.urgencyTone)}>{alert.urgencyText}</div>
                        <div className="topbar-alert-date">{alert.scheduleText}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="topbar-alert-empty">No near-due transfers.</div>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </div>

      <div ref={profileRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => {
            setProfileOpen((prev) => !prev);
            setBellOpen(false);
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px 6px 8px', borderRadius: 100,
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            cursor: 'pointer',
            color: 'var(--txt-primary)',
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--grad-violet)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700, color: 'white',
          }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--txt-primary)' }}>{user?.name?.split(' ')[0]}</span>
          <ChevronDown size={14} color="var(--txt-muted)" />
        </button>

        {profileOpen ? (
          <div className="topbar-dropdown-panel" style={{ width: 220 }}>
            <div className="topbar-dropdown-body" style={{ maxHeight: 'unset' }}>
              <button type="button" className="topbar-alert-row" onClick={() => {
                navigate('/settings/profile');
                setProfileOpen(false);
              }}>
                <div className="topbar-alert-main">
                  <div className="topbar-alert-title">My Profile</div>
                  <div className="topbar-alert-meta">{user?.email}</div>
                </div>
              </button>
              <button type="button" className="topbar-alert-row" onClick={() => {
                logout();
                navigate('/login');
              }}>
                <div className="topbar-alert-main">
                  <div className="topbar-alert-title">Logout</div>
                  <div className="topbar-alert-meta">End current session</div>
                </div>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
