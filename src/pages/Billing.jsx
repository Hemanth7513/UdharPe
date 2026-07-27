import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Receipt, CheckCircle, ArrowRight, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import SkeletonLoader from '../components/SkeletonLoader';

export default function Billing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  // Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Inline Add Customer State
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('customers')
        .select('id, name, total_outstanding')
        .eq('business_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);

      // Check for pre-filled customer in URL
      const searchParams = new URLSearchParams(location.search);
      const prefilledId = searchParams.get('customer_id');
      if (prefilledId && data && data.some(c => c.id === prefilledId)) {
        setSelectedCustomerId(prefilledId);
      }

    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setIsAddingCustomer(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('customers')
        .insert([{ 
          business_id: user.id, 
          name: newCustomerName, 
          phone: newCustomerPhone 
        }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const newCust = data[0];
        setCustomers(prev => [...prev, newCust].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedCustomerId(newCust.id); // Auto-select the new customer
      }
      
      setIsAddCustomerModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      toast.success('Party added successfully!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsAddingCustomer(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !amount || isNaN(amount) || Number(amount) <= 0) {
      toast.error('Please select a party and enter a valid amount.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const numericAmount = Number(amount);

      // 1. Insert the new bill/udhar entry
      const { error: billError } = await supabase
        .from('bills')
        .insert([{
          business_id: user.id,
          customer_id: selectedCustomerId,
          amount: numericAmount,
          remaining_amount: numericAmount,
          status: 'pending',
          note: description,
          due_date: new Date().toISOString().split('T')[0] // default to today since we removed due date UI
        }]);

      if (billError) throw billError;

      // 2. Fetch current outstanding for the customer
      const customer = customers.find(c => c.id === selectedCustomerId);
      const newTotal = Number(customer.total_outstanding) + numericAmount;

      // 3. Update the customer's total_outstanding balance
      const { error: updateError } = await supabase
        .from('customers')
        .update({ total_outstanding: newTotal })
        .eq('id', selectedCustomerId);

      if (updateError) throw updateError;

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

  return (
    <motion.div 
      className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in pb-12"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    >
      <header className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 shadow-neu rounded-2xl flex items-center justify-center text-neu-primary bg-neu-bg">
          <Receipt size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-neu-heading tracking-tight">Record Udhar</h1>
          <p className="text-neu-text font-medium text-sm mt-1">Add a new entry to a party's ledger</p>
        </div>
      </header>

      <div className="neu-card p-6 sm:p-10 border border-white/40 relative z-10">
        
        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="py-12 text-center"
          >
            <div className="w-20 h-20 mx-auto bg-neu-bg shadow-neu rounded-full flex items-center justify-center text-neu-primary mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-black text-neu-heading mb-2">Entry Recorded!</h2>
            <p className="text-neu-text font-medium">The ledger has been updated successfully.</p>
            <p className="text-xs text-neu-text/60 mt-8 uppercase tracking-widest font-bold">Redirecting to Dashboard...</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Customer / Party Selection */}
            <div className="relative">
              <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-bold text-neu-heading pl-1 uppercase tracking-wide">
                  Customer / Party *
                </label>
                {customers.length > 0 && (
                  <button 
                    type="button" 
                    onClick={() => setIsAddCustomerModalOpen(true)}
                    className="text-neu-primary font-bold flex items-center gap-1 hover:underline text-sm"
                  >
                    <UserPlus size={16} /> New Party
                  </button>
                )}
              </div>
              
              {customers.length === 0 ? (
                <div className="p-4 rounded-2xl shadow-neu-inner bg-neu-bg text-neu-danger font-medium text-sm flex justify-between items-center">
                  <span>No parties found. Please add a customer first.</span>
                  <button type="button" onClick={() => setIsAddCustomerModalOpen(true)} className="btn-primary text-xs py-1.5 px-3">
                    Add Customer
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <select 
                    value={selectedCustomerId} 
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    required
                    className="w-full bg-neu-bg text-neu-heading rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-neu-primary/30 shadow-neu-inner font-bold appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select a party...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Current Udhar: ₹{Number(c.total_outstanding).toLocaleString()})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-neu-primary">
                    ▼
                  </div>
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-bold text-neu-heading mb-2 pl-1 uppercase tracking-wide">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neu-heading font-black text-xl">₹</span>
                <input 
                  type="number" 
                  required 
                  min="1"
                  step="0.01"
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00" 
                  className="w-full bg-neu-bg text-neu-heading rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-neu-primary/30 shadow-neu-inner font-black text-xl"
                />
              </div>
            </div>

            {/* Description / Note */}
            <div>
              <label className="block text-sm font-bold text-neu-heading mb-2 pl-1 uppercase tracking-wide">
                Description / Note (Optional)
              </label>
              <input 
                type="text" 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Invoice #1042, Materials, etc." 
                className="input-field"
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || customers.length === 0} 
              className="btn-solid w-full py-5 text-lg mt-4 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Recording...' : 'Record Udhar Entry'}
              {!isSubmitting && <ArrowRight size={20} />}
            </button>
          </form>
        )}

      </div>

      {/* Inline Add Customer Modal */}
      <Modal isOpen={isAddCustomerModalOpen} onClose={() => setIsAddCustomerModalOpen(false)} title="Add Party">
        <form onSubmit={handleAddCustomer} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">Party Name *</label>
            <input 
              type="text" required value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)}
              placeholder="e.g. Ramesh Singh" className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">Phone Number (Optional)</label>
            <input 
              type="tel" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)}
              placeholder="e.g. 9876543210" className="input-field"
            />
          </div>

          <button type="submit" disabled={isAddingCustomer} className="btn-solid w-full mt-6 py-4">
            {isAddingCustomer ? 'Saving...' : 'Save Party'}
          </button>
        </form>
      </Modal>
    </motion.div>
  );
}
