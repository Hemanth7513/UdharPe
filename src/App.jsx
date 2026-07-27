import { useEffect, useState, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { AnimatePresence } from 'framer-motion';

// Lazy loaded pages
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Landing = lazy(() => import('./pages/Landing'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerLedger = lazy(() => import('./pages/CustomerLedger'));
const Billing = lazy(() => import('./pages/Billing'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));

import AuthLayout from './components/AuthLayout';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const location = useLocation();

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
      <Toaster position="top-center" toastOptions={{ className: 'font-bold' }} />
      <AnimatePresence mode="wait">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-neu-bg">
            <div className="animate-pulse text-neu-primary font-bold">Loading...</div>
          </div>
        }>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={!session ? <Landing /> : <Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={(!session || isRecovering) ? <Auth isRecovering={isRecovering} /> : <Navigate to="/dashboard" replace />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            
            {/* Protected Routes inside AuthLayout */}
            {session && (
              <Route element={<AuthLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id" element={<CustomerLedger />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>
            )}

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </>
  );
}

export default App;
