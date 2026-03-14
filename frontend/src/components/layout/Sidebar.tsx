import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine,
    ArrowLeftRight, ClipboardList, History, Warehouse,
    User, LogOut, ChevronRight, Box, PanelLeftClose, PanelLeftOpen, Bot
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface NavItem {
    icon: React.ReactNode;
    label: string;
    to: string;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

const navGroups: NavGroup[] = [
    {
        title: 'Overview',
        items: [
            { icon: <LayoutDashboard size={18} />, label: 'Dashboard', to: '/dashboard' },
            { icon: <Package size={18} />, label: 'Products', to: '/products' },
        ],
    },
    {
        title: 'Operations',
        items: [
            { icon: <ArrowDownToLine size={18} />, label: 'Receipts', to: '/receipts' },
            { icon: <ArrowUpFromLine size={18} />, label: 'Deliveries', to: '/deliveries' },
            { icon: <Bot size={18} />, label: 'Automation', to: '/automation' },
            { icon: <ArrowLeftRight size={18} />, label: 'Transfers', to: '/transfers' },
            { icon: <ClipboardList size={18} />, label: 'Adjustments', to: '/adjustments' },
        ],
    },
    {
        title: 'Reports',
        items: [
            { icon: <History size={18} />, label: 'Move History', to: '/history' },
        ],
    },
    {
        title: 'Settings',
        items: [
            { icon: <Warehouse size={18} />, label: 'Warehouses', to: '/settings/warehouses' },
            { icon: <User size={18} />, label: 'My Profile', to: '/settings/profile' },
        ],
    },
];

export default function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <motion.aside
            animate={{ width: open ? 260 : 72 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{
                position: 'fixed', left: 0, top: 0, bottom: 0,
                background: 'linear-gradient(180deg, #0A0E1A 0%, #111827 100%)',
                borderRight: '1px solid var(--glass-border)',
                zIndex: 'var(--z-sidebar)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* Logo */}
            <div style={{
                height: 'var(--topbar-h)', display: 'flex', alignItems: 'center',
                padding: '0 16px', borderBottom: '1px solid var(--glass-border)',
                flexShrink: 0, gap: 12,
            }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'var(--grad-violet)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'var(--shadow-glow-violet)',
                }}>
                    <Box size={20} color="white" />
                </div>
                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.1rem', color: 'var(--txt-primary)', lineHeight: 1.1 }}>
                                Core<span style={{ color: 'var(--clr-violet)' }}>Inventory</span>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--txt-muted)', letterSpacing: '0.1em' }}>ODOO 2026</div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <button
                    className="btn btn-ghost btn-icon"
                    type="button"
                    onClick={onToggle}
                    style={{ marginLeft: 'auto' }}
                    title={open ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    {open ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                </button>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 0' }}>
                {navGroups.map(group => (
                    <div key={group.title} style={{ marginBottom: 4 }}>
                        {open && (
                            <div style={{ padding: '6px 18px 4px', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.12em', color: 'var(--txt-muted)', textTransform: 'uppercase' }}>
                                {group.title}
                            </div>
                        )}
                        {group.items.map(item => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                style={{ textDecoration: 'none' }}
                            >
                                {({ isActive }) => (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '10px 18px', margin: '1px 8px', borderRadius: 10,
                                        background: isActive ? 'var(--clr-violet-dim)' : 'transparent',
                                        color: isActive ? 'var(--clr-violet-hover)' : 'var(--txt-secondary)',
                                        borderLeft: isActive ? `3px solid var(--clr-violet)` : '3px solid transparent',
                                        transition: 'all var(--transition-fast)',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--clr-surface-hover)'; }}
                                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                    >
                                        <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                                        <AnimatePresence>
                                            {open && (
                                                <motion.span
                                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                    style={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap' }}
                                                >
                                                    {item.label}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                        {isActive && open && <ChevronRight size={14} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                                    </div>
                                )}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            {/* User */}
            <div style={{ padding: '12px 8px', borderTop: '1px solid var(--glass-border)', flexShrink: 0 }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px',
                    borderRadius: 10, background: 'var(--glass-bg)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                        background: 'var(--grad-violet)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', fontWeight: 700, color: 'white',
                    }}>
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                style={{ flex: 1, minWidth: 0 }}
                            >
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--txt-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--txt-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {open && (
                        <button onClick={handleLogout} className="btn-ghost btn-icon btn" title="Logout" style={{ color: 'var(--txt-muted)', padding: '4px' }}>
                            <LogOut size={16} />
                        </button>
                    )}
                </div>
            </div>
        </motion.aside>
    );
}
