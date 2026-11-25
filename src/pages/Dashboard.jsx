import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Users, Receipt, Plus, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AnimatedCurrency from '../components/AnimatedCurrency';

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
        <div className="animate-pulse text-zinc-700 font-display font-bold text-lg">Loading your ledger...</div>
      </div>
    );
  }

  return (
    <motion.div
      className="px-4 sm:px-6 lg:px-8 space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-zinc-900 tracking-tight">Overview</h1>
          <p className="text-zinc-600 mt-1 text-[15px]">{firmName}</p>
        </div>

        {/* Quick Action Toolbar */}
        <div className="flex flex-wrap gap-2.5 items-center">
          <button
            onClick={() => navigate('/billing')}
            className="btn-primary py-2 px-4 text-[14px]"
          >
            <ArrowUpRight size={15} /> Give Credit (Udhar)
          </button>
          <button
            onClick={() => navigate('/settlement')}
            className="btn-solid py-2 px-4 text-[14px] text-emerald-700"
          >
            <ArrowDownRight size={15} /> Record Payment (Jama)
          </button>
          <button
            onClick={() => navigate('/customers')}
            className="btn-solid py-2 px-3.5 text-[14px]"
          >
            <Plus size={15} /> Add Party
          </button>
        </div>
      </header>

      {/* Getting Started Guide if 0 customers */}
      {customerCount === 0 && (
        <div className="bg-white border border-zinc-300 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-zinc-200">
            <div className="flex items-center gap-2.5 text-zinc-900 mb-1.5">
              <Sparkles size={18} />
              <h2 className="text-lg font-display font-bold">Welcome to your digital ledger</h2>
            </div>
            <p className="text-[15px] text-zinc-600 max-w-xl">
              Your business workspace is ready. Begin tracking your credits and payment reminders:
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="p-5 text-left hover:bg-zinc-50 transition-colors duration-150"
            >
              <div className="text-[13px] font-bold text-zinc-900 mb-1">1. Add Your First Customer / Party</div>
              <p className="text-[14px] text-zinc-600">Save their phone number to send 1-click WhatsApp payment reminders.</p>
            </button>
            <button
              type="button"
              onClick={() => navigate('/billing')}
              className="p-5 text-left hover:bg-zinc-50 transition-colors duration-150"
            >
              <div className="text-[13px] font-bold text-zinc-900 mb-1">2. Record Credit or Bill</div>
              <p className="text-[14px] text-zinc-600">Enter bill amount and due date to automatically build your financial ledger.</p>
            </button>
          </div>
        </div>
      )}

      {/* Architectural 3-Column KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 bg-white border border-zinc-300 rounded-lg divide-y md:divide-y-0 md:divide-x divide-zinc-200">
        <div className="p-6 sm:p-7">
          <p className="text-[13px] font-medium text-zinc-600 mb-2">Total Udhar (Baki)</p>
          <p className="text-3xl font-display font-bold text-red-600 tracking-tight truncate">
            <AnimatedCurrency value={totalOutstanding} />
          </p>
        </div>

        <div className="p-6 sm:p-7">
          <p className="text-[13px] font-medium text-zinc-600 mb-2">Jama / Received (This Month)</p>
          <p className="text-3xl font-display font-bold text-emerald-700 tracking-tight truncate">
            <AnimatedCurrency value={paymentsReceived} />
          </p>
        </div>

        <div className="p-6 sm:p-7">
          <p className="text-[13px] font-medium text-zinc-600 mb-2">Udhar Given (This Month)</p>
          <p className="text-3xl font-display font-bold text-zinc-900 tracking-tight truncate">
            <AnimatedCurrency value={newUdhar} />
          </p>
        </div>
      </div>

      {/* Chart + Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {chartData.length > 0 && (
          <div className="lg:col-span-2 bg-white border border-zinc-300 rounded-lg p-6">
            <h2 className="text-lg font-display font-bold text-zinc-900 mb-5">30-Day Activity</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGiven" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#15803d" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#15803d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#52525b' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#52525b' }} tickFormatter={(value) => `₹${value}`} dx={-4} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #d4d4d8', color: '#18181b' }}
                    itemStyle={{ fontWeight: 600, fontSize: '13px' }}
                  />
                  <Area type="monotone" dataKey="given" name="Udhar Given" stroke="#dc2626" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGiven)" />
                  <Area type="monotone" dataKey="received" name="Payments Received" stroke="#15803d" strokeWidth={2.5} fillOpacity={1} fill="url(#colorReceived)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className={`flex flex-col gap-4 ${chartData.length === 0 ? 'lg:col-span-3 sm:flex-row' : ''}`}>
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="bg-white border border-zinc-300 hover:border-zinc-400 rounded-lg p-6 flex items-center gap-4 text-left transition-colors duration-150 flex-1"
          >
            <div className="w-11 h-11 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 shrink-0">
              <Users size={20} />
            </div>
            <div>
              <p className="font-display font-bold text-zinc-900 text-2xl tabular-nums">{customerCount}</p>
              <p className="text-[14px] text-zinc-600 font-medium">Total Customers</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/billing')}
            className="btn-primary py-5 text-[15px] w-full flex-1"
          >
            <Receipt size={20} /> Raise New Bill
          </button>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white border border-zinc-300 rounded-lg p-6">
        <div className="flex justify-between items-center pb-4 mb-2 border-b border-zinc-200">
          <h2 className="text-lg font-display font-bold text-zinc-900">Recent Transactions</h2>
          {recentBills.length > 0 && (
            <button
              onClick={() => navigate('/customers')}
              className="text-[13px] font-semibold text-zinc-700 hover:text-zinc-900 transition-colors duration-150"
            >
              View all customers →
            </button>
          )}
        </div>

        {recentBills.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-zinc-900 font-bold text-[15px] mb-1">No pending bills yet</p>
            <p className="text-zinc-600 text-[14px]">When you raise an Udhar entry, it will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {recentBills.map(bill => (
              <div
                key={bill.id}
                onClick={() => bill.customers?.id && navigate(`/customers/${bill.customers.id}`)}
                className="py-3.5 flex justify-between items-center gap-4 hover:bg-zinc-50 px-2 -mx-2 rounded-md cursor-pointer transition-colors duration-150"
              >
                <div>
                  <h4 className="font-semibold text-zinc-900 text-[15px]">{bill.customers?.name || 'Unknown'}</h4>
                  <p className="text-[13px] text-zinc-500">
                    Recorded on {new Date(bill.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600 text-[15px] tabular-nums">₹{Number(bill.remaining_amount).toLocaleString('en-IN')}</p>
                  <p className="text-[13px] text-zinc-500">Pending</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button (Charcoal, not Red) */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/billing')}
        className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 bg-zinc-900 text-white rounded-full shadow-elevated flex items-center justify-center hover:bg-zinc-800 transition-colors duration-150 z-40"
        title="Raise New Bill"
      >
        <Receipt size={22} />
      </motion.button>
    </motion.div>
  );
}
