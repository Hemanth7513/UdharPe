import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { isSuperAdminUser } from '../lib/admin';
import { LayoutDashboard, Users, PlusCircle, LogOut, Settings, ShieldAlert, Handshake } from 'lucide-react';

export default function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAdmin(isSuperAdminUser(user));
    };
    checkAdmin();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Raise Bill', path: '/billing', icon: PlusCircle },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Admin', path: '/admin', icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Top Navbar */}
      <nav className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => navigate('/dashboard')}
            >
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/25 flex items-center justify-center text-white">
                <Handshake size={24} />
              </div>
              <span className="text-2xl font-black text-slate-900 tracking-tight hidden sm:block">UdharPe</span>
            </motion.div>

            {/* Desktop Navigation with Animated Framer Pill */}
            <div className="hidden md:flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/60">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.path)}
                    className={`relative px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-colors ${
                      isActive 
                        ? 'text-indigo-600' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNavTab"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                        className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/50 -z-0"
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon size={17} />
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Logout Button */}
            <div className="flex items-center gap-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile Floating Bottom Bar with Layout Animation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 z-50 px-3 py-2 pb-safe min-h-[4.5rem]">
          <div className="flex justify-around items-center h-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`relative p-2 flex-1 mx-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors ${
                    isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobileActiveTab"
                      transition={{ type: 'spring', bounce: 0.25, duration: 0.35 }}
                      className="absolute inset-0 bg-indigo-50 rounded-2xl -z-0"
                    />
                  )}
                  <Icon size={20} className="relative z-10 shrink-0" />
                  <span className="relative z-10 text-[11px] text-center font-bold">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto pb-24 md:pb-8 pt-6">
        <Outlet />
      </main>
    </div>
  );
}
