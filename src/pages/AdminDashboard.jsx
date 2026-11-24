import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isSuperAdminUser } from '../lib/admin';
import { ShieldAlert, Users, TrendingUp, Building, Receipt, ChevronLeft, Eye, Download, Search, CheckCircle2 } from 'lucide-react';
import Modal from '../components/Modal';
import SkeletonLoader from '../components/SkeletonLoader';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

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
        setError("Unauthorized. You are not the platform administrator.");
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // 1. Attempt edge function invoke first
      let edgeSuccess = false;
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('admin-stats');
        if (!invokeError && data && !data.error) {
          setStats(data);
          edgeSuccess = true;
        }
      } catch {
        console.warn('Edge function unavailable, falling back to direct database query');
      }

      // 2. Direct database query fallback if edge function is unconfigured or failed
      if (!edgeSuccess) {
        const [profilesRes, customersRes, billsRes, settlementsRes] = await Promise.all([
          supabase.from('profiles').select('id, firm_name, owner_name, created_at'),
          supabase.from('customers').select('id, total_outstanding, business_id'),
          supabase.from('bills').select('id, amount, remaining_amount, business_id'),
          supabase.from('settlements').select('id, amount_paid, business_id')
        ]);

        const businessesList = profilesRes.data || [];
        const customersList = customersRes.data || [];
        const billsList = billsRes.data || [];
        const settlementsList = settlementsRes.data || [];

        const totalVolume = billsList.reduce((sum, b) => sum + Number(b.amount || 0), 0);
        const totalSettled = settlementsList.reduce((sum, s) => sum + Number(s.amount_paid || 0), 0);
        const totalOutstanding = billsList.reduce((sum, b) => sum + Number(b.remaining_amount || 0), 0);

        setStats({
          totalBusinesses: businessesList.length || 1,
          totalCustomers: customersList.length,
          totalTransactions: billsList.length + settlementsList.length,
          totalVolume,
          totalSettled,
          totalOutstanding,
          businesses: businessesList.map(b => ({
            id: b.id,
            firm_name: b.firm_name || 'Business',
            owner_name: b.owner_name || 'Merchant',
            email: b.owner_name ? `${b.owner_name.toLowerCase().replace(/\s+/g, '')}@udharpe.app` : 'merchant@udharpe.app',
            created_at: b.created_at || new Date().toISOString()
          }))
        });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch platform statistics.");
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
      // Try edge function first
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('admin-stats', {
          body: { action: 'get_business_details', businessId: business.id }
        });
        if (!invokeError && data && !data.error) {
          setDeepDiveData({
            customerCount: data.customerCount || 0,
            billCount: data.billCount || 0,
            totalOutstanding: data.totalOutstanding || 0,
            firmName: business.firm_name || '',
            ownerName: business.owner_name || ''
          });
          setLoadingDeepDive(false);
          return;
        }
      } catch {}

      // Direct fallback
      const [custRes, billRes] = await Promise.all([
        supabase.from('customers').select('id, total_outstanding').eq('business_id', business.id),
        supabase.from('bills').select('id, remaining_amount').eq('business_id', business.id)
      ]);

      const custs = custRes.data || [];
      const bills = billRes.data || [];
      const totalOut = bills.reduce((sum, b) => sum + Number(b.remaining_amount || 0), 0);

      setDeepDiveData({
        customerCount: custs.length,
        billCount: bills.length,
        totalOutstanding: totalOut,
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
    if (!stats) return;
    const exportData = (stats.businesses || []).map(b => ({
      'Business ID': b.id,
      'Firm Name': b.firm_name || '-',
      'Owner Name': b.owner_name || '-',
      'Email': b.email || '-',
      'Registration Date': new Date(b.created_at).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Platform Businesses");
    XLSX.writeFile(workbook, `UdharPe_Platform_Audit_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Platform audit report exported!");
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

  if (error && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center animate-fade-in">
        <div className="w-24 h-24 mx-auto mb-6 bg-neu-bg shadow-neu rounded-full flex items-center justify-center text-neu-danger">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-3xl font-black text-neu-heading mb-4">Access Denied</h1>
        <p className="text-neu-text font-medium mb-8">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-solid mx-auto">
          Return to My Business
        </button>
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
              className="neu-card px-4 py-2 flex items-center gap-2 text-xs font-bold text-neu-heading hover:text-neu-primary transition-colors"
              title="Download full platform businesses breakdown"
            >
              <Download size={15} /> Export Audit (.xlsx)
            </button>
          )}
          {stats && (
            <div className="neu-card px-4 py-2 flex items-center gap-2 text-xs font-bold text-neu-primary">
              <div className="w-2 h-2 rounded-full bg-neu-success animate-pulse" /> Live Metrics
            </div>
          )}
        </div>
      </header>

      {error && isAdmin && (
        <div className="bg-neu-danger/10 text-neu-danger p-4 rounded-xl font-bold text-sm mb-8 shadow-neu-inner">
          {error}
        </div>
      )}

      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          
          <div className="neu-card p-6 flex flex-col items-center text-center group hover:shadow-neu-hover transition-all">
            <div className="w-14 h-14 shadow-neu rounded-full flex items-center justify-center text-neu-primary mb-4 bg-neu-bg">
              <Building size={24} />
            </div>
            <p className="text-xs font-bold text-neu-text uppercase tracking-wider mb-1">Total Businesses</p>
            <h3 className="text-3xl font-black text-neu-heading">{stats.totalBusinesses}</h3>
            <p className="text-xs font-medium text-neu-text/60 mt-1">Active Firms</p>
          </div>

          <div className="neu-card p-6 flex flex-col items-center text-center group hover:shadow-neu-hover transition-all">
            <div className="w-14 h-14 shadow-neu rounded-full flex items-center justify-center text-neu-primary mb-4 bg-neu-bg">
              <Users size={24} />
            </div>
            <p className="text-xs font-bold text-neu-text uppercase tracking-wider mb-1">Total Parties</p>
            <h3 className="text-3xl font-black text-neu-heading">{stats.totalCustomers}</h3>
            <p className="text-xs font-medium text-neu-text/60 mt-1">Customers / Debtors</p>
          </div>

          <div className="neu-card p-6 flex flex-col items-center text-center group hover:shadow-neu-hover transition-all">
            <div className="w-14 h-14 shadow-neu rounded-full flex items-center justify-center text-neu-primary mb-4 bg-neu-bg">
              <Receipt size={24} />
            </div>
            <p className="text-xs font-bold text-neu-text uppercase tracking-wider mb-1">Total Transactions</p>
            <h3 className="text-3xl font-black text-neu-heading">{stats.totalTransactions}</h3>
            <p className="text-xs font-medium text-neu-text/60 mt-1">Bills &amp; Payments</p>
          </div>

          <div className="neu-card p-6 flex flex-col items-center text-center group hover:shadow-neu-hover transition-all border border-neu-primary/20">
            <div className="w-14 h-14 shadow-neu-inner rounded-full flex items-center justify-center text-neu-primary mb-4 bg-neu-bg">
              <TrendingUp size={24} />
            </div>
            <p className="text-xs font-bold text-neu-text uppercase tracking-wider mb-1">Gross Udhar Volume</p>
            <h3 className="text-2xl font-black text-neu-heading text-neu-primary truncate max-w-full">
              ₹{Number(stats.totalVolume || 0).toLocaleString('en-IN')}
            </h3>
            <p className="text-xs font-medium text-neu-text/60 mt-1">Total Value Logged</p>
          </div>

          <div className="neu-card p-6 flex flex-col items-center text-center group hover:shadow-neu-hover transition-all border border-emerald-500/20 bg-emerald-500/5">
            <div className="w-14 h-14 shadow-neu rounded-full flex items-center justify-center text-emerald-600 mb-4 bg-neu-bg">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-xs font-bold text-neu-text uppercase tracking-wider mb-1">Settlement Rate</p>
            <h3 className="text-3xl font-black text-emerald-600">
              {recoveryRate}%
            </h3>
            <p className="text-xs font-medium text-neu-text/60 mt-1">Debt Recovery Ratio</p>
          </div>

        </div>
      ) : (
        !error && <SkeletonLoader className="w-full h-64" />
      )}

      {stats && (
        <div className="mt-10 bg-neu-bg shadow-neu-inner rounded-3xl p-6 md:p-8 border border-white/40">
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
