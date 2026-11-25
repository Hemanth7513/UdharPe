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

  // Load customers for quick jump when opened by a merchant
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
      { id: 'nav-bill', label: 'Raise New Bill', sub: 'Record credit entry (Udhar)', path: '/billing', icon: PlusCircle },
      { id: 'nav-cust', label: 'All Customers', sub: 'Directory & Balances', path: '/customers', icon: Users },
      { id: 'nav-set', label: 'Business Settings', sub: 'Firm Profile & Account', path: '/settings', icon: Settings },
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

  // Keyboard navigation inside modal
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
            onClick={onClose}
            className="fixed inset-0 bg-stone-900/45 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 360 }}
            className="relative w-full max-w-lg bg-[#fffdf9] rounded-lg shadow-2xl border-2 border-stone-800 overflow-hidden z-10"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#d6cbb9] bg-[#f6f0e4]">
              <Search size={18} className="text-red-800 shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isAdmin ? 'Jump to admin section...' : 'Search party name, phone, or action...'}
                className="w-full bg-transparent text-stone-900 placeholder-stone-500 text-sm font-medium outline-none"
              />
              <button onClick={onClose} className="p-1 text-stone-500 hover:text-stone-900 rounded">
                <X size={16} />
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {results.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-stone-500">
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
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left transition-colors ${
                        active
                          ? 'bg-red-800 text-white'
                          : 'text-stone-800 hover:bg-[#f0e9db]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                          active ? 'bg-red-900 text-white' : 'bg-[#f0e9db] text-stone-700'
                        }`}>
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">{item.label}</div>
                          <div className={`text-[11px] font-mono truncate ${active ? 'text-red-100' : 'text-stone-500'}`}>
                            {item.sub}
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={14} className={`shrink-0 ${active ? 'text-white' : 'text-stone-400'}`} />
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Hints */}
            <div className="px-4 py-2 bg-[#f6f0e4] border-t border-[#d6cbb9] flex items-center justify-between text-[10px] font-mono text-stone-500">
              <span>↑↓ Navigate · ↵ Open</span>
              <span>ESC to close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
