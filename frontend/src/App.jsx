import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Radiology from './pages/Radiology';
import Laboratory from './pages/Laboratory';
import Invoices from './pages/Invoices';
import Coupons from './pages/Coupons';
import Accounting from './pages/Accounting'; // Phase 2
import HR from './pages/HR'; // Phase 3
import Services from './pages/Services'; // Phase 3
import FinanceDashboard from './pages/FinanceDashboard'; // Phase 2
import Suppliers from './pages/Suppliers'; // Phase 11
import Settings from './pages/Settings'; // Phase 10
import Closing from './pages/Closing'; // Phase 10
import CashReport from './pages/CashReport'; // Phase 19
import Login from './pages/Login'; // Phase 18
import Clinic from './pages/Clinic';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return children;
};

// Layout Component (Sidebar + header)
const Layout = () => {
  return (
    <div className="flex h-screen bg-slate-50 font-sans" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden mr-64">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Area */}
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/clinic" element={<Clinic />} />
            <Route path="/radiology" element={<Radiology />} />
            <Route path="/laboratory" element={<Laboratory />} />
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/hr" element={<HR />} />
            <Route path="/services" element={<Services />} />
            <Route path="/finance-dashboard" element={<FinanceDashboard />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/closing" element={<Closing />} />
            <Route path="/cash-report" element={<CashReport />} />
            <Route path="/settings/*" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
