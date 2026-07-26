import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <div className="app-container">
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />} />
          <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/auth" replace />} />
          {/* We will add Customers and Billing routes later */}
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default App;
