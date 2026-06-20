import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import Launchpad from './pages/Launchpad';
import Creators from './pages/Creators';
import Brands from './pages/Brands';
import Analytics from './pages/Analytics';
import Ledger from './pages/Ledger';
import Payouts from './pages/Payouts';
import ErrorBoundary from './components/common/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Protected Admin Routes */}
          <Route path="/" element={
            <AdminLayout>
              <Launchpad />
            </AdminLayout>
          } />
          
          <Route path="/creators" element={
            <AdminLayout>
              <Creators />
            </AdminLayout>
          } />

          <Route path="/brands" element={
            <AdminLayout>
              <Brands />
            </AdminLayout>
          } />

          <Route path="/analytics" element={
            <AdminLayout>
              <Analytics />
            </AdminLayout>
          } />

          <Route path="/ledger" element={
            <AdminLayout>
              <Ledger />
            </AdminLayout>
          } />

          <Route path="/payouts" element={
            <AdminLayout>
              <Payouts />
            </AdminLayout>
          } />
  
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
