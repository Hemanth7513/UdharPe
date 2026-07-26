import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Plus, AlertCircle, Calendar, LogOut, Wallet } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [overdueBills, setOverdueBills] = useState([]);
  const [dueThisWeek, setDueThisWeek] = useState([]);
  const [firmName, setFirmName] = useState('Your Business');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setFirmName(user.user_metadata?.firm_name || 'Your Business');

      const { data: customersData, error: custError } = await supabase
        .from('customers').select('total_outstanding');
      
      if (!custError && customersData) {
        const total = customersData.reduce((sum, cust) => sum + Number(cust.total_outstanding), 0);
        setTotalOutstanding(total);
      }

      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select(`id, amount, remaining_amount, due_date, status, customers ( name )`)
        .in('status', ['pending', 'partial'])
        .order('due_date', { ascending: true });

      if (!billsError && billsData) {
        setOverdueBills(billsData.filter(b => b.due_date < today));
        setDueThisWeek(billsData.filter(b => b.due_date >= today && b.due_date <= nextWeekStr));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neu-primary font-bold text-xl">Loading your ledger...</div>
      </div>
    );
  }

  return (
    <motion.div 
      className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neu-heading tracking-tight">Dashboard</h1>
          <p className="text-neu-text mt-1 font-medium">Welcome back, {firmName}</p>
        </div>
        
        <div className="flex gap-4 w-full sm:w-auto">
          <button 
            onClick={() => navigate('/customers')}
            className="flex-1 sm:flex-none neu-card px-4 py-2 flex items-center justify-center text-neu-heading hover:text-neu-primary transition-colors font-medium"
          >
             <span className="hidden sm:inline">Customers</span>
          </button>
          
          <button 
            onClick={handleLogout}
            className="flex-1 sm:flex-none neu-card px-4 py-2 flex items-center justify-center gap-2 text-neu-heading hover:text-neu-primary transition-colors font-medium"
          >
            <LogOut size={18} /> <span className="hidden sm:inline">Logout</span>
          </button>
          
          <button onClick={() => navigate('/billing')} className="btn-solid flex-1 sm:flex-none">
            <Plus size={20} /> Raise a Bill
          </button>
        </div>
      </header>
      
      {/* Search Bar */}
      <div className="relative mb-8 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neu-text group-focus-within:text-neu-primary transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Search customers by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-neu-bg text-neu-heading placeholder-neu-text/60 rounded-2xl pl-14 pr-4 py-4 outline-none focus:ring-2 focus:ring-neu-primary/30 shadow-neu-inner transition-all font-medium"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        {/* Total Outstanding Card */}
        <div className="neu-card p-8 md:col-span-2 relative overflow-hidden flex flex-col justify-center">
          <div className="flex items-center gap-2 text-neu-text mb-3">
            <div className="w-10 h-10 shadow-neu rounded-full flex items-center justify-center text-neu-primary">
              <Wallet size={18} />
            </div>
            <h3 className="font-bold text-lg">Total Outstanding</h3>
          </div>
          <p className="text-4xl sm:text-5xl font-black text-neu-heading tracking-tight mt-2">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="neu-card p-8 flex flex-col justify-center space-y-6">
           <div className="flex justify-between items-center shadow-neu-inner p-4 rounded-xl">
             <span className="text-neu-heading font-bold">Overdue</span>
             <span className="bg-neu-bg shadow-neu text-neu-danger px-3 py-1 rounded-lg text-sm font-black">{overdueBills.length}</span>
           </div>
           <div className="flex justify-between items-center shadow-neu-inner p-4 rounded-xl">
             <span className="text-neu-heading font-bold">Due this week</span>
             <span className="bg-neu-bg shadow-neu text-neu-primary px-3 py-1 rounded-lg text-sm font-black">{dueThisWeek.length}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Overdue Section */}
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-neu-danger mb-6 pl-2">
            <AlertCircle size={22} /> Overdue Bills
          </h2>
          
          {overdueBills.length === 0 ? (
            <div className="neu-card p-8 text-center shadow-neu-inner">
              <p className="text-neu-text font-medium">All clear! No overdue bills.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {overdueBills.map(bill => (
                <div key={bill.id} className="neu-card p-5 flex justify-between items-center hover:shadow-neu-hover transition-all cursor-pointer group">
                  <div>
                    <h4 className="font-bold text-neu-heading group-hover:text-neu-danger transition-colors text-lg">{bill.customers?.name || 'Unknown'}</h4>
                    <p className="text-neu-text font-medium text-sm mt-1">Due: {new Date(bill.due_date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-neu-danger text-xl">₹{Number(bill.remaining_amount).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Due This Week Section */}
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-neu-heading mb-6 pl-2">
            <Calendar size={22} className="text-neu-primary" /> Due This Week
          </h2>
          
          {dueThisWeek.length === 0 ? (
            <div className="neu-card p-8 text-center shadow-neu-inner">
              <p className="text-neu-text font-medium">No bills due in the next 7 days.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {dueThisWeek.map(bill => (
                <div key={bill.id} className="neu-card p-5 flex justify-between items-center hover:shadow-neu-hover transition-all cursor-pointer group">
                  <div>
                    <h4 className="font-bold text-neu-heading group-hover:text-neu-primary transition-colors text-lg">{bill.customers?.name || 'Unknown'}</h4>
                    <p className="text-neu-text font-medium text-sm mt-1">Due: {new Date(bill.due_date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-neu-heading text-xl">₹{Number(bill.remaining_amount).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </motion.div>
  );
}
