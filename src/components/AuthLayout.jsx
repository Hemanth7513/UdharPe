import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { isSuperAdminUser } from '../lib/admin';
import { LayoutDashboard, Users, PlusCircle, LogOut, Settings, ShieldAlert, Handshake, ChevronDown, User, ShieldCheck } from 'lucide-react';

export default function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const fetchUserAndRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        setIsAdmin(isSuperAdminUser(user));
      }
    };
    fetchUserAndRole();
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const navItems = isAdmin
    ? [
        { name: 'Platform Command Center', path: '/admin', icon: ShieldAlert },
        { name: 'Settings', path: '/settings', icon: Settings },
      ]
    : [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Customers', path: '/customers', icon: Users },
        { name: 'Raise Bill', path: '/billing', icon: PlusCircle },
        { name: 'Settings', path: '/settings', icon: Settings },
      ];

  const firmName = isAdmin 
    ? 'Platform Superadmin' 
    : (currentUser?.user_metadata?.firm_name || 'My Business');
  const ownerName = currentUser?.user_metadata?.owner_name || '';
  const userInitials = isAdmin ? 'SA' : (firmName || currentUser?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Top Navbar */}
      <nav className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => navigate(isAdmin ? '/admin' : '/dashboard')}
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

            {/* User Profile & Account Menu */}
            <div className="relative flex items-center gap-3" ref={menuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white font-black text-xs flex items-center justify-center shadow-sm relative">
                  {userInitials}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{firmName}</div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    {isAdmin ? (
                      <span className="text-indigo-600 font-bold flex items-center gap-0.5">
                        <ShieldCheck size={11} /> Admin
                      </span>
                    ) : (
                      'Merchant'
                    )}
                  </div>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-14 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-50 overflow-hidden"
                  >
                    <div className="p-3 bg-slate-50 rounded-xl mb-1.5 border border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{firmName}</p>
                      {ownerName && <p className="text-[11px] text-slate-500 truncate">{ownerName}</p>}
                      <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">{currentUser?.email}</p>
                      {isAdmin && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                          <ShieldCheck size={11} /> Platform Superadmin
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          navigate('/settings');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors text-left"
                      >
                        <Settings size={15} className="text-slate-500" /> Business Profile &amp; Settings
                      </button>

                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => {
                              setIsProfileMenuOpen(false);
                              navigate('/admin');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors text-left"
                          >
                            <ShieldAlert size={15} /> Platform Command Center
                          </button>
                          <button
                            onClick={() => {
                              setIsProfileMenuOpen(false);
                              navigate('/dashboard');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors text-left"
                          >
                            <LayoutDashboard size={15} className="text-slate-400" /> Preview Merchant View
                          </button>
                        </>
                      ) : null}

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                      >
                        <LogOut size={15} /> Sign Out of UdharPe
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
