import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Search, Plus, UserPlus, ChevronLeft, Phone, Mail, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import SkeletonLoader from '../components/SkeletonLoader';
import { Tilt3DCard, FadeInContainer, FadeInItem } from '../components/FramerComponents';
import { findDuplicateCustomer } from '../lib/customers';
import { exportCsv } from '../lib/csv';

export default function Customers() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingId, setEditingId] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', firm_name: '', address: '', gst_details: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const duplicate = findDuplicateCustomer(customers, newCustomer);
    if (duplicate) {
      toast.error(`Customer already exists: ${duplicate.name}`);
      return;
    }
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to add a customer.');

      const sanitized = {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        email: newCustomer.email.trim(),
        firm_name: newCustomer.firm_name.trim(),
        address: newCustomer.address.trim(),
        gst_details: newCustomer.gst_details.trim().toUpperCase(),
      };
      if (!sanitized.name || !sanitized.firm_name || !sanitized.phone || !sanitized.email || !sanitized.gst_details || !sanitized.address) {
        toast.error('Please fill in all required customer fields.');
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([{ 
          business_id: user.id, 
          ...sanitized,
        }])
        .select();

      if (error) throw error;

      // Add to local state
      if (data && data.length > 0) {
        setCustomers(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
      }
      
      // Close modal and reset form
      setIsModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '', firm_name: '', address: '', gst_details: '' });
      toast.success(t('customers.customerAdded'));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    const duplicate = findDuplicateCustomer(customers, newCustomer, editingId);
    if (duplicate) {
      toast.error(`Another customer already uses those details: ${duplicate.name}`);
      return;
    }
    setIsSubmitting(true);

    try {
      const sanitized = {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        email: newCustomer.email.trim(),
        firm_name: newCustomer.firm_name.trim(),
        address: newCustomer.address.trim(),
        gst_details: newCustomer.gst_details.trim().toUpperCase(),
      };
      if (!sanitized.name || !sanitized.firm_name || !sanitized.phone || !sanitized.email || !sanitized.gst_details || !sanitized.address) {
        toast.error('Please fill in all required customer fields.');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('customers')
        .update(sanitized)
        .eq('id', editingId);

      if (error) throw error;

      // Update local state
      setCustomers(prev => prev.map(c => c.id === editingId ? { ...c, ...sanitized } : c));
      
      setIsModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '', firm_name: '', address: '', gst_details: '' });
      toast.success(t('customers.customerUpdated'));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setNewCustomer({ name: '', phone: '', email: '', firm_name: '', address: '', gst_details: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (customer) => {
    setModalMode('edit');
    setEditingId(customer.id);
    setNewCustomer({ 
      name: customer.name || '', 
      phone: customer.phone || '', 
      email: customer.email || '', 
      firm_name: customer.firm_name || '', 
      address: customer.address || '', 
      gst_details: customer.gst_details || '' 
    });
    setIsModalOpen(true);
  };

  const handleExportExcel = () => {
    if (customers.length === 0) {
      toast.error("No customers to export.");
      return;
    }
    const headers = ['Party Name', 'Firm Name', 'Phone', 'Email', 'GSTIN', 'Address', 'Outstanding (INR)', 'Added On'];
    const rows = customers.map(c => [
      c.name || '',
      c.firm_name || 'N/A',
      c.phone || 'N/A',
      c.email || 'N/A',
      c.gst_details || 'N/A',
      c.address || 'N/A',
      Number(c.total_outstanding || 0),
      new Date(c.created_at).toLocaleDateString()
    ]);
    exportCsv('UdharPe_Customers.csv', headers, rows);
    toast.success("Customer list exported (.csv)!");
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.phone && c.phone.includes(searchQuery))
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <SkeletonLoader className="w-48 h-10 mb-8" />
        <SkeletonLoader className="w-full h-16 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonLoader className="w-full h-48" count={6} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/dashboard')}
            aria-label="Back to Dashboard"
            className="w-10 h-10 bg-white border border-zinc-300 rounded-md flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 transition-colors duration-150"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold text-zinc-900 tracking-tight">{t('customers.title')}</h1>
            <p className="text-zinc-600 mt-0.5 text-[14px] tabular-nums">{customers.length} {t('nav.customers')}</p>
          </div>
        </div>

        <div className="flex w-full sm:w-auto gap-2.5">
          <button onClick={handleExportExcel} className="btn-solid px-4 py-2 text-[14px]">
            <Download size={16} /> <span className="hidden sm:inline">{t('customers.exportCsv')}</span>
          </button>
          <button onClick={openAddModal} className="btn-primary flex-1 sm:flex-none">
            <UserPlus size={18} /> {t('customers.addCustomer')}
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          placeholder={t('customers.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400 rounded-lg pl-11 pr-4 py-3 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 transition-colors duration-150 text-[15px]"
        />
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white border border-zinc-300 rounded-lg p-12 text-center">
          <h3 className="text-xl font-display font-bold text-zinc-900 mb-2">{t('customers.noCustomersFound')}</h3>
          <p className="text-zinc-600 text-[15px] max-w-md mx-auto">
            {t('customers.noCustomersHint')}
          </p>
          {!searchQuery && (
            <button onClick={openAddModal} className="btn-primary mx-auto mt-6">
              {t('customers.addCustomer')}
            </button>
          )}
        </div>
      ) : (
        <FadeInContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCustomers.map(customer => (
            <FadeInItem key={customer.id} className="h-full">
              <Tilt3DCard maxTilt={3.5}>
                <div className="bg-white border border-zinc-300 hover:border-zinc-400 rounded-lg p-5 flex flex-col justify-between h-full transition-colors duration-150">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 font-display font-bold text-[16px]">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] text-zinc-500 font-medium">{t('customers.outstanding')}</p>
                        <p className={`font-display font-bold text-lg tabular-nums ${Number(customer.total_outstanding) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                          ₹{Number(customer.total_outstanding).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    <h3 className="font-display font-bold text-lg text-zinc-900 mb-2">{customer.name}</h3>

                    <div className="space-y-1.5 mb-3">
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-zinc-600 text-[14px]">
                          <Phone size={14} className="text-zinc-400" /> {customer.phone}
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-2 text-zinc-600 text-[14px] truncate">
                          <Mail size={14} className="text-zinc-400 shrink-0" /> {customer.email}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => openEditModal(customer)}
                      className="text-[13px] font-semibold text-zinc-600 hover:text-zinc-900 underline underline-offset-4 transition-colors duration-150"
                    >
                      {t('customers.editDetails')}
                    </button>
                  </div>

                  <div className="mt-5 pt-4 border-t border-zinc-200 flex gap-2.5">
                    <button
                      onClick={() => navigate(`/customers/${customer.id}`)}
                      className="btn-solid flex-1 py-2 text-[14px]"
                    >
                      {t('customers.viewLedger')}
                    </button>
                    <button
                      onClick={() => navigate(`/billing?customer_id=${customer.id}`)}
                      className="btn-primary flex-1 py-2 text-[14px]"
                    >
                      <Plus size={16} /> {t('customers.udharBtn')}
                    </button>
                  </div>
                </div>
              </Tilt3DCard>
            </FadeInItem>
          ))}
        </FadeInContainer>
      )}

      {/* Add/Edit Customer Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === 'add' ? t('customers.addPartyModal') : t('customers.editPartyModal')}>
        <form onSubmit={modalMode === 'add' ? handleAddCustomer : handleEditCustomer} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="customerName" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">{t('customers.partyName')} *</label>
              <input 
                id="customerName"
                type="text" required value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                placeholder={t('customers.partyNamePlaceholder')} className="input-field"
              />
            </div>
            <div>
              <label htmlFor="customerFirm" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">{t('settings.firmName')} *</label>
              <input 
                id="customerFirm"
                type="text" required value={newCustomer.firm_name} onChange={e => setNewCustomer({...newCustomer, firm_name: e.target.value})}
                placeholder={t('settings.firmNamePlaceholder')} className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="customerPhone" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">{t('customers.phoneLabel')} *</label>
              <input 
                id="customerPhone"
                type="tel" required value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                placeholder={t('customers.phonePlaceholder')} className="input-field"
              />
            </div>
            <div>
              <label htmlFor="customerEmail" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">{t('customers.emailLabel')} *</label>
              <input 
                id="customerEmail"
                type="email" required value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                placeholder={t('customers.emailPlaceholder')} className="input-field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="customerGst" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">GST *</label>
            <input 
              id="customerGst"
              type="text" required value={newCustomer.gst_details} onChange={e => setNewCustomer({...newCustomer, gst_details: e.target.value})}
              placeholder="e.g. 29ABCDE1234F1Z5" className="input-field uppercase"
            />
          </div>

          <div>
            <label htmlFor="customerAddress" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">{t('customers.addressLabel')} *</label>
            <textarea 
              id="customerAddress"
              rows="2" required value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
              placeholder={t('customers.addressPlaceholder')} className="input-field resize-none"
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-solid w-full mt-6 py-4">
            {isSubmitting ? t('settings.saving') : (modalMode === 'add' ? t('customers.saveParty') : t('customers.updateParty'))}
          </button>
        </form>
      </Modal>

    </motion.div>
  );
}
