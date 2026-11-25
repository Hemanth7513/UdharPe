import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isSuperAdminUser } from '../lib/admin';
import { ShieldAlert, Building, ChevronLeft, Eye, Download, Search } from 'lucide-react';
import Modal from '../components/Modal';
import SkeletonLoader from '../components/SkeletonLoader';
import toast from 'react-hot-toast';

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
    const headers = ['Business ID', 'Firm Name', 'Owner Name', 'Email', 'Registration Date'];
    const rows = stats.businesses.map(b => [
      b.id || '',
      b.firm_name || '-',
      b.owner_name || '-',
      b.email || '-',
      b.created_at ? new Date(b.created_at).toLocaleDateString() : '-'
    ]);
    const csvContent = '\uFEFF' + [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `UdharPe_Platform_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 neu-card flex items-center justify-center text-neu-text hover:text-neu-primary transition-colors shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-neu-heading tracking-tight flex items-center gap-3">
              Super Admin <ShieldAlert className="text-neu-primary" />
            </h1>
            <p className="text-neu-text font-medium text-sm mt-1">Platform Command Center &amp; Health Overview</p>
          </div>
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
                <tr className="border-b-2 border-neu-text/10">
                  <th className="p-3 text-xs font-bold text-neu-text uppercase tracking-wider">Firm / Merchant</th>
                  <th className="p-3 text-xs font-bold text-neu-text uppercase tracking-wider">Contact Identifier</th>
                  <th className="p-3 text-xs font-bold text-neu-text uppercase tracking-wider">Joined On</th>
                  <th className="p-3 text-xs font-bold text-neu-text uppercase tracking-wider text-right">Audit</th>
                </tr>
              </thead>
              <tbody>
                {filteredBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-neu-text/60 text-sm">
                      No businesses matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredBusinesses.map(b => (
                    <tr key={b.id} className="border-b border-neu-text/5 hover:bg-white/50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-neu-heading text-sm">{b.firm_name || 'My Business'}</div>
                        <div className="text-xs text-neu-text/60">{b.owner_name || 'Business Owner'}</div>
                      </td>
                      <td className="p-3 font-mono text-xs text-neu-text">{b.email}</td>
                      <td className="p-3 text-neu-text font-medium text-xs">
                        {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => handleDeepDive(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neu-primary text-neu-primary font-bold hover:bg-neu-primary hover:text-white transition-colors text-xs"
                        >
                          <Eye size={13} /> Deep Dive
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
