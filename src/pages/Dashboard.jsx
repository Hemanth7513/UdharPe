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
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400">Loading your ledger...</p>
        </div>
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
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome back, {firmName}</p>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={handleLogout}
            className="flex-1 sm:flex-none glass-card-sm px-4 py-2 flex items-center justify-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut size={18} /> <span className="hidden sm:inline">Logout</span>
          </button>
          
          <button onClick={() => navigate('/billing')} className="btn-primary flex-1 sm:flex-none">
            <Plus size={20} /> Raise a Bill
          </button>
        </div>
      </header>
      
      {/* Search Bar */}
      <div className="relative mb-8 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Search customers by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/60 backdrop-blur-md border border-white/10 text-white placeholder-slate-500 rounded-2xl pl-12 pr-4 py-4 outline-none focus:bg-slate-900/80 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 shadow-glass-sm transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Outstanding Card */}
        <div className="glass-card p-6 md:col-span-2 border-t-4 border-t-indigo-500 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Wallet size={18} />
            <h3 className="font-medium">Total Outstanding</h3>
          </div>
          <p className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="glass-card p-6 flex flex-col justify-center">
           <div className="flex justify-between items-center mb-4">
             <span className="text-slate-400 font-medium">Overdue</span>
             <span className="bg-red-500/20 text-red-400 px-2.5 py-0.5 rounded-full text-sm font-semibold">{overdueBills.length}</span>
           </div>
           <div className="flex justify-between items-center">
             <span className="text-slate-400 font-medium">Due this week</span>
             <span className="bg-indigo-500/20 text-indigo-400 px-2.5 py-0.5 rounded-full text-sm font-semibold">{dueThisWeek.length}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Overdue Section */}
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2 text-red-400 mb-4">
            <AlertCircle size={22} /> Overdue Bills
          </h2>
          
          {overdueBills.length === 0 ? (
            <div className="glass-card-sm p-8 text-center border-dashed border-white/10">
              <p className="text-slate-400">All clear! No overdue bills.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueBills.map(bill => (
                <div key={bill.id} className="glass-card-sm p-4 flex justify-between items-center border-l-4 border-l-red-500 hover:bg-slate-800/50 transition-colors cursor-pointer group">
                  <div>
                    <h4 className="font-semibold text-white group-hover:text-red-400 transition-colors">{bill.customers?.name || 'Unknown'}</h4>
                    <p className="text-slate-400 text-sm mt-0.5">Due: {new Date(bill.due_date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-400 text-lg">₹{Number(bill.remaining_amount).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Due This Week Section */}
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2 text-white mb-4">
            <Calendar size={22} className="text-indigo-400" /> Due This Week
          </h2>
          
          {dueThisWeek.length === 0 ? (
            <div className="glass-card-sm p-8 text-center border-dashed border-white/10">
              <p className="text-slate-400">No bills due in the next 7 days.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dueThisWeek.map(bill => (
                <div key={bill.id} className="glass-card-sm p-4 flex justify-between items-center border-l-4 border-l-indigo-500 hover:bg-slate-800/50 transition-colors cursor-pointer group">
                  <div>
                    <h4 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">{bill.customers?.name || 'Unknown'}</h4>
                    <p className="text-slate-400 text-sm mt-0.5">Due: {new Date(bill.due_date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white text-lg">₹{Number(bill.remaining_amount).toLocaleString()}</p>
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
