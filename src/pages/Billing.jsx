import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Receipt, CheckCircle, ArrowRight, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import SkeletonLoader from '../components/SkeletonLoader';
import DueDatePicker from '../components/DueDatePicker';
import { findDuplicateCustomer } from '../lib/customers';

export default function Billing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Inline Add Customer State
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', firm_name: '', address: '', gst_details: '' });
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, total_outstanding')
        .eq('business_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);

      // Check for pre-filled customer in URL
      const searchParams = new URLSearchParams(location.search);
      const prefilledId = searchParams.get('customer_id');
      if (prefilledId && data && data.some(c => c.id === prefilledId)) {
        const c = data.find(c => c.id === prefilledId);
        setSelectedCustomerId(c.id);
        setCustomerSearch(c.name);
      }

    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }, [location.search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const duplicate = findDuplicateCustomer(customers, newCustomer);
    if (duplicate) {
      toast.error(`Party already exists: ${duplicate.name}`);
      return;
    }
    setIsAddingCustomer(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('customers')
        .insert([{ 
          business_id: user.id, 
          name: newCustomer.name, 
          phone: newCustomer.phone,
          email: newCustomer.email,
          firm_name: newCustomer.firm_name,
          address: newCustomer.address,
          gst_details: newCustomer.gst_details
        }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const newCust = data[0];
        setCustomers(prev => [...prev, newCust].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedCustomerId(newCust.id);
        setCustomerSearch(newCust.name);
      }
      
      setIsAddCustomerModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '', firm_name: '', address: '', gst_details: '' });
      toast.success('Party added successfully!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsAddingCustomer(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !amount || isNaN(amount) || Number(amount) <= 0 || !dueDate) {
      toast.error('Please select a party, valid amount, and a due date.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const numericAmount = Number(amount);

      const { error: billError } = await supabase.rpc('create_bill', {
        p_customer_id: selectedCustomerId,
        p_amount: numericAmount,
        p_due_date: dueDate,
        p_note: description || null,
        p_bill_no: `INV-${Date.now().toString().slice(-6)}`,
      });

      if (billError) throw billError;

      setSuccess(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      toast.error(error.message);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <SkeletonLoader className="w-12 h-12 rounded-2xl" />
          <div>
            <SkeletonLoader className="w-48 h-8 mb-2" />
            <SkeletonLoader className="w-32 h-4" />
          </div>
        </div>
        <SkeletonLoader className="w-full h-[400px]" />
      </div>
    );
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const newProjectedBalance = selectedCustomer
    ? Number(selectedCustomer.total_outstanding || 0) + (Number(amount) || 0)
    : Number(amount) || 0;

  return (
    <motion.div
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <header className="mb-7 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-white border border-zinc-300 flex items-center justify-center text-zinc-900">
            <Receipt size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-zinc-900 tracking-tight">{t('billing.title')}</h1>
            <p className="text-zinc-600 text-[14px] mt-0.5">{t('billing.subtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsAddCustomerModalOpen(true)}
          className="btn-solid px-4 py-2 text-[13px] hidden sm:inline-flex"
        >
          <UserPlus size={15} /> {t('customers.addCustomer')}
        </button>
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
            <h2 className="text-2xl font-display font-bold text-zinc-900 mb-2">Entry Recorded!</h2>
            <p className="text-zinc-600 text-[15px]">The ledger has been updated successfully.</p>
            <p className="text-[13px] text-zinc-500 mt-6 font-medium">Redirecting to Dashboard...</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Customer / Party Selection */}
            <div className="relative">
              <div className="flex justify-between items-end mb-1.5">
                <label htmlFor="customerSearch" className="block text-[13px] font-semibold text-zinc-800">
                  {t('billing.selectCustomer')} *
                </label>
                {customers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerModalOpen(true)}
                    className="text-zinc-900 font-semibold flex items-center gap-1 hover:underline text-[13px]"
                  >
                    <UserPlus size={15} /> {t('billing.addNewParty')}
                  </button>
                )}
              </div>

              {customers.length === 0 ? (
                <div className="p-4 rounded-md border border-red-200 bg-red-50 text-red-700 font-medium text-[14px] flex justify-between items-center">
                  <span>{t('customers.noCustomersFound')}</span>
                  <button type="button" onClick={() => setIsAddCustomerModalOpen(true)} className="btn-primary text-[13px] py-1.5 px-3">
                    {t('customers.addCustomer')}
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    id="customerSearch"
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setIsDropdownOpen(true);
                      if (e.target.value === '') setSelectedCustomerId('');
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                    placeholder={t('billing.searchCustomerPlaceholder')}
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
                        {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length > 0 ? (
                          customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
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
                              <span className="text-red-600 font-medium tabular-nums">₹{Number(c.total_outstanding).toLocaleString('en-IN')}</span>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-neu-text text-sm">No match found.</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label htmlFor="amount" className="block text-[13px] font-semibold text-zinc-800">
                  {t('billing.amountLabel')} *
                </label>
                {Number(amount) > 0 && (
                  <span className="text-[13px] font-semibold text-zinc-600 tabular-nums">
                    ₹{Number(amount).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-900 font-display font-bold text-lg">₹</span>
                <input
                  id="amount"
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="input-field pl-10 py-3 font-display font-bold text-lg tabular-nums"
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[500, 1000, 2000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String((Number(amount) || 0) + preset))}
                    className="py-1.5 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 text-[13px] font-semibold text-zinc-700 tabular-nums transition-colors duration-150"
                  >
                    +₹{preset.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-[13px] font-semibold text-zinc-800 mb-1.5">
                {t('billing.dueDateLabel')} *
              </label>
              <DueDatePicker value={dueDate} onChange={setDueDate} />
            </div>

            {/* Description / Note */}
            <div>
              <label htmlFor="description" className="block text-[13px] font-semibold text-zinc-800 mb-1.5">
                {t('billing.noteLabel')}
              </label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('billing.notePlaceholder')}
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || customers.length === 0}
              className="btn-primary w-full py-3.5 text-[15px] mt-2"
            >
              {isSubmitting ? t('settings.saving') : t('billing.submitBtn')}
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>
        )}

        </div>

        {/* Right Column: Live Customer Summary + Quick-Pick Action Cards */}
        <div className="lg:col-span-5 space-y-5">
          {selectedCustomer ? (
            <div className="bg-white border border-zinc-300 rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
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
                  <p className="text-lg font-display font-bold text-zinc-900 tabular-nums">
                    ₹{Number(selectedCustomer.total_outstanding || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-zinc-500">{t('ledger.totalOutstanding')}</p>
                  <p className="text-lg font-display font-bold text-red-600 tabular-nums">
                    ₹{newProjectedBalance.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {customers.length > 0 && (
            <div className="bg-white border border-zinc-300 rounded-lg p-6 space-y-3">
              <h3 className="text-[14px] font-display font-bold text-zinc-900">
                {t('billing.selectCustomer')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
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
                      <span className={`text-[13px] font-bold tabular-nums shrink-0 ${isPicked ? 'text-zinc-200' : 'text-red-600'}`}>
                        ₹{Number(c.total_outstanding || 0).toLocaleString('en-IN')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inline Add Customer Modal */}
      <Modal isOpen={isAddCustomerModalOpen} onClose={() => setIsAddCustomerModalOpen(false)} title="Add Party">
        <form onSubmit={handleAddCustomer} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="newCustomerName" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">{t('customers.partyName')} *</label>
              <input 
                id="newCustomerName"
                type="text" required value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                placeholder={t('customers.partyNamePlaceholder')} className="input-field"
              />
            </div>
            <div>
              <label htmlFor="newCustomerFirm" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">{t('settings.firmName')} *</label>
              <input 
                id="newCustomerFirm"
                type="text" required value={newCustomer.firm_name} onChange={e => setNewCustomer({...newCustomer, firm_name: e.target.value})}
                placeholder={t('settings.firmNamePlaceholder')} className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="newCustomerPhone" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">{t('customers.phoneLabel')} *</label>
              <input 
                id="newCustomerPhone"
                type="tel" required value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                placeholder={t('customers.phonePlaceholder')} className="input-field"
              />
            </div>
            <div>
              <label htmlFor="newCustomerEmail" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">{t('customers.emailLabel')} *</label>
              <input 
                id="newCustomerEmail"
                type="email" required value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                placeholder={t('customers.emailPlaceholder')} className="input-field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="newCustomerGst" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">GST *</label>
            <input 
              id="newCustomerGst"
              type="text" required value={newCustomer.gst_details} onChange={e => setNewCustomer({...newCustomer, gst_details: e.target.value})}
              placeholder="e.g. 29ABCDE1234F1Z5" className="input-field uppercase"
            />
          </div>

          <div>
            <label htmlFor="newCustomerAddress" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">{t('customers.addressLabel')} *</label>
            <textarea 
              id="newCustomerAddress"
              rows="2" required value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
              placeholder={t('customers.addressPlaceholder')} className="input-field resize-none"
            />
          </div>

          <button type="submit" disabled={isAddingCustomer} className="btn-solid w-full mt-6 py-4">
            {isAddingCustomer ? t('settings.saving') : t('customers.saveParty')}
          </button>
        </form>
      </Modal>
    </motion.div>
  );
}
