import { useLocation } from 'react-router-dom';
import { Menu, Bell, ChevronDown } from 'lucide-react';
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

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
    const location = useLocation();
    const { user } = useAuthStore();
    const title = routeTitles[location.pathname] || 'CoreInventory';

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
            <button onClick={onMenuClick} className="btn btn-ghost btn-icon" style={{ marginRight: 4 }}>
                <Menu size={20} />
            </button>

            <div>
                <h1 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--txt-primary)', fontFamily: 'Space Grotesk' }}>
                    {title}
                </h1>
            </div>

            <div style={{ flex: 1 }} />

            {/* Notification bell */}
            <button className="btn btn-ghost btn-icon" style={{ position: 'relative' }}>
                <Bell size={18} />
                <span style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--clr-danger)',
                    boxShadow: '0 0 6px var(--clr-danger)',
                }} />
            </button>

            {/* User badge */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px 6px 8px', borderRadius: 100,
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                cursor: 'pointer',
            }}>
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
            </div>
        </div>
    );
}
