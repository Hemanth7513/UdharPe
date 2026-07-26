import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, ArrowRight, IndianRupee } from 'lucide-react';

export default function Settlement() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  
  // Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

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
        .gt('total_outstanding', 0) // Only fetch customers who owe money
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !amount || isNaN(amount) || Number(amount) <= 0) {
      setErrorMsg('Please select a party and enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const numericAmount = Number(amount);
      const customer = customers.find(c => c.id === selectedCustomerId);

      if (numericAmount > Number(customer.total_outstanding)) {
          throw new Error('Payment amount cannot be greater than the outstanding Udhar.');
      }

      // 1. Insert the new settlement entry
      const { error: settlementError } = await supabase
        .from('settlements')
        .insert([{
          business_id: user.id,
          customer_id: selectedCustomerId,
          amount_paid: numericAmount,
          note: note
        }]);

      if (settlementError) {
          // If the table doesn't exist yet, we catch it
          if (settlementError.code === '42P01') {
              throw new Error("Database error: Please run the SQL command provided in the chat to create the 'settlements' table.");
          }
          throw settlementError;
      }

      // 2. Fetch current outstanding for the customer and subtract the payment
      const newTotal = Number(customer.total_outstanding) - numericAmount;

      // 3. Update the customer's total_outstanding balance
      const { error: updateError } = await supabase
        .from('customers')
        .update({ total_outstanding: newTotal })
        .eq('id', selectedCustomerId);

      if (updateError) throw updateError;

      setSuccess(true);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      setErrorMsg(error.message);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-neu-primary font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <motion.div 
      className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    >
      <header className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 shadow-neu rounded-2xl flex items-center justify-center text-neu-primary bg-neu-bg">
          <IndianRupee size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-neu-heading tracking-tight">Record Payment</h1>
          <p className="text-neu-text font-medium text-sm mt-1">Settle an outstanding Udhar balance</p>
        </div>
      </header>

      <div className="neu-card p-6 sm:p-10 border border-white/40">
        
        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="py-12 text-center"
          >
            <div className="w-20 h-20 mx-auto bg-neu-bg shadow-neu rounded-full flex items-center justify-center text-neu-primary mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-black text-neu-heading mb-2">Payment Recorded!</h2>
            <p className="text-neu-text font-medium">The customer's Udhar balance has been reduced.</p>
            <p className="text-xs text-neu-text/60 mt-8 uppercase tracking-widest font-bold">Redirecting to Dashboard...</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {errorMsg && (
              <div className="bg-neu-bg shadow-neu-inner text-neu-danger p-4 rounded-xl text-sm font-medium">
                {errorMsg}
              </div>
            )}

            {/* Customer / Party Selection */}
            <div>
              <label className="block text-sm font-bold text-neu-heading mb-2 pl-1 uppercase tracking-wide">
                Customer / Party *
              </label>
              {customers.length === 0 ? (
                <div className="p-4 rounded-2xl shadow-neu-inner bg-neu-bg text-neu-text font-medium text-sm flex justify-center items-center text-center">
                  <span>No customers currently have an outstanding balance! You're all settled.</span>
                </div>
              ) : (
                <div className="relative">
                  <select 
                    value={selectedCustomerId} 
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    required
                    className="w-full bg-neu-bg text-neu-heading rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-neu-primary/30 shadow-neu-inner font-bold appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select a party to settle...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Owes: ₹{Number(c.total_outstanding).toLocaleString()})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-neu-primary">
                    ▼
                  </div>
                </div>
              )}
            </div>

            {/* Amount Paid */}
            <div>
              <label className="block text-sm font-bold text-neu-heading mb-2 pl-1 uppercase tracking-wide">
                Amount Paid (₹) *
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
                Note (Optional)
              </label>
              <input 
                type="text" 
                value={note} 
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Paid in Cash, Bank Transfer, etc." 
                className="input-field"
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || customers.length === 0} 
              className="btn-solid w-full py-5 text-lg mt-4 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Processing...' : 'Record Payment'}
              {!isSubmitting && <ArrowRight size={20} />}
            </button>
          </form>
        )}

      </div>
    </motion.div>
  );
}
