import { useEffect, useState, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { isSuperAdminUser } from './lib/admin';

// Lazy loaded pages
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Landing = lazy(() => import('./pages/Landing'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerLedger = lazy(() => import('./pages/CustomerLedger'));
const Billing = lazy(() => import('./pages/Billing'));
const Settlement = lazy(() => import('./pages/Settlement'));
const Subscription = lazy(() => import('./pages/Subscription'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));

import AuthLayout from './components/AuthLayout';
import OfflineScreen from './components/OfflineScreen';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      setIsRecovering(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neu-bg">
        <div className="animate-pulse text-neu-primary font-bold">Loading UdharPe...</div>
      </div>
    );
  }

  return (
    <>
      <OfflineScreen />
      <Toaster position="top-center" toastOptions={{ className: 'font-bold' }} />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-neu-bg">
          <div className="animate-pulse text-neu-primary font-bold">Loading...</div>
        </div>
      }>
        <Routes>
            <Route path="/" element={!session ? <Landing /> : <Navigate to={isSuperAdminUser(session.user) ? "/admin" : "/dashboard"} replace />} />
            <Route path="/auth" element={(!session || isRecovering) ? <Auth isRecovering={isRecovering} /> : <Navigate to={isSuperAdminUser(session.user) ? "/admin" : "/dashboard"} replace />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            
            {/* Protected Routes inside AuthLayout */}
            {session && (
              <Route element={<AuthLayout />}>
                <Route 
                  path="/dashboard" 
                  element={isSuperAdminUser(session.user) ? <Navigate to="/admin" replace /> : <Dashboard />} 
                />
                <Route 
                  path="/customers" 
                  element={isSuperAdminUser(session.user) ? <Navigate to="/admin" replace /> : <Customers />} 
                />
                <Route 
                  path="/customers/:id" 
                  element={isSuperAdminUser(session.user) ? <Navigate to="/admin" replace /> : <CustomerLedger />} 
                />
                <Route 
                  path="/billing" 
                  element={isSuperAdminUser(session.user) ? <Navigate to="/admin" replace /> : <Billing />} 
                />
                <Route 
                  path="/settlement" 
                  element={isSuperAdminUser(session.user) ? <Navigate to="/admin" replace /> : <Settlement />} 
                />
                <Route 
                  path="/subscription" 
                  element={isSuperAdminUser(session.user) ? <Navigate to="/admin" replace /> : <Subscription />} 
                />
                <Route path="/settings" element={<Settings />} />
                <Route 
                  path="/admin" 
                  element={!isSuperAdminUser(session.user) ? <Navigate to="/dashboard" replace /> : <AdminDashboard />} 
                />
              </Route>
            )}

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </Suspense>
    </>
  );
}

export default App;
