import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppShell() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--clr-bg-0)' }}>
            <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(p => !p)} />
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                marginLeft: sidebarOpen ? 'var(--sidebar-w)' : 'var(--sidebar-w-collapsed)',
                transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}>
                <TopBar onMenuClick={() => setSidebarOpen(p => !p)} />
                <main style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            style={{ minHeight: '100%' }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
