import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isSuperAdminUser } from '../lib/admin';
import { ShieldAlert, Building, Eye, Download, Search, TrendingUp, Users } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Modal from '../components/Modal';
import SkeletonLoader from '../components/SkeletonLoader';
import toast from 'react-hot-toast';
import { exportCsv } from '../lib/csv';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('businesses');
  const [selectedBizFilter, setSelectedBizFilter] = useState('all');
  
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [deepDiveData, setDeepDiveData] = useState({ customerCount: 0, billCount: 0, totalOutstanding: 0, firmName: '', ownerName: '', customers: [] });
  const [loadingDeepDive, setLoadingDeepDive] = useState(false);

  const checkAdminAndFetchStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user ?? null;
      if (!user && navigator.onLine) {
        const { data } = await supabase.auth.getUser();
        user = data?.user ?? null;
      }

      if (!user) {
        navigate('/auth');
        return;
      }

      if (!isSuperAdminUser(user)) {
        setError("Unauthorized. You do not have platform administrator privileges.");
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      const { data, error: invokeError } = await supabase.functions.invoke('admin-stats');
      if (invokeError || !data || data.error) {
        throw new Error(data?.error || invokeError?.message || 'Unable to load platform statistics');
      }

      setStats(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load platform statistics. Please ensure the admin-stats Edge Function is deployed and you have verified superadmin permissions.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkAdminAndFetchStats();
  }, [checkAdminAndFetchStats]);

  const handleDeepDive = async (business) => {
    setSelectedBusiness(business);
    setIsDeepDiveOpen(true);
    setLoadingDeepDive(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-stats', {
        body: { action: 'get_business_details', businessId: business.id }
      });
      if (invokeError || !data || data.error) {
        throw new Error(data?.error || invokeError?.message || 'Failed to fetch business details');
      }

      setDeepDiveData({
        customerCount: data.customerCount || 0,
        billCount: data.billCount || 0,
        totalOutstanding: data.totalOutstanding || 0,
        firmName: business.firm_name || '',
        ownerName: business.owner_name || '',
        customers: data.customers || [],
      });
    } catch {
      toast.error('Failed to load business details');
      setIsDeepDiveOpen(false);
    } finally {
      setLoadingDeepDive(false);
    }
  };

  const handleExportAuditReport = () => {
    if (!stats?.businesses) return;
    const headers = ['Business ID', 'Firm Name', 'Owner Name', 'Email', 'Customers', 'Bills', 'Gross Volume (INR)', 'Outstanding (INR)', 'Registration Date'];
    const rows = stats.businesses.map(b => [
      b.id || '',
      b.firm_name || '-',
      b.owner_name || '-',
      b.email || '-',
      b.customerCount ?? 0,
      b.billCount ?? 0,
      b.totalVolume ?? 0,
      b.totalOutstanding ?? 0,
      b.created_at ? new Date(b.created_at).toLocaleDateString() : '-'
    ]);
    exportCsv(`UdharPe_Platform_Audit_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    toast.success("Platform audit report exported (.csv)!");
  };

  const filteredBusinesses = useMemo(() => {
    if (!stats?.businesses) return [];
    if (!searchQuery.trim()) return stats.businesses;
    const query = searchQuery.toLowerCase();
    return stats.businesses.filter(b => 
      (b.firm_name && b.firm_name.toLowerCase().includes(query)) ||
      (b.owner_name && b.owner_name.toLowerCase().includes(query)) ||
      (b.email && b.email.toLowerCase().includes(query)) ||
      (b.id && b.id.toLowerCase().includes(query))
    );
  }, [stats, searchQuery]);

  const filteredCustomers = useMemo(() => {
    if (!stats?.allCustomers) return [];
    return stats.allCustomers.filter((c) => {
      if (selectedBizFilter !== 'all' && c.business_id !== selectedBizFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.firm_name && c.firm_name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.gst_details && c.gst_details.toLowerCase().includes(q)) ||
        (c.business_firm && c.business_firm.toLowerCase().includes(q)) ||
        (c.business_email && c.business_email.toLowerCase().includes(q))
      );
    });
  }, [stats, searchQuery, selectedBizFilter]);

  const recoveryRate = useMemo(() => {
    if (!stats || !stats.totalVolume || stats.totalVolume <= 0) return 0;
    const recovered = stats.totalSettled || (stats.totalVolume - (stats.totalOutstanding || 0));
    return Math.min(100, Math.max(0, Math.round((recovered / stats.totalVolume) * 100)));
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-neu-primary font-bold">Loading Admin Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center animate-fade-in py-16">
        <div className="w-20 h-20 mx-auto mb-6 bg-rose-50 border border-rose-200 rounded-3xl flex items-center justify-center text-rose-600 shadow-sm">
          <ShieldAlert size={36} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">{!isAdmin ? 'Access Denied' : 'Admin Telemetry Unavailable'}</h1>
        <p className="text-slate-600 font-medium mb-8 max-w-md mx-auto leading-relaxed">{error}</p>
        <div className="flex items-center justify-center gap-4">
          {isAdmin ? (
            <button
              onClick={() => { setError(null); setLoading(true); checkAdminAndFetchStats(); }}
              className="btn-primary px-6 py-2.5"
            >
              Retry Connection
            </button>
          ) : (
            <button onClick={() => navigate('/dashboard')} className="btn-solid mx-auto">
              Return to My Business
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in pb-12"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    >
      <header className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-neu-heading tracking-tight flex items-center gap-3">
            Super Admin <ShieldAlert className="text-neu-primary" />
          </h1>
          <p className="text-neu-text font-medium text-sm mt-1">Platform Command Center &amp; Health Overview</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {stats && (
            <button
              onClick={handleExportAuditReport}
              className="btn-solid px-4 py-2 text-[13px]"
              title="Download full platform businesses breakdown"
            >
              <Download size={15} /> Export Audit (.csv)
            </button>
          )}
        </div>
      </header>

      {error && isAdmin && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg font-medium text-[14px] mb-8">
          {error}
        </div>
      )}

      {stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 bg-white border border-zinc-300 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-zinc-200">
            <div className="p-6">
              <p className="text-[13px] font-medium text-zinc-600 mb-1.5">Total Businesses</p>
              <h3 className="text-3xl font-display font-bold text-zinc-900 tabular-nums">{stats.totalBusinesses}</h3>
              <p className="text-[13px] text-zinc-500 mt-1">Active Firms</p>
            </div>

            <div className="p-6">
              <p className="text-[13px] font-medium text-zinc-600 mb-1.5">Total Parties</p>
              <h3 className="text-3xl font-display font-bold text-zinc-900 tabular-nums">{stats.totalCustomers}</h3>
              <p className="text-[13px] text-zinc-500 mt-1">Customers / Debtors</p>
            </div>

            <div className="p-6">
              <p className="text-[13px] font-medium text-zinc-600 mb-1.5">Total Transactions</p>
              <h3 className="text-3xl font-display font-bold text-zinc-900 tabular-nums">{stats.totalTransactions}</h3>
              <p className="text-[13px] text-zinc-500 mt-1">Bills &amp; Payments</p>
            </div>

            <div className="p-6">
              <p className="text-[13px] font-medium text-zinc-600 mb-1.5">Gross Udhar Volume</p>
              <h3 className="text-2xl font-display font-bold text-zinc-900 tabular-nums truncate">
                ₹{Number(stats.totalVolume || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[13px] text-zinc-500 mt-1">Total Value Logged</p>
            </div>

            <div className="p-6">
              <p className="text-[13px] font-medium text-zinc-600 mb-1.5">Settlement Rate</p>
              <h3 className="text-3xl font-display font-bold text-emerald-700 tabular-nums">
                {recoveryRate}%
              </h3>
              <p className="text-[13px] text-zinc-500 mt-1">Debt Recovery Ratio</p>
            </div>
          </div>

          {/* 30-Day Platform Performance Graph + Recovery Breakdown */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-8 bg-white border border-zinc-300 rounded-lg p-6">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-zinc-700" />
                  <h2 className="text-lg font-display font-bold text-zinc-900">
                    30-Day Platform Activity
                  </h2>
                </div>
                <span className="text-[12px] font-medium text-zinc-500">
                  Udhar Given vs. Jama Received
                </span>
              </div>

              {stats.dailyActivity && stats.dailyActivity.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.dailyActivity} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="adminGiven" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.16} />
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="adminReceived" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#15803d" stopOpacity={0.16} />
                          <stop offset="95%" stopColor="#15803d" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#52525b' }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#52525b' }} tickFormatter={(value) => `₹${value}`} dx={-4} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #d4d4d8', color: '#18181b' }}
                        itemStyle={{ fontWeight: 600, fontSize: '13px' }}
                      />
                      <Area type="monotone" dataKey="given" name="Udhar Given" stroke="#dc2626" strokeWidth={2.5} fillOpacity={1} fill="url(#adminGiven)" />
                      <Area type="monotone" dataKey="received" name="Jama Received" stroke="#15803d" strokeWidth={2.5} fillOpacity={1} fill="url(#adminReceived)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-[14px] text-zinc-500">
                  No platform activity recorded in the last 30 days.
                </div>
              )}
            </div>

            <div className="lg:col-span-4 bg-white border border-zinc-300 rounded-lg p-6 flex flex-col justify-between space-y-5">
              <div>
                <h2 className="text-lg font-display font-bold text-zinc-900 mb-1">
                  Collection Health
                </h2>
                <p className="text-[13px] text-zinc-500">
                  Cumulative recovery across all registered firms
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-baseline text-[14px]">
                  <span className="text-zinc-600">Total Settled (Jama)</span>
                  <span className="font-display font-bold text-emerald-700 tabular-nums">
                    ₹{Number(stats.totalSettled || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-[14px]">
                  <span className="text-zinc-600">Pending Outstanding</span>
                  <span className="font-display font-bold text-red-600 tabular-nums">
                    ₹{Number(stats.totalOutstanding || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200 space-y-2">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="font-medium text-zinc-600">Recovery Progress</span>
                  <span className="font-display font-bold text-zinc-900 tabular-nums">{recoveryRate}%</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-700 rounded-full transition-all duration-300"
                    style={{ width: `${recoveryRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        !error && <SkeletonLoader className="w-full h-64" />
      )}

      {stats && (
        <div className="mt-8 bg-white border border-zinc-300 rounded-lg p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 border border-zinc-200 self-start">
              <button
                type="button"
                onClick={() => setActiveTab('businesses')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors duration-150 ${
                  activeTab === 'businesses'
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Building size={15} /> Registered Businesses ({filteredBusinesses.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('customers')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors duration-150 ${
                  activeTab === 'customers'
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Users size={15} /> Customers ({filteredCustomers.length})
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {activeTab === 'customers' && (
                <select
                  value={selectedBizFilter}
                  onChange={(e) => setSelectedBizFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-zinc-300 bg-white text-[13px] font-medium text-zinc-800 outline-none focus:border-zinc-900"
                >
                  <option value="all">All Businesses</option>
                  {(stats.businesses || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.firm_name || b.email}
                    </option>
                  ))}
                </select>
              )}
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={activeTab === 'businesses' ? 'Search firm, owner, email...' : 'Search customer, phone, GST, firm...'}
                  className="w-full h-9 pl-10 pr-4 bg-zinc-50 text-zinc-900 rounded-lg text-[13px] font-medium border border-zinc-300 outline-none focus:border-zinc-900"
                />
              </div>
            </div>
          </div>

          {activeTab === 'businesses' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="py-3 px-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Firm / Merchant</th>
                  <th className="py-3 px-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Contact</th>
                  <th className="py-3 px-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Parties</th>
                  <th className="py-3 px-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Volume</th>
                  <th className="py-3 px-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Outstanding</th>
                  <th className="py-3 px-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Joined / Last Active</th>
                  <th className="py-3 px-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-zinc-500 text-sm">
                      No businesses matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredBusinesses.map(b => (
                    <tr key={b.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-zinc-900 text-[14px]">
                            {b.firm_name || (b.is_admin ? 'Platform Superadmin' : (b.email?.split('@')[0] || 'Unnamed Business'))}
                          </span>
                          {b.is_admin && (
                            <span className="text-[11px] font-semibold bg-zinc-900 text-white rounded px-1.5 py-0.5">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-zinc-500 mt-0.5">
                          {b.owner_name || 'Owner not set'}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-[13px] text-zinc-600">{b.email}</td>
                      <td className="py-3.5 px-3 text-right font-semibold text-[14px] text-zinc-900 tabular-nums">
                        {b.customerCount ?? 0}
                      </td>
                      <td className="py-3.5 px-3 text-right text-[13px] tabular-nums">
                        <div className="font-semibold text-zinc-900">
                          ₹{Number(b.totalVolume || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-zinc-500">{b.billCount ?? 0} bills</div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-[14px] tabular-nums">
                        <span className={Number(b.totalOutstanding || 0) > 0 ? 'text-red-600' : 'text-emerald-700'}>
                          ₹{Number(b.totalOutstanding || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[13px] text-zinc-600 tabular-nums">
                        <div>{new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        {b.last_sign_in_at && (
                          <div className="text-[12px] text-zinc-400">
                            Active {new Date(b.last_sign_in_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button 
                          onClick={() => handleDeepDive(b)}
                          className="btn-solid px-3 py-1.5 text-[13px]"
                        >
                          <Eye size={14} /> Deep Dive
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="py-3 px-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Customer / Party</th>
                  <th className="py-3 px-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Registered Business</th>
                  <th className="py-3 px-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Phone &amp; Email</th>
                  <th className="py-3 px-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">GST</th>
                  <th className="py-3 px-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Outstanding</th>
                  <th className="py-3 px-3 text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">Added On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-zinc-500 text-sm">
                      No customers matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-display font-bold text-zinc-900 text-[14px]">{c.name}</div>
                        {c.firm_name && <div className="text-[13px] text-zinc-500">{c.firm_name}</div>}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-zinc-800 text-[13px]">{c.business_firm}</div>
                        <div className="text-[12px] text-zinc-500">{c.business_email}</div>
                      </td>
                      <td className="py-3.5 px-3 text-[13px] text-zinc-600">
                        <div>{c.phone || '-'}</div>
                        <div className="text-[12px] text-zinc-500">{c.email || '-'}</div>
                      </td>
                      <td className="py-3.5 px-3 text-[13px] font-medium text-zinc-700 uppercase">
                        {c.gst_details || '-'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-[14px] tabular-nums">
                        <span className={c.total_outstanding > 0 ? 'text-red-600' : 'text-emerald-700'}>
                          ₹{c.total_outstanding.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[13px] text-zinc-600 tabular-nums">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Deep Dive Modal */}
      <Modal isOpen={isDeepDiveOpen} onClose={() => setIsDeepDiveOpen(false)} title="Business Deep Dive">
        {loadingDeepDive ? (
          <div className="py-12 text-center text-neu-primary font-bold animate-pulse">
            Extracting data for {selectedBusiness?.email}...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg p-4 bg-zinc-50 border border-zinc-200">
              <p className="text-[12px] text-zinc-500 font-semibold uppercase tracking-wider">Target Business</p>
              <p className="font-display font-bold text-zinc-900 text-[16px] mt-0.5">
                {selectedBusiness?.firm_name || selectedBusiness?.email}
              </p>
              <p className="text-[13px] text-zinc-600">{selectedBusiness?.email}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-zinc-200 bg-white p-3.5 text-center">
                <p className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Customers</p>
                <p className="text-2xl font-display font-bold text-zinc-900 tabular-nums">{deepDiveData.customerCount}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3.5 text-center">
                <p className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Bills</p>
                <p className="text-2xl font-display font-bold text-zinc-900 tabular-nums">{deepDiveData.billCount}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3.5 text-center">
                <p className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Outstanding</p>
                <p className="text-xl font-display font-bold text-red-600 tabular-nums">
                  ₹{Number(deepDiveData.totalOutstanding || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-200 pt-4">
              <h3 className="text-[14px] font-display font-bold text-zinc-900 mb-3">
                Registered Customers ({deepDiveData.customers?.length || 0})
              </h3>
              {!deepDiveData.customers || deepDiveData.customers.length === 0 ? (
                <div className="py-6 text-center text-[13px] text-zinc-500 bg-zinc-50 rounded-lg border border-zinc-200">
                  No customers added by this business yet.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-zinc-200 border border-zinc-200 rounded-lg">
                  {deepDiveData.customers.map((c) => (
                    <div key={c.id} className="p-3.5 flex items-center justify-between gap-3 bg-white hover:bg-zinc-50">
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 text-[14px] truncate">
                          {c.name}
                          {c.firm_name ? <span className="text-zinc-500 font-normal"> · {c.firm_name}</span> : null}
                        </p>
                        <p className="text-[12px] text-zinc-500 truncate mt-0.5">
                          {[c.phone, c.email, c.gst_details].filter(Boolean).join(' · ') || 'No contact info'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-display font-bold text-[14px] tabular-nums ${Number(c.total_outstanding || 0) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                          ₹{Number(c.total_outstanding || 0).toLocaleString('en-IN')}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {Number(c.total_outstanding || 0) > 0 ? 'Pending' : 'Settled'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

    </motion.div>
  );
}
