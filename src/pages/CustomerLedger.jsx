import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Receipt, IndianRupee, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function CustomerLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLedger();
  }, [id]);

  const fetchLedger = async () => {
    try {
      // 1. Fetch Customer Details
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
        
      if (custError) throw custError;
      setCustomer(custData);

      // 2. Fetch Bills (Udhar given)
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('id, amount, note, created_at')
        .eq('customer_id', id);
        
      if (billsError) throw billsError;

      // 3. Fetch Settlements (Payments received)
      // Check if table exists first, if it fails, just return empty array
      let settlementsData = [];
      const { data: sData, error: sError } = await supabase
        .from('settlements')
        .select('id, amount_paid, note, created_at')
        .eq('customer_id', id);

      if (!sError) {
          settlementsData = sData;
      }

      // 4. Combine and Sort by Date (newest first)
      const combined = [
        ...(billsData || []).map(b => ({ ...b, type: 'bill', amount: Number(b.amount) })),
        ...settlementsData.map(s => ({ ...s, type: 'payment', amount: Number(s.amount_paid) }))
      ];

      combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setTransactions(combined);

    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-neu-primary font-bold">Loading ledger...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-neu-heading">Customer not found</h2>
        <button onClick={() => navigate('/customers')} className="btn-primary mt-4 px-4 py-2 text-sm">Go Back</button>
      </div>
    );
  }

  return (
    <motion.div 
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in pb-12"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    >
      <button 
        onClick={() => navigate('/customers')}
        className="mb-6 flex items-center gap-2 text-neu-text hover:text-neu-primary transition-colors font-bold text-sm"
      >
        <ArrowLeft size={16} /> Back to Parties
      </button>

      {/* Customer Header Card */}
      <div className="neu-card p-6 sm:p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 shadow-neu-inner rounded-full flex items-center justify-center text-neu-primary bg-neu-bg shrink-0">
             <User size={30} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neu-heading tracking-tight">{customer.name}</h1>
            {customer.phone && <p className="text-neu-text font-medium mt-1 text-sm">{customer.phone}</p>}
          </div>
        </div>
        
        <div className="text-left md:text-right w-full md:w-auto p-4 md:p-0 rounded-2xl md:rounded-none shadow-neu-inner md:shadow-none bg-neu-bg md:bg-transparent">
          <p className="text-sm text-neu-text font-bold uppercase tracking-wider mb-1">Total Outstanding</p>
          <p className="text-4xl font-black text-neu-danger">₹{Number(customer.total_outstanding).toLocaleString()}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 pl-2">
        <h2 className="text-xl font-bold text-neu-heading">Transaction History</h2>
      </div>

      <div className="space-y-4">
        {transactions.length === 0 ? (
           <div className="neu-card p-10 text-center shadow-neu-inner border border-white/30">
             <p className="text-neu-text font-medium">No transactions recorded yet.</p>
           </div>
        ) : (
          transactions.map(t => (
            <div key={t.id} className="neu-card p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-neu-hover transition-all">
              <div className="flex items-center gap-4">
                {t.type === 'bill' ? (
                  <div className="w-12 h-12 rounded-full shadow-neu-inner flex items-center justify-center text-neu-danger bg-neu-bg shrink-0">
                    <ArrowUpRight size={22} />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full shadow-neu-inner flex items-center justify-center text-neu-success bg-neu-bg shrink-0">
                    <ArrowDownRight size={22} />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-neu-heading text-lg">
                    {t.type === 'bill' ? 'Udhar Given' : 'Payment Received'}
                  </h4>
                  <p className="text-sm text-neu-text font-medium mt-0.5">
                    {new Date(t.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  {t.note && (
                    <p className="text-sm text-neu-text/80 mt-2 bg-neu-bg/50 inline-block px-3 py-1 rounded-lg italic">
                      "{t.note}"
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-white/20 sm:border-t-0">
                <p className={`font-black text-2xl ${t.type === 'bill' ? 'text-neu-danger' : 'text-neu-success'}`}>
                  {t.type === 'bill' ? '+' : '-'}₹{t.amount.toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

    </motion.div>
  );
}
