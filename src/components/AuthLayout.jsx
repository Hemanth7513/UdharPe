import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { isSuperAdminUser } from '../lib/admin';
import { LayoutDashboard, Users, PlusCircle, LogOut, Settings, ShieldAlert, Handshake, ChevronDown, ShieldCheck } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col selection:bg-red-800 selection:text-white">
      {/* Top Navbar — Digital Bahi-Khata Header */}
      <nav className="w-full bg-[#fffdf9]/95 backdrop-blur-md border-b-2 border-stone-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => navigate(isAdmin ? '/admin' : '/dashboard')}
            >
              <div className="w-11 h-11 rounded-lg bg-red-800 shadow-sm border border-red-900 flex items-center justify-center text-[#fffdf9]">
                <Handshake size={24} />
              </div>
              <div className="hidden sm:block">
                <span className="text-2xl font-serif font-bold text-stone-900 tracking-tight block leading-none">UdharPe</span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-stone-500">Digital Bahi-Khata</span>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1.5 p-1 bg-[#f0e9db] rounded-lg border border-[#d6cbb9]">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.path)}
                    className={`relative px-4 py-2 rounded-md flex items-center gap-2 font-bold text-sm transition-colors ${
                      isActive 
                        ? 'text-red-800' 
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNavTab"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                        className="absolute inset-0 bg-[#fffdf9] rounded-md shadow-sm border border-[#c7bba7] -z-0"
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
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-lg bg-[#f0e9db] hover:bg-[#e7decb] border border-[#d6cbb9] transition-all text-left"
              >
                <div className="w-9 h-9 rounded-md bg-stone-900 text-[#fffdf9] font-mono font-bold text-xs flex items-center justify-center shadow-sm relative">
                  {userInitials}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-600 border-2 border-[#fffdf9] rounded-full" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-stone-900 truncate max-w-[120px]">{firmName}</div>
                  <div className="text-[10px] font-mono font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                    {isAdmin ? (
                      <span className="text-red-800 font-bold flex items-center gap-0.5">
                        <ShieldCheck size={11} /> Admin
                      </span>
                    ) : (
                      'Merchant'
                    )}
                  </div>
                </div>
                <ChevronDown size={14} className={`text-stone-500 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-14 w-64 bg-[#fffdf9] rounded-lg shadow-xl border border-[#c7bba7] p-2 z-50 overflow-hidden"
                  >
                    <div className="p-3 bg-[#f6f0e4] rounded-md mb-1.5 border border-[#d6cbb9]">
                      <p className="text-xs font-serif font-bold text-stone-900 truncate">{firmName}</p>
                      {ownerName && <p className="text-[11px] text-stone-600 truncate">{ownerName}</p>}
                      <p className="text-[10px] text-stone-500 font-mono truncate mt-0.5">{currentUser?.email}</p>
                      {isAdmin && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono font-bold text-red-800 bg-red-50 border border-red-300 px-2 py-0.5 rounded-sm">
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
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold text-stone-700 hover:bg-[#f0e9db] transition-colors text-left"
                      >
                        <Settings size={15} className="text-stone-500" /> Business Profile &amp; Settings
                      </button>

                      {isAdmin ? (
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            navigate('/admin');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold text-red-800 hover:bg-red-50 transition-colors text-left"
                        >
                          <ShieldAlert size={15} /> Platform Command Center
                        </button>
                      ) : null}

                      <div className="my-1 border-t border-[#d6cbb9]" />

                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold text-red-700 hover:bg-red-50 transition-colors text-left"
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

        {/* Mobile Floating Bottom Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#fffdf9]/95 backdrop-blur-lg border-t-2 border-stone-800 z-50 px-3 py-2 pb-safe min-h-[4.5rem]">
          <div className="flex justify-around items-center h-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`relative p-2 flex-1 mx-1 rounded-md flex flex-col items-center justify-center gap-1 transition-colors ${
                    isActive ? 'text-red-800' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobileActiveTab"
                      transition={{ type: 'spring', bounce: 0.25, duration: 0.35 }}
                      className="absolute inset-0 bg-[#f0e9db] border border-[#c7bba7] rounded-md -z-0"
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
