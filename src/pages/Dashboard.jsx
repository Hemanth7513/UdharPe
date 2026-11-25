import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Users, Receipt, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AnimatedCurrency from '../components/AnimatedCurrency';
import { Tilt3DCard } from '../components/FramerComponents';

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
      className="px-4 sm:px-6 lg:px-8 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Compact Single-Row Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-zinc-900 tracking-tight">Overview</h1>
          <p className="text-zinc-600 mt-0.5 text-[15px]">{firmName}</p>
        </div>

        <button
          onClick={() => navigate('/billing')}
          className="btn-primary py-2.5 px-5 text-[14px] self-start sm:self-auto"
        >
          <Plus size={16} /> Raise Bill
        </button>
      </header>

      {/* Balanced 12-Column Architectural Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Main Column (8 cols): KPIs + Chart + Recent Transactions */}
        <div className="lg:col-span-8 space-y-5">
          {/* Unified 3-Column KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 bg-white border border-zinc-300 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-zinc-200">
            <div className="p-5 sm:p-6">
              <p className="text-[13px] font-medium text-zinc-600 mb-1.5">Total Udhar (Baki)</p>
              <p className="text-2xl sm:text-3xl font-display font-bold text-red-600 tracking-tight truncate">
                <AnimatedCurrency value={totalOutstanding} />
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <p className="text-[13px] font-medium text-zinc-600 mb-1.5">Jama / Received (This Month)</p>
              <p className="text-2xl sm:text-3xl font-display font-bold text-emerald-700 tracking-tight truncate">
                <AnimatedCurrency value={paymentsReceived} />
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <p className="text-[13px] font-medium text-zinc-600 mb-1.5">Udhar Given (This Month)</p>
              <p className="text-2xl sm:text-3xl font-display font-bold text-zinc-900 tracking-tight truncate">
                <AnimatedCurrency value={newUdhar} />
              </p>
            </div>
          </div>

          {/* 30-Day Activity Chart */}
          {chartData.length > 0 && (
            <div className="bg-white border border-zinc-300 rounded-lg p-5 sm:p-6">
              <h2 className="text-lg font-display font-bold text-zinc-900 mb-4">30-Day Activity</h2>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGiven" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.16} />
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#15803d" stopOpacity={0.16} />
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

          {/* Recent Transactions */}
          <div className="bg-white border border-zinc-300 rounded-lg p-5 sm:p-6">
            <div className="flex justify-between items-center pb-3.5 mb-2 border-b border-zinc-200">
              <h2 className="text-lg font-display font-bold text-zinc-900">Recent Transactions</h2>
              {recentBills.length > 0 && (
                <button
                  onClick={() => navigate('/customers')}
                  className="text-[13px] font-semibold text-zinc-600 hover:text-zinc-900 transition-colors duration-150"
                >
                  View all →
                </button>
              )}
            </div>

            {recentBills.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-zinc-900 font-semibold text-[15px] mb-1">No pending bills yet</p>
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
        </div>

        {/* Right Sidebar Column (4 cols): Customer Count + Quick Actions / Onboarding */}
        <div className="lg:col-span-4 space-y-5">
          <Tilt3DCard maxTilt={3}>
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="w-full bg-white border border-zinc-300 hover:border-zinc-400 rounded-lg p-5 sm:p-6 flex items-center justify-between text-left transition-colors duration-150"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <p className="font-display font-bold text-zinc-900 text-2xl tabular-nums leading-tight">{customerCount}</p>
                  <p className="text-[14px] text-zinc-600 font-medium">Total Customers</p>
                </div>
              </div>
              <span className="text-[13px] font-semibold text-zinc-500">Open →</span>
            </button>
          </Tilt3DCard>

          {/* Compact Quick Actions Panel */}
          <div className="bg-white border border-zinc-300 rounded-lg overflow-hidden divide-y divide-zinc-200">
            <div className="px-5 py-3.5 bg-zinc-50/80">
              <h3 className="text-[14px] font-display font-bold text-zinc-900">Quick Actions</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/billing')}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors duration-150"
            >
              <span className="flex items-center gap-2.5 text-[14px] font-semibold text-zinc-900">
                <ArrowUpRight size={16} className="text-zinc-600" /> Give Credit (Udhar)
              </span>
              <span className="text-[13px] text-zinc-400">→</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/settlement')}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors duration-150"
            >
              <span className="flex items-center gap-2.5 text-[14px] font-semibold text-emerald-700">
                <ArrowDownRight size={16} /> Record Payment (Jama)
              </span>
              <span className="text-[13px] text-zinc-400">→</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors duration-150"
            >
              <span className="flex items-center gap-2.5 text-[14px] font-semibold text-zinc-900">
                <Plus size={16} className="text-zinc-600" /> Add Customer
              </span>
              <span className="text-[13px] text-zinc-400">→</span>
            </button>
          </div>

          {/* Compact Getting Started Guide (only when 0 customers) */}
          {customerCount === 0 && (
            <div className="bg-white border border-zinc-300 rounded-lg p-5 space-y-3">
              <h3 className="text-[15px] font-display font-bold text-zinc-900">Getting started</h3>
              <p className="text-[14px] text-zinc-600">Set up your ledger in two quick steps:</p>
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/customers')}
                  className="w-full p-3 rounded-md border border-zinc-200 hover:border-zinc-400 text-left transition-colors duration-150"
                >
                  <div className="text-[13px] font-bold text-zinc-900">1. Add your first customer</div>
                  <div className="text-[13px] text-zinc-500">Save phone &amp; email for reminders.</div>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/billing')}
                  className="w-full p-3 rounded-md border border-zinc-200 hover:border-zinc-400 text-left transition-colors duration-150"
                >
                  <div className="text-[13px] font-bold text-zinc-900">2. Record your first bill</div>
                  <div className="text-[13px] text-zinc-500">Track credit and due dates.</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (Mobile convenience) */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/billing')}
        className="md:hidden fixed bottom-24 right-5 w-14 h-14 bg-zinc-900 text-white rounded-full shadow-elevated flex items-center justify-center hover:bg-zinc-800 transition-colors duration-150 z-40"
        title="Raise New Bill"
      >
        <Receipt size={22} />
      </motion.button>
    </motion.div>
  );
}
