import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';

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
    <Routes>
      <Route path="/" element={!session ? <Landing /> : <Navigate to="/dashboard" replace />} />
      <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/auth" replace />} />
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
