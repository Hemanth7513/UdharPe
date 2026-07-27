import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import Customers from './pages/Customers';
import CustomerLedger from './pages/CustomerLedger';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import AuthLayout from './components/AuthLayout';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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
      <Routes>
        <Route path="/" element={!session ? <Landing /> : <Navigate to="/dashboard" replace />} />
        <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/dashboard" replace />} />
        
        {/* Protected Routes inside AuthLayout */}
        {session && (
          <Route element={<AuthLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerLedger />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        )}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
