import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProductsPage from './pages/products/ProductsPage';
import ReceiptsPage from './pages/operations/ReceiptsPage';
import ReceiptDetail from './pages/operations/ReceiptDetail';
import DeliveryPage from './pages/operations/DeliveryPage';
import DeliveryDetail from './pages/operations/DeliveryDetail';
import TransfersPage from './pages/operations/TransfersPage';
import TransferDetail from './pages/operations/TransferDetail';
import AdjustmentsPage from './pages/operations/AdjustmentsPage';
import AdjustmentDetail from './pages/operations/AdjustmentDetail';
import AutomationPage from './pages/operations/AutomationPage';
import MoveHistoryPage from './pages/history/MoveHistoryPage';
import WarehousePage from './pages/settings/WarehousePage';
import ProfilePage from './pages/settings/ProfilePage';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1A2235',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '0.9rem',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="receipts" element={<ReceiptsPage />} />
          <Route path="receipts/:id" element={<ReceiptDetail />} />
          <Route path="deliveries" element={<DeliveryPage />} />
          <Route path="deliveries/:id" element={<DeliveryDetail />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="transfers/:id" element={<TransferDetail />} />
          <Route path="adjustments" element={<AdjustmentsPage />} />
          <Route path="adjustments/:id" element={<AdjustmentDetail />} />
          <Route path="automation" element={<AutomationPage />} />
          <Route path="history" element={<MoveHistoryPage />} />
          <Route path="settings/warehouses" element={<WarehousePage />} />
          <Route path="settings/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
