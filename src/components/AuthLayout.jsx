import { useState, useEffect, useRef, Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { isSuperAdminUser } from '../lib/admin';
import { LayoutDashboard, Users, PlusCircle, LogOut, Settings, ShieldAlert, ChevronDown, ShieldCheck, Search, Sparkles } from 'lucide-react';
import CommandPalette from './CommandPalette';
import BrandMark from './BrandMark';
import LanguageSelector from './LanguageSelector';

export default function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

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
        { name: t('nav.commandCenter'), path: '/admin', icon: ShieldAlert },
        { name: t('nav.settings'), path: '/settings', icon: Settings },
      ]
    : [
        { name: t('nav.dashboard'), path: '/dashboard', icon: LayoutDashboard },
        { name: t('nav.customers'), path: '/customers', icon: Users },
        { name: t('nav.raiseBill'), path: '/billing', icon: PlusCircle },
        { name: 'Subscription', path: '/subscription', icon: Sparkles },
        { name: t('nav.settings'), path: '/settings', icon: Settings },
      ];

  const firmName = isAdmin
    ? 'Platform Superadmin'
    : (currentUser?.user_metadata?.firm_name || 'My Business');
  const ownerName = currentUser?.user_metadata?.owner_name || '';
  const userInitials = isAdmin ? 'SA' : (firmName || currentUser?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f4f5] text-zinc-900">
      {/* Top Navbar */}
      <nav className="w-full bg-[#f4f4f5]/85 backdrop-blur-xl border-b border-zinc-300/90 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-3">
            {/* Brand Logo */}
            <button
              type="button"
              onClick={() => navigate(isAdmin ? '/admin' : '/dashboard')}
              aria-label="UdharPe Home"
              className="flex items-center gap-2.5 shrink-0 hover:opacity-85 transition-opacity duration-150"
            >
              <BrandMark size={38} />
            </button>

            {/* Desktop Editorial Navigation (Open & Fluid, No Box Container) */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path === '/customers' && location.pathname.startsWith('/customers/'));
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`relative px-3.5 py-2 rounded-md text-[14px] flex items-center gap-2 transition-colors duration-150 ${
                      isActive
                        ? 'text-zinc-900 font-semibold'
                        : 'text-zinc-500 font-medium hover:text-zinc-900 hover:bg-zinc-200/55'
                    }`}
                  >
                    <Icon size={16} className={`shrink-0 transition-colors duration-150 ${isActive ? 'text-emerald-700' : 'text-zinc-400'}`} />
                    <span className="whitespace-nowrap">{item.name}</span>
                    {isActive && (
                      <motion.span
                        layoutId="activeNavIndicator"
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                        className="absolute left-3 right-3 -bottom-[11px] h-[2.5px] rounded-full bg-zinc-900"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Unified Utility Rail: Language + Search + User Menu */}
            <div className="relative flex items-center gap-2 shrink-0" ref={menuRef}>
              <div className="hidden lg:block">
                <LanguageSelector variant="compact" />
              </div>

              <button
                onClick={() => setIsCommandOpen(true)}
                className="hidden sm:flex h-9 items-center gap-2 px-3 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-600 hover:text-zinc-900 transition-colors duration-150 text-[13px] font-medium"
                title={`${t('common.search')} (Ctrl+K)`}
              >
                <Search size={14} className="text-zinc-500" />
                <span className="hidden xl:inline">{t('common.search')}</span>
                <kbd className="px-1.5 py-0.5 text-[11px] font-semibold leading-none bg-zinc-100 border border-zinc-300 rounded text-zinc-600">⌘K</kbd>
              </button>

              <button
                onClick={() => setIsCommandOpen(true)}
                className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-zinc-300 text-zinc-700"
                aria-label="Search"
              >
                <Search size={17} />
              </button>

              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex h-9 items-center gap-2 pl-1 pr-2.5 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-300 transition-colors duration-150 text-left"
              >
                <div className="w-7 h-7 rounded-md bg-zinc-900 text-white font-display font-bold text-[12px] flex items-center justify-center">
                  {userInitials}
                </div>
                <div className="hidden sm:block">
                  <div className="text-[13px] font-bold text-zinc-900 truncate max-w-[120px] leading-tight">{firmName}</div>
                </div>
                <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-150 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-12 w-64 bg-white rounded-lg shadow-elevated border border-zinc-300 p-2 z-50"
                  >
                    <div className="p-3 bg-zinc-50 rounded-md mb-1.5 border border-zinc-200">
                      <p className="text-[14px] font-display font-bold text-zinc-900 truncate">{firmName}</p>
                      {ownerName && <p className="text-[13px] text-zinc-600 truncate">{ownerName}</p>}
                      <p className="text-[13px] text-zinc-500 truncate mt-0.5">{currentUser?.email}</p>
                      {isAdmin && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-zinc-900">
                          <ShieldCheck size={14} /> Platform Superadmin
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          navigate('/settings');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[14px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors duration-150 text-left"
                      >
                        <Settings size={15} className="text-zinc-500" /> {t('nav.settings')}
                      </button>

                      {isAdmin ? (
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            navigate('/admin');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[14px] font-medium text-zinc-900 hover:bg-zinc-100 transition-colors duration-150 text-left"
                        >
                          <ShieldAlert size={15} /> {t('nav.commandCenter')}
                        </button>
                      ) : null}

                      <div className="my-1 border-t border-zinc-200" />

                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[14px] font-medium text-red-600 hover:bg-red-50 transition-colors duration-150 text-left"
                      >
                        <LogOut size={15} /> {t('nav.signOut')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Bar (outside sticky/backdrop-blur nav so fixed bottom-0 anchors to viewport) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-zinc-300 z-50 px-2 py-1.5">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === '/customers' && location.pathname.startsWith('/customers/'));
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`py-1.5 px-2 flex-1 rounded-md flex flex-col items-center justify-center gap-1 transition-colors duration-150 ${
                  isActive ? 'text-zinc-900 font-bold bg-zinc-100' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                <span className="text-[11px] text-center truncate max-w-full">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto pb-24 md:pb-12 pt-6">
        <Suspense
          fallback={
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="h-8 w-44 bg-zinc-200/80 rounded-md animate-pulse mb-6" />
              <div className="h-64 w-full bg-white border border-zinc-200 rounded-lg animate-pulse" />
            </div>
          }
        >
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </Suspense>
      </main>

      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
