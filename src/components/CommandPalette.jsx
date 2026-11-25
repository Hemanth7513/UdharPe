import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutDashboard, Users, PlusCircle, Settings, ShieldAlert, ArrowRight, User, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function CommandPalette({ isOpen, onClose, isAdmin }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
      return;
    }

    if (isAdmin) return;

    const loadCustomers = async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, total_outstanding')
        .order('name', { ascending: true })
        .limit(50);
      if (data) setCustomers(data);
    };
    loadCustomers();
  }, [isOpen, isAdmin]);

  const baseActions = useMemo(() => {
    if (isAdmin) {
      return [
        { id: 'nav-admin', label: 'Platform Command Center', sub: 'Analytics & Merchant Audit', path: '/admin', icon: ShieldAlert },
        { id: 'nav-settings', label: 'System Settings', sub: 'Account & Profile', path: '/settings', icon: Settings },
      ];
    }
    return [
      { id: 'nav-dash', label: 'Dashboard', sub: 'Business Overview & KPIs', path: '/dashboard', icon: LayoutDashboard },
      { id: 'nav-bill', label: 'Raise Bill', sub: 'Record Udhar for a customer', path: '/billing', icon: PlusCircle },
      { id: 'nav-cust', label: 'Customers', sub: 'Customer directory & balances', path: '/customers', icon: Users },
      { id: 'nav-set', label: 'Settings', sub: 'Business Profile & Account', path: '/settings', icon: Settings },
    ];
  }, [isAdmin]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedActions = baseActions.filter(
      (a) => !q || a.label.toLowerCase().includes(q) || a.sub.toLowerCase().includes(q)
    );

    const matchedCustomers = isAdmin
      ? []
      : customers
          .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)))
          .slice(0, 6)
          .map((c) => ({
            id: `cust-${c.id}`,
            label: c.name,
            sub: `${c.phone || 'No phone'} · Outstanding ₹${Number(c.total_outstanding || 0).toLocaleString('en-IN')}`,
            path: `/customers/${c.id}`,
            icon: User,
            isCustomer: true,
          }));

    return [...matchedActions, ...matchedCustomers];
  }, [query, baseActions, customers, isAdmin]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        navigate(results[selectedIndex].path);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, navigate, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/45 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg bg-white rounded-lg shadow-elevated border border-zinc-300 overflow-hidden z-10"
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-200 bg-zinc-50">
              <Search size={18} className="text-zinc-500 shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isAdmin ? 'Search admin section...' : 'Search customer name, phone, or action...'}
                className="w-full bg-transparent text-zinc-900 placeholder-zinc-400 text-[15px] font-medium outline-none"
              />
              <button
                onClick={onClose}
                aria-label="Close search"
                className="p-1 text-zinc-500 hover:text-zinc-900 rounded transition-colors duration-150"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {results.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-zinc-500">
                  No matching pages or customers found.
                </div>
              ) : (
                results.map((item, idx) => {
                  const Icon = item.icon;
                  const active = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => {
                        navigate(item.path);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left transition-colors duration-150 ${
                        active ? 'bg-zinc-900 text-white' : 'text-zinc-800 hover:bg-zinc-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                          active ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-700'
                        }`}>
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold truncate">{item.label}</div>
                          <div className={`text-[13px] tabular-nums truncate ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>
                            {item.sub}
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={14} className={`shrink-0 ${active ? 'text-white' : 'text-zinc-400'}`} />
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-4 py-2.5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-[13px] text-zinc-500">
              <span>↑↓ Navigate · ↵ Open</span>
              <span>Esc to close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
