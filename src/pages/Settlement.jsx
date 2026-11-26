import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { ArrowDownRight, CheckCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonLoader from '../components/SkeletonLoader';

export default function Settlement() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('customers')
        .select('id, name, total_outstanding')
        .eq('business_id', user.id)
        .gt('total_outstanding', 0)
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;
  const maxPayable = Number(selectedCustomer?.total_outstanding || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!selectedCustomerId || !numericAmount || numericAmount <= 0) {
      toast.error('Please select a customer and enter a valid payment amount.');
      return;
    }
    if (numericAmount > maxPayable) {
      toast.error(`Amount exceeds outstanding balance (₹${maxPayable.toLocaleString('en-IN')}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('record_payment', {
        p_customer_id: selectedCustomerId,
        p_amount: numericAmount,
        p_note: note.trim() || null,
        p_bill_id: null,
      });

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        navigate(`/customers/${selectedCustomerId}`);
      }, 1600);
    } catch (error) {
      toast.error(error.message || 'Failed to record payment');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <SkeletonLoader className="w-56 h-10 mb-6" />
        <SkeletonLoader className="w-full h-[360px]" />
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <header className="mb-7 flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-lg bg-white border border-zinc-300 flex items-center justify-center text-emerald-700">
          <ArrowDownRight size={22} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-zinc-900 tracking-tight">{t('settlement.title')}</h1>
          <p className="text-zinc-600 text-[14px] mt-0.5">{t('settlement.subtitle')}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <div className="lg:col-span-7 bg-white border border-zinc-300 rounded-lg p-6 sm:p-8 relative z-10">
        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 text-center"
          >
            <div className="w-16 h-16 mx-auto bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-700 mb-5">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-display font-bold text-zinc-900 mb-2">Payment Recorded!</h2>
            <p className="text-zinc-600 text-[15px]">Customer balance and ledger have been updated.</p>
            <p className="text-[13px] text-zinc-500 mt-6 font-medium">Opening customer ledger...</p>
          </motion.div>
        ) : customers.length === 0 ? (
          <div className="py-10 text-center space-y-4">
            <h2 className="text-xl font-display font-bold text-zinc-900">{t('settlement.noCustomersWithDue')}</h2>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-solid mx-auto"
            >
              {t('nav.dashboard')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Selection */}
            <div className="relative">
              <label htmlFor="settlementCustomer" className="block text-[13px] font-semibold text-zinc-800 mb-1.5">
                {t('settlement.selectCustomer')} *
              </label>
              <input
                id="settlementCustomer"
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setIsDropdownOpen(true);
                  if (e.target.value === '') setSelectedCustomerId('');
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                placeholder={t('settlement.searchPlaceholder')}
                className="input-field py-3 font-semibold"
              />

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.14 }}
                    className="absolute z-50 w-full mt-1.5 bg-white border border-zinc-300 shadow-elevated rounded-lg max-h-60 overflow-y-auto divide-y divide-zinc-200"
                  >
                    {customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length > 0 ? (
                      customers
                        .filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                        .map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setCustomerSearch(c.name);
                              setIsDropdownOpen(false);
                            }}
                            className="px-4 py-3 hover:bg-zinc-50 cursor-pointer font-semibold text-zinc-900 flex justify-between text-[14px]"
                          >
                            <span>{c.name}</span>
                            <span className="text-red-600 font-medium tabular-nums">
                              Due ₹{Number(c.total_outstanding).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))
                    ) : (
                      <div className="px-4 py-3 text-zinc-500 text-[14px]">No matching customer with pending balance.</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {selectedCustomer && (
                <p className="text-[13px] text-zinc-600 mt-1.5 tabular-nums">
                  Current Outstanding: <span className="font-bold text-red-600">₹{maxPayable.toLocaleString('en-IN')}</span>
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label htmlFor="settlementAmount" className="block text-[13px] font-semibold text-zinc-800">
                  {t('settlement.amountReceived')} *
                </label>
                {Number(amount) > 0 && (
                  <span className="text-[13px] font-semibold text-emerald-700 tabular-nums">
                    ₹{Number(amount).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-900 font-display font-bold text-lg">₹</span>
                <input
                  id="settlementAmount"
                  type="number"
                  required
                  min="1"
                  max={maxPayable || undefined}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="input-field pl-10 py-3 font-display font-bold text-lg tabular-nums"
                />
              </div>

              {selectedCustomer && maxPayable > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setAmount(String(maxPayable))}
                    className="px-3 py-1.5 rounded-md border border-zinc-900 bg-zinc-900 text-white text-[13px] font-semibold tabular-nums"
                  >
                    {t('settlement.fullBalance')} (₹{maxPayable.toLocaleString('en-IN')})
                  </button>
                  {maxPayable > 100 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(Math.round(maxPayable / 2)))}
                      className="px-3 py-1.5 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-[13px] font-semibold text-zinc-700 tabular-nums"
                    >
                      {t('settlement.halfBalance')} (₹{Math.round(maxPayable / 2).toLocaleString('en-IN')})
                    </button>
                  )}
                  {[500, 1000, 2000, 5000]
                    .filter((amt) => amt < maxPayable)
                    .map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmount(String(amt))}
                        className="px-3 py-1.5 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-[13px] font-semibold text-zinc-700 tabular-nums"
                      >
                        ₹{amt.toLocaleString('en-IN')}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label htmlFor="settlementNote" className="block text-[13px] font-semibold text-zinc-800 mb-1.5">
                {t('settlement.paymentModeNote')}
              </label>
              <input
                id="settlementNote"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('settlement.paymentModePlaceholder')}
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedCustomerId}
              className="btn-primary w-full py-3.5 text-[15px] disabled:opacity-50"
            >
              {isSubmitting ? t('settings.saving') : t('settlement.submitBtn')}
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>
        )}
      </div>

      {/* Right Column: Actionable Pending Balance Quick-Pick Cards */}
      <div className="lg:col-span-5 space-y-5">
        {selectedCustomer && (
          <div className="bg-white border border-zinc-300 rounded-lg p-6 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-zinc-500">
                  {t('billing.selectedCustomer')}
                </p>
                <h2 className="text-xl font-display font-bold text-zinc-900 mt-0.5">
                  {selectedCustomer.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/customers/${selectedCustomer.id}`)}
                className="btn-solid px-3 py-1.5 text-[13px]"
              >
                {t('customers.viewLedger')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200">
              <div>
                <p className="text-[12px] text-zinc-500">{t('billing.currentBalance')}</p>
                <p className="text-lg font-display font-bold text-red-600 tabular-nums">
                  ₹{maxPayable.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-zinc-500">{t('ledger.balanceDue')}</p>
                <p className="text-lg font-display font-bold text-emerald-700 tabular-nums">
                  ₹{Math.max(0, maxPayable - (Number(amount) || 0)).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        )}

        {customers.length > 0 && (
          <div className="bg-white border border-zinc-300 rounded-lg p-6 space-y-3">
            <h3 className="text-[14px] font-display font-bold text-zinc-900">
              {t('settlement.selectCustomer')}
            </h3>
            <div className="space-y-2">
              {customers.slice(0, 6).map((c) => {
                const isPicked = c.id === selectedCustomerId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setCustomerSearch(c.name);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition-colors duration-150 ${
                      isPicked
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-zinc-50 text-zinc-900 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    <span className="text-[14px] font-semibold truncate pr-2">{c.name}</span>
                    <span className={`text-[13px] font-bold tabular-nums shrink-0 ${isPicked ? 'text-emerald-300' : 'text-red-600'}`}>
                      ₹{Number(c.total_outstanding).toLocaleString('en-IN')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </div>
    </motion.div>
  );
}
