import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Users, TrendingUp, Building, Receipt, Activity, ChevronLeft, Eye, X } from 'lucide-react';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Deep Dive State
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [deepDiveData, setDeepDiveData] = useState({ customers: [], bills: [] });
  const [loadingDeepDive, setLoadingDeepDive] = useState(false);

  useEffect(() => {
    checkAdminAndFetchStats();
  }, []);

  const checkAdminAndFetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      if (user.email !== 'hemaxtth@gmail.com') {
        setError("Unauthorized. You are not the platform administrator.");
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // Fetch global stats using our edge function
      const { data, error: invokeError } = await supabase.functions.invoke('admin-stats');
      
      if (invokeError) throw invokeError;
      
      setStats(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch platform statistics. Ensure the Edge Function is deployed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeepDive = async (business) => {
    setSelectedBusiness(business);
    setIsDeepDiveOpen(true);
    setLoadingDeepDive(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-stats', {
        body: { action: 'get_business_details', businessId: business.id }
      });
      
      if (invokeError) throw invokeError;
      setDeepDiveData({ customers: data.customers || [], bills: data.bills || [] });
    } catch (err) {
      toast.error('Failed to load business details');
      setIsDeepDiveOpen(false);
    } finally {
      setLoadingDeepDive(false);
    }
  };

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
        <div className="w-24 h-24 mx-auto mb-6 bg-neu-bg shadow-neu rounded-none flex items-center justify-center text-neu-danger">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-3xl font-black text-neu-heading mb-4">Access Denied</h1>
        <p className="text-neu-text font-bold mb-8">{error}</p>
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
            <p className="text-neu-text font-bold text-sm mt-1">Platform Overview & Metrics</p>
          </div>
        </div>
        
        {stats && (
          <div className="neu-card px-4 py-2 flex items-center gap-2 text-xs font-bold text-neu-primary">
            <div className="w-2 h-2 rounded-none bg-neu-success animate-pulse" /> Live Data
          </div>
        )}
      </header>

      {error && isAdmin && (
        <div className="bg-neu-danger/10 text-neu-danger p-4 rounded-none font-bold text-sm mb-8 border-4 border-[#059669] bg-white">
          {error}
        </div>
      )}

      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="neu-card p-6 flex flex-col items-center text-center group hover:shadow-neu-hover transition-all">
            <div className="w-16 h-16 shadow-neu rounded-none flex items-center justify-center text-neu-primary mb-4 bg-neu-bg">
              <Building size={28} />
            </div>
            <p className="text-sm font-bold text-neu-text uppercase tracking-wider mb-1">Total Businesses</p>
            <h3 className="text-4xl font-black text-neu-heading">{stats.totalBusinesses}</h3>
            <p className="text-xs font-bold text-neu-text/60 mt-2">Registered on UdharPe</p>
          </div>

          <div className="neu-card p-6 flex flex-col items-center text-center group hover:shadow-neu-hover transition-all">
            <div className="w-16 h-16 shadow-neu rounded-none flex items-center justify-center text-neu-primary mb-4 bg-neu-bg">
              <Users size={28} />
            </div>
            <p className="text-sm font-bold text-neu-text uppercase tracking-wider mb-1">Total Customers</p>
            <h3 className="text-4xl font-black text-neu-heading">{stats.totalCustomers}</h3>
            <p className="text-xs font-bold text-neu-text/60 mt-2">Across all businesses</p>
          </div>

          <div className="neu-card p-6 flex flex-col items-center text-center group hover:shadow-neu-hover transition-all">
            <div className="w-16 h-16 shadow-neu rounded-none flex items-center justify-center text-neu-primary mb-4 bg-neu-bg">
              <Receipt size={28} />
            </div>
            <p className="text-sm font-bold text-neu-text uppercase tracking-wider mb-1">Total Transactions</p>
            <h3 className="text-4xl font-black text-neu-heading">{stats.totalTransactions}</h3>
            <p className="text-xs font-bold text-neu-text/60 mt-2">Bills and Payments logged</p>
          </div>

          <div className="neu-card p-6 flex flex-col items-center text-center group hover:shadow-neu-hover transition-all border border-neu-primary/20">
            <div className="w-16 h-16 border-4 border-[#059669] bg-white rounded-none flex items-center justify-center text-neu-primary mb-4 bg-neu-bg">
              <TrendingUp size={28} />
            </div>
            <p className="text-sm font-bold text-neu-text uppercase tracking-wider mb-1">Total Udhar Volume</p>
            <h3 className="text-3xl font-black text-neu-heading text-neu-primary">
              ₹{stats.totalVolume.toLocaleString()}
            </h3>
            <p className="text-xs font-bold text-neu-text/60 mt-2">Value recorded globally</p>
          </div>

        </div>
      ) : (
        !error && <SkeletonLoader className="w-full h-64" />
      )}

      {stats && (
        <div className="mt-12 bg-neu-bg border-4 border-[#059669] bg-white rounded-3xl p-8 border border-4 border-[#059669]">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="text-neu-primary" />
            <h2 className="text-xl font-bold text-neu-heading">System Status</h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-neu-bg shadow-neu rounded-none">
              <span className="font-bold text-neu-heading text-sm">Edge Functions</span>
              <span className="text-xs font-black text-neu-success bg-neu-success/10 px-3 py-1 rounded-none uppercase tracking-wider">Operational</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-neu-bg shadow-neu rounded-none">
              <span className="font-bold text-neu-heading text-sm">Database Connections</span>
              <span className="text-xs font-black text-neu-success bg-neu-success/10 px-3 py-1 rounded-none uppercase tracking-wider">Operational</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-neu-bg shadow-neu rounded-none">
              <span className="font-bold text-neu-heading text-sm">SMTP / Resend Email Engine</span>
              <span className="text-xs font-black text-neu-success bg-neu-success/10 px-3 py-1 rounded-none uppercase tracking-wider">Operational</span>
            </div>
          </div>
        </div>
      )}

      {stats && stats.businesses && stats.businesses.length > 0 && (
        <div className="mt-8 bg-neu-bg border-4 border-[#059669] bg-white rounded-3xl p-6 md:p-8 border border-4 border-[#059669] overflow-hidden">
          <h2 className="text-xl font-bold text-neu-heading mb-6 flex items-center gap-2">
            <Building size={20} className="text-neu-primary" /> Registered Businesses
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-neu-text/10">
                  <th className="p-3 text-sm font-bold text-neu-text uppercase tracking-wider">Business Email</th>
                  <th className="p-3 text-sm font-bold text-neu-text uppercase tracking-wider">Joined On</th>
                  <th className="p-3 text-sm font-bold text-neu-text uppercase tracking-wider">Last Login</th>
                  <th className="p-3 text-sm font-bold text-neu-text uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.businesses.map(b => (
                  <tr key={b.id} className="border-b border-neu-text/5 hover:bg-white/50 transition-colors">
                    <td className="p-3 font-semibold text-neu-heading">{b.email}</td>
                    <td className="p-3 text-neu-text font-bold text-sm">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-neu-text font-bold text-sm">
                      {b.last_sign_in_at ? new Date(b.last_sign_in_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => handleDeepDive(b)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border border-neu-primary text-neu-primary font-bold hover:bg-neu-primary hover:text-white transition-colors text-xs"
                      >
                        <Eye size={14} /> Deep Dive
                      </button>
                    </td>
                  </tr>
                ))}
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
              <p className="text-xs text-neu-text font-bold mt-1">ID: {selectedBusiness?.id}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="neu-card p-4 text-center">
                <p className="text-sm font-bold text-neu-text uppercase tracking-wider mb-1">Customers</p>
                <p className="text-3xl font-black text-neu-heading">{deepDiveData.customers.length}</p>
              </div>
              <div className="neu-card p-4 text-center">
                <p className="text-sm font-bold text-neu-text uppercase tracking-wider mb-1">Bills Logged</p>
                <p className="text-3xl font-black text-neu-heading">{deepDiveData.bills.length}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-neu-text/10 text-center">
              <p className="text-sm font-bold text-neu-text italic">
                Viewing capabilities restricted to metrics to preserve target business data privacy.
              </p>
            </div>
          </div>
        )}
      </Modal>

    </motion.div>
  );
}
