import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Wallet, Users, Receipt } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [paymentsReceived, setPaymentsReceived] = useState(0);
  const [newUdhar, setNewUdhar] = useState(0);
  const [recentBills, setRecentBills] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [firmName, setFirmName] = useState('Your Business');
  const [customerCount, setCustomerCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setFirmName(user.user_metadata?.firm_name || 'Your Business');

      // Fetch customers for total outstanding & count
      const { data: customersData, error: custError } = await supabase
        .from('customers')
        .select('total_outstanding')
        .eq('business_id', user.id);
      
      if (!custError && customersData) {
        const total = customersData.reduce((sum, cust) => sum + Number(cust.total_outstanding), 0);
        setTotalOutstanding(total);
        setCustomerCount(customersData.length);
      }

      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      // Fetch payments received this month
      const { data: settlementsData, error: settError } = await supabase
        .from('settlements')
        .select('amount_paid')
        .eq('business_id', user.id)
        .gte('created_at', startOfMonth);

      if (!settError && settlementsData) {
        const received = settlementsData.reduce((sum, s) => sum + Number(s.amount_paid), 0);
        setPaymentsReceived(received);
      }

      // Fetch new udhar given this month
      const { data: udharData, error: udharError } = await supabase
        .from('bills')
        .select('amount')
        .eq('business_id', user.id)
        .gte('created_at', startOfMonth);

      if (!udharError && udharData) {
        const given = udharData.reduce((sum, b) => sum + Number(b.amount), 0);
        setNewUdhar(given);
      }

      // Fetch recent un-settled bills
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select(`id, amount, remaining_amount, created_at, status, customers ( name )`)
        .eq('business_id', user.id)
        .in('status', ['pending', 'partial'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (!billsError && billsData) {
        setRecentBills(billsData);
      }

      // Fetch all bills for chart (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: chartBills } = await supabase
        .from('bills')
        .select('amount, created_at')
        .eq('business_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      const { data: chartSettlements } = await supabase
        .from('settlements')
        .select('amount_paid, created_at')
        .eq('business_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Process chart data by day
      const dataMap = {};
      const addData = (items, typeKey, amountKey) => {
        if (items) {
          items.forEach(item => {
            const date = new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            if (!dataMap[date]) {
              dataMap[date] = { date, given: 0, received: 0 };
            }
            dataMap[date][typeKey] += Number(item[amountKey]);
          });
        }
      };

      addData(chartBills, 'given', 'amount');
      addData(chartSettlements, 'received', 'amount_paid');

      const formattedChartData = Object.values(dataMap).sort((a, b) => new Date(a.date) - new Date(b.date));
      setChartData(formattedChartData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-neu-primary font-bold text-xl">Loading your ledger...</div>
      </div>
    );
  }

  return (
    <motion.div 
      className="px-4 sm:px-6 lg:px-8 animate-fade-in space-y-8"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-neu-heading tracking-tight">Overview</h1>
        <p className="text-neu-text mt-1 font-bold">{firmName}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Total Outstanding Card - Highlighted */}
        <div className="neu-card p-8 relative overflow-hidden flex flex-col justify-center border border-4 border-[#059669] bg-neu-primary/5">
          <div className="flex items-center gap-2 text-neu-text mb-3">
            <div className="w-10 h-10 shadow-neu rounded-none flex items-center justify-center text-neu-primary bg-neu-bg">
              <Wallet size={18} />
            </div>
            <h3 className="font-bold text-lg">Total Udhar</h3>
          </div>
          <p className="text-4xl sm:text-5xl font-black text-neu-danger tracking-tight mt-2 truncate">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Payments Received This Month */}
        <div className="neu-card p-8 relative overflow-hidden flex flex-col justify-center border border-4 border-[#059669]">
          <div className="flex items-center gap-2 text-neu-text mb-3">
            <div className="w-10 h-10 shadow-neu rounded-none flex items-center justify-center text-neu-success bg-neu-bg">
              <Receipt size={18} />
            </div>
            <h3 className="font-bold text-lg">Received (This Month)</h3>
          </div>
          <p className="text-4xl sm:text-5xl font-black text-neu-success tracking-tight mt-2 truncate">
            ₹{paymentsReceived.toLocaleString('en-IN')}
          </p>
        </div>

        {/* New Udhar This Month */}
        <div className="neu-card p-8 relative overflow-hidden flex flex-col justify-center border border-4 border-[#059669]">
          <div className="flex items-center gap-2 text-neu-text mb-3">
            <div className="w-10 h-10 shadow-neu rounded-none flex items-center justify-center text-neu-danger bg-neu-bg">
              <Wallet size={18} />
            </div>
            <h3 className="font-bold text-lg">Given (This Month)</h3>
          </div>
          <p className="text-4xl sm:text-5xl font-black text-neu-danger tracking-tight mt-2 truncate">
            ₹{newUdhar.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Chart Section */}
      {chartData.length > 0 && (
        <div className="neu-card p-6 border border-4 border-[#059669]">
          <h2 className="text-xl font-bold text-neu-heading mb-6 pl-2">30-Day Activity</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGiven" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }} tickFormatter={(value) => `₹${value}`} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1f2b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="given" name="Udhar Given" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorGiven)" />
                <Area type="monotone" dataKey="received" name="Payments Received" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorReceived)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Quick Actions / Stats */}
        <div className="flex flex-col gap-6">
          <div 
            onClick={() => navigate('/customers')}
            className="neu-card p-6 flex items-center gap-4 cursor-pointer hover:shadow-neu-hover transition-all flex-1"
          >
             <div className="w-12 h-12 border-4 border-[#059669] bg-white rounded-none flex items-center justify-center text-neu-heading bg-neu-bg">
               <Users size={20} />
             </div>
             <div>
               <p className="font-bold text-neu-heading text-xl">{customerCount}</p>
               <p className="text-sm text-neu-text font-bold">Total Customers</p>
             </div>
          </div>
          
          <button 
            onClick={() => navigate('/billing')}
            className="btn-solid flex items-center justify-center gap-3 py-6 text-lg w-full flex-1"
          >
            <Receipt size={24} /> Raise New Bill
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-neu-heading mb-6 pl-2">Recent Transactions</h2>
        
        {recentBills.length === 0 ? (
          <div className="neu-card p-12 text-center border-4 border-[#059669] bg-white">
             <div className="w-16 h-16 mx-auto mb-4 shadow-neu rounded-none flex items-center justify-center text-neu-text bg-neu-bg">
               <Receipt size={24} />
             </div>
            <p className="text-neu-heading font-bold text-lg mb-1">No pending bills yet</p>
            <p className="text-neu-text text-sm">When you raise an Udhar entry, it will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentBills.map(bill => (
              <div key={bill.id} className="neu-card p-5 hover:shadow-neu-hover transition-all group">
                <div className="flex justify-between items-start mb-4">
                   <div className="w-10 h-10 border-4 border-[#059669] bg-white rounded-none flex items-center justify-center text-neu-primary font-bold bg-neu-bg">
                     {bill.customers?.name?.charAt(0) || '?'}
                   </div>
                   <div className="text-right">
                     <p className="font-black text-neu-danger text-xl">₹{Number(bill.remaining_amount).toLocaleString()}</p>
                     <p className="text-[10px] text-neu-text font-bold uppercase tracking-wider mt-1">Pending</p>
                   </div>
                </div>
                <h4 className="font-bold text-neu-heading text-lg truncate">{bill.customers?.name || 'Unknown'}</h4>
                <p className="text-xs text-neu-text font-bold mt-1">
                  Recorded on: {new Date(bill.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => navigate('/billing')}
        className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 bg-neu-primary text-white rounded-none shadow-[0_10px_20px_rgba(79,70,229,0.4)] flex items-center justify-center hover:scale-105 hover:bg-neu-primary-hover transition-all z-40"
        title="Raise New Bill"
      >
        <Receipt size={24} />
      </button>
    </motion.div>
  );
}
