import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Plus, UserPlus, X, ChevronLeft, Phone, Mail } from 'lucide-react';

export default function Customers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to add a customer.');

      const { data, error } = await supabase
        .from('customers')
        .insert([{ 
          business_id: user.id, 
          name: newCustomer.name, 
          phone: newCustomer.phone, 
          email: newCustomer.email 
        }])
        .select();

      if (error) throw error;

      // Add to local state
      if (data && data.length > 0) {
        setCustomers(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
      }
      
      // Close modal and reset form
      setIsModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '' });
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.phone && c.phone.includes(searchQuery))
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neu-primary font-bold text-xl">Loading Customers...</div>
      </div>
    );
  }

  return (
    <motion.div 
      className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 neu-card flex items-center justify-center text-neu-text hover:text-neu-primary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-neu-heading tracking-tight">My Customers</h1>
            <p className="text-neu-text mt-1 font-medium">{customers.length} total clients</p>
          </div>
        </div>
        
        <button onClick={() => setIsModalOpen(true)} className="btn-solid w-full sm:w-auto">
          <UserPlus size={20} /> Add Customer
        </button>
      </header>
      
      {/* Search Bar */}
      <div className="relative mb-8 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neu-text group-focus-within:text-neu-primary transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-neu-bg text-neu-heading placeholder-neu-text/60 rounded-2xl pl-14 pr-4 py-4 outline-none focus:ring-2 focus:ring-neu-primary/30 shadow-neu-inner transition-all font-medium"
        />
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="neu-card p-12 text-center shadow-neu-inner">
          <div className="w-20 h-20 mx-auto mb-6 shadow-neu rounded-full flex items-center justify-center text-neu-primary">
            <UserPlus size={32} />
          </div>
          <h3 className="text-xl font-bold text-neu-heading mb-2">No customers found</h3>
          <p className="text-neu-text font-medium max-w-md mx-auto">
            {searchQuery ? "We couldn't find anyone matching your search." : "You haven't added any customers yet. Add your first customer to start tracking Udhar."}
          </p>
          {!searchQuery && (
            <button onClick={() => setIsModalOpen(true)} className="btn-primary mx-auto mt-6">
              Add First Customer
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map(customer => (
            <div key={customer.id} className="neu-card p-6 flex flex-col justify-between hover:shadow-neu-hover transition-all group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 shadow-neu rounded-full flex items-center justify-center text-neu-primary font-bold text-lg bg-neu-bg">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neu-text font-medium uppercase tracking-wider mb-1">Outstanding</p>
                    <p className="font-black text-neu-danger text-lg">₹{Number(customer.total_outstanding).toLocaleString()}</p>
                  </div>
                </div>
                
                <h3 className="font-bold text-xl text-neu-heading mb-3">{customer.name}</h3>
                
                <div className="space-y-2">
                  {customer.phone && (
                    <div className="flex items-center gap-3 text-neu-text font-medium text-sm">
                      <Phone size={14} className="text-neu-primary" /> {customer.phone}
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-3 text-neu-text font-medium text-sm">
                      <Mail size={14} className="text-neu-primary" /> {customer.email}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  className="flex-1 py-2.5 rounded-lg shadow-neu text-neu-heading font-bold hover:text-neu-primary transition-colors flex items-center justify-center gap-2"
                >
                  View Ledger
                </button>
                <button 
                  onClick={() => navigate('/billing')}
                  className="flex-1 py-2.5 rounded-lg shadow-neu-inner text-neu-primary font-bold hover:bg-neu-primary hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Udhar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neu-bg/80 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md z-10"
            >
              <div className="neu-card p-8 border border-white/60">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-neu-heading">Add Party</h2>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full shadow-neu flex items-center justify-center text-neu-text hover:text-neu-danger transition-colors">
                    <X size={18} />
                  </button>
                </div>
                
                {errorMsg && (
                  <div className="bg-neu-bg shadow-neu-inner text-neu-danger p-3 rounded-lg mb-5 text-sm font-medium">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleAddCustomer} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">Party Name *</label>
                    <input 
                      type="text" required value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                      placeholder="e.g. Ramesh Singh" className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">Phone Number (Optional)</label>
                    <input 
                      type="tel" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                      placeholder="e.g. 9876543210" className="input-field"
                    />
                  </div>

                  <button type="submit" disabled={isSubmitting} className="btn-solid w-full mt-6 py-4">
                    {isSubmitting ? 'Saving...' : 'Save Party'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
