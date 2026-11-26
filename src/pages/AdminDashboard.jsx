import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isSuperAdminUser } from '../lib/admin';
import { ShieldAlert, Building, Eye, Download, Search } from 'lucide-react';
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
  
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [deepDiveData, setDeepDiveData] = useState({ customerCount: 0, billCount: 0, totalOutstanding: 0, firmName: '', ownerName: '' });
  const [loadingDeepDive, setLoadingDeepDive] = useState(false);

  const checkAdminAndFetchStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
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
        ownerName: business.owner_name || ''
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
    exportCsv(headers, rows, `UdharPe_Platform_Audit_${new Date().toISOString().split('T')[0]}.csv`);
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
      ) : (
        !error && <SkeletonLoader className="w-full h-64" />
      )}

      {stats && (
        <div className="mt-8 bg-white border border-zinc-300 rounded-lg p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-neu-heading flex items-center gap-2">
              <Building size={20} className="text-neu-primary" /> Registered Businesses ({filteredBusinesses.length})
            </h2>
            <div className="relative min-w-[260px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neu-text/50" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search firm, owner, ID..."
                className="w-full pl-10 pr-4 py-2 bg-neu-bg text-neu-heading rounded-xl text-sm font-medium border border-slate-200/80 outline-none focus:ring-2 focus:ring-neu-primary/20"
              />
            </div>
          </div>
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
        </div>
      )}

      {/* Deep Dive Modal */}
      <Modal isOpen={isDeepDiveOpen} onClose={() => setIsDeepDiveOpen(false)} title="Business Deep Dive">
        {loadingDeepDive ? (
          <div className="py-12 text-center text-neu-primary font-bold animate-pulse">
            Extracting data for {selectedBusiness?.email}...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="neu-card p-4 bg-neu-primary/5 border border-neu-primary/20">
              <p className="text-xs text-neu-text font-bold uppercase tracking-wide">Target Business</p>
              <p className="font-bold text-neu-heading">{selectedBusiness?.email}</p>
              <p className="text-xs text-neu-text font-medium mt-1">ID: {selectedBusiness?.id}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="neu-card p-4 text-center">
                <p className="text-sm font-bold text-neu-text uppercase tracking-wider mb-1">Customers</p>
                <p className="text-3xl font-black text-neu-heading">{deepDiveData.customerCount}</p>
              </div>
              <div className="neu-card p-4 text-center">
                <p className="text-sm font-bold text-neu-text uppercase tracking-wider mb-1">Bills Logged</p>
                <p className="text-3xl font-black text-neu-heading">{deepDiveData.billCount}</p>
              </div>
              <div className="neu-card p-4 text-center col-span-2">
                <p className="text-sm font-bold text-neu-text uppercase tracking-wider mb-1">Total Outstanding</p>
                <p className="text-3xl font-black text-neu-danger">₹{Number(deepDiveData.totalOutstanding || 0).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-neu-text/10 text-center">
              <p className="text-sm font-medium text-neu-text italic">
                Viewing capabilities restricted to metrics to preserve target business data privacy.
              </p>
            </div>
          </div>
        )}
      </Modal>

    </motion.div>
  );
}
