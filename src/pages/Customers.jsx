import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Plus, UserPlus, X, ChevronLeft, Phone, Mail, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Modal from '../components/Modal';
import SkeletonLoader from '../components/SkeletonLoader';

export default function Customers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingId, setEditingId] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', firm_name: '', address: '', gst_details: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
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
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to add a customer.');

      const { data, error } = await supabase
        .from('customers')
        .insert([{ 
          business_id: user.id, 
          name: newCustomer.name, 
          phone: newCustomer.phone, 
          email: newCustomer.email,
          firm_name: newCustomer.firm_name,
          address: newCustomer.address,
          gst_details: newCustomer.gst_details
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
      toast.success('Customer added successfully!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: newCustomer.name, 
          phone: newCustomer.phone, 
          email: newCustomer.email,
          firm_name: newCustomer.firm_name,
          address: newCustomer.address,
          gst_details: newCustomer.gst_details
        })
        .eq('id', editingId);

      if (error) throw error;

      // Update local state
      setCustomers(prev => prev.map(c => c.id === editingId ? { ...c, ...newCustomer } : c));
      
      setIsModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '', firm_name: '', address: '', gst_details: '' });
      toast.success('Customer updated successfully!');
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
    const exportData = customers.map(c => ({
      'Party Name': c.name,
      'Firm Name': c.firm_name || 'N/A',
      'Phone': c.phone || 'N/A',
      'Email': c.email || 'N/A',
      'GSTIN': c.gst_details || 'N/A',
      'Address': c.address || 'N/A',
      'Outstanding (₹)': Number(c.total_outstanding),
      'Added On': new Date(c.created_at).toLocaleDateString()
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, "UdharPe_Customers.xlsx");
    toast.success("Excel downloaded!");
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
      className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 neu-card flex items-center justify-center text-neu-text hover:text-neu-primary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-neu-heading tracking-tight">My Customers</h1>
            <p className="text-neu-text mt-1 font-bold">{customers.length} total clients</p>
          </div>
        </div>
        
        <div className="flex w-full sm:w-auto gap-3">
          <button onClick={handleExportExcel} className="neu-card px-4 py-2 flex items-center justify-center gap-2 text-neu-primary hover:bg-neu-primary hover:text-white transition-all font-bold">
            <Download size={18} /> <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={openAddModal} className="btn-solid flex-1 sm:flex-none">
            <UserPlus size={20} /> Add Customer
          </button>
        </div>
      </header>
      
      {/* Search Bar */}
      <div className="relative mb-8 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neu-text group-focus-within:text-neu-primary transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-neu-bg text-neu-heading placeholder-neu-text/60 rounded-none pl-14 pr-4 py-4 outline-none focus:ring-2 focus:ring-neu-primary/30 border-4 border-black shadow-none bg-white transition-all font-bold"
        />
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="neu-card p-12 text-center border-4 border-black shadow-none bg-white">
          <div className="w-20 h-20 mx-auto mb-6 shadow-neu rounded-none flex items-center justify-center text-neu-primary">
            <UserPlus size={32} />
          </div>
          <h3 className="text-xl font-bold text-neu-heading mb-2">No customers found</h3>
          <p className="text-neu-text font-bold max-w-md mx-auto">
            {searchQuery ? "We couldn't find anyone matching your search." : "You haven't added any customers yet. Add your first customer to start tracking Udhar."}
          </p>
          {!searchQuery && (
            <button onClick={openAddModal} className="btn-primary mx-auto mt-6">
              Add First Customer
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map(customer => (
            <div key={customer.id} className="neu-card p-6 flex flex-col justify-between hover:shadow-neu-hover transition-all group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 shadow-neu rounded-none flex items-center justify-center text-neu-primary font-bold text-lg bg-neu-bg">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neu-text font-bold uppercase tracking-wider mb-1">Outstanding</p>
                    <p className="font-black text-neu-danger text-lg">₹{Number(customer.total_outstanding).toLocaleString()}</p>
                  </div>
                </div>
                
                <h3 className="font-bold text-xl text-neu-heading mb-3">{customer.name}</h3>
                
                <div className="space-y-2">
                  {customer.phone && (
                    <div className="flex items-center gap-3 text-neu-text font-bold text-sm">
                      <Phone size={14} className="text-neu-primary" /> {customer.phone}
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-3 text-neu-text font-bold text-sm">
                      <Mail size={14} className="text-neu-primary" /> {customer.email}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => openEditModal(customer)}
                  className="mt-4 text-xs font-bold text-neu-primary hover:text-neu-primary-hover border border-neu-primary px-3 py-1 rounded-none transition-colors inline-block"
                >
                  Edit Details
                </button>
              </div>
              
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  className="flex-1 py-2.5 rounded-none shadow-neu text-neu-heading font-bold hover:text-neu-primary transition-colors flex items-center justify-center gap-2"
                >
                  View Ledger
                </button>
                <button 
                  onClick={() => navigate('/billing')}
                  className="flex-1 py-2.5 rounded-none border-4 border-black shadow-none bg-white text-neu-primary font-bold hover:bg-neu-primary hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Udhar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Customer Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === 'add' ? "Add Party" : "Edit Party"}>
        <form onSubmit={modalMode === 'add' ? handleAddCustomer : handleEditCustomer} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="customerName" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">Party Name *</label>
              <input 
                id="customerName"
                type="text" required value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                placeholder="e.g. Ramesh Singh" className="input-field"
              />
            </div>
            <div>
              <label htmlFor="customerFirm" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">Firm Name</label>
              <input 
                id="customerFirm"
                type="text" value={newCustomer.firm_name} onChange={e => setNewCustomer({...newCustomer, firm_name: e.target.value})}
                placeholder="e.g. Ramesh Electronics" className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="customerPhone" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">Phone Number</label>
              <input 
                id="customerPhone"
                type="tel" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                placeholder="e.g. 9876543210" className="input-field"
              />
            </div>
            <div>
              <label htmlFor="customerEmail" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">Email Address (For Reminders)</label>
              <input 
                id="customerEmail"
                type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                placeholder="ramesh@example.com" className="input-field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="customerGst" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">GST Number (Optional)</label>
            <input 
              id="customerGst"
              type="text" value={newCustomer.gst_details} onChange={e => setNewCustomer({...newCustomer, gst_details: e.target.value})}
              placeholder="e.g. 29ABCDE1234F1Z5" className="input-field uppercase"
            />
          </div>

          <div>
            <label htmlFor="customerAddress" className="block text-sm font-semibold text-neu-heading mb-2 pl-1 uppercase tracking-wider text-xs">Address</label>
            <textarea 
              id="customerAddress"
              rows="2" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
              placeholder="Full address of the party" className="input-field resize-none"
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-solid w-full mt-6 py-4">
            {isSubmitting ? 'Saving...' : (modalMode === 'add' ? 'Save Party' : 'Update Party')}
          </button>
        </form>
      </Modal>

    </motion.div>
  );
}
